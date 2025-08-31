// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  // Basic Information
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // Profile Information
  firstName: {
    type: String,
    trim: true,
    maxlength: 30
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 30
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  profilePicture: {
    type: String,
    default: 'https://ui-avatars.com/api/?name=User&background=0EA5E9&color=fff&size=200'
  },
  coverPhoto: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxlength: 160,
    default: ''
  },
  location: {
    type: String,
    maxlength: 100,
    default: ''
  },
  website: {
    type: String,
    maxlength: 200,
    default: ''
  },
  dateOfBirth: {
    type: Date
  },
  
  // Social Connections
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Account Status & Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Activity & Engagement
  lastActive: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  },
  postsCount: {
    type: Number,
    default: 0
  },
  likesReceived: {
    type: Number,
    default: 0
  },
  commentsReceived: {
    type: Number,
    default: 0
  },
  
  // Preferences & Settings
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      likes: {
        type: Boolean,
        default: true
      },
      comments: {
        type: Boolean,
        default: true
      },
      follows: {
        type: Boolean,
        default: true
      },
      mentions: {
        type: Boolean,
        default: true
      }
    },
    privacy: {
      showEmail: {
        type: Boolean,
        default: false
      },
      showLastActive: {
        type: Boolean,
        default: true
      },
      allowTagging: {
        type: Boolean,
        default: true
      },
      allowMessaging: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // Interests & Categories
  interests: [{
    type: String,
    trim: true
  }],
  favoriteTopics: [{
    type: String,
    trim: true
  }],
  
  // Professional Information
  profession: {
    type: String,
    maxlength: 100
  },
  company: {
    type: String,
    maxlength: 100
  },
  education: {
    type: String,
    maxlength: 100
  },
  
  // Social Media Links
  socialLinks: {
    twitter: String,
    instagram: String,
    linkedin: String,
    github: String,
    youtube: String,
    tiktok: String
  },
  
  // Achievements & Badges
  badges: [{
    name: String,
    description: String,
    icon: String,
    earnedAt: {
      type: Date,
      default: Date.now
    }
  }],
  level: {
    type: Number,
    default: 1
  },
  experience: {
    type: Number,
    default: 0
  },
  
  // Analytics & Insights
  analytics: {
    profileViews: {
      type: Number,
      default: 0
    },
    searchAppearances: {
      type: Number,
      default: 0
    },
    weeklyReach: {
      type: Number,
      default: 0
    },
    monthlyReach: {
      type: Number,
      default: 0
    }
  },
  
  // Device & Security
  devices: [{
    deviceId: String,
    deviceName: String,
    deviceType: String,
    lastUsed: Date,
    ipAddress: String,
    location: String
  }],
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  
  // Subscription & Premium Features
  subscription: {
    type: {
      type: String,
      enum: ['free', 'premium', 'pro'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    autoRenew: {
      type: Boolean,
      default: false
    }
  },
  
  // Content Moderation
  reportedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }],
  warnings: [{
    reason: String,
    issuedAt: {
      type: Date,
      default: Date.now
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Saved Content
  savedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  likedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  
  // Streaks & Gamification
  streaks: {
    dailyLogin: {
      current: {
        type: Number,
        default: 0
      },
      longest: {
        type: Number,
        default: 0
      },
      lastLoginDate: Date
    },
    posting: {
      current: {
        type: Number,
        default: 0
      },
      longest: {
        type: Number,
        default: 0
      },
      lastPostDate: Date
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ 'analytics.profileViews': -1 });
UserSchema.index({ lastActive: -1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'followers': 1 });
UserSchema.index({ 'following': 1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.displayName || this.username;
});

// Virtual for follower count
UserSchema.virtual('followerCount').get(function() {
  return this.followers ? this.followers.length : 0;
});

// Virtual for following count
UserSchema.virtual('followingCount').get(function() {
  return this.following ? this.following.length : 0;
});

// Virtual for age calculation
UserSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Virtual for online status
UserSchema.virtual('isOnline').get(function() {
  if (!this.lastActive) return false;
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.lastActive > fiveMinutesAgo;
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update last active before saving
UserSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('lastActive')) {
    this.lastActive = new Date();
  }
  next();
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to follow a user
UserSchema.methods.followUser = async function(userId) {
  if (!this.following.includes(userId)) {
    this.following.push(userId);
    await this.save();
    
    // Add this user to the target user's followers
    const targetUser = await this.constructor.findById(userId);
    if (targetUser && !targetUser.followers.includes(this._id)) {
      targetUser.followers.push(this._id);
      await targetUser.save();
    }
  }
};

// Method to unfollow a user
UserSchema.methods.unfollowUser = async function(userId) {
  this.following = this.following.filter(id => !id.equals(userId));
  await this.save();
  
  // Remove this user from the target user's followers
  const targetUser = await this.constructor.findById(userId);
  if (targetUser) {
    targetUser.followers = targetUser.followers.filter(id => !id.equals(this._id));
    await targetUser.save();
  }
};

// Method to block a user
UserSchema.methods.blockUser = async function(userId) {
  if (!this.blockedUsers.includes(userId)) {
    this.blockedUsers.push(userId);
    // Also unfollow each other
    await this.unfollowUser(userId);
    const targetUser = await this.constructor.findById(userId);
    if (targetUser) {
      await targetUser.unfollowUser(this._id);
    }
    await this.save();
  }
};

// Method to unblock a user
UserSchema.methods.unblockUser = async function(userId) {
  this.blockedUsers = this.blockedUsers.filter(id => !id.equals(userId));
  await this.save();
};

// Method to check if user is following another user
UserSchema.methods.isFollowing = function(userId) {
  return this.following.some(id => id.equals(userId));
};

// Method to check if user is blocked
UserSchema.methods.isBlocked = function(userId) {
  return this.blockedUsers.some(id => id.equals(userId));
};

// Method to add experience points
UserSchema.methods.addExperience = async function(points) {
  this.experience += points;
  
  // Level up logic
  const newLevel = Math.floor(this.experience / 1000) + 1;
  if (newLevel > this.level) {
    this.level = newLevel;
    // Award level up badge
    this.badges.push({
      name: `Level ${newLevel}`,
      description: `Reached level ${newLevel}!`,
      icon: '🏆'
    });
  }
  
  await this.save();
};

// Method to update login streak
UserSchema.methods.updateLoginStreak = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastLogin = this.streaks.dailyLogin.lastLoginDate;
  if (lastLogin) {
    const lastLoginDate = new Date(lastLogin);
    lastLoginDate.setHours(0, 0, 0, 0);
    
    const daysDiff = (today - lastLoginDate) / (1000 * 60 * 60 * 24);
    
    if (daysDiff === 1) {
      // Consecutive day
      this.streaks.dailyLogin.current += 1;
    } else if (daysDiff > 1) {
      // Streak broken
      this.streaks.dailyLogin.current = 1;
    }
    // If daysDiff === 0, same day, don't update
  } else {
    // First login
    this.streaks.dailyLogin.current = 1;
  }
  
  // Update longest streak
  if (this.streaks.dailyLogin.current > this.streaks.dailyLogin.longest) {
    this.streaks.dailyLogin.longest = this.streaks.dailyLogin.current;
  }
  
  this.streaks.dailyLogin.lastLoginDate = new Date();
  this.loginCount += 1;
  
  // Award experience for login
  await this.addExperience(10);
};

// Method to get user's public profile
UserSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  
  // Remove sensitive information
  delete userObject.password;
  delete userObject.emailVerificationToken;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  delete userObject.twoFactorSecret;
  delete userObject.devices;
  delete userObject.reportedBy;
  delete userObject.warnings;
  
  // Remove private information based on privacy settings
  if (!userObject.preferences.privacy.showEmail) {
    delete userObject.email;
  }
  if (!userObject.preferences.privacy.showLastActive) {
    delete userObject.lastActive;
  }
  
  return userObject;
};

// Static method to find suggested users
UserSchema.statics.findSuggestedUsers = async function(userId, limit = 5) {
  const user = await this.findById(userId);
  if (!user) return [];
  
  // Find users that current user's following are following
  const suggestions = await this.aggregate([
    {
      $match: {
        _id: { $ne: mongoose.Types.ObjectId(userId) },
        _id: { $nin: user.following },
        _id: { $nin: user.blockedUsers },
        isActive: true
      }
    },
    {
      $addFields: {
        mutualFollowers: {
          $size: {
            $setIntersection: ['$followers', user.following]
          }
        }
      }
    },
    {
      $sort: { mutualFollowers: -1, followerCount: -1, createdAt: -1 }
    },
    {
      $limit: limit
    }
  ]);
  
  return suggestions;
};

// Static method for user search
UserSchema.statics.searchUsers = async function(query, currentUserId, limit = 10) {
  const searchRegex = new RegExp(query, 'i');
  
  return await this.find({
    $and: [
      {
        $or: [
          { username: searchRegex },
          { displayName: searchRegex },
          { firstName: searchRegex },
          { lastName: searchRegex },
          { bio: searchRegex }
        ]
      },
      { _id: { $ne: currentUserId } },
      { isActive: true }
    ]
  })
  .select('username displayName firstName lastName profilePicture bio isVerified followerCount')
  .limit(limit)
  .sort({ followerCount: -1, isVerified: -1 });
};

module.exports = mongoose.model('User', UserSchema);

/*
Now let me also create the 
Post
 and 
Comment
 models to complete your backend:

// models/Post.js
const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'gif'],
      required: true
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
  hashtags: [{
    type: String,
    trim: true
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  shares: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  location: {
    name: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  visibility: {
    type: String,
    enum: ['public', 'followers', 'private'],
    default: 'public'
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  reportedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }],
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    reach: {
      type: Number,
      default: 0
    },
    engagement: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
PostSchema.index({ author: 1, createdAt: -1 });
PostSchema.index({ hashtags: 1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ 'likes': 1 });

// Virtuals
PostSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

PostSchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

PostSchema.virtual('shareCount').get(function() {
  return this.shares ? this.shares.length : 0;
});

// Methods
PostSchema.methods.addLike = async function(userId) {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId);
    await this.save();
    
    // Update author's likes received count
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(this.author, { $inc: { likesReceived: 1 } });
  }
};

PostSchema.methods.removeLike = async function(userId) {
  this.likes = this.likes.filter(id => !id.equals(userId));
  await this.save();
  
  // Update author's likes received count
  const User = mongoose.model('User');
  await User.findByIdAndUpdate(this.author, { $inc: { likesReceived: -1 } });
};

module.exports = mongoose.model('Post', PostSchema);

// models/Comment.js
const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 500
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  reportedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
CommentSchema.index({ post: 1, createdAt: -1 });
CommentSchema.index({ author: 1 });
CommentSchema.index({ parentComment: 1 });

// Virtuals
CommentSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

CommentSchema.virtual('replyCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

module.exports = mongoose.model('Comment', CommentSchema);
*/