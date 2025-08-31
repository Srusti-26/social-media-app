// middleware/rateLimitMiddleware.js
const rateLimit = require('express-rate-limit');

// Create post rate limit
const createPost = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 posts per 15 minutes
  message: {
    message: 'Too many posts created, please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

// Like post rate limit
const likePost = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 likes per minute
  message: {
    message: 'Too many likes, please slow down.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

// Comment rate limit
const createComment = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 comments per 5 minutes
  message: {
    message: 'Too many comments, please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

// Share post rate limit
const sharePost = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15, // 15 shares per 10 minutes
  message: {
    message: 'Too many shares, please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

// Follow user rate limit
const followUser = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 follows per hour
  message: {
    message: 'Too many follow requests, please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

// Update profile rate limit
const updateProfile = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 updates per 15 minutes
  message: {
    message: 'Too many profile updates, please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

// Upload media rate limit
const uploadMedia = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 uploads per 10 minutes
  message: {
    message: 'Too many uploads, please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

// Additional rate limits for postRoutes
const getPosts = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { message: 'Too many requests', error: 'RATE_LIMIT_EXCEEDED' }
});

const updatePost = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 updates per hour
  message: { message: 'Too many updates', error: 'RATE_LIMIT_EXCEEDED' }
});

const deletePost = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 deletes per hour
  message: { message: 'Too many deletes', error: 'RATE_LIMIT_EXCEEDED' }
});

const bookmarkPost = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 bookmarks per minute
  message: { message: 'Too many bookmarks', error: 'RATE_LIMIT_EXCEEDED' }
});

const reportPost = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 reports per hour
  message: { message: 'Too many reports', error: 'RATE_LIMIT_EXCEEDED' }
});

const voteOnPoll = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 votes per minute
  message: { message: 'Too many votes', error: 'RATE_LIMIT_EXCEEDED' }
});

const repost = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // 15 reposts per hour
  message: { message: 'Too many reposts', error: 'RATE_LIMIT_EXCEEDED' }
});

const pinPost = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 1 day
  max: 3, // 3 pins per day
  message: { message: 'Too many pins', error: 'RATE_LIMIT_EXCEEDED' }
});

const createDraft = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 drafts per hour
  message: { message: 'Too many drafts', error: 'RATE_LIMIT_EXCEEDED' }
});

const getComments = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { message: 'Too many requests', error: 'RATE_LIMIT_EXCEEDED' }
});

const updateComment = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 updates per hour
  message: { message: 'Too many updates', error: 'RATE_LIMIT_EXCEEDED' }
});

const deleteComment = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 deletes per hour
  message: { message: 'Too many deletes', error: 'RATE_LIMIT_EXCEEDED' }
});

const likeComment = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 likes per minute
  message: { message: 'Too many likes', error: 'RATE_LIMIT_EXCEEDED' }
});

const reportComment = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 reports per hour
  message: { message: 'Too many reports', error: 'RATE_LIMIT_EXCEEDED' }
});

const bulkDelete = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1, // 1 bulk operation per hour
  message: { message: 'Too many bulk operations', error: 'RATE_LIMIT_EXCEEDED' }
});

const bulkUpdate = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 bulk operations per hour
  message: { message: 'Too many bulk operations', error: 'RATE_LIMIT_EXCEEDED' }
});

const search = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 searches per hour
  message: { message: 'Too many searches', error: 'RATE_LIMIT_EXCEEDED' }
});

const exportData = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 1 day
  max: 1, // 1 export per day
  message: { message: 'Too many exports', error: 'RATE_LIMIT_EXCEEDED' }
});

// Missing rate limits for profile routes
const searchUsers = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 searches per hour
  message: { message: 'Too many searches', error: 'RATE_LIMIT_EXCEEDED' }
});

const uploadAvatar = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 uploads per hour
  message: { message: 'Too many uploads', error: 'RATE_LIMIT_EXCEEDED' }
});

const uploadCover = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 uploads per hour
  message: { message: 'Too many uploads', error: 'RATE_LIMIT_EXCEEDED' }
});

const updateStatus = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 updates per hour
  message: { message: 'Too many updates', error: 'RATE_LIMIT_EXCEEDED' }
});

const blockUser = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 blocks per hour
  message: { message: 'Too many blocks', error: 'RATE_LIMIT_EXCEEDED' }
});

const muteUser = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 mutes per hour
  message: { message: 'Too many mutes', error: 'RATE_LIMIT_EXCEEDED' }
});

const friendRequest = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 requests per hour
  message: { message: 'Too many friend requests', error: 'RATE_LIMIT_EXCEEDED' }
});

const respondFriendRequest = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 responses per hour
  message: { message: 'Too many responses', error: 'RATE_LIMIT_EXCEEDED' }
});

const removeFriend = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 removals per hour
  message: { message: 'Too many removals', error: 'RATE_LIMIT_EXCEEDED' }
});

const closeFriends = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 updates per hour
  message: { message: 'Too many updates', error: 'RATE_LIMIT_EXCEEDED' }
});

const getConnections = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour
  message: { message: 'Too many requests', error: 'RATE_LIMIT_EXCEEDED' }
});

const updateSettings = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 updates per hour
  message: { message: 'Too many updates', error: 'RATE_LIMIT_EXCEEDED' }
});

const verificationRequest = rateLimit({
  windowMs: 7 * 24 * 60 * 60 * 1000, // 1 week
  max: 1, // 1 request per week
  message: { message: 'Too many verification requests', error: 'RATE_LIMIT_EXCEEDED' }
});

const reportUser = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 reports per hour
  message: { message: 'Too many reports', error: 'RATE_LIMIT_EXCEEDED' }
});

const appealRequest = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 1 day
  max: 3, // 3 appeals per day
  message: { message: 'Too many appeals', error: 'RATE_LIMIT_EXCEEDED' }
});

const dailyReward = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 1 day
  max: 1, // 1 claim per day
  message: { message: 'Daily reward already claimed', error: 'RATE_LIMIT_EXCEEDED' }
});

const backupData = rateLimit({
  windowMs: 7 * 24 * 60 * 60 * 1000, // 1 week
  max: 3, // 3 backups per week
  message: { message: 'Too many backups', error: 'RATE_LIMIT_EXCEEDED' }
});

const downloadData = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 1 day
  max: 2, // 2 downloads per day
  message: { message: 'Too many downloads', error: 'RATE_LIMIT_EXCEEDED' }
});

const accountAction = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1, // 1 action per hour
  message: { message: 'Too many account actions', error: 'RATE_LIMIT_EXCEEDED' }
});

const deleteRequest = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 1 day
  max: 1, // 1 request per day
  message: { message: 'Too many delete requests', error: 'RATE_LIMIT_EXCEEDED' }
});

const pokeUser = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 pokes per hour
  message: { message: 'Too many pokes', error: 'RATE_LIMIT_EXCEEDED' }
});

const sendGift = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 1 day
  max: 5, // 5 gifts per day
  message: { message: 'Too many gifts', error: 'RATE_LIMIT_EXCEEDED' }
});

const endorseSkills = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 1 day
  max: 20, // 20 endorsements per day
  message: { message: 'Too many endorsements', error: 'RATE_LIMIT_EXCEEDED' }
});

const rateUser = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 1 day
  max: 10, // 10 ratings per day
  message: { message: 'Too many ratings', error: 'RATE_LIMIT_EXCEEDED' }
});

const bulkFollow = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1, // 1 bulk operation per hour
  message: { message: 'Too many bulk operations', error: 'RATE_LIMIT_EXCEEDED' }
});

const bulkUnfollow = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1, // 1 bulk operation per hour
  message: { message: 'Too many bulk operations', error: 'RATE_LIMIT_EXCEEDED' }
});

const bulkBlock = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 1 day
  max: 1, // 1 bulk operation per day
  message: { message: 'Too many bulk operations', error: 'RATE_LIMIT_EXCEEDED' }
});

const connectSocial = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 1 day
  max: 10, // 10 connections per day
  message: { message: 'Too many connections', error: 'RATE_LIMIT_EXCEEDED' }
});

const syncPlatform = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 1 day
  max: 5, // 5 syncs per day
  message: { message: 'Too many syncs', error: 'RATE_LIMIT_EXCEEDED' }
});

module.exports = {
  createPost,
  likePost,
  createComment,
  sharePost,
  followUser,
  updateProfile,
  uploadMedia,
  getPosts,
  updatePost,
  deletePost,
  bookmarkPost,
  reportPost,
  voteOnPoll,
  repost,
  pinPost,
  createDraft,
  getComments,
  updateComment,
  deleteComment,
  likeComment,
  reportComment,
  bulkDelete,
  bulkUpdate,
  search,
  exportData,
  searchUsers,
  uploadAvatar,
  uploadCover,
  updateStatus,
  blockUser,
  muteUser,
  friendRequest,
  respondFriendRequest,
  removeFriend,
  closeFriends,
  getConnections,
  updateSettings,
  verificationRequest,
  reportUser,
  appealRequest,
  dailyReward,
  backupData,
  downloadData,
  accountAction,
  deleteRequest,
  pokeUser,
  sendGift,
  endorseSkills,
  rateUser,
  bulkFollow,
  bulkUnfollow,
  bulkBlock,
  connectSocial,
  syncPlatform
};