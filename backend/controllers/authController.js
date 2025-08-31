// controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const geoip = require('geoip-lite');
const useragent = require('useragent');

// Email transporter setup (using free services)
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail', // You can use Gmail, Outlook, etc.
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // Use app-specific password
    }
  });
};

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

// Get device info from request
const getDeviceInfo = (req) => {
  const agent = useragent.parse(req.headers['user-agent']);
  const ip = req.ip || req.connection.remoteAddress;
  const geo = geoip.lookup(ip);
  
  return {
    deviceId: crypto.createHash('md5').update(req.headers['user-agent'] + ip).digest('hex'),
    deviceName: `${agent.os.family} ${agent.os.major}`,
    deviceType: agent.device.family === 'Other' ? 'Desktop' : agent.device.family,
    browser: `${agent.family} ${agent.major}`,
    ipAddress: ip,
    location: geo ? `${geo.city}, ${geo.country}` : 'Unknown',
    userAgent: req.headers['user-agent']
  };
};

// Enhanced Registration
exports.register = async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      firstName, 
      lastName, 
      dateOfBirth,
      interests = [],
      referralCode 
    } = req.body;

    // Enhanced validation
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: 'Username, email, and password are required',
        errors: {
          username: !username ? 'Username is required' : null,
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null
        }
      });
    }

    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        errors: {
          password: 'Password does not meet security requirements'
        }
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.email === email ? 'Email already registered' : 'Username already taken',
        errors: {
          email: existingUser.email === email ? 'Email already registered' : null,
          username: existingUser.username === username ? 'Username already taken' : null
        }
      });
    }

    // Get device info
    const deviceInfo = getDeviceInfo(req);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create new user with enhanced data
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      interests,
      emailVerificationToken,
      devices: [deviceInfo],
      preferences: {
        notifications: {
          email: true,
          push: true,
          likes: true,
          comments: true,
          follows: true,
          mentions: true
        }
      }
    });

    // Handle referral system
    if (referralCode) {
      const referrer = await User.findOne({ username: referralCode });
      if (referrer) {
        // Award experience to both users
        await referrer.addExperience(100);
        await user.addExperience(50);
        
        // Add referral badge
        user.badges.push({
          name: 'Referred User',
          description: 'Joined through a referral',
          icon: '🤝'
        });
      }
    }

    await user.save();

    // Update login streak and experience
    await user.updateLoginStreak();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Send welcome email with verification
    try {
      const transporter = createEmailTransporter();
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`;
      
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: '🎉 Welcome to SocialWave! Verify your email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #0EA5E9;">Welcome to SocialWave, ${firstName || username}! 🌊</h1>
            <p>Thanks for joining our amazing community! Please verify your email to get started:</p>
            <a href="${verificationUrl}" style="background: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">
              Verify Email Address
            </a>
            <p>Or copy this link: ${verificationUrl}</p>
            <p>Welcome aboard! 🚀</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    // Return success response
    res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
      success: true,
      tokens: {
        accessToken,
        refreshToken
      },
      user: user.getPublicProfile(),
      deviceRegistered: true,
      emailVerificationSent: true
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Enhanced Login
exports.login = async (req, res) => {
  try {
    const { email, password, rememberMe = false, twoFactorCode } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required',
        errors: {
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null
        }
      });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ 
      $or: [{ email }, { username: email }],
      isActive: true 
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid email or password',
        errors: {
          credentials: 'Invalid credentials'
        }
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ 
        message: 'Invalid email or password',
        errors: {
          credentials: 'Invalid credentials'
        }
      });
    }

    // Check if account is locked or suspended
    if (!user.isActive) {
      return res.status(403).json({ 
        message: 'Account is suspended. Please contact support.',
        accountStatus: 'suspended'
      });
    }

    // Two-factor authentication check
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return res.status(200).json({
          message: 'Two-factor authentication required',
          requiresTwoFactor: true,
          userId: user._id
        });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode,
        window: 2
      });

      if (!verified) {
        return res.status(400).json({
          message: 'Invalid two-factor authentication code',
          errors: {
            twoFactor: 'Invalid code'
          }
        });
      }
    }

    // Get device info
    const deviceInfo = getDeviceInfo(req);
    
    // Check if this is a new device
    const existingDevice = user.devices.find(device => device.deviceId === deviceInfo.deviceId);
    let isNewDevice = false;

    if (!existingDevice) {
      user.devices.push(deviceInfo);
      isNewDevice = true;
      
      // Send new device notification email
      try {
        const transporter = createEmailTransporter();
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: '🔐 New Device Login - SocialWave',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0EA5E9;">New Device Login Detected</h2>
              <p>Hi ${user.firstName || user.username},</p>
              <p>We detected a login from a new device:</p>
              <ul>
                <li><strong>Device:</strong> ${deviceInfo.deviceName}</li>
                <li><strong>Browser:</strong> ${deviceInfo.browser}</li>
                <li><strong>Location:</strong> ${deviceInfo.location}</li>
                <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
              </ul>
              <p>If this wasn't you, please secure your account immediately.</p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('New device email error:', emailError);
      }
    } else {
      // Update existing device info
      existingDevice.lastUsed = new Date();
      existingDevice.ipAddress = deviceInfo.ipAddress;
      existingDevice.location = deviceInfo.location;
    }

    // Update login streak and stats
    await user.updateLoginStreak();
    user.lastActive = new Date();
    await user.save();

    // Generate tokens with extended expiry if "remember me"
    const accessTokenExpiry = rememberMe ? '30d' : '15m';
    const refreshTokenExpiry = rememberMe ? '90d' : '7d';

    const accessToken = jwt.sign(
      { userId: user._id, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: accessTokenExpiry }
    );
    
    const refreshToken = jwt.sign(
      { userId: user._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: refreshTokenExpiry }
    );

    // Prepare response
    const response = {
      message: 'Login successful! Welcome back! 🎉',
      success: true,
      tokens: {
        accessToken,
        refreshToken
      },
      user: user.getPublicProfile(),
      loginStreak: user.streaks.dailyLogin.current,
      isNewDevice,
      deviceInfo: {
        name: deviceInfo.deviceName,
        location: deviceInfo.location
      }
    };

    // Set secure HTTP-only cookies for tokens
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 90 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
    };

    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, cookieOptions);

    res.json(response);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Login failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Enhanced Get Current User
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('followers', 'username displayName profilePicture isVerified')
      .populate('following', 'username displayName profilePicture isVerified')
      .select('-password -emailVerificationToken -passwordResetToken -twoFactorSecret');

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    // Update last active
    user.lastActive = new Date();
    await user.save();

    // Get user stats
    const Post = require('../models/Post');
    const Comment = require('../models/Comment');

    const [postCount, commentCount, totalLikes] = await Promise.all([
      Post.countDocuments({ user: user._id, status: 'published' }),
      Comment.countDocuments({ user: user._id, status: 'active' }),
      Post.aggregate([
        { $match: { user: user._id } },
        { $project: { likeCount: { $size: '$likes' } } },
        { $group: { _id: null, total: { $sum: '$likeCount' } } }
      ])
    ]);

    const userProfile = user.getPublicProfile();
    
    res.json({
      ...userProfile,
      stats: {
        posts: postCount,
        comments: commentCount,
        totalLikes: totalLikes[0]?.total || 0,
        followers: user.followerCount,
        following: user.followingCount,
        level: user.level,
        experience: user.experience,
        loginStreak: user.streaks.dailyLogin.current
      },
      achievements: user.badges,
      isOnline: user.isOnline,
      lastActive: user.lastActive
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch user data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    const { logoutFromAllDevices = false } = req.body;
    
    if (logoutFromAllDevices) {
      // Clear all devices
      const user = await User.findById(req.userId);
      user.devices = [];
      await user.save();
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({
      message: 'Logged out successfully! See you soon! 👋',
      success: true
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      message: 'Logout failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Refresh Token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body || req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ 
        message: 'Refresh token required',
        error: 'NO_REFRESH_TOKEN'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ 
        message: 'Invalid token type',
        error: 'INVALID_TOKEN_TYPE'
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        message: 'User not found or inactive',
        error: 'USER_NOT_FOUND'
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    res.json({
      message: 'Token refreshed successfully',
      tokens: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ 
      message: 'Invalid refresh token',
      error: 'INVALID_REFRESH_TOKEN'
    });
  }
};

// Email Verification
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired verification token',
        error: 'INVALID_TOKEN'
      });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    
    // Award verification badge and experience
    user.badges.push({
      name: 'Email Verified',
      description: 'Verified email address',
      icon: '✅'
    });
    
    await user.addExperience(25);
    await user.save();

    res.json({
      message: 'Email verified successfully! 🎉',
      success: true,
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ 
      message: 'Email verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not
      return res.json({
        message: 'If an account with that email exists, we\'ve sent a password reset link.',
        success: true
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send reset email
    try {
      const transporter = createEmailTransporter();
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: '🔐 Password Reset - SocialWave',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0EA5E9;">Password Reset Request</h2>
            <p>Hi ${user.firstName || user.username},</p>
            <p>You requested a password reset. Click the link below to reset your password:</p>
            <a href="${resetUrl}" style="background: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">
              Reset Password
            </a>
            <p>This link expires in 10 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Password reset email error:', emailError);
    }

    res.json({
      message: 'If an account with that email exists, we\'ve sent a password reset link.',
      success: true
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      message: 'Password reset request failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset token',
        error: 'INVALID_TOKEN'
      });
    }

    // Validate new password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        error: 'WEAK_PASSWORD'
      });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      message: 'Password reset successfully! 🎉',
      success: true
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      message: 'Password reset failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Setup Two-Factor Authentication
exports.setupTwoFactor = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    const secret = speakeasy.generateSecret({
      name: `SocialWave (${user.email})`,
      issuer: 'SocialWave'
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Temporarily store secret (don't save until verified)
    req.session.tempTwoFactorSecret = secret.base32;

    res.json({
      message: 'Two-factor authentication setup initiated',
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
      success: true
    });

  } catch (error) {
    console.error('Two-factor setup error:', error);
    res.status(500).json({ 
      message: 'Two-factor setup failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Verify Two-Factor Authentication
exports.verifyTwoFactor = async (req, res) => {
  try {
    const { token } = req.body;
    const secret = req.session.tempTwoFactorSecret;

    if (!secret) {
      return res.status(400).json({ 
        message: 'No two-factor setup in progress',
        error: 'NO_SETUP_IN_PROGRESS'
      });
    }

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ 
        message: 'Invalid verification code',
        error: 'INVALID_CODE'
      });
    }

    // Save the secret and enable 2FA
    const user = await User.findById(req.userId);
    user.twoFactorSecret = secret;
    user.twoFactorEnabled = true;
    await user.save();

    // Clear temporary secret
    delete req.session.tempTwoFactorSecret;

    res.json({
      message: 'Two-factor authentication enabled successfully! 🔐',
      success: true
    });

  } catch (error) {
    console.error('Two-factor verification error:', error);
    res.status(500).json({ 
      message: 'Two-factor verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Disable Two-Factor Authentication
exports.disableTwoFactor = async (req, res) => {
  try {
    const { password, twoFactorCode } = req.body;
    
    const user = await User.findById(req.userId);
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ 
        message: 'Invalid password',
        error: 'INVALID_PASSWORD'
      });
    }

    // Verify 2FA code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: twoFactorCode,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ 
        message: 'Invalid two-factor code',
        error: 'INVALID_CODE'
      });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    res.json({
      message: 'Two-factor authentication disabled successfully',
      success: true
    });

  } catch (error) {
    console.error('Disable two-factor error:', error);
    res.status(500).json({ 
      message: 'Failed to disable two-factor authentication',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  register: exports.register,
  login: exports.login,
  logout: exports.logout,
  getCurrentUser: exports.getCurrentUser,
  refreshToken: exports.refreshToken,
  verifyEmail: exports.verifyEmail,
  forgotPassword: exports.forgotPassword,
  resetPassword: exports.resetPassword,
  setupTwoFactor: exports.setupTwoFactor,
  verifyTwoFactor: exports.verifyTwoFactor,
  disableTwoFactor: exports.disableTwoFactor
};