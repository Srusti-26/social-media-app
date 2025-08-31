// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const rateLimit = require('express-rate-limit');
const geoip = require('geoip-lite');
const useragent = require('useragent');

// Rate limiting for authentication attempts
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    message: 'Too many authentication attempts, please try again later.',
    error: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for sensitive operations
const strictAuthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 attempts for sensitive operations
  message: {
    message: 'Too many attempts for sensitive operation, please try again later.',
    error: 'STRICT_RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60
  }
});

// Get device fingerprint
const getDeviceFingerprint = (req) => {
  const agent = useragent.parse(req.headers['user-agent']);
  const ip = req.ip || req.connection.remoteAddress;
  const geo = geoip.lookup(ip);
  
  return {
    deviceId: require('crypto').createHash('md5').update(req.headers['user-agent'] + ip).digest('hex'),
    deviceName: `${agent.os.family} ${agent.os.major}`,
    deviceType: agent.device.family === 'Other' ? 'Desktop' : agent.device.family,
    browser: `${agent.family} ${agent.major}`,
    ipAddress: ip,
    location: geo ? `${geo.city}, ${geo.country}` : 'Unknown',
    userAgent: req.headers['user-agent'],
    timestamp: new Date()
  };
};

// Enhanced Authentication Middleware
const authenticate = async (req, res, next) => {
  try {
    let token = null;
    
    // Get token from multiple sources (header, cookie, query)
    if (req.header('Authorization')) {
      const authHeader = req.header('Authorization');
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    } else if (req.header('x-auth-token')) {
      token = req.header('x-auth-token');
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.query.token) {
      token = req.query.token; // For WebSocket connections
    }

    // Check if no token
    if (!token) {
      return res.status(401).json({ 
        message: 'Access denied. No authentication token provided.',
        error: 'NO_TOKEN',
        requiresAuth: true
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check token type
      if (decoded.type && decoded.type !== 'access') {
        return res.status(401).json({ 
          message: 'Invalid token type',
          error: 'INVALID_TOKEN_TYPE'
        });
      }

      // Get user from database with security checks
      const user = await User.findById(decoded.userId)
        .select('-password -emailVerificationToken -passwordResetToken -twoFactorSecret');

      if (!user) {
        return res.status(401).json({ 
          message: 'Token is valid but user not found',
          error: 'USER_NOT_FOUND'
        });
      }

      // Check if user account is active
      if (!user.isActive) {
        return res.status(403).json({ 
          message: 'Account is suspended or deactivated',
          error: 'ACCOUNT_SUSPENDED'
        });
      }

      // Get device fingerprint
      const deviceInfo = getDeviceFingerprint(req);
      
      // Check if device is recognized (optional security check)
      const isKnownDevice = user.devices.some(device => device.deviceId === deviceInfo.deviceId);
      
      // Update last active and device info
      user.lastActive = new Date();
      
      if (isKnownDevice) {
        // Update existing device
        const deviceIndex = user.devices.findIndex(device => device.deviceId === deviceInfo.deviceId);
        if (deviceIndex !== -1) {
          user.devices[deviceIndex].lastUsed = new Date();
          user.devices[deviceIndex].ipAddress = deviceInfo.ipAddress;
          user.devices[deviceIndex].location = deviceInfo.location;
        }
      }

      // Save user updates (but don't wait for it)
      user.save().catch(err => console.error('Error updating user activity:', err));

      // Add user info to request
      req.user = user;
      req.userId = user._id;
      req.deviceInfo = deviceInfo;
      req.isKnownDevice = isKnownDevice;
      
      next();

    } catch (tokenError) {
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token has expired',
          error: 'TOKEN_EXPIRED',
          expiredAt: tokenError.expiredAt
        });
      } else if (tokenError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          message: 'Invalid token format',
          error: 'INVALID_TOKEN'
        });
      } else {
        throw tokenError;
      }
    }

  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ 
      message: 'Authentication service error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Optional Authentication (for public endpoints that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    
    // Get token from multiple sources
    if (req.header('Authorization')) {
      const authHeader = req.header('Authorization');
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    } else if (req.header('x-auth-token')) {
      token = req.header('x-auth-token');
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      // No token provided, continue without authentication
      req.user = null;
      req.userId = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId)
        .select('-password -emailVerificationToken -passwordResetToken -twoFactorSecret');

      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id;
        
        // Update last active (don't wait)
        user.lastActive = new Date();
        user.save().catch(err => console.error('Error updating user activity:', err));
      }
    } catch (tokenError) {
      // Invalid token, but continue without authentication
      req.user = null;
      req.userId = null;
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Don't fail the request, just continue without auth
    req.user = null;
    req.userId = null;
    next();
  }
};

