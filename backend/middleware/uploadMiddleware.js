// middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Create multer instance
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter
});

// Profile picture upload middleware
const uploadProfilePicture = upload.single('profilePicture');

// Cover photo upload middleware
const uploadCoverPhoto = upload.single('coverPhoto');

// Multiple images upload middleware
const uploadMultipleImages = upload.array('images', 5);

// Single image upload middleware
const uploadSingleImage = upload.single('image');

module.exports = {
  uploadProfilePicture,
  uploadCoverPhoto,
  uploadMultipleImages,
  uploadSingleImage,
  upload,
  single: upload.single.bind(upload),
  array: upload.array.bind(upload),
  fields: upload.fields.bind(upload)
};