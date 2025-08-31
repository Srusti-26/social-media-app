// middleware/validationMiddleware.js
const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Helper function to handle validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array(),
      error: 'VALIDATION_ERROR'
    });
  }
  next();
};

// Validate ObjectId
const validateObjectId = (field) => {
  return param(field).custom((value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error('Invalid ID format');
    }
    return true;
  });
};

// Post validation
const validateCreatePost = [
  body('content').notEmpty().withMessage('Content is required').isLength({ max: 2000 }).withMessage('Content too long'),
  handleValidationErrors
];

const validateUpdatePost = [
  body('content').optional().isLength({ max: 2000 }).withMessage('Content too long'),
  handleValidationErrors
];

// Comment validation
const validateCreateComment = [
  body('content').notEmpty().withMessage('Comment content is required').isLength({ max: 500 }).withMessage('Comment too long'),
  handleValidationErrors
];

// Profile validation
const validateUpdateProfile = [
  body('firstName').optional().isLength({ max: 30 }).withMessage('First name too long'),
  body('lastName').optional().isLength({ max: 30 }).withMessage('Last name too long'),
  body('bio').optional().isLength({ max: 160 }).withMessage('Bio too long'),
  body('location').optional().isLength({ max: 100 }).withMessage('Location too long'),
  body('website').optional().isURL().withMessage('Invalid website URL'),
  handleValidationErrors
];

// Query validation
const validateGetPosts = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  handleValidationErrors
];

// Additional validation functions
const validateHashtag = [
  param('tag').notEmpty().withMessage('Hashtag is required'),
  handleValidationErrors
];

const validateLocation = [
  param('location').notEmpty().withMessage('Location is required'),
  handleValidationErrors
];

const validateSharePost = [
  body('message').optional().isLength({ max: 280 }).withMessage('Share message too long'),
  handleValidationErrors
];

const validateReportPost = [
  body('reason').notEmpty().withMessage('Report reason is required'),
  handleValidationErrors
];

const validatePollVote = [
  body('optionId').notEmpty().withMessage('Poll option is required'),
  handleValidationErrors
];

const validateRepost = [
  body('comment').optional().isLength({ max: 280 }).withMessage('Repost comment too long'),
  handleValidationErrors
];

const validateUpdateScheduledPost = [
  body('scheduledFor').optional().isISO8601().withMessage('Invalid date format'),
  handleValidationErrors
];

const validateCreateDraft = [
  body('content').notEmpty().withMessage('Draft content is required'),
  handleValidationErrors
];

const validateUpdateDraft = [
  body('content').optional().isLength({ max: 2000 }).withMessage('Content too long'),
  handleValidationErrors
];

const validateGetComments = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
  handleValidationErrors
];

const validateUpdateComment = [
  body('content').notEmpty().withMessage('Comment content is required'),
  handleValidationErrors
];

const validateReportComment = [
  body('reason').notEmpty().withMessage('Report reason is required'),
  handleValidationErrors
];

const validateBulkDelete = [
  body('postIds').isArray({ min: 1 }).withMessage('Post IDs array is required'),
  handleValidationErrors
];

const validateBulkUpdateVisibility = [
  body('postIds').isArray({ min: 1 }).withMessage('Post IDs array is required'),
  body('visibility').isIn(['public', 'private', 'followers']).withMessage('Invalid visibility'),
  handleValidationErrors
];

const validateAdvancedSearch = [
  query('q').optional().isLength({ min: 1 }).withMessage('Search query required'),
  handleValidationErrors
];

const validateGetUserPosts = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  handleValidationErrors
];

const validateLocationFeed = [
  query('lat').optional().isFloat().withMessage('Invalid latitude'),
  query('lng').optional().isFloat().withMessage('Invalid longitude'),
  handleValidationErrors
];

const validateRejectPost = [
  body('reason').notEmpty().withMessage('Rejection reason is required'),
  handleValidationErrors
];

// Missing validation functions for profile routes
const validateGetUserContent = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  handleValidationErrors
];

const validateUserSearch = [
  query('q').notEmpty().withMessage('Search query is required'),
  handleValidationErrors
];

const validateLocationSearch = [
  query('lat').optional().isFloat().withMessage('Invalid latitude'),
  query('lng').optional().isFloat().withMessage('Invalid longitude'),
  handleValidationErrors
];

const validateStatusUpdate = [
  body('status').notEmpty().withMessage('Status is required'),
  handleValidationErrors
];

const validateFriendRequest = [
  body('message').optional().isLength({ max: 200 }).withMessage('Message too long'),
  handleValidationErrors
];

const validateFriendRequestAction = [
  param('action').isIn(['accept', 'decline']).withMessage('Invalid action'),
  handleValidationErrors
];

const validateGetConnections = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  handleValidationErrors
];

const validateGetFriendRequests = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  handleValidationErrors
];

const validatePrivacySettings = [
  body('profileVisibility').optional().isIn(['public', 'private']).withMessage('Invalid visibility'),
  handleValidationErrors
];

const validateNotificationSettings = [
  body('emailNotifications').optional().isBoolean().withMessage('Invalid setting'),
  handleValidationErrors
];

const validateAccountPreferences = [
  body('language').optional().isLength({ min: 2, max: 5 }).withMessage('Invalid language'),
  handleValidationErrors
];

const validateAnalyticsRequest = [
  query('timeframe').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid timeframe'),
  handleValidationErrors
];

