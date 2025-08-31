// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { 
  authenticate, 
  optionalAuth, 
  requireAdmin, 
  requireVerified, 
  requireTwoFactor,
  requireKnownDevice,
  authRateLimit, 
  strictAuthRateLimit,
  securityHeaders 
} = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');

// Apply security headers to all routes
router.use(securityHeaders);

// Validation middleware
const validateRegistration = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const validatePasswordReset = [
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character')
];

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().reduce((acc, error) => {
        acc[error.path] = error.msg;
        return acc;
      }, {}),
      success: false
    });
  }
  next();
};

// 🎯 PUBLIC ROUTES (No Authentication Required)

// Register route with enhanced validation and rate limiting
router.post('/register', 
  authRateLimit,
  validateRegistration,
  handleValidationErrors,
  authController.register
);

// Login route with rate limiting
router.post('/login', 
  authRateLimit,
  validateLogin,
  handleValidationErrors,
  authController.login
);

// Refresh token route
router.post('/refresh-token', 
  authRateLimit,
  authController.refreshToken
);

// Email verification route
router.get('/verify-email/:token', 
  authRateLimit,
  authController.verifyEmail
);

// Forgot password route with strict rate limiting
router.post('/forgot-password', 
  strictAuthRateLimit,
  body('email').isEmail().normalizeEmail(),
  handleValidationErrors,
  authController.forgotPassword
);

// Reset password route with validation
router.post('/reset-password', 
  strictAuthRateLimit,
  body('token').notEmpty().withMessage('Reset token is required'),
  validatePasswordReset,
  handleValidationErrors,
  authController.resetPassword
);

// Check username availability
router.get('/check-username/:username', 
  authRateLimit,
  async (req, res) => {
    try {
      const { username } = req.params;
      const User = require('../models/User');
      
      const existingUser = await User.findOne({ username });
      
      res.json({
        available: !existingUser,
        username,
        suggestions: existingUser ? [
          `${username}1`,
          `${username}_official`,
          `${username}2024`
        ] : []
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'Error checking username availability',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      });
    }
  }
);

// Check email availability
router.get('/check-email/:email', 
  authRateLimit,
  async (req, res) => {
    try {
      const { email } = req.params;
      const User = require('../models/User');
      
      const existingUser = await User.findOne({ email });
      
      res.json({
        available: !existingUser,
        email
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'Error checking email availability',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      });
    }
  }
);

// 🔐 PROTECTED ROUTES (Authentication Required)

// Get current user route with enhanced data
router.get('/me', 
  authenticate, 
  authController.getCurrentUser
);

// Update user profile
router.put('/profile', 
  authenticate,
  requireVerified,
  [
    body('firstName').optional().isLength({ min: 1, max: 50 }),
    body('lastName').optional().isLength({ min: 1, max: 50 }),
    body('bio').optional().isLength({ max: 500 }),
    body('website').optional().isURL(),
    body('location').optional().isLength({ max: 100 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const updates = req.body;
      const user = await req.user.updateOne(updates);
      
      res.json({
        message: 'Profile updated successfully! ✨',
        user: user.getPublicProfile(),
        success: true
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'Profile update failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      });
    }
  }
);

// Change password
router.put('/change-password', 
  authenticate,
  requireVerified,
  strictAuthRateLimit,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must meet security requirements')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Verify current password
      const isCurrentPasswordValid = await req.user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          message: 'Current password is incorrect',
          errors: { currentPassword: 'Invalid current password' }
        });
      }
      
      // Update password
      req.user.password = newPassword;
      await req.user.save();
      
      res.json({
        message: 'Password changed successfully! 🔐',
        success: true
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'Password change failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      });
    }
  }
);

// Logout route
router.post('/logout', 
  authenticate, 
  authController.logout
);

// Get user devices
router.get('/devices', 
  authenticate,
  async (req, res) => {
    try {
      const devices = req.user.devices.map(device => ({
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        browser: device.browser,
        location: device.location,
        lastUsed: device.lastUsed,
        isCurrent: device.deviceId === req.deviceInfo.deviceId
      }));
      
      res.json({
        devices,
        currentDevice: req.deviceInfo,
        totalDevices: devices.length
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'Failed to fetch devices',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      });
    }
  }
);

// Remove device
router.delete('/devices/:deviceId', 
  authenticate,
  async (req, res) => {
    try {
      const { deviceId } = req.params;
      
      req.user.devices = req.user.devices.filter(device => device.deviceId !== deviceId);
      await req.user.save();
      
      res.json({
        message: 'Device removed successfully! 📱',
        success: true
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'Failed to remove device',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      });
    }
  }
);

// 🔐 TWO-FACTOR AUTHENTICATION ROUTES

// Setup 2FA
router.post('/2fa/setup', 
  authenticate,
  requireVerified,
  strictAuthRateLimit,
  authController.setupTwoFactor
);

// Verify 2FA setup
router.post('/2fa/verify', 
  authenticate,
  requireVerified,
  strictAuthRateLimit,
  body('token').isLength({ min: 6, max: 6 }).withMessage('2FA token must be 6 digits'),
  handleValidationErrors,
  authController.verifyTwoFactor
);

// Disable 2FA
router.post('/2fa/disable', 
  authenticate,
  requireVerified,
  strictAuthRateLimit,
  [
    body('password').notEmpty().withMessage('Password is required'),
    body('twoFactorCode').isLength({ min: 6, max: 6 }).withMessage('2FA code must be 6 digits')
  ],
  handleValidationErrors,
  authController.disableTwoFactor
);

// 🎯 ADMIN ROUTES

// Get all users (admin only)
router.get('/admin/users', 
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, search, status } = req.query;
      const User = require('../models/User');
      
      const query = {};
      if (search) {
        query.$or = [
          { username: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
          { firstName: new RegExp(search, 'i') },
          { lastName: new RegExp(search, 'i') }
        ];
      }
      if (status) {
        query.isActive = status === 'active';
      }
      
      const users = await User.find(query)
        .select('-password -emailVerificationToken -passwordResetToken -twoFactorSecret')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });
      
      const total = await User.countDocuments(query);
      
      res.json({
        users,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'Failed to fetch users',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      });
    }
  }
);

// Suspend user (admin only)
router.put('/admin/users/:userId/suspend', 
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const User = require('../models/User');
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      user.isActive = false;
      user.suspensionReason = reason;
      user.suspendedAt = new Date();
      user.suspendedBy = req.userId;
      await user.save();
      
      res.json({
        message: 'User suspended successfully',
        success: true
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'Failed to suspend user',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      });
    }
  }
);

// 📊 ANALYTICS ROUTES

// Get auth statistics
router.get('/stats', 
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const User = require('../models/User');
      
      const stats = await User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
            verifiedUsers: { $sum: { $cond: ['$emailVerified', 1, 0] } },
            premiumUsers: { $sum: { $cond: [{ $ne: ['$subscription.type', 'free'] }, 1, 0] } },
            twoFactorEnabled: { $sum: { $cond: ['$twoFactorEnabled', 1, 0] } }
          }
        }
      ]);
      
      const recentSignups = await User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });
      
      res.json({
        ...stats[0],
        recentSignups,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'Failed to fetch statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      });
    }
  }
);

module.exports = router;