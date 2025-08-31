// models/Post.js
const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  // Author Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Content
  content: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true
  },
  
  // Media Content
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'gif', 'audio'],
      default: 'image'
    },
    url: {
      type: String,
      required: true
    },
    thumbnail: String, // For videos
    alt: String,
    width: Number,
    height: Number,
    size: Number, // File size in bytes
    duration: Number // For videos/audio in seconds
  }],
  
  // Legacy image field (keeping for backward compatibility)
  image: {
    type: String
  },
  
  // Social Features
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
    },
    shareType: {
      type: String,
      enum: ['repost', 'quote', 'story'],
      default: 'repost'
    }
  }],
  saves: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    savedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Content Enhancement
  hashtags: [{
    type: String,
    trim: true,
    lowercase: true,
    match: [/^[a-zA-Z0-9_]+$/, 'Hashtags can only contain letters, numbers, and underscores']
  }],
  mentions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    position: Number // Position in content where mention occurs
  }],
  
  // Location & Context
  location: {
    name: String,
    address: String,
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180
      }
    },
    placeId: String, // For integration with maps APIs
    country: String,
    city: String
  },
  
  // Weather at time of posting (using OpenWeatherMap API)
  weather: {
    condition: String, // sunny, rainy, cloudy, etc.
    temperature: Number,
    humidity: Number,
    description: String,
    icon: String, // Weather icon code
    location: String
  },
  
  // Post Settings
  visibility: {
    type: String,
    enum: ['public', 'followers', 'friends', 'private', 'custom'],
    default: 'public'
  },
  allowComments: {
    type: Boolean,
    default: true
  },
  allowShares: {
    type: Boolean,
    default: true
  },
  allowDownloads: {
    type: Boolean,
    default: true
  },
  
  // Content Moderation
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
      enum: ['spam', 'harassment', 'inappropriate', 'copyright', 'fake_news', 'violence', 'other']
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
  
  // Content Status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'deleted', 'hidden'],
    default: 'published'
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
    },
    reason: String
  }],
  
  // Scheduling
  scheduledFor: Date,
  isScheduled: {
    type: Boolean,
    default: false
  },
  
  // Analytics & Engagement
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
      },
      duration: Number, // Time spent viewing in seconds
      device: String,
      location: String
    }],
    reach: {
      type: Number,
      default: 0
    },
    impressions: {
      type: Number,
      default: 0
    },
    engagementRate: {
      type: Number,
      default: 0
    },
    clickThroughRate: {
      type: Number,
      default: 0
    }
  },
  
  // AI & Content Analysis
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
    topics: [String], // AI-detected topics
    language: {
      type: String,
      default: 'en'
    },
    readingTime: Number, // Estimated reading time in seconds
    complexity: {
      type: String,
      enum: ['simple', 'moderate', 'complex'],
      default: 'moderate'
    }
  },
  
  // Trending & Viral Metrics
  trending: {
    score: {
      type: Number,
      default: 0
    },
    isViral: {
      type: Boolean,
      default: false
    },
    viralAt: Date,
    trendingAt: Date,
    peakEngagement: {
      timestamp: Date,
      likes: Number,
      comments: Number,
      shares: Number
    }
  },
  
  // Post Type & Category
  postType: {
    type: String,
    enum: ['text', 'image', 'video', 'poll', 'event', 'article', 'quote', 'meme', 'story'],
    default: 'text'
  },
  category: {
    type: String,
    enum: ['general', 'technology', 'sports', 'entertainment', 'news', 'lifestyle', 'education', 'business', 'health', 'travel', 'food', 'art', 'music', 'gaming'],
    default: 'general'
  },
  
  // Interactive Features
  poll: {
    question: String,
    options: [{
      text: String,
      votes: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        votedAt: {
          type: Date,
          default: Date.now
        }
      }]
    }],
    expiresAt: Date,
    allowMultiple: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  
  // Event Information (for event posts)
  event: {
    title: String,
    description: String,
    startDate: Date,
    endDate: Date,
    location: String,
    ticketPrice: Number,
    maxAttendees: Number,
    attendees: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      status: {
        type: String,
        enum: ['going', 'interested', 'not_going'],
        default: 'interested'
      },
      respondedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Monetization
  isPromoted: {
    type: Boolean,
    default: false
  },
  promotion: {
    budget: Number,
    targetAudience: {
      ageRange: {
        min: Number,
        max: Number
      },
      interests: [String],
      location: [String],
      gender: {
        type: String,
        enum: ['all', 'male', 'female', 'other']
      }
    },
    startDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: false
    }
  },
  
  // External Integrations
  externalLinks: [{
    url: String,
    title: String,
    description: String,
    image: String,
    domain: String,
    isVerified: {
      type: Boolean,
      default: false
    }
  }],
  
  // Music Integration (Spotify, etc.)
  music: {
    track: String,
    artist: String,
    album: String,
    spotifyId: String,
    previewUrl: String,
    duration: Number
  },
  
  // Quote of the Day (using QuoteGarden API)
  quote: {
    text: String,
    author: String,
    category: String,
    isDaily: {
      type: Boolean,
      default: false
    }
  },
  
  // Fun Facts (using various APIs)
  funFact: {
    text: String,
    category: {
      type: String,
      enum: ['cat', 'dog', 'random', 'science', 'history']
    },
    source: String
  },
  
  // Collaboration
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['co-author', 'editor', 'contributor'],
      default: 'contributor'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Thread/Series
  thread: {
    isThread: {
      type: Boolean,
      default: false
    },
    threadId: String,
    position: Number,
    totalPosts: Number
  },
  
  // Reactions (beyond likes)
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry', 'celebrate', 'support'],
      default: 'like'
    },
    reactedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
PostSchema.index({ user: 1, createdAt: -1 });
PostSchema.index({ hashtags: 1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ 'likes.user': 1 });
PostSchema.index({ status: 1, visibility: 1 });
PostSchema.index({ 'trending.score': -1 });
PostSchema.index({ category: 1, createdAt: -1 });
PostSchema.index({ 'location.coordinates': '2dsphere' }); // For geospatial queries
PostSchema.index({ scheduledFor: 1, isScheduled: 1 });

// Virtual fields
PostSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

PostSchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

PostSchema.virtual('shareCount').get(function() {
  return this.shares ? this.shares.length : 0;
});

PostSchema.virtual('saveCount').get(function() {
  return this.saves ? this.saves.length : 0;
});

PostSchema.virtual('totalEngagement').get(function() {
  return this.likeCount + this.commentCount + this.shareCount;
});

PostSchema.virtual('isRecent').get(function() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.createdAt > oneDayAgo;
});

PostSchema.virtual('readingTime').get(function() {
  const wordsPerMinute = 200;
  const wordCount = this.content.split(' ').length;
  return Math.ceil(wordCount / wordsPerMinute);
});

// Pre-save middleware
PostSchema.pre('save', function(next) {
  // Extract hashtags from content
  const hashtagRegex = /#(\w+)/g;
  const hashtags = [];
  let match;
  
  while ((match = hashtagRegex.exec(this.content)) !== null) {
    hashtags.push(match[1].toLowerCase());
  }
  
  this.hashtags = [...new Set(hashtags)]; // Remove duplicates
  
  // Extract mentions from content
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
  this.aiAnalysis.readingTime = Math.ceil((wordCount / wordsPerMinute) * 60); // in seconds
  
  // Set post type based on content
  if (this.media && this.media.length > 0) {
    this.postType = this.media[0].type;
  } else if (this.poll && this.poll.question) {
    this.postType = 'poll';
  } else if (this.event && this.event.title) {
    this.postType = 'event';
  } else if (this.quote && this.quote.text) {
    this.postType = 'quote';
  }
  
  next();
});

// Instance Methods
PostSchema.methods.addLike = async function(userId) {
  const existingLike = this.likes.find(like => like.user.equals(userId));
  
  if (!existingLike) {
    this.likes.push({ user: userId });
    this.analytics.views += 1;
    await this.save();
    
    // Update user's likes received count
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(this.user, { $inc: { likesReceived: 1 } });
    
    // Add experience to post author
    const author = await User.findById(this.user);
    if (author) {
      await author.addExperience(5);
    }
    
    return true;
  }
  return false;
};

PostSchema.methods.removeLike = async function(userId) {
  const likeIndex = this.likes.findIndex(like => like.user.equals(userId));
  
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
    await this.save();
    
    // Update user's likes received count
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(this.user, { $inc: { likesReceived: -1 } });
    
    return true;
  }
  return false;
};

PostSchema.methods.addReaction = async function(userId, reactionType) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(reaction => !reaction.user.equals(userId));
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    type: reactionType
  });
  
  await this.save();
};

PostSchema.methods.addView = async function(userId, duration = 0, device = 'unknown', location = 'unknown') {
  // Check if user already viewed this post today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const existingView = this.analytics.uniqueViews.find(view => 
    view.user.equals(userId) && view.viewedAt >= today
  );
  
  if (!existingView) {
    this.analytics.uniqueViews.push({
      user: userId,
      duration,
      device,
      location
    });
    this.analytics.views += 1;
  }
  
  this.analytics.impressions += 1;
  await this.save();
};

PostSchema.methods.calculateTrendingScore = function() {
  const ageInHours = (Date.now() - this.createdAt) / (1000 * 60 * 60);
  const engagementScore = this.totalEngagement;
  const viewScore = this.analytics.views * 0.1;
  
  // Trending score decreases with age but increases with engagement
  this.trending.score = (engagementScore + viewScore) / Math.pow(ageInHours + 1, 1.5);
  
  // Mark as viral if score is very high
  if (this.trending.score > 100 && !this.trending.isViral) {
    this.trending.isViral = true;
    this.trending.viralAt = new Date();
  }
  
  return this.trending.score;
};

PostSchema.methods.addToThread = async function(threadId, position) {
  this.thread.isThread = true;
  this.thread.threadId = threadId;
  this.thread.position = position;
  await this.save();
};

PostSchema.methods.schedulePost = function(scheduledDate) {
  this.scheduledFor = scheduledDate;
  this.isScheduled = true;
  this.status = 'draft';
};

PostSchema.methods.publishScheduledPost = async function() {
  if (this.isScheduled && this.scheduledFor <= new Date()) {
    this.status = 'published';
    this.isScheduled = false;
    await this.save();
    return true;
  }
  return false;
};

// Static Methods
PostSchema.statics.getTrendingPosts = async function(limit = 10) {
  return await this.find({
    status: 'published',
    visibility: 'public',
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
  })
  .populate('user', 'username displayName profilePicture isVerified')
  .sort({ 'trending.score': -1 })
  .limit(limit);
};

PostSchema.statics.getPostsByHashtag = async function(hashtag, limit = 20) {
  return await this.find({
    hashtags: hashtag.toLowerCase(),
    status: 'published',
    visibility: 'public'
  })
  .populate('user', 'username displayName profilePicture isVerified')
  .sort({ createdAt: -1 })
  .limit(limit);
};

PostSchema.statics.searchPosts = async function(query, limit = 20) {
  const searchRegex = new RegExp(query, 'i');
  
  return await this.find({
    $and: [
      {
        $or: [
          { content: searchRegex },
          { hashtags: searchRegex },
          { 'location.name': searchRegex }
        ]
      },
      { status: 'published' },
      { visibility: 'public' }
    ]
  })
  .populate('user', 'username displayName profilePicture isVerified')
  .sort({ 'trending.score': -1, createdAt: -1 })
  .limit(limit);
};

PostSchema.statics.getPostsNearLocation = async function(latitude, longitude, maxDistance = 10000, limit = 20) {
  return await this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance // in meters
      }
    },
    status: 'published',
    visibility: 'public'
  })
  .populate('user', 'username displayName profilePicture isVerified')
  .sort({ createdAt: -1 })
  .limit(limit);
};

// API Integration Methods
PostSchema.methods.addWeatherData = async function(latitude, longitude) {
  try {
    // Using OpenWeatherMap API (you'll need to get a free API key)
    const API_KEY = process.env.OPENWEATHER_API_KEY || 'your_api_key_here';
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`);
    const weatherData = await response.json();
    
    if (weatherData && weatherData.weather) {
      this.weather = {
        condition: weatherData.weather[0].main.toLowerCase(),
        temperature: Math.round(weatherData.main.temp),
        humidity: weatherData.main.humidity,
        description: weatherData.weather[0].description,
        icon: weatherData.weather[0].icon,
        location: weatherData.name
      };
      await this.save();
    }
  } catch (error) {
    console.error('Error fetching weather data:', error);
  }
};

PostSchema.methods.addDailyQuote = async function() {
  try {
    // Using QuoteGarden API
    const response = await fetch('https://quotegarden.herokuapp.com/api/v3/quotes/random');
    const quoteData = await response.json();
    
    if (quoteData && quoteData.data) {
      this.quote = {
        text: quoteData.data.quoteText,
        author: quoteData.data.quoteAuthor,
        category: quoteData.data.quoteGenre,
        isDaily: true
      };
      await this.save();
    }
  } catch (error) {
    console.error('Error fetching quote:', error);
  }
};

PostSchema.methods.addFunFact = async function(category = 'cat') {
  try {
    let apiUrl;
    switch (category) {
      case 'cat':
        apiUrl = 'https://catfact.ninja/fact';
        break;
      case 'dog':
        apiUrl = 'https://dog-api.kinduff.com/api/facts';
        break;
      default:
        apiUrl = 'https://uselessfacts.jsph.pl/random.json?language=en';
    }
    
    const response = await fetch(apiUrl);
    const factData = await response.json();
    
    let factText;
    if (category === 'cat') {
      factText = factData.fact;
    } else if (category === 'dog') {
      factText = factData.facts[0];
    } else {
      factText = factData.text;
    }
    
    this.funFact = {
      text: factText,
      category: category,
      source: apiUrl
    };
    await this.save();
  } catch (error) {
    console.error('Error fetching fun fact:', error);
  }
};

module.exports = mongoose.model('Post', PostSchema);

