// controllers/postController.js
const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const mongoose = require('mongoose');
const sharp = require('sharp');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Image processing configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Process and optimize images
const processImage = async (buffer, filename) => {
  try {
    const processedImage = await sharp(buffer)
      .resize(1200, 1200, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toBuffer();
    
    // In production, you'd upload to cloud storage (AWS S3, Cloudinary, etc.)
    const uploadPath = path.join(__dirname, '../uploads/posts');
    await fs.mkdir(uploadPath, { recursive: true });
    
    const imagePath = path.join(uploadPath, filename);
    await fs.writeFile(imagePath, processedImage);
    
    return `/uploads/posts/${filename}`;
  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error('Failed to process image');
  }
};

// Enhanced Create Post
exports.createPost = async (req, res) => {
  try {
    const { 
      content, 
      type = 'text', 
      tags = [], 
      location,
      visibility = 'public',
      allowComments = true,
      allowShares = true,
      scheduledFor,
      poll
    } = req.body;

    // Validation
    if (!content && !req.files?.length) {
      return res.status(400).json({ 
        message: 'Post must have content or media',
        error: 'EMPTY_POST'
      });
    }

    if (content && content.length > 2000) {
      return res.status(400).json({ 
        message: 'Post content too long (max 2000 characters)',
        error: 'CONTENT_TOO_LONG'
      });
    }

    // Process images if uploaded
    let mediaUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const imageUrl = await processImage(file.buffer, filename);
        mediaUrls.push({
          type: 'image',
          url: imageUrl,
          originalName: file.originalname
        });
      }
    }

    // Create post data
    const postData = {
      user: req.userId,
      content: content?.trim(),
      type,
      media: mediaUrls,
      tags: Array.isArray(tags) ? tags.slice(0, 10) : [], // Limit to 10 tags
      location,
      visibility,
      settings: {
        allowComments,
        allowShares,
        allowDownloads: req.body.allowDownloads || false
      }
    };

    // Handle scheduled posts
    if (scheduledFor) {
      const scheduledDate = new Date(scheduledFor);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ 
          message: 'Scheduled time must be in the future',
          error: 'INVALID_SCHEDULE_TIME'
        });
      }
      postData.scheduledFor = scheduledDate;
      postData.status = 'scheduled';
    }

    // Handle polls
    if (poll && poll.options && poll.options.length >= 2) {
      postData.poll = {
        question: poll.question || content,
        options: poll.options.slice(0, 4).map(option => ({
          text: option.text,
          votes: 0,
          voters: []
        })),
        expiresAt: poll.expiresAt ? new Date(poll.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
        allowMultiple: poll.allowMultiple || false
      };
      postData.type = 'poll';
    }

    const newPost = new Post(postData);
    await newPost.save();

    // Award experience points to user
    const user = await User.findById(req.userId);
    await user.addExperience(10); // 10 XP for creating a post

    // Update user's post streak
    await user.updatePostStreak();

    // Populate the post for response
    const populatedPost = await Post.findById(newPost._id)
      .populate('user', 'username displayName profilePicture isVerified level')
      .populate('mentions', 'username displayName profilePicture');

    // Real-time notification to followers (if public)
    if (visibility === 'public') {
      const io = req.app.get('io');
      const followers = await User.findById(req.userId).populate('followers', '_id');
      
      followers.followers.forEach(follower => {
        io.to(`user_${follower._id}`).emit('new_post', {
          post: populatedPost,
          author: {
            username: user.username,
            displayName: user.displayName,
            profilePicture: user.profilePicture
          }
        });
      });
    }

    res.status(201).json({
      message: 'Post created successfully! 🎉',
      post: populatedPost,
      experienceGained: 10,
      success: true
    });

  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ 
      message: 'Failed to create post',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Enhanced Get Posts (Smart Feed)
exports.getPosts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type = 'all',
      sortBy = 'recent',
      tags,
      location,
      following = false
    } = req.query;

    const userId = req.userId;
    const skip = (page - 1) * limit;

    // Build query
    let query = { 
      status: 'published',
      $or: [
        { visibility: 'public' },
        { user: userId }, // User's own posts
      ]
    };

    // Add friends' posts if user is authenticated
    if (userId) {
      const user = await User.findById(userId).select('following friends');
      if (user.following.length > 0) {
        query.$or.push({ 
          user: { $in: user.following },
          visibility: { $in: ['public', 'friends'] }
        });
      }
      if (user.friends && user.friends.length > 0) {
        query.$or.push({ 
          user: { $in: user.friends },
          visibility: 'friends'
        });
      }
    }

    // Filter by type
    if (type !== 'all') {
      query.type = type;
    }

    // Filter by tags
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    // Filter by location
    if (location) {
      query['location.city'] = new RegExp(location, 'i');
    }

    // Filter by following only
    if (following === 'true' && userId) {
      const user = await User.findById(userId).select('following');
      query.user = { $in: user.following };
    }

    // Build sort options
    let sortOptions = {};
    switch (sortBy) {
      case 'popular':
        sortOptions = { 
          'engagement.score': -1, 
          createdAt: -1 
        };
        break;
      case 'trending':
        // Posts with high engagement in last 24 hours
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: yesterday };
        sortOptions = { 
          'engagement.score': -1,
          'stats.likeCount': -1,
          'stats.commentCount': -1
        };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      default: // recent
        sortOptions = { createdAt: -1 };
    }

    // Execute query with aggregation for better performance
    const posts = await Post.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                username: 1,
                displayName: 1,
                profilePicture: 1,
                isVerified: 1,
                level: 1,
                badges: 1
              }
            }
          ]
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'comments',
          localField: '_id',
          foreignField: 'post',
          as: 'recentComments',
          pipeline: [
            { $match: { status: 'active' } },
            { $sort: { createdAt: -1 } },
            { $limit: 3 },
            {
              $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'user',
                pipeline: [
                  {
                    $project: {
                      username: 1,
                      displayName: 1,
                      profilePicture: 1,
                      isVerified: 1
                    }
                  }
                ]
              }
            },
            { $unwind: '$user' }
          ]
        }
      },
      {
        $addFields: {
          isLiked: userId ? { $in: [new mongoose.Types.ObjectId(userId), '$likes'] } : false,
          isBookmarked: userId ? { $in: [new mongoose.Types.ObjectId(userId), '$bookmarks'] } : false,
          'stats.likeCount': { $size: '$likes' },
          'stats.commentCount': { $size: '$comments' },
          'stats.shareCount': { $size: '$shares' },
          'stats.bookmarkCount': { $size: '$bookmarks' }
        }
      },
      { $sort: sortOptions },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    // Get total count for pagination
    const totalPosts = await Post.countDocuments(query);

    // Update user's feed preferences based on interaction
    if (userId && posts.length > 0) {
      const user = await User.findById(userId);
      // Track viewed posts for recommendation algorithm
      user.feedPreferences.viewedPosts.push(...posts.map(p => p._id));
      if (user.feedPreferences.viewedPosts.length > 1000) {
        user.feedPreferences.viewedPosts = user.feedPreferences.viewedPosts.slice(-500);
      }
      user.save().catch(err => console.error('Error updating feed preferences:', err));
    }

    res.json({
      posts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(totalPosts / limit),
        total: totalPosts,
        hasNext: page * limit < totalPosts,
        hasPrev: page > 1
      },
      filters: {
        type,
        sortBy,
        tags,
        location,
        following
      }
    });

  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch posts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Enhanced Get Single Post
exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        message: 'Invalid post ID',
        error: 'INVALID_POST_ID'
      });
    }

    const post = await Post.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                username: 1,
                displayName: 1,
                profilePicture: 1,
                isVerified: 1,
                level: 1,
                badges: 1,
                followerCount: 1,
                bio: 1
              }
            }
          ]
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'comments',
          localField: '_id',
          foreignField: 'post',
          as: 'comments',
          pipeline: [
            { $match: { status: 'active' } },
            { $sort: { createdAt: -1 } },
            {
              $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'user',
                pipeline: [
                  {
                    $project: {
                      username: 1,
                      displayName: 1,
                      profilePicture: 1,
                      isVerified: 1,
                      level: 1
                    }
                  }
                ]
              }
            },
            { $unwind: '$user' },
            {
              $addFields: {
                isLiked: userId ? { $in: [new mongoose.Types.ObjectId(userId), '$likes'] } : false,
                likeCount: { $size: '$likes' }
              }
            }
          ]
        }
      },
      {
        $addFields: {
          isLiked: userId ? { $in: [new mongoose.Types.ObjectId(userId), '$likes'] } : false,
          isBookmarked: userId ? { $in: [new mongoose.Types.ObjectId(userId), '$bookmarks'] } : false,
          isFollowing: userId ? { $in: [new mongoose.Types.ObjectId(userId), '$user.followers'] } : false,
          'stats.likeCount': { $size: '$likes' },
          'stats.commentCount': { $size: '$comments' },
          'stats.shareCount': { $size: '$shares' },
          'stats.bookmarkCount': { $size: '$bookmarks' }
        }
      }
    ]);

    if (!post || post.length === 0) {
      return res.status(404).json({ 
        message: 'Post not found',
        error: 'POST_NOT_FOUND'
      });
    }

    const postData = post[0];

    // Check visibility permissions
    if (postData.visibility === 'private' && postData.user._id.toString() !== userId) {
      return res.status(403).json({ 
        message: 'This post is private',
        error: 'PRIVATE_POST'
      });
    }

    if (postData.visibility === 'friends' && userId) {
      const user = await User.findById(userId).select('friends following');
      const isAuthor = postData.user._id.toString() === userId;
      const isFriend = user.friends?.includes(postData.user._id);
      const isFollowing = user.following?.includes(postData.user._id);
      
      if (!isAuthor && !isFriend && !isFollowing) {
        return res.status(403).json({ 
          message: 'This post is only visible to friends',
          error: 'FRIENDS_ONLY'
        });
      }
    }

    // Increment view count
    await Post.findByIdAndUpdate(id, { 
      $inc: { 'stats.viewCount': 1 },
      $addToSet: { viewers: userId }
    });

    // Track view for recommendations
    if (userId) {
      const user = await User.findById(userId);
      user.feedPreferences.viewedPosts.push(new mongoose.Types.ObjectId(id));
      user.save().catch(err => console.error('Error tracking view:', err));
    }

    res.json({
      post: postData,
      success: true
    });

  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch post',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Enhanced Update Post
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, tags, location, visibility, allowComments, allowShares } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        message: 'Invalid post ID',
        error: 'INVALID_POST_ID'
      });
    }

    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({ 
        message: 'Post not found',
        error: 'POST_NOT_FOUND'
      });
    }
    
    // Check ownership
    if (post.user.toString() !== userId) {
      return res.status(403).json({ 
        message: 'You can only edit your own posts',
        error: 'UNAUTHORIZED_EDIT'
      });
    }

    // Check if post can be edited (not older than 24 hours for non-premium users)
    const user = await User.findById(userId);
    const hoursSinceCreation = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
    
    if (user.subscription.type === 'free' && hoursSinceCreation > 24) {
      return res.status(403).json({ 
        message: 'Posts can only be edited within 24 hours (upgrade to Premium for unlimited editing)',
        error: 'EDIT_TIME_EXPIRED'
      });
    }

    // Validate content length
    if (content && content.length > 2000) {
      return res.status(400).json({ 
        message: 'Post content too long (max 2000 characters)',
        error: 'CONTENT_TOO_LONG'
      });
    }

    // Update fields
    if (content !== undefined) post.content = content.trim();
    if (tags !== undefined) post.tags = Array.isArray(tags) ? tags.slice(0, 10) : [];
    if (location !== undefined) post.location = location;
    if (visibility !== undefined) post.visibility = visibility;
    if (allowComments !== undefined) post.settings.allowComments = allowComments;
    if (allowShares !== undefined) post.settings.allowShares = allowShares;
    
    post.editedAt = new Date();
    post.editCount = (post.editCount || 0) + 1;

    await post.save();

    // Populate updated post
    const updatedPost = await Post.findById(id)
      .populate('user', 'username displayName profilePicture isVerified level');

    res.json({
      message: 'Post updated successfully! ✨',
      post: updatedPost,
      success: true
    });

  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ 
      message: 'Failed to update post',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Enhanced Delete Post
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        message: 'Invalid post ID',
        error: 'INVALID_POST_ID'
      });
    }

    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({ 
        message: 'Post not found',
        error: 'POST_NOT_FOUND'
      });
    }
    
    // Check ownership or admin privileges
    const user = await User.findById(userId);
    if (post.user.toString() !== userId && !user.isAdmin) {
      return res.status(403).json({ 
        message: 'You can only delete your own posts',
        error: 'UNAUTHORIZED_DELETE'
      });
    }

    // Delete associated media files
    if (post.media && post.media.length > 0) {
      for (const media of post.media) {
        if (media.url.startsWith('/uploads/')) {
          const filePath = path.join(__dirname, '..', media.url);
          try {
            await fs.unlink(filePath);
          } catch (fileError) {
            console.error('Error deleting file:', fileError);
          }
        }
      }
    }

    // Delete all comments associated with this post
    await Comment.deleteMany({ post: id });

    // Remove post from users' bookmarks
    await User.updateMany(
      { bookmarkedPosts: id },
      { $pull: { bookmarkedPosts: id } }
    );

    // Delete the post
    await post.deleteOne();

    // Real-time notification
    const io = req.app.get('io');
    io.emit('post_deleted', { postId: id });

    res.json({
      message: 'Post deleted successfully! 🗑️',
      success: true
    });

  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ 
      message: 'Failed to delete post',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Enhanced Like/Unlike Post
