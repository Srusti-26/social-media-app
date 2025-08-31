// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const profileRoutes = require('./routes/profileRoutes');
// const userRoutes = require('./routes/userRoutes');
// const commentRoutes = require('./routes/commentRoutes');

// Import middleware
const { logRequest, securityHeaders } = require('./middleware/authMiddleware');

// Initialize Express app
const app = express();
const server = createServer(app);

// Initialize Socket.IO for real-time features
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 🛡️ SECURITY MIDDLEWARE

// Helmet for security headers - relaxed for frontend compatibility
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "https://images.unsplash.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
      connectSrc: ["'self'", "ws:", "wss:", "https:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Custom security headers
app.use(securityHeaders);

// Rate limiting
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    message: 'Too many requests from this IP, please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalRateLimit);

// 🔧 GENERAL MIDDLEWARE

// Compression
app.use(compression());

// CORS configuration - allow all origins for development
const corsOptions = {
  origin: true, // Allow all origins for development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'X-API-Key']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Session configuration for 2FA and other features
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/social-media-app',
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(logRequest);

// Trust proxy (for accurate IP addresses behind reverse proxy)
app.set('trust proxy', 1);

// 🎯 ROUTES

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API status route
app.get('/api/status', (req, res) => {
  res.json({
    message: '🌊 SocialWave API is running smoothly!',
    status: 'active',
    features: [
      '🔐 Advanced Authentication',
      '👥 User Management',
      '📱 Real-time Features',
      '🛡️ Security First',
      '📊 Analytics Ready',
      '🎮 Gamification',
      '🌍 Multi-language Support'
    ],
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      posts: '/api/posts',
      comments: '/api/comments'
    },
    timestamp: new Date().toISOString()
  });
});

// Main API routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/profiles', profileRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/comments', commentRoutes);

// 🔌 SOCKET.IO REAL-TIME FEATURES

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    const jwt = require('jsonwebtoken');
    const User = require('./models/User');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return next(new Error('User not found or inactive'));
    }
    
    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User ${socket.user.username} connected`);
  
  // Join user to their personal room
  socket.join(`user_${socket.userId}`);
  
  // Update user online status
  socket.user.isOnline = true;
  socket.user.lastActive = new Date();
  socket.user.save().catch(err => console.error('Error updating online status:', err));
  
  // Handle real-time features
  socket.on('join_post', (postId) => {
    socket.join(`post_${postId}`);
  });
  
  socket.on('leave_post', (postId) => {
    socket.leave(`post_${postId}`);
  });
  
  socket.on('typing_start', (data) => {
    socket.to(`post_${data.postId}`).emit('user_typing', {
      userId: socket.userId,
      username: socket.user.username
    });
  });
  
  socket.on('typing_stop', (data) => {
    socket.to(`post_${data.postId}`).emit('user_stopped_typing', {
      userId: socket.userId
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 User ${socket.user.username} disconnected`);
    
    // Update user offline status (with delay to handle quick reconnects)
    setTimeout(async () => {
      try {
        const User = require('./models/User');
        const user = await User.findById(socket.userId);
        if (user) {
          user.isOnline = false;
          user.lastActive = new Date();
          await user.save();
        }
      } catch (error) {
        console.error('Error updating offline status:', error);
      }
    }, 30000); // 30 seconds delay
  });
});

// Make io available to routes
app.set('io', io);

// 🚫 ERROR HANDLING

// Serve frontend for all non-API routes (SPA support)
app.get('*', (req, res) => {
  // If it's an API route that doesn't exist, return JSON error
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      message: 'API endpoint not found 🔍',
      error: 'NOT_FOUND',
      availableEndpoints: {
        health: '/health',
        apiStatus: '/api/status',
        auth: '/api/auth',
        posts: '/api/posts',
        profiles: '/api/profiles'
      }
    });
  }
  
  // For all other routes, serve the frontend
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('🚨 Global Error:', error);
  
  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      message: 'Validation Error',
      errors,
      error: 'VALIDATION_ERROR'
    });
  }
  
  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      message: `${field} already exists`,
      error: 'DUPLICATE_FIELD'
    });
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token',
      error: 'INVALID_TOKEN'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expired',
      error: 'TOKEN_EXPIRED'
    });
  }
  
  // CORS error
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      message: 'CORS policy violation',
      error: 'CORS_ERROR'
    });
  }
  
  // Default error
  res.status(error.status || 500).json({
    message: error.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? error.stack : 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
});

// 🗄️ DATABASE CONNECTION

const connectDB = async () => {
  try {
    // Try Atlas connection first
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    
    console.log(`🗄️  MongoDB Connected: ${conn.connection.host}`);
    
    // Database event listeners
    mongoose.connection.on('error', (err) => {
      console.error('🚨 MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('🔌 MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔌 MongoDB reconnected');
    });
    
  } catch (error) {
    console.error('🚨 MongoDB Atlas connection failed:', error.message);
    
    // Try local MongoDB as fallback
    try {
      console.log('🔄 Attempting to connect to local MongoDB...');
      const localConn = await mongoose.connect('mongodb://localhost:27017/social-media-app', {
        serverSelectionTimeoutMS: 5000,
      });
      
      console.log(`🗄️  Local MongoDB Connected: ${localConn.connection.host}`);
      console.log('⚠️  Using local MongoDB for development. Please fix Atlas connection for production.');
      
    } catch (localError) {
      console.error('🚨 Local MongoDB connection also failed:', localError.message);
      console.log('\n📋 To fix this issue:');
      console.log('1. For Atlas: Add your IP to MongoDB Atlas Network Access');
      console.log('2. For Local: Install and start MongoDB locally');
      console.log('3. Or update your MONGODB_URI in .env file\n');
      process.exit(1);
    }
  }
};

// 🚀 SERVER STARTUP

const PORT = process.env.PORT || 5006;

const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Start the server
    server.listen(PORT, () => {
      console.log(`
🌊 ================================
   SocialWave API Server Started
🌊 ================================
🚀 Server running on port ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔗 API URL: http://localhost:${PORT}
📊 Health Check: http://localhost:${PORT}/health
📚 API Status: http://localhost:${PORT}/api/status
🔌 Socket.IO: Enabled
🛡️  Security: Enhanced
⚡ Features: All systems go!
🌊 ================================
      `);
    });
    
  } catch (error) {
    console.error('🚨 Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('🔌 HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('🗄️  MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('🔌 HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('🗄️  MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Start the server
startServer();

module.exports = { app, server, io };