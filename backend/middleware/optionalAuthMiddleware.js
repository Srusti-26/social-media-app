// middleware/optionalAuthMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.accessToken;

    if (!token) {
      // No token provided, continue without authentication
      req.userId = null;
      req.user = null;
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      // Invalid user, continue without authentication
      req.userId = null;
      req.user = null;
      return next();
    }

    // Set user info
    req.userId = user._id;
    req.user = user;
    next();
  } catch (error) {
    // Token invalid, continue without authentication
    req.userId = null;
    req.user = null;
    next();
  }
};

module.exports = optionalAuth;