exports.likePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        message: 'Invalid post ID',
        error: 'INVALID_POST_ID'
      });
    }

    const post = await Post.findById(id).populate('user', 'username displayName');
    
    if (!post) {
      return res.status(404).json({ 
        message: 'Post not found',
        error: 'POST_NOT_FOUND'
      });
    }

    const isLiked = post.likes.includes(userId);
    let action, message;

    if (isLiked) {
      // Unlike the post
      post.likes = post.likes.filter(like => like.toString() !== userId);
      action = 'unliked';
      message = 'Post unliked';
    } else {
      // Like the post
      post.likes.push(userId);
      action = 'liked';
      message = 'Post liked! ❤️';

      // Award experience to post author (but not to self)
      if (post.user._id.toString() !== userId) {
        await User.findByIdAndUpdate(post.user._id, {
          $inc: { experience: 2 }
        });

        // Create notification for post author
        const Notification = require('../models/Notification');
        const liker = await User.findById(userId).select('username displayName profilePicture');
        
        await new Notification({
          recipient: post.user._id,
          sender: userId,
          type: 'like',
          message: `${liker.displayName || liker.username} liked your post`,
          relatedPost: id,
          data: {
            postContent: post.content?.substring(0, 50) + (post.content?.length > 50 ? '...' : ''),
            senderInfo: {
              username: liker.username,
              displayName: liker.displayName,
              profilePicture: liker.profilePicture
            }
          }
        }).save();

        // Real-time notification
        const io = req.app.get('io');
        io.to(`user_${post.user._id}`).emit('new_notification', {
          type: 'like',
          message: `${liker.displayName || liker.username} liked your post`,
          sender: liker,
          postId: id
        });
      }
    }

    // Update engagement score
    post.engagement.score = post.likes.length * 1 + post.comments.length * 2 + post.shares.length * 3;
    await post.save();

    res.json({
      message,
      action,
      likeCount: post.likes.length,
      isLiked: !isLiked,
      success: true
    });

  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ 
      message: 'Failed to process like',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Bookmark/Unbookmark Post