// Admin Authentication Middleware
const requireAdmin = async (req, res, next) => {
  try {
    // First run regular authentication
    await new Promise((resolve, reject) => {
      authenticate(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Check if user has admin privileges
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        message: 'Admin access required',
        error: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({ 
      message: 'Admin authentication error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Verified User Middleware (requires email verification)
const requireVerified = (req, res, next) => {
  if (!req.user.emailVerified) {
    return res.status(403).json({ 
      message: 'Email verification required',
      error: 'EMAIL_NOT_VERIFIED',
      action: 'verify_email'
    });
  }
  next();
};

// Premium User Middleware
const requirePremium = (req, res, next) => {
  if (req.user.subscription.type === 'free') {
    return res.status(403).json({ 
      message: 'Premium subscription required',
      error: 'PREMIUM_REQUIRED',
      action: 'upgrade_subscription'
    });
  }
  next();
};

// Two-Factor Authentication Middleware
const requireTwoFactor = (req, res, next) => {
  if (!req.user.twoFactorEnabled) {
    return res.status(403).json({ 
      message: 'Two-factor authentication required',
      error: 'TWO_FACTOR_REQUIRED',
      action: 'setup_2fa'
    });
  }
  next();
};

// Device Security Middleware
const requireKnownDevice = (req, res, next) => {
  if (!req.isKnownDevice) {
    return res.status(403).json({ 
      message: 'Unrecognized device. Please verify your identity.',
      error: 'UNKNOWN_DEVICE',
      deviceInfo: req.deviceInfo,
      action: 'verify_device'
    });
  }
  next();
};

// Permission-based Authorization
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return res.status(403).json({ 
        message: `Permission '${permission}' required`,
        error: 'INSUFFICIENT_PERMISSIONS',
        required: permission
      });
    }
    next();
  };
};

// Resource Owner Middleware (check if user owns the resource)
const requireOwnership = (resourceModel, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const Model = require(`../models/${resourceModel}`);
      
      const resource = await Model.findById(resourceId);
      if (!resource) {
        return res.status(404).json({ 
          message: `${resourceModel} not found`,
          error: 'RESOURCE_NOT_FOUND'
        });
      }

      // Check ownership (assuming the resource has a 'user' field)
      if (!resource.user.equals(req.userId)) {
        return res.status(403).json({ 
          message: 'You can only access your own resources',
          error: 'ACCESS_DENIED'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Ownership middleware error:', error);
      res.status(500).json({ 
        message: 'Authorization check failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
      });
    }
  };
};

// API Key Authentication (for external integrations)
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.header('X-API-Key');
    
    if (!apiKey) {
      return res.status(401).json({ 
        message: 'API key required',
        error: 'NO_API_KEY'
      });
    }

    // Find user by API key (you'd need to add apiKeys field to User model)
    const user = await User.findOne({ 'apiKeys.key': apiKey, 'apiKeys.isActive': true });
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid API key',
        error: 'INVALID_API_KEY'
      });
    }

    // Update API key usage
    const apiKeyObj = user.apiKeys.find(key => key.key === apiKey);
    apiKeyObj.lastUsed = new Date();
    apiKeyObj.usageCount += 1;
    
    await user.save();

    req.user = user;
    req.userId = user._id;
    req.apiKey = apiKeyObj;
    
    next();
  } catch (error) {
    console.error('API key auth error:', error);
    res.status(500).json({ 
      message: 'API authentication error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Security Headers Middleware
const securityHeaders = (req, res, next) => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

// Request Logging Middleware
const logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.userId || 'anonymous',
      timestamp: new Date().toISOString()
    };
    
    console.log(`[${logData.timestamp}] ${logData.method} ${logData.url} - ${logData.status} - ${logData.duration} - ${logData.ip} - ${logData.userId}`);
  });
  
  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  requireAdmin,
  requireVerified,
  requirePremium,
  requireTwoFactor,
  requireKnownDevice,
  requirePermission,
  requireOwnership,
  authenticateApiKey,
  authRateLimit,
  strictAuthRateLimit,
  securityHeaders,
  logRequest
};