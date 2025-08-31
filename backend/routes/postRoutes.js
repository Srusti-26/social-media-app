// routes/postRoutes.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const commentController = require('../controllers/commentController');
const authMiddleware = require('../middleware/authMiddleware');
const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware');
const rateLimitMiddleware = require('../middleware/rateLimitMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');
const cacheMiddleware = require('../middleware/cacheMiddleware');

// Public routes (no auth required)
router.get('/trending', 
  cacheMiddleware(300), // Cache for 5 minutes
  postController.getTrendingPosts
);

router.get('/public', 
  optionalAuthMiddleware, // Auth optional for personalization
  cacheMiddleware(60), // Cache for 1 minute
  postController.getPublicPosts
);

router.get('/hashtag/:tag',
  optionalAuthMiddleware,
  validationMiddleware.validateHashtag,
  cacheMiddleware(180), // Cache for 3 minutes
  postController.getPostsByHashtag
);

router.get('/location/:location',
  optionalAuthMiddleware,
  validationMiddleware.validateLocation,
  cacheMiddleware(300), // Cache for 5 minutes
  postController.getPostsByLocation
);

// Single post view (public but with optional auth for interactions)
router.get('/:id', 
  optionalAuthMiddleware,
  validationMiddleware.validateObjectId('id'),
  postController.getPostById
);

// Apply auth middleware to protected routes
router.use(authMiddleware.authenticate);

// ===== CORE POST ROUTES =====
router.post('/', 
  rateLimitMiddleware.createPost, // 10 posts per hour
  validationMiddleware.validateCreatePost,
  postController.createPost
);

router.get('/', 
  rateLimitMiddleware.getPosts, // 100 requests per minute
  validationMiddleware.validateGetPosts,
  postController.getPosts
);

router.put('/:id', 
  rateLimitMiddleware.updatePost, // 5 updates per hour
  validationMiddleware.validateObjectId('id'),
  validationMiddleware.validateUpdatePost,
  postController.updatePost
);

router.delete('/:id', 
  rateLimitMiddleware.deletePost, // 10 deletes per hour
  validationMiddleware.validateObjectId('id'),
  postController.deletePost
);

// ===== POST INTERACTION ROUTES =====
router.post('/:id/like', 
  rateLimitMiddleware.likePost, // 60 likes per minute
  validationMiddleware.validateObjectId('id'),
  postController.likePost
);

router.post('/:id/bookmark', 
  rateLimitMiddleware.bookmarkPost, // 30 bookmarks per minute
  validationMiddleware.validateObjectId('id'),
  postController.bookmarkPost
);

router.post('/:id/share', 
  rateLimitMiddleware.sharePost, // 20 shares per hour
  validationMiddleware.validateObjectId('id'),
  validationMiddleware.validateSharePost,
  postController.sharePost
);

router.post('/:id/report', 
  rateLimitMiddleware.reportPost, // 5 reports per hour
  validationMiddleware.validateObjectId('id'),
  validationMiddleware.validateReportPost,
  postController.reportPost
);

// ===== POLL ROUTES =====
router.post('/:id/vote', 
  rateLimitMiddleware.voteOnPoll, // 30 votes per minute
  validationMiddleware.validateObjectId('id'),
  validationMiddleware.validatePollVote,
  postController.voteOnPoll
);

router.get('/:id/poll-results', 
  validationMiddleware.validateObjectId('id'),
  postController.getPollResults
);

// ===== ADVANCED POST FEATURES =====
router.post('/:id/repost', 
  rateLimitMiddleware.repost, // 15 reposts per hour
  validationMiddleware.validateObjectId('id'),
  validationMiddleware.validateRepost,
  postController.repostPost
);

router.get('/:id/analytics', 
  validationMiddleware.validateObjectId('id'),
  postController.getPostAnalytics
);

router.get('/:id/engagement', 
  validationMiddleware.validateObjectId('id'),
  postController.getPostEngagement
);

router.post('/:id/pin', 
  rateLimitMiddleware.pinPost, // 3 pins per day
  validationMiddleware.validateObjectId('id'),
  postController.pinPost
);

router.delete('/:id/pin', 
  validationMiddleware.validateObjectId('id'),
  postController.unpinPost
);

// ===== SCHEDULED POSTS =====
router.get('/scheduled/list', 
  postController.getScheduledPosts
);

router.put('/scheduled/:id', 
  validationMiddleware.validateObjectId('id'),
  validationMiddleware.validateUpdateScheduledPost,
  postController.updateScheduledPost
);

router.delete('/scheduled/:id', 
  validationMiddleware.validateObjectId('id'),
  postController.cancelScheduledPost
);

// ===== DRAFT POSTS =====
router.post('/drafts', 
  rateLimitMiddleware.createDraft, // 20 drafts per hour
  validationMiddleware.validateCreateDraft,
  postController.createDraft
);

router.get('/drafts', 
  postController.getDrafts
);

router.put('/drafts/:id', 
  validationMiddleware.validateObjectId('id'),
  validationMiddleware.validateUpdateDraft,
  postController.updateDraft
);

router.delete('/drafts/:id', 
  validationMiddleware.validateObjectId('id'),
  postController.deleteDraft
);

router.post('/drafts/:id/publish', 
  validationMiddleware.validateObjectId('id'),
  postController.publishDraft
);

// ===== COMMENT ROUTES =====
router.post('/:postId/comments', 
  rateLimitMiddleware.createComment, // 30 comments per hour
  validationMiddleware.validateObjectId('postId'),
  validationMiddleware.validateCreateComment,
  commentController.createComment
);

router.get('/:postId/comments', 
  rateLimitMiddleware.getComments, // 100 requests per minute
  validationMiddleware.validateObjectId('postId'),
  validationMiddleware.validateGetComments,
  commentController.getComments
);

router.get('/comments/:commentId', 
  validationMiddleware.validateObjectId('commentId'),
  commentController.getComment
);

router.put('/comments/:commentId', 
  rateLimitMiddleware.updateComment, // 10 updates per hour
  validationMiddleware.validateObjectId('commentId'),
  validationMiddleware.validateUpdateComment,
  commentController.updateComment
);

router.delete('/comments/:commentId', 
  rateLimitMiddleware.deleteComment, // 20 deletes per hour
  validationMiddleware.validateObjectId('commentId'),
  commentController.deleteComment
);

router.post('/comments/:commentId/like', 
  rateLimitMiddleware.likeComment, // 60 likes per minute
  validationMiddleware.validateObjectId('commentId'),
  commentController.likeComment
);

router.post('/comments/:commentId/report', 
  rateLimitMiddleware.reportComment, // 5 reports per hour
  validationMiddleware.validateObjectId('commentId'),
  validationMiddleware.validateReportComment,
  commentController.reportComment
);

router.get('/comments/:commentId/analytics', 
  validationMiddleware.validateObjectId('commentId'),
  commentController.getCommentAnalytics
);

// ===== BULK OPERATIONS =====
router.post('/bulk/delete', 
  rateLimitMiddleware.bulkDelete, // 1 bulk operation per hour
  validationMiddleware.validateBulkDelete,
  postController.bulkDeletePosts
);

router.post('/bulk/update-visibility', 
  rateLimitMiddleware.bulkUpdate, // 3 bulk operations per hour
  validationMiddleware.validateBulkUpdateVisibility,
  postController.bulkUpdateVisibility
);

// ===== SEARCH & DISCOVERY =====
router.get('/search/advanced', 
  rateLimitMiddleware.search, // 50 searches per hour
  validationMiddleware.validateAdvancedSearch,
  postController.advancedSearch
);

router.get('/discover/for-you', 
  cacheMiddleware(300), // Cache for 5 minutes
  postController.getPersonalizedFeed
);

router.get('/discover/similar/:id', 
  validationMiddleware.validateObjectId('id'),
  cacheMiddleware(600), // Cache for 10 minutes
  postController.getSimilarPosts
);

// ===== USER-SPECIFIC POST ROUTES =====
router.get('/user/:userId', 
  validationMiddleware.validateObjectId('userId'),
  validationMiddleware.validateGetUserPosts,
  postController.getUserPosts
);

router.get('/user/:userId/liked', 
  validationMiddleware.validateObjectId('userId'),
  postController.getUserLikedPosts
);

router.get('/user/:userId/bookmarked', 
  validationMiddleware.validateObjectId('userId'),
  postController.getUserBookmarkedPosts
);

// ===== FEED ROUTES =====
router.get('/feed/following', 
  cacheMiddleware(60), // Cache for 1 minute
  postController.getFollowingFeed
);

router.get('/feed/friends', 
  cacheMiddleware(60), // Cache for 1 minute
  postController.getFriendsFeed
);

router.get('/feed/local', 
  validationMiddleware.validateLocationFeed,
  cacheMiddleware(180), // Cache for 3 minutes
  postController.getLocalFeed
);

// ===== ADMIN ROUTES =====
router.use('/admin', authMiddleware.requireAdmin);

router.get('/admin/flagged', 
  postController.getFlaggedPosts
);

router.post('/admin/:id/approve', 
  validationMiddleware.validateObjectId('id'),
  postController.approvePost
);

router.post('/admin/:id/reject', 
  validationMiddleware.validateObjectId('id'),
  validationMiddleware.validateRejectPost,
  postController.rejectPost
);

router.get('/admin/analytics/overview', 
  postController.getAdminAnalytics
);

// ===== EXPORT ROUTES =====
router.get('/export/my-posts', 
  rateLimitMiddleware.exportData, // 1 export per day
  postController.exportUserPosts
);

router.get('/export/my-interactions', 
  rateLimitMiddleware.exportData, // 1 export per day
  postController.exportUserInteractions
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Post routes error:', error);
  
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
  
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
  });
});

module.exports = router;