exports.bookmarkPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        message: 'Invalid post ID',
        error: 'INVALID_POST_ID'
      });
    }

    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({ 
        message: 'Post not found',
        error: 'POST_NOT_FOUND'
      });
    }

    const user = await User.findById(userId);
    const isBookmarked = post.bookmarks.includes(userId);
    let action, message;

    if (isBookmarked) {
      // Remove bookmark
      post.bookmarks = post.bookmarks.filter(bookmark => bookmark.toString() !== userId);
      user.bookmarkedPosts = user.bookmarkedPosts.filter(postId => postId.toString() !== id);
      action = 'unbookmarked';
      message = 'Bookmark removed';
    } else {
      // Add bookmark
      post.bookmarks.push(userId);
      user.bookmarkedPosts.push(id);
      action = 'bookmarked';
      message = 'Post bookmarked! 🔖';
    }

    await Promise.all([post.save(), user.save()]);

    res.json({
      message,
      action,
      bookmarkCount: post.bookmarks.length,
      isBookmarked: !isBookmarked,
      success: true
    });

  } catch (error) {
    console.error('Bookmark post error:', error);
    res.status(500).json({ 
      message: 'Failed to process bookmark',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Share Post
exports.sharePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, platform = 'internal' } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        message: 'Invalid post ID',
        error: 'INVALID_POST_ID'
      });
    }

    const post = await Post.findById(id).populate('user', 'username displayName');
    
    if (!post) {
      return res.status(404).json({ 
        message: 'Post not found',
        error: 'POST_NOT_FOUND'
      });
    }

    if (!post.settings.allowShares) {
      return res.status(403).json({ 
        message: 'This post cannot be shared',
        error: 'SHARING_DISABLED'
      });
    }

    // Add to shares
    post.shares.push({
      user: userId,
      platform,
      message,
      sharedAt: new Date()
    });

    // Update engagement score
    post.engagement.score = post.likes.length * 1 + post.comments.length * 2 + post.shares.length * 3;
    await post.save();

    // Award experience to post author
    if (post.user._id.toString() !== userId) {
      await User.findByIdAndUpdate(post.user._id, {
        $inc: { experience: 5 }
      });

      // Create notification
      const Notification = require('../models/Notification');
      const sharer = await User.findById(userId).select('username displayName profilePicture');
      
      await new Notification({
        recipient: post.user._id,
        sender: userId,
        type: 'share',
        message: `${sharer.displayName || sharer.username} shared your post`,
        relatedPost: id,
        data: {
          postContent: post.content?.substring(0, 50) + (post.content?.length > 50 ? '...' : ''),
          shareMessage: message,
          platform
        }
      }).save();
    }

    res.json({
      message: 'Post shared successfully! 🚀',
      shareCount: post.shares.length,
      success: true
    });

  } catch (error) {
    console.error('Share post error:', error);
    res.status(500).json({ 
      message: 'Failed to share post',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Vote on Poll
exports.voteOnPoll = async (req, res) => {
  try {
    const { id } = req.params;
    const { optionIndex } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        message: 'Invalid post ID',
        error: 'INVALID_POST_ID'
      });
    }

    const post = await Post.findById(id);
    
    if (!post || post.type !== 'poll') {
      return res.status(404).json({ 
        message: 'Poll not found',
        error: 'POLL_NOT_FOUND'
      });
    }

    if (post.poll.expiresAt < new Date()) {
      return res.status(400).json({ 
        message: 'This poll has expired',
        error: 'POLL_EXPIRED'
      });
    }

    if (optionIndex < 0 || optionIndex >= post.poll.options.length) {
      return res.status(400).json({ 
        message: 'Invalid poll option',
        error: 'INVALID_OPTION'
      });
    }

    // Check if user already voted
    const hasVoted = post.poll.options.some(option => option.voters.includes(userId));
    
    if (hasVoted && !post.poll.allowMultiple) {
      return res.status(400).json({ 
        message: 'You have already voted on this poll',
        error: 'ALREADY_VOTED'
      });
    }

    // Add vote
    post.poll.options[optionIndex].votes += 1;
    post.poll.options[optionIndex].voters.push(userId);

    await post.save();

    res.json({
      message: 'Vote recorded successfully! 🗳️',
      poll: post.poll,
      success: true
    });

  } catch (error) {
    console.error('Vote on poll error:', error);
    res.status(500).json({ 
      message: 'Failed to record vote',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Get Trending Posts
exports.getTrendingPosts = async (req, res) => {
  try {
    const { timeframe = '24h', limit = 20 } = req.query;
    
    let timeFilter = new Date();
    switch (timeframe) {
      case '1h':
        timeFilter.setHours(timeFilter.getHours() - 1);
        break;
      case '6h':
        timeFilter.setHours(timeFilter.getHours() - 6);
        break;
      case '24h':
        timeFilter.setDate(timeFilter.getDate() - 1);
        break;
      case '7d':
        timeFilter.setDate(timeFilter.getDate() - 7);
        break;
      case '30d':
        timeFilter.setDate(timeFilter.getDate() - 30);
        break;
      default:
        timeFilter.setDate(timeFilter.getDate() - 1);
    }

    const trendingPosts = await Post.aggregate([
      {
        $match: {
          createdAt: { $gte: timeFilter },
          status: 'published',
          visibility: 'public'
        }
      },
      {
        $addFields: {
          trendingScore: {
            $add: [
              { $multiply: [{ $size: '$likes' }, 1] },
              { $multiply: [{ $size: '$comments' }, 2] },
              { $multiply: [{ $size: '$shares' }, 3] },
              { $multiply: [{ $size: '$bookmarks' }, 0.5] }
            ]
          }
        }
      },
      { $match: { trendingScore: { $gt: 0 } } },
      { $sort: { trendingScore: -1, createdAt: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                username: 1,
                displayName: 1,
                profilePicture: 1,
                isVerified: 1,
                level: 1
              }
            }
          ]
        }
      },
      { $unwind: '$user' },
      {
        $addFields: {
          'stats.likeCount': { $size: '$likes' },
          'stats.commentCount': { $size: '$comments' },
          'stats.shareCount': { $size: '$shares' },
          'stats.bookmarkCount': { $size: '$bookmarks' }
        }
      }
    ]);

    res.json({
      posts: trendingPosts,
      timeframe,
      count: trendingPosts.length
    });

  } catch (error) {
    console.error('Get trending posts error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch trending posts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Get User's Posts
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, type = 'all' } = req.query;
    const requesterId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        message: 'Invalid user ID',
        error: 'INVALID_USER_ID'
      });
    }

    const skip = (page - 1) * limit;
    
    // Build query based on privacy and relationship
    let query = { 
      user: userId,
      status: 'published'
    };

    // Check if requester can see private posts
    if (requesterId !== userId) {
      const targetUser = await User.findById(userId).select('friends following followers');
      const requester = await User.findById(requesterId).select('following friends');
      
      const isFriend = targetUser.friends?.includes(requesterId);
      const isFollowing = requester?.following?.includes(userId);
      const isFollower = targetUser.followers?.includes(requesterId);
      
      if (isFriend || (isFollowing && isFollower)) {
        query.visibility = { $in: ['public', 'friends'] };
      } else {
        query.visibility = 'public';
      }
    }

    if (type !== 'all') {
      query.type = type;
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'username displayName profilePicture isVerified level')
      .lean();

    // Add interaction data
    const postsWithStats = posts.map(post => ({
      ...post,
      isLiked: requesterId ? post.likes.includes(requesterId) : false,
      isBookmarked: requesterId ? post.bookmarks.includes(requesterId) : false,
      stats: {
        likeCount: post.likes.length,
        commentCount: post.comments.length,
        shareCount: post.shares.length,
        bookmarkCount: post.bookmarks.length
      }
    }));

    const totalPosts = await Post.countDocuments(query);

    res.json({
      posts: postsWithStats,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(totalPosts / limit),
        total: totalPosts
      }
    });

  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch user posts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Stub functions for missing routes
const stubFunction = (name) => (req, res) => {
  res.status(501).json({
    message: `${name} endpoint not implemented yet`,
    error: 'NOT_IMPLEMENTED'
  });
};

module.exports = {
  createPost: [upload.array('images', 5), exports.createPost],
  getPosts: exports.getPosts,
  getPostById: exports.getPostById,
  updatePost: exports.updatePost,
  deletePost: exports.deletePost,
  likePost: exports.likePost,
  bookmarkPost: exports.bookmarkPost,
  sharePost: exports.sharePost,
  voteOnPoll: exports.voteOnPoll,
  getTrendingPosts: exports.getTrendingPosts,
  getUserPosts: exports.getUserPosts,
  
  // Missing functions as stubs
  getPublicPosts: stubFunction('getPublicPosts'),
  getPostsByHashtag: stubFunction('getPostsByHashtag'),
  getPostsByLocation: stubFunction('getPostsByLocation'),
  reportPost: stubFunction('reportPost'),
  getPollResults: stubFunction('getPollResults'),
  repostPost: stubFunction('repostPost'),
  getPostAnalytics: stubFunction('getPostAnalytics'),
  getPostEngagement: stubFunction('getPostEngagement'),
  pinPost: stubFunction('pinPost'),
  unpinPost: stubFunction('unpinPost'),
  getScheduledPosts: stubFunction('getScheduledPosts'),
  updateScheduledPost: stubFunction('updateScheduledPost'),
  cancelScheduledPost: stubFunction('cancelScheduledPost'),
  createDraft: stubFunction('createDraft'),
  getDrafts: stubFunction('getDrafts'),
  updateDraft: stubFunction('updateDraft'),
  deleteDraft: stubFunction('deleteDraft'),
  publishDraft: stubFunction('publishDraft'),
  bulkDeletePosts: stubFunction('bulkDeletePosts'),
  bulkUpdateVisibility: stubFunction('bulkUpdateVisibility'),
  advancedSearch: stubFunction('advancedSearch'),
  getPersonalizedFeed: stubFunction('getPersonalizedFeed'),
  getSimilarPosts: stubFunction('getSimilarPosts'),
  getUserLikedPosts: stubFunction('getUserLikedPosts'),
  getUserBookmarkedPosts: stubFunction('getUserBookmarkedPosts'),
  getFollowingFeed: stubFunction('getFollowingFeed'),
  getFriendsFeed: stubFunction('getFriendsFeed'),
  getLocalFeed: stubFunction('getLocalFeed'),
  getFlaggedPosts: stubFunction('getFlaggedPosts'),
  approvePost: stubFunction('approvePost'),
  rejectPost: stubFunction('rejectPost'),
  getAdminAnalytics: stubFunction('getAdminAnalytics'),
  exportUserPosts: stubFunction('exportUserPosts'),
  exportUserInteractions: stubFunction('exportUserInteractions')
};