const validateInsightsRequest = [
  query('type').optional().isIn(['engagement', 'growth', 'demographics']).withMessage('Invalid type'),
  handleValidationErrors
];

const validateGetVisitors = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  handleValidationErrors
];

const validateEngagementRequest = [
  query('period').optional().isIn(['day', 'week', 'month']).withMessage('Invalid period'),
  handleValidationErrors
];

const validateGrowthRequest = [
  query('period').optional().isIn(['week', 'month', 'year']).withMessage('Invalid period'),
  handleValidationErrors
];

const validateGetCollections = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  handleValidationErrors
];

const validateGetActivity = [
  query('type').optional().isIn(['posts', 'likes', 'comments']).withMessage('Invalid type'),
  handleValidationErrors
];

const validateGetInteractions = [
  query('type').optional().isIn(['likes', 'comments', 'shares']).withMessage('Invalid type'),
  handleValidationErrors
];

const validateVerificationRequest = [
  body('reason').notEmpty().withMessage('Verification reason is required'),
  handleValidationErrors
];

const validateReportUser = [
  body('reason').notEmpty().withMessage('Report reason is required'),
  handleValidationErrors
];

const validateAppealRequest = [
  body('message').notEmpty().withMessage('Appeal message is required'),
  handleValidationErrors
];

const validateExportRequest = [
  body('format').optional().isIn(['json', 'csv']).withMessage('Invalid format'),
  handleValidationErrors
];

const validateDownloadRequest = [
  query('type').optional().isIn(['profile', 'posts', 'all']).withMessage('Invalid type'),
  handleValidationErrors
];

const validateDeactivateAccount = [
  body('reason').notEmpty().withMessage('Deactivation reason is required'),
  handleValidationErrors
];

const validateReactivateAccount = [
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const validateDeleteRequest = [
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const validateSendGift = [
  body('giftType').notEmpty().withMessage('Gift type is required'),
  handleValidationErrors
];

const validateEndorseSkills = [
  body('skills').isArray({ min: 1 }).withMessage('Skills array is required'),
  handleValidationErrors
];

const validateRateUser = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  handleValidationErrors
];

const validateSuspendUser = [
  body('reason').notEmpty().withMessage('Suspension reason is required'),
  handleValidationErrors
];

const validateAdminVerifyUser = [
  body('verified').isBoolean().withMessage('Verified must be boolean'),
  handleValidationErrors
];

const validateForceDelete = [
  body('reason').notEmpty().withMessage('Deletion reason is required'),
  handleValidationErrors
];

const validateResolveReport = [
  body('action').isIn(['dismiss', 'warn', 'suspend']).withMessage('Invalid action'),
  handleValidationErrors
];

const validateImpersonateUser = [
  body('reason').notEmpty().withMessage('Impersonation reason is required'),
  handleValidationErrors
];

const validateBulkFollow = [
  body('userIds').isArray({ min: 1 }).withMessage('User IDs array is required'),
  handleValidationErrors
];

const validateBulkUnfollow = [
  body('userIds').isArray({ min: 1 }).withMessage('User IDs array is required'),
  handleValidationErrors
];

const validateBulkBlock = [
  body('userIds').isArray({ min: 1 }).withMessage('User IDs array is required'),
  handleValidationErrors
];

const validateSocialConnect = [
  body('accessToken').notEmpty().withMessage('Access token is required'),
  handleValidationErrors
];

const validateSocialDisconnect = [
  param('platform').isIn(['twitter', 'facebook', 'instagram']).withMessage('Invalid platform'),
  handleValidationErrors
];

const validatePlatformSync = [
  body('syncType').isIn(['posts', 'followers', 'all']).withMessage('Invalid sync type'),
  handleValidationErrors
];

module.exports = {
  validateObjectId,
  validateCreatePost,
  validateUpdatePost,
  validateCreateComment,
  validateUpdateProfile,
  validateGetPosts,
  validateHashtag,
  validateLocation,
  validateSharePost,
  validateReportPost,
  validatePollVote,
  validateRepost,
  validateUpdateScheduledPost,
  validateCreateDraft,
  validateUpdateDraft,
  validateGetComments,
  validateUpdateComment,
  validateReportComment,
  validateBulkDelete,
  validateBulkUpdateVisibility,
  validateAdvancedSearch,
  validateGetUserPosts,
  validateLocationFeed,
  validateRejectPost,
  validateGetUserContent,
  validateUserSearch,
  validateLocationSearch,
  validateStatusUpdate,
  validateFriendRequest,
  validateFriendRequestAction,
  validateGetConnections,
  validateGetFriendRequests,
  validatePrivacySettings,
  validateNotificationSettings,
  validateAccountPreferences,
  validateAnalyticsRequest,
  validateInsightsRequest,
  validateGetVisitors,
  validateEngagementRequest,
  validateGrowthRequest,
  validateGetCollections,
  validateGetActivity,
  validateGetInteractions,
  validateVerificationRequest,
  validateReportUser,
  validateAppealRequest,
  validateExportRequest,
  validateDownloadRequest,
  validateDeactivateAccount,
  validateReactivateAccount,
  validateDeleteRequest,
  validateSendGift,
  validateEndorseSkills,
  validateRateUser,
  validateSuspendUser,
  validateAdminVerifyUser,
  validateForceDelete,
  validateResolveReport,
  validateImpersonateUser,
  validateBulkFollow,
  validateBulkUnfollow,
  validateBulkBlock,
  validateSocialConnect,
  validateSocialDisconnect,
  validatePlatformSync,
  handleValidationErrors
};