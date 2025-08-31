// routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware');
const rateLimitMiddleware = require('../middleware/rateLimitMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');

// ===== PUBLIC PROFILE ROUTES =====
// Get user profile (public with optional auth for personalization)
router.get('/:userId', 
  optionalAuthMiddleware,
  validationMiddleware.validateObjectId('userId'),
  cacheMiddleware(300), // Cache for 5 minutes
  profileController.getUserProfile
);

// Get user's public posts
router.get('/:userId/posts',
  optionalAuthMiddleware,
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateGetUserPosts,
  cacheMiddleware(180), // Cache for 3 minutes
  profileController.getUserPosts
);

// Get user's media gallery
router.get('/:userId/media',
  optionalAuthMiddleware,
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateGetUserContent,
  cacheMiddleware(240), // Cache for 4 minutes
  profileController.getUserMediaPosts
);

// Search users (public)
router.get('/search/users',
  rateLimitMiddleware.searchUsers, // 50 searches per hour
  validationMiddleware.validateUserSearch,
  cacheMiddleware(120), // Cache for 2 minutes
  userController.searchUsers
);

// Get trending users
router.get('/discover/trending',
  cacheMiddleware(600), // Cache for 10 minutes
  userController.getTrendingUsers
);

// Get suggested users (requires optional auth)
router.get('/discover/suggestions',
  optionalAuthMiddleware,
  cacheMiddleware(300), // Cache for 5 minutes
  userController.getSuggestedUsers
);

// Get users by location
router.get('/discover/nearby',
  optionalAuthMiddleware,
  validationMiddleware.validateLocationSearch,
  cacheMiddleware(300), // Cache for 5 minutes
  userController.getNearbyUsers
);

// Get user achievements (public)
router.get('/:userId/achievements',
  validationMiddleware.validateObjectId('userId'),
  cacheMiddleware(600), // Cache for 10 minutes
  userController.getUserAchievements
);

// Get user badges (public)
router.get('/:userId/badges',
  validationMiddleware.validateObjectId('userId'),
  cacheMiddleware(600), // Cache for 10 minutes
  userController.getUserBadges
);

// ===== PROTECTED ROUTES =====
router.use(authMiddleware.authenticate);

// ===== PROFILE MANAGEMENT =====
// Update profile
router.put('/:userId', 
  rateLimitMiddleware.updateProfile, // 10 updates per hour
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateUpdateProfile,
  profileController.updateProfile
);

// Upload profile picture
router.post('/:userId/avatar',
  rateLimitMiddleware.uploadAvatar, // 5 uploads per hour
  validationMiddleware.validateObjectId('userId'),
  uploadMiddleware.single('avatar'),
  profileController.uploadProfilePicture
);

// Upload cover photo
router.post('/:userId/cover',
  rateLimitMiddleware.uploadCover, // 3 uploads per hour
  validationMiddleware.validateObjectId('userId'),
  uploadMiddleware.single('cover'),
  profileController.uploadCoverPhoto
);

// Delete profile picture
router.delete('/:userId/avatar',
  validationMiddleware.validateObjectId('userId'),
  profileController.deleteProfilePicture
);

// Delete cover photo
router.delete('/:userId/cover',
  validationMiddleware.validateObjectId('userId'),
  profileController.deleteCoverPhoto
);

// Update profile status/bio
router.put('/:userId/status',
  rateLimitMiddleware.updateStatus, // 20 updates per hour
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateStatusUpdate,
  profileController.updateStatus
);

// ===== SOCIAL CONNECTIONS =====
// Follow/unfollow user
router.post('/:userId/follow', 
  rateLimitMiddleware.followUser, // 60 follows per hour
  validationMiddleware.validateObjectId('userId'),
  profileController.followUser
);

// Block/unblock user
router.post('/:userId/block',
  rateLimitMiddleware.blockUser, // 20 blocks per hour
  validationMiddleware.validateObjectId('userId'),
  profileController.blockUser
);

// Mute/unmute user
router.post('/:userId/mute',
  rateLimitMiddleware.muteUser, // 30 mutes per hour
  validationMiddleware.validateObjectId('userId'),
  userController.muteUser
);

// Send friend request
router.post('/:userId/friend-request',
  rateLimitMiddleware.friendRequest, // 30 requests per hour
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateFriendRequest,
  userController.sendFriendRequest
);

// Accept/decline friend request
router.post('/friend-requests/:requestId/:action(accept|decline)',
  rateLimitMiddleware.respondFriendRequest, // 100 responses per hour
  validationMiddleware.validateObjectId('requestId'),
  validationMiddleware.validateFriendRequestAction,
  userController.respondToFriendRequest
);

// Cancel sent friend request
router.delete('/friend-requests/:requestId',
  validationMiddleware.validateObjectId('requestId'),
  userController.cancelFriendRequest
);

// Remove friend
router.delete('/:userId/friend',
  rateLimitMiddleware.removeFriend, // 20 removals per hour
  validationMiddleware.validateObjectId('userId'),
  userController.removeFriend
);

// Add to close friends
router.post('/:userId/close-friends',
  rateLimitMiddleware.closeFriends, // 50 updates per hour
  validationMiddleware.validateObjectId('userId'),
  userController.addToCloseFriends
);

// ===== FOLLOWERS & FOLLOWING =====
// Get user's followers
router.get('/:userId/followers',
  rateLimitMiddleware.getConnections, // 100 requests per hour
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateGetConnections,
  profileController.getUserFollowers
);

// Get user's following
router.get('/:userId/following',
  rateLimitMiddleware.getConnections, // 100 requests per hour
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateGetConnections,
  profileController.getUserFollowing
);

// Get user's friends
router.get('/:userId/friends',
  rateLimitMiddleware.getConnections, // 100 requests per hour
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateGetConnections,
  userController.getUserFriends
);

// Get mutual connections
router.get('/:userId/mutual',
  validationMiddleware.validateObjectId('userId'),
  userController.getMutualConnections
);

// Get friend requests (received)
router.get('/friend-requests/received',
  validationMiddleware.validateGetFriendRequests,
  userController.getReceivedFriendRequests
);

// Get friend requests (sent)
router.get('/friend-requests/sent',
  validationMiddleware.validateGetFriendRequests,
  userController.getSentFriendRequests
);

// ===== PRIVACY & SETTINGS =====
// Update privacy settings
router.put('/:userId/privacy',
  rateLimitMiddleware.updateSettings, // 20 updates per hour
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validatePrivacySettings,
  userController.updatePrivacySettings
);

// Update notification preferences
router.put('/:userId/notifications',
  rateLimitMiddleware.updateSettings, // 20 updates per hour
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateNotificationSettings,
  userController.updateNotificationSettings
);

// Update account preferences
router.put('/:userId/preferences',
  rateLimitMiddleware.updateSettings, // 20 updates per hour
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateAccountPreferences,
  userController.updateAccountPreferences
);

// Get blocked users
router.get('/:userId/blocked',
  validationMiddleware.validateObjectId('userId'),
  userController.getBlockedUsers
);

// Get muted users
router.get('/:userId/muted',
  validationMiddleware.validateObjectId('userId'),
  userController.getMutedUsers
);

// ===== PROFILE ANALYTICS =====
// Get profile analytics (own profile only)
router.get('/:userId/analytics',
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateAnalyticsRequest,
  profileController.getProfileAnalytics
);

// Get profile insights
router.get('/:userId/insights',
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateInsightsRequest,
  profileController.getProfileInsights
);

// Get profile visitors
router.get('/:userId/visitors',
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateGetVisitors,
  userController.getProfileVisitors
);

// Get engagement metrics
router.get('/:userId/engagement',
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateEngagementRequest,
  profileController.getEngagementMetrics
);

// Get follower growth
router.get('/:userId/growth',
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateGrowthRequest,
  profileController.getFollowerGrowth
);

// ===== CONTENT MANAGEMENT =====
// Get user's liked posts
router.get('/:userId/liked',
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateGetUserContent,
  profileController.getUserLikedPosts
);

// Get user's bookmarked posts
router.get('/:userId/bookmarks',
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateGetUserContent,
  profileController.getUserBookmarkedPosts
);

// Get user's shared posts
router.get('/:userId/shared',
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateGetUserContent,
  profileController.getUserSharedPosts
);

// Get user's tagged posts
router.get('/:userId/tagged',
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateGetUserContent,
  profileController.getUserTaggedPosts
);

// Get user's collections
router.get('/:userId/collections',
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateGetCollections,
  userController.getUserCollections
);

// ===== ACTIVITY & HISTORY =====
// Get user activity feed
router.get('/:userId/activity',
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateGetActivity,
  userController.getUserActivity
);

// Get login history
router.get('/:userId/login-history',
  validationMiddleware.validateObjectId('userId'),
  userController.getLoginHistory
);

// Get interaction history
router.get('/:userId/interactions',
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateGetInteractions,
  userController.getInteractionHistory
);

// ===== VERIFICATION & REPORTING =====
// Request verification
router.post('/:userId/verify',
  rateLimitMiddleware.verificationRequest, // 1 request per week
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateVerificationRequest,
  userController.requestVerification
);

// Report user
router.post('/:userId/report',
  rateLimitMiddleware.reportUser, // 5 reports per hour
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateReportUser,
  userController.reportUser
);

// Appeal account action
router.post('/:userId/appeal',
  rateLimitMiddleware.appealRequest, // 3 appeals per day
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateAppealRequest,
  userController.submitAppeal
);

// ===== GAMIFICATION =====
// Get leaderboard position
router.get('/:userId/leaderboard',
  validationMiddleware.validateObjectId('userId'),
  cacheMiddleware(300), // Cache for 5 minutes
  userController.getUserLeaderboardPosition
);

// Get user level progress
router.get('/:userId/level-progress',
  validationMiddleware.validateObjectId('userId'),
  userController.getUserLevelProgress
);

// Claim daily reward
router.post('/:userId/daily-reward',
  rateLimitMiddleware.dailyReward, // 1 claim per day
  validationMiddleware.validateObjectId('userId'),
  userController.claimDailyReward
);

// Get streak information
router.get('/:userId/streaks',
  validationMiddleware.validateObjectId('userId'),
  userController.getUserStreaks
);

// ===== DATA EXPORT & BACKUP =====
// Export profile data
router.get('/:userId/export',
  rateLimitMiddleware.exportData, // 1 export per day
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateExportRequest,
  userController.exportProfileData
);

// Backup profile
router.post('/:userId/backup',
  rateLimitMiddleware.backupData, // 3 backups per week
  validationMiddleware.validateObjectId('userId'),
  userController.backupProfile
);

// Download user data
router.get('/:userId/download',
  rateLimitMiddleware.downloadData, // 2 downloads per day
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateDownloadRequest,
  userController.downloadUserData
);

// ===== ACCOUNT MANAGEMENT =====
// Deactivate account
router.post('/:userId/deactivate',
  rateLimitMiddleware.accountAction, // 1 action per hour
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateDeactivateAccount,
  userController.deactivateAccount
);

// Reactivate account
router.post('/:userId/reactivate',
  rateLimitMiddleware.accountAction, // 1 action per hour
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateReactivateAccount,
  userController.reactivateAccount
);

// Delete account request
router.post('/:userId/delete-request',
  rateLimitMiddleware.deleteRequest, // 1 request per day
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateDeleteRequest,
  userController.requestAccountDeletion
);

// Cancel delete request
router.delete('/:userId/delete-request',
  validationMiddleware.validateObjectId('userId'),
  userController.cancelAccountDeletion
);

// ===== SOCIAL FEATURES =====
// Poke user
router.post('/:userId/poke',
  rateLimitMiddleware.pokeUser, // 10 pokes per hour
  validationMiddleware.validateObjectId('userId'),
  userController.pokeUser
);

// Send gift/badge
router.post('/:userId/gift',
  rateLimitMiddleware.sendGift, // 5 gifts per day
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateSendGift,
  userController.sendGift
);

// Endorse skills
router.post('/:userId/endorse',
  rateLimitMiddleware.endorseSkills, // 20 endorsements per day
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateEndorseSkills,
  userController.endorseSkills
);

// Rate user (for marketplace/services)
router.post('/:userId/rate',
  rateLimitMiddleware.rateUser, // 10 ratings per day
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateRateUser,
  userController.rateUser
);

// ===== ADMIN ROUTES =====
router.use('/admin', authMiddleware.requireAdmin);

// Admin: Get user details
router.get('/admin/:userId/details',
  validationMiddleware.validateObjectId('userId'),
  userController.getAdminUserDetails
);

// Admin: Suspend user
router.post('/admin/:userId/suspend',
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateSuspendUser,
  userController.suspendUser
);

// Admin: Unsuspend user
router.post('/admin/:userId/unsuspend',
  validationMiddleware.validateObjectId('userId'),
  userController.unsuspendUser
);

// Admin: Verify user
router.post('/admin/:userId/verify',
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateAdminVerifyUser,
  userController.verifyUser
);

// Admin: Remove verification
router.delete('/admin/:userId/verify',
  validationMiddleware.validateObjectId('userId'),
  userController.removeVerification
);

// Admin: Force delete user
router.delete('/admin/:userId/force-delete',
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateForceDelete,
  userController.forceDeleteUser
);

// Admin: Get user reports
router.get('/admin/:userId/reports',
  validationMiddleware.validateObjectId('userId'),
  userController.getUserReports
);

// Admin: Resolve user report
router.post('/admin/reports/:reportId/resolve',
  validationMiddleware.validateObjectId('reportId'),
  validationMiddleware.validateResolveReport,
  userController.resolveUserReport
);

// Admin: Get user analytics
router.get('/admin/:userId/analytics',
  validationMiddleware.validateObjectId('userId'),
  userController.getAdminUserAnalytics
);

// Admin: Impersonate user (for support)
router.post('/admin/:userId/impersonate',
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateImpersonateUser,
  userController.impersonateUser
);

// ===== BULK OPERATIONS =====
// Bulk follow users
router.post('/bulk/follow',
  rateLimitMiddleware.bulkFollow, // 1 bulk operation per hour
  validationMiddleware.validateBulkFollow,
  userController.bulkFollowUsers
);

// Bulk unfollow users
router.post('/bulk/unfollow',
  rateLimitMiddleware.bulkUnfollow, // 1 bulk operation per hour
  validationMiddleware.validateBulkUnfollow,
  userController.bulkUnfollowUsers
);

// Bulk block users
router.post('/bulk/block',
  rateLimitMiddleware.bulkBlock, // 1 bulk operation per day
  validationMiddleware.validateBulkBlock,
  userController.bulkBlockUsers
);

// ===== WEBHOOKS & INTEGRATIONS =====
// Connect social media account
router.post('/:userId/connect/:platform',
  rateLimitMiddleware.connectSocial, // 10 connections per day
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateSocialConnect,
  userController.connectSocialAccount
);

// Disconnect social media account
router.delete('/:userId/connect/:platform',
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateSocialDisconnect,
  userController.disconnectSocialAccount
);

// Sync with external platform
router.post('/:userId/sync/:platform',
  rateLimitMiddleware.syncPlatform, // 5 syncs per day
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validatePlatformSync,
  userController.syncWithPlatform
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Profile routes error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed',
      errors: Object.values(error.errors).map(err => err.message),
      error: 'VALIDATION_ERROR'
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid ID format',
      error: 'INVALID_ID'
    });
  }

  if (error.name === 'MulterError') {
    return res.status(400).json({
      message: 'File upload error',
      error: 'UPLOAD_ERROR',
      details: error.message
    });
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: 'File too large',
      error: 'FILE_TOO_LARGE'
    });
  }
  
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
  });
});

module.exports = router;