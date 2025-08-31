// models/Comment.js
const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  // Basic Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  
  // Hierarchical Comments (Replies)
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  replyLevel: {
    type: Number,
    default: 0,
    max: 5 // Limit nesting to 5 levels
  },
  
  // Enhanced Engagement
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Reactions System (like posts)
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry', 'helpful', 'insightful'],
      default: 'like'
    },
    reactedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Media Support
  media: [{
    type: {
      type: String,
      enum: ['image', 'gif', 'sticker', 'emoji'],
      default: 'image'
    },
    url: {
      type: String,
      required: true
    },
    thumbnail: String,
    alt: String,
    width: Number,
    height: Number
  }],
  
  // Content Enhancement
  mentions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    position: Number
  }],
  hashtags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Comment Features
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],
  
  // Pinning System
  isPinned: {
    type: Boolean,
    default: false
  },
  pinnedAt: Date,
  pinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Content Status
  status: {
    type: String,
    enum: ['active', 'hidden', 'deleted', 'pending_review'],
    default: 'active'
  },
  
  // Moderation & Safety
  isReported: {
    type: Boolean,
    default: false
  },
  reports: [{
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['spam', 'harassment', 'inappropriate', 'hate_speech', 'misinformation', 'other']
    },
    description: String,
    reportedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending'
    }
  }],
  
  // Verification & Quality
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  
  // Quality Metrics
  quality: {
    helpfulVotes: {
      type: Number,
      default: 0
    },
    unhelpfulVotes: {
      type: Number,
      default: 0
    },
    qualityScore: {
      type: Number,
      default: 0,
      min: -100,
      max: 100
    },
    isHighQuality: {
      type: Boolean,
      default: false
    }
  },
  
  // Analytics
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    uniqueViews: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      viewedAt: {
        type: Date,
        default: Date.now
      }
    }],
    engagement: {
      type: Number,
      default: 0
    },
    shareCount: {
      type: Number,
      default: 0
    }
  },
  
  // AI Analysis
  aiAnalysis: {
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      default: 'neutral'
    },
    sentimentScore: {
      type: Number,
      min: -1,
      max: 1,
      default: 0
    },
    toxicity: {
      score: {
        type: Number,
        min: 0,
        max: 1,
        default: 0
      },
      isToxic: {
        type: Boolean,
        default: false
      }
    },
    language: {
      type: String,
      default: 'en'
    },
    topics: [String],
    readingTime: {
      type: Number,
      default: 0
    }
  },
  
  // Voting System (for Q&A style comments)
  votes: {
    upvotes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      votedAt: {
        type: Date,
        default: Date.now
      }
    }],
    downvotes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      votedAt: {
        type: Date,
        default: Date.now
      }
    }],
    score: {
      type: Number,
      default: 0
    }
  },
  
  // Special Comment Types
  commentType: {
    type: String,
    enum: ['regular', 'question', 'answer', 'suggestion', 'correction', 'appreciation', 'critique'],
    default: 'regular'
  },
  
  // Badges & Recognition
  badges: [{
    type: {
      type: String,
      enum: ['helpful', 'insightful', 'funny', 'first', 'popular', 'expert', 'verified_info']
    },
    awardedAt: {
      type: Date,
      default: Date.now
    },
    awardedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Translation Support
  translations: [{
    language: String,
    content: String,
    translatedAt: {
      type: Date,
      default: Date.now
    },
    translationService: {
      type: String,
      default: 'google'
    }
  }],
  
  // Bookmarking
  bookmarkedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    bookmarkedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Location (for location-based comments)
  location: {
    name: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // Scheduling (for delayed comments)
  scheduledFor: Date,
  isScheduled: {
    type: Boolean,
    default: false
  },
  
  // External Links
  links: [{
    url: String,
    title: String,
    description: String,
    image: String,
    isVerified: {
      type: Boolean,
      default: false
    }
  }],
  
  // Comment Threading
  thread: {
    isThreadStarter: {
      type: Boolean,
      default: false
    },
    threadId: String,
    position: Number
  },
  
  // Notification Settings
  notifications: {
    notifyOnReply: {
      type: Boolean,
      default: true
    },
    notifyOnLike: {
      type: Boolean,
      default: true
    },
    notifyOnMention: {
      type: Boolean,
      default: true
    }
  },
  
  // Device Information
  deviceInfo: {
    platform: String,
    browser: String,
    ipAddress: String,
    userAgent: String
  },
  
  // Collaboration Features
  collaborativeEdit: {
    isCollaborative: {
      type: Boolean,
      default: false
    },
    editors: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      permissions: {
        type: String,
        enum: ['edit', 'suggest', 'view'],
        default: 'suggest'
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for Performance
CommentSchema.index({ post: 1, createdAt: -1 });
CommentSchema.index({ user: 1, createdAt: -1 });
CommentSchema.index({ parentComment: 1 });
CommentSchema.index({ 'likes.user': 1 });
CommentSchema.index({ status: 1 });
CommentSchema.index({ isPinned: -1, createdAt: -1 });
CommentSchema.index({ 'quality.qualityScore': -1 });
CommentSchema.index({ 'votes.score': -1 });
CommentSchema.index({ hashtags: 1 });

// Virtual Fields
CommentSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

CommentSchema.virtual('replyCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

CommentSchema.virtual('reactionCount').get(function() {
  return this.reactions ? this.reactions.length : 0;
});

CommentSchema.virtual('totalEngagement').get(function() {
  return this.likeCount + this.replyCount + this.reactionCount;
});

CommentSchema.virtual('voteScore').get(function() {
  const upvotes = this.votes.upvotes ? this.votes.upvotes.length : 0;
  const downvotes = this.votes.downvotes ? this.votes.downvotes.length : 0;
  return upvotes - downvotes;
});

CommentSchema.virtual('isRecent').get(function() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return this.createdAt > oneHourAgo;
});

CommentSchema.virtual('readingTime').get(function() {
  const wordsPerMinute = 200;
  const wordCount = this.content.split(' ').length;
  return Math.ceil((wordCount / wordsPerMinute) * 60); // in seconds
});

CommentSchema.virtual('isTopLevel').get(function() {
  return !this.parentComment;
});

// Pre-save Middleware
CommentSchema.pre('save', function(next) {
  // Extract hashtags
  const hashtagRegex = /#(\w+)/g;
  const hashtags = [];
  let match;
  
  while ((match = hashtagRegex.exec(this.content)) !== null) {
    hashtags.push(match[1].toLowerCase());
  }
  
  this.hashtags = [...new Set(hashtags)];
  
  // Extract mentions
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let mentionMatch;
  
  while ((mentionMatch = mentionRegex.exec(this.content)) !== null) {
    mentions.push({
      username: mentionMatch[1],
      position: mentionMatch.index
    });
  }
  
  // Calculate reading time
  const wordsPerMinute = 200;
  const wordCount = this.content.split(' ').length;
  this.aiAnalysis.readingTime = Math.ceil((wordCount / wordsPerMinute) * 60);
  
  // Update quality score
  this.calculateQualityScore();
  
  next();
});

// Instance Methods
CommentSchema.methods.addLike = async function(userId) {
  const existingLike = this.likes.find(like => like.user.equals(userId));
  
  if (!existingLike) {
    this.likes.push({ user: userId });
    this.analytics.engagement += 1;
    await this.save();
    
    // Award experience to comment author
    const User = mongoose.model('User');
    const author = await User.findById(this.user);
    if (author) {
      await author.addExperience(2);
    }
    
    return true;
  }
  return false;
};

CommentSchema.methods.removeLike = async function(userId) {
  const likeIndex = this.likes.findIndex(like => like.user.equals(userId));
  
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
    this.analytics.engagement -= 1;
    await this.save();
    return true;
  }
  return false;
};

CommentSchema.methods.addReaction = async function(userId, reactionType) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(reaction => !reaction.user.equals(userId));
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    type: reactionType
  });
  
  this.analytics.engagement += 1;
  await this.save();
};

CommentSchema.methods.addReply = async function(replyData) {
  const Comment = mongoose.model('Comment');
  
  const reply = new Comment({
    ...replyData,
    parentComment: this._id,
    post: this.post,
    replyLevel: Math.min(this.replyLevel + 1, 5)
  });
  
  await reply.save();
  
  // Add reply to parent's replies array
  this.replies.push(reply._id);
  await this.save();
  
  return reply;
};

CommentSchema.methods.upvote = async function(userId) {
  // Remove from downvotes if exists
  this.votes.downvotes = this.votes.downvotes.filter(vote => !vote.user.equals(userId));
  
  // Add to upvotes if not already there
  const existingUpvote = this.votes.upvotes.find(vote => vote.user.equals(userId));
  if (!existingUpvote) {
    this.votes.upvotes.push({ user: userId });
  }
  
  this.votes.score = this.votes.upvotes.length - this.votes.downvotes.length;
  await this.save();
};

CommentSchema.methods.downvote = async function(userId) {
  // Remove from upvotes if exists
  this.votes.upvotes = this.votes.upvotes.filter(vote => !vote.user.equals(userId));
  
  // Add to downvotes if not already there
  const existingDownvote = this.votes.downvotes.find(vote => vote.user.equals(userId));
  if (!existingDownvote) {
    this.votes.downvotes.push({ user: userId });
  }
  
  this.votes.score = this.votes.upvotes.length - this.votes.downvotes.length;
  await this.save();
};

CommentSchema.methods.calculateQualityScore = function() {
  let score = 0;
  
  // Positive factors
  score += this.likeCount * 2;
  score += this.votes.upvotes.length * 3;
  score += this.quality.helpfulVotes * 5;
  score += this.replyCount * 1;
  
  // Negative factors
  score -= this.votes.downvotes.length * 2;
  score -= this.quality.unhelpfulVotes * 3;
  score -= this.reports.length * 10;
  
  // Content quality factors
  if (this.content.length > 50) score += 2; // Substantial content
  if (this.hashtags.length > 0) score += 1; // Uses hashtags
  if (this.links.length > 0) score += 2; // Includes links
  
  this.quality.qualityScore = Math.max(-100, Math.min(100, score));
  this.quality.isHighQuality = this.quality.qualityScore > 20;
  
  return this.quality.qualityScore;
};

CommentSchema.methods.pin = async function(userId) {
  this.isPinned = true;
  this.pinnedAt = new Date();
  this.pinnedBy = userId;
  await this.save();
};

CommentSchema.methods.unpin = async function() {
  this.isPinned = false;
  this.pinnedAt = null;
  this.pinnedBy = null;
  await this.save();
};

CommentSchema.methods.markAsHelpful = async function(userId) {
  this.quality.helpfulVotes += 1;
  
  // Award badge if reaches threshold
  if (this.quality.helpfulVotes >= 5 && !this.badges.some(b => b.type === 'helpful')) {
    this.badges.push({
      type: 'helpful',
      awardedBy: userId
    });
  }
  
  await this.save();
};

CommentSchema.methods.addView = async function(userId) {
  // Check if user already viewed this comment
  const existingView = this.analytics.uniqueViews.find(view => view.user.equals(userId));
  
  if (!existingView) {
    this.analytics.uniqueViews.push({ user: userId });
    this.analytics.views += 1;
    await this.save();
  }
};

CommentSchema.methods.translate = async function(targetLanguage) {
  try {
    // Using Google Translate API (free tier available)
    // You would implement actual translation service here
    const translatedContent = await this.translateText(this.content, targetLanguage);
    
    this.translations.push({
      language: targetLanguage,
      content: translatedContent,
      translationService: 'google'
    });
    
    await this.save();
    return translatedContent;
  } catch (error) {
    console.error('Translation error:', error);
    return null;
  }
};

CommentSchema.methods.translateText = async function(text, targetLang) {
  // Placeholder for translation service integration
  // You can integrate with Google Translate, Microsoft Translator, etc.
  return `[Translated to ${targetLang}] ${text}`;
};

CommentSchema.methods.bookmark = async function(userId) {
  const existingBookmark = this.bookmarkedBy.find(bookmark => bookmark.user.equals(userId));
  
  if (!existingBookmark) {
    this.bookmarkedBy.push({ user: userId });
    await this.save();
    return true;
  }
  return false;
};

CommentSchema.methods.removeBookmark = async function(userId) {
  this.bookmarkedBy = this.bookmarkedBy.filter(bookmark => !bookmark.user.equals(userId));
  await this.save();
};

// Static Methods
CommentSchema.statics.getTopComments = async function(postId, limit = 10) {
  return await this.find({
    post: postId,
    status: 'active',
    parentComment: null // Only top-level comments
  })
  .populate('user', 'username displayName profilePicture isVerified')
  .sort({ 'quality.qualityScore': -1, 'votes.score': -1, likeCount: -1 })
  .limit(limit);
};

CommentSchema.statics.getRecentComments = async function(postId, limit = 10) {
  return await this.find({
    post: postId,
    status: 'active',
    parentComment: null
  })
  .populate('user', 'username displayName profilePicture isVerified')
  .sort({ createdAt: -1 })
  .limit(limit);
};

CommentSchema.statics.searchComments = async function(query, postId = null, limit = 20) {
  const searchRegex = new RegExp(query, 'i');
  const searchCriteria = {
    content: searchRegex,
    status: 'active'
  };
  
  if (postId) {
    searchCriteria.post = postId;
  }
  
  return await this.find(searchCriteria)
  .populate('user', 'username displayName profilePicture isVerified')
  .populate('post', 'content user')
  .sort({ 'quality.qualityScore': -1, createdAt: -1 })
  .limit(limit);
};

CommentSchema.statics.getCommentThread = async function(commentId, maxDepth = 5) {
  const comment = await this.findById(commentId)
    .populate('user', 'username displayName profilePicture isVerified')
    .populate({
      path: 'replies',
      populate: {
        path: 'user',
        select: 'username displayName profilePicture isVerified'
      }
    });
  
  if (!comment) return null;
  
  // Recursively populate replies up to maxDepth
  const populateReplies = async (comment, currentDepth = 0) => {
    if (currentDepth >= maxDepth) return comment;
    
    for (let i = 0; i < comment.replies.length; i++) {
      comment.replies[i] = await populateReplies(comment.replies[i], currentDepth + 1);
    }
    
    return comment;
  };
  
  return await populateReplies(comment);
};

CommentSchema.statics.getMostEngaging = async function(timeframe = '24h', limit = 10) {
  const timeMap = {
    '1h': 1,
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30
  };
  
  const hoursAgo = timeMap[timeframe] || 24;
  const startDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  
  return await this.find({
    createdAt: { $gte: startDate },
    status: 'active'
  })
  .populate('user', 'username displayName profilePicture isVerified')
  .sort({ 'analytics.engagement': -1, 'quality.qualityScore': -1 })
  .limit(limit);
};

module.exports = mongoose.model('Comment', CommentSchema);