// controllers/profileController.js
const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const sharp = require('sharp');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Image processing for profile pictures
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for profile pictures!'));
    }
  }
});

// Process profile picture
const processProfilePicture = async (buffer, filename) => {
  try {
    const processedImage = await sharp(buffer)
      .resize(400, 400, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 90 })
      .toBuffer();
    
    const uploadPath = path.join(__dirname, '../uploads/profiles');
    await fs.mkdir(uploadPath, { recursive: true });
    
    const imagePath = path.join(uploadPath, filename);
    await fs.writeFile(imagePath, processedImage);
    
    return `/uploads/profiles/${filename}`;
  } catch (error) {
    console.error('Profile picture processing error:', error);
    throw new Error('Failed to process profile picture');
  }
};

// Enhanced Get User Profile
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.userId;
    const { includeStats = true, includePosts = true, postsLimit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        message: 'Invalid user ID',
        error: 'INVALID_USER_ID'
      });
    }

    // Get user with comprehensive data
    const userAggregation = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'followers',
          foreignField: '_id',
          as: 'followersData',
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
      {
        $lookup: {
          from: 'users',
          localField: 'following',
          foreignField: '_id',
          as: 'followingData',
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
      {
        $lookup: {
          from: 'users',
          localField: 'friends',
          foreignField: '_id',
          as: 'friendsData',
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
      {
        $addFields: {
          isOwnProfile: requesterId ? { $eq: ['$_id', new mongoose.Types.ObjectId(requesterId)] } : false,
          isFollowing: requesterId ? { $in: [new mongoose.Types.ObjectId(requesterId), '$followers'] } : false,
          isFriend: requesterId ? { $in: [new mongoose.Types.ObjectId(requesterId), '$friends'] } : false,
          isBlocked: requesterId ? { $in: [new mongoose.Types.ObjectId(requesterId), '$blockedUsers'] } : false,
          hasBlockedRequester: requesterId ? { $in: [new mongoose.Types.ObjectId(requesterId), '$blockedBy'] } : false,
          followerCount: { $size: '$followers' },
          followingCount: { $size: '$following' },
          friendCount: { $size: '$friends' }
        }
      },
      {
        $project: {
          password: 0,
          email: { $cond: [{ $eq: ['$_id', new mongoose.Types.ObjectId(requesterId || '000000000000000000000000')] }, '$email', '$$REMOVE'] },
          blockedUsers: 0,
          blockedBy: 0,
          refreshTokens: 0,
          resetPasswordToken: 0,
          resetPasswordExpires: 0,
          emailVerificationToken: 0
        }
      }
    ]);

    if (!userAggregation || userAggregation.length === 0) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    const user = userAggregation[0];

    // Check if profile is blocked
    if (user.hasBlockedRequester) {
      return res.status(403).json({ 
        message: 'You cannot view this profile',
        error: 'PROFILE_BLOCKED'
      });
    }

    // Check privacy settings
    if (user.privacy.profileVisibility === 'private' && !user.isOwnProfile && !user.isFriend) {
      return res.status(403).json({ 
        message: 'This profile is private',
        error: 'PRIVATE_PROFILE'
      });
    }

    let posts = [];
    let postStats = {};

    // Get user's posts if requested
    if (includePosts === 'true') {
      const postQuery = { 
        user: userId,
        status: 'published'
      };

      // Apply privacy filters
      if (!user.isOwnProfile) {
        if (user.isFriend) {
          postQuery.visibility = { $in: ['public', 'friends'] };
        } else {
          postQuery.visibility = 'public';
        }
      }

      posts = await Post.find(postQuery)
        .sort({ createdAt: -1 })
        .limit(parseInt(postsLimit))
        .populate('user', 'username displayName profilePicture isVerified level')
        .lean();

      // Add interaction data
      posts = posts.map(post => ({
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
    }

    // Get comprehensive stats if requested
    if (includeStats === 'true') {
      const statsAggregation = await Post.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), status: 'published' } },
        {
          $group: {
            _id: null,
            totalPosts: { $sum: 1 },
            totalLikes: { $sum: { $size: '$likes' } },
            totalComments: { $sum: { $size: '$comments' } },
            totalShares: { $sum: { $size: '$shares' } },
            totalBookmarks: { $sum: { $size: '$bookmarks' } },
            avgEngagement: { 
              $avg: { 
                $add: [
                  { $size: '$likes' },
                  { $size: '$comments' },
                  { $size: '$shares' }
                ]
              }
            }
          }
        }
      ]);

      postStats = statsAggregation[0] || {
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalBookmarks: 0,
        avgEngagement: 0
      };

      // Get posting activity (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const activityStats = await Post.aggregate([
        { 
          $match: { 
            user: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: thirtyDaysAgo },
            status: 'published'
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      postStats.recentActivity = activityStats;
    }

    // Track profile view (if not own profile)
    if (requesterId && !user.isOwnProfile) {
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.profileViews': 1 },
        $addToSet: { 'stats.recentViewers': requesterId }
      });

      // Keep only last 50 viewers
      await User.findByIdAndUpdate(userId, {
        $push: {
          'stats.recentViewers': {
            $each: [],
            $slice: -50
          }
        }
      });
    }

    // Get mutual connections
    let mutualConnections = [];
    if (requesterId && !user.isOwnProfile) {
      const requester = await User.findById(requesterId).select('following friends');
      
      const mutualFollowing = user.followingData.filter(followedUser => 
        requester.following.includes(followedUser._id)
      );
      
      const mutualFriends = user.friendsData.filter(friend => 
        requester.friends?.includes(friend._id)
      );

      mutualConnections = {
        following: mutualFollowing.slice(0, 10),
        friends: mutualFriends.slice(0, 10),
        totalMutualFollowing: mutualFollowing.length,
        totalMutualFriends: mutualFriends.length
      };
    }

    // Build response based on privacy and relationship
    const response = {
      user: {
        ...user,
        // Hide sensitive data based on privacy settings
        email: user.isOwnProfile ? user.email : undefined,
        followersData: user.privacy.showFollowers || user.isOwnProfile || user.isFriend ? user.followersData : [],
        followingData: user.privacy.showFollowing || user.isOwnProfile || user.isFriend ? user.followingData : [],
        friendsData: user.privacy.showFriends || user.isOwnProfile || user.isFriend ? user.friendsData : []
      },
      posts: includePosts === 'true' ? posts : undefined,
      stats: includeStats === 'true' ? postStats : undefined,
      mutualConnections: requesterId && !user.isOwnProfile ? mutualConnections : undefined,
      relationship: {
        isOwnProfile: user.isOwnProfile,
        isFollowing: user.isFollowing,
        isFriend: user.isFriend,
        isBlocked: user.isBlocked
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Enhanced Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.userId;
    const { 
      displayName, 
      bio, 
      location, 
      website, 
      dateOfBirth,
      privacy,
      preferences,
      socialLinks
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        message: 'Invalid user ID',
        error: 'INVALID_USER_ID'
      });
    }

    // Make sure user is updating their own profile
    if (userId !== requesterId) {
      return res.status(403).json({ 
        message: 'You can only update your own profile',
        error: 'UNAUTHORIZED_UPDATE'
      });
    }

    const user = await User.findById(requesterId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    // Validate inputs
    if (displayName && displayName.length > 50) {
      return res.status(400).json({ 
        message: 'Display name too long (max 50 characters)',
        error: 'DISPLAY_NAME_TOO_LONG'
      });
    }

    if (bio && bio.length > 500) {
      return res.status(400).json({ 
        message: 'Bio too long (max 500 characters)',
        error: 'BIO_TOO_LONG'
      });
    }

    if (website && !isValidUrl(website)) {
      return res.status(400).json({ 
        message: 'Invalid website URL',
        error: 'INVALID_WEBSITE_URL'
      });
    }

    // Process profile picture if uploaded
    let profilePictureUrl = user.profilePicture;
    if (req.file) {
      const filename = `profile-${userId}-${Date.now()}.jpg`;
      profilePictureUrl = await processProfilePicture(req.file.buffer, filename);
      
      // Delete old profile picture
      if (user.profilePicture && user.profilePicture.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '..', user.profilePicture);
        try {
          await fs.unlink(oldPath);
        } catch (fileError) {
          console.error('Error deleting old profile picture:', fileError);
        }
      }
    }

    // Update user fields
    const updateData = {};
    
    if (displayName !== undefined) updateData.displayName = displayName.trim();
    if (bio !== undefined) updateData.bio = bio.trim();
    if (location !== undefined) updateData.location = location.trim();
    if (website !== undefined) updateData.website = website.trim();
    if (dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dateOfBirth);
    if (profilePictureUrl !== user.profilePicture) updateData.profilePicture = profilePictureUrl;

    // Update privacy settings
    if (privacy) {
      updateData.privacy = {
        ...user.privacy,
        ...privacy
      };
    }

    // Update preferences
    if (preferences) {
      updateData.preferences = {
        ...user.preferences,
        ...preferences
      };
    }

    // Update social links
    if (socialLinks) {
      updateData.socialLinks = {
        ...user.socialLinks,
        ...socialLinks
      };
    }

    updateData.updatedAt = new Date();

    const updatedUser = await User.findByIdAndUpdate(
      requesterId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -refreshTokens -resetPasswordToken -resetPasswordExpires -emailVerificationToken');

    // Award experience for profile completion
    let experienceGained = 0;
    if (!user.displayName && displayName) experienceGained += 10;
    if (!user.bio && bio) experienceGained += 15;
    if (!user.profilePicture && profilePictureUrl) experienceGained += 20;
    if (!user.location && location) experienceGained += 5;

    if (experienceGained > 0) {
      await updatedUser.addExperience(experienceGained);
    }

    res.json({
      message: 'Profile updated successfully! ✨',
      user: updatedUser,
      experienceGained,
      success: true
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Enhanced Follow/Unfollow User
exports.followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        message: 'Invalid user ID',
        error: 'INVALID_USER_ID'
      });
    }

    if (userId === requesterId) {
      return res.status(400).json({ 
        message: 'You cannot follow yourself',
        error: 'CANNOT_FOLLOW_SELF'
      });
    }

    const [userToFollow, currentUser] = await Promise.all([
      User.findById(userId),
      User.findById(requesterId)
    ]);

    if (!userToFollow || !currentUser) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    // Check if user is blocked
    if (userToFollow.blockedUsers.includes(requesterId) || currentUser.blockedUsers.includes(userId)) {
      return res.status(403).json({ 
        message: 'Cannot follow this user',
        error: 'USER_BLOCKED'
      });
    }

    const isFollowing = currentUser.following.includes(userId);
    let action, message, experienceGained = 0;

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(id => id.toString() !== userId);
      userToFollow.followers = userToFollow.followers.filter(id => id.toString() !== requesterId);
      
      // Remove from friends if they were friends
      if (currentUser.friends?.includes(userId)) {
        currentUser.friends = currentUser.friends.filter(id => id.toString() !== userId);
        userToFollow.friends = userToFollow.friends?.filter(id => id.toString() !== requesterId) || [];
      }

      action = 'unfollowed';
      message = `You unfollowed ${userToFollow.displayName || userToFollow.username}`;

    } else {
      // Follow
      currentUser.following.push(userId);
      userToFollow.followers.push(requesterId);

      // Check if this creates a mutual follow (friendship)
      const isFollowingBack = userToFollow.following.includes(requesterId);
      if (isFollowingBack) {
        // Create friendship
        if (!currentUser.friends) currentUser.friends = [];
        if (!userToFollow.friends) userToFollow.friends = [];
        
        currentUser.friends.push(userId);
        userToFollow.friends.push(requesterId);
        
        experienceGained = 25; // Bonus XP for making a friend
        message = `You are now friends with ${userToFollow.displayName || userToFollow.username}! 🎉`;
      } else {
        experienceGained = 5;
        message = `You are now following ${userToFollow.displayName || userToFollow.username}`;
      }

      action = 'followed';

      // Create notification for the followed user
      await new Notification({
        recipient: userId,
        sender: requesterId,
        type: isFollowingBack ? 'friendship' : 'follow',
        message: isFollowingBack 
          ? `${currentUser.displayName || currentUser.username} is now your friend!`
          : `${currentUser.displayName || currentUser.username} started following you`,
        data: {
          senderInfo: {
            username: currentUser.username,
            displayName: currentUser.displayName,
            profilePicture: currentUser.profilePicture,
            isVerified: currentUser.isVerified,
            level: currentUser.level
          },
          actionType: isFollowingBack ? 'friendship' : 'follow'
        }
      }).save();

      // Real-time notification
      const io = req.app.get('io');
      io.to(`user_${userId}`).emit('new_notification', {
        type: isFollowingBack ? 'friendship' : 'follow',
        message: isFollowingBack 
          ? `${currentUser.displayName || currentUser.username} is now your friend!`
          : `${currentUser.displayName || currentUser.username} started following you`,
        sender: {
          username: currentUser.username,
          displayName: currentUser.displayName,
          profilePicture: currentUser.profilePicture,
          isVerified: currentUser.isVerified,
          level: currentUser.level
        }
      });
    }

    // Save both users
    await Promise.all([currentUser.save(), userToFollow.save()]);

    // Award experience
    if (experienceGained > 0) {
      await currentUser.addExperience(experienceGained);
    }

    res.json({
      message,
      action,
      isFollowing: !isFollowing,
      isFriend: !isFollowing && userToFollow.following.includes(requesterId),
      followerCount: userToFollow.followers.length,
      followingCount: currentUser.following.length,
      experienceGained,
      success: true
    });

  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ 
      message: 'Failed to process follow request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Block/Unblock User
exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        message: 'Invalid user ID',
        error: 'INVALID_USER_ID'
      });
    }

    if (userId === requesterId) {
      return res.status(400).json({ 
        message: 'You cannot block yourself',
        error: 'CANNOT_BLOCK_SELF'
      });
    }

    const [userToBlock, currentUser] = await Promise.all([
      User.findById(userId),
      User.findById(requesterId)
    ]);

    if (!userToBlock || !currentUser) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    const isBlocked = currentUser.blockedUsers.includes(userId);
    let action, message;

    if (isBlocked) {
      // Unblock
      currentUser.blockedUsers = currentUser.blockedUsers.filter(id => id.toString() !== userId);
      userToBlock.blockedBy = userToBlock.blockedBy.filter(id => id.toString() !== requesterId);
      
      action = 'unblocked';
      message = `You unblocked ${userToBlock.displayName || userToBlock.username}`;

    } else {
      // Block
      currentUser.blockedUsers.push(userId);
      userToBlock.blockedBy.push(requesterId);

      // Remove from following/followers and friends
      currentUser.following = currentUser.following.filter(id => id.toString() !== userId);
      currentUser.friends = currentUser.friends?.filter(id => id.toString() !== userId) || [];
      
      userToBlock.followers = userToBlock.followers.filter(id => id.toString() !== requesterId);
      userToBlock.following = userToBlock.following.filter(id => id.toString() !== requesterId);
      userToBlock.friends = userToBlock.friends?.filter(id => id.toString() !== requesterId) || [];

      action = 'blocked';
      message = `You blocked ${userToBlock.displayName || userToBlock.username}`;
    }

    await Promise.all([currentUser.save(), userToBlock.save()]);

    res.json({
      message,
      action,
      isBlocked: !isBlocked,
      success: true
    });

  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ 
      message: 'Failed to process block request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Get User's Followers
exports.getUserFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, search } = req.query;
    const requesterId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        message: 'Invalid user ID',
        error: 'INVALID_USER_ID'
      });
    }

    const skip = (page - 1) * limit;

    // Check if user exists and privacy settings
    const user = await User.findById(userId).select('privacy followers friends');
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    // Check privacy permissions
    const isOwnProfile = userId === requesterId;
    const isFriend = user.friends?.includes(requesterId);
    
    if (!user.privacy.showFollowers && !isOwnProfile && !isFriend) {
      return res.status(403).json({ 
        message: 'Followers list is private',
        error: 'PRIVATE_FOLLOWERS'
      });
    }

    // Build query for followers
    let matchQuery = { _id: { $in: user.followers } };
    
    if (search) {
      matchQuery.$or = [
        { username: new RegExp(search, 'i') },
        { displayName: new RegExp(search, 'i') }
      ];
    }

    const followers = await User.find(matchQuery)
      .select('username displayName profilePicture isVerified level badges followerCount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Add relationship data
    const followersWithRelationship = followers.map(follower => ({
      ...follower,
      isFollowing: requesterId ? user.following?.includes(follower._id) : false,
      isFriend: requesterId ? user.friends?.includes(follower._id) : false
    }));

    const totalFollowers = await User.countDocuments(matchQuery);

    res.json({
      followers: followersWithRelationship,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(totalFollowers / limit),
        total: totalFollowers
      }
    });

  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch followers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Get User's Following
exports.getUserFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, search } = req.query;
    const requesterId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        message: 'Invalid user ID',
        error: 'INVALID_USER_ID'
      });
    }

    const skip = (page - 1) * limit;

    // Check if user exists and privacy settings
    const user = await User.findById(userId).select('privacy following friends');
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    // Check privacy permissions
    const isOwnProfile = userId === requesterId;
    const isFriend = user.friends?.includes(requesterId);
    
    if (!user.privacy.showFollowing && !isOwnProfile && !isFriend) {
      return res.status(403).json({ 
        message: 'Following list is private',
        error: 'PRIVATE_FOLLOWING'
      });
    }

    // Build query for following
    let matchQuery = { _id: { $in: user.following } };
    
    if (search) {
      matchQuery.$or = [
        { username: new RegExp(search, 'i') },
        { displayName: new RegExp(search, 'i') }
      ];
    }

    const following = await User.find(matchQuery)
      .select('username displayName profilePicture isVerified level badges followerCount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Add relationship data
    const followingWithRelationship = following.map(followedUser => ({
      ...followedUser,
      isFollowing: true, // They're in the following list
      isFriend: requesterId ? user.friends?.includes(followedUser._id) : false
    }));

    const totalFollowing = await User.countDocuments(matchQuery);

    res.json({
      following: followingWithRelationship,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(totalFollowing / limit),
        total: totalFollowing
      }
    });

  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch following',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Get Profile Analytics (for own profile)
exports.getProfileAnalytics = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.userId;
    const { timeframe = '30d' } = req.query;

    if (userId !== requesterId) {
      return res.status(403).json({ 
        message: 'You can only view analytics for your own profile',
        error: 'UNAUTHORIZED_ACCESS'
      });
    }

    // Calculate date range
    let startDate = new Date();
    switch (timeframe) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const user = await User.findById(userId);
    
    // Get post analytics
    const postAnalytics = await Post.aggregate([
      { 
        $match: { 
          user: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate },
          status: 'published'
        }
      },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalLikes: { $sum: { $size: '$likes' } },
          totalComments: { $sum: { $size: '$comments' } },
          totalShares: { $sum: { $size: '$shares' } },
          totalBookmarks: { $sum: { $size: '$bookmarks' } },
          avgEngagement: { 
            $avg: { 
              $add: [
                { $size: '$likes' },
                { $size: '$comments' },
                { $size: '$shares' }
              ]
            }
          }
        }
      }
    ]);

    // Get follower growth
    const followerGrowth = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      {
        $project: {
          followerGrowth: {
            $filter: {
              input: '$stats.followerHistory',
              cond: { $gte: ['$$this.date', startDate] }
            }
          }
        }
      }
    ]);

    // Get top performing posts
    const topPosts = await Post.find({
      user: userId,
      createdAt: { $gte: startDate },
      status: 'published'
    })
    .sort({ 'engagement.score': -1 })
    .limit(5)
    .select('content media createdAt likes comments shares bookmarks engagement')
    .lean();

    const analytics = {
      timeframe,
      overview: postAnalytics[0] || {
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalBookmarks: 0,
        avgEngagement: 0
      },
      profile: {
        profileViews: user.stats.profileViews || 0,
        followerCount: user.followers.length,
        followingCount: user.following.length,
        friendCount: user.friends?.length || 0
      },
      followerGrowth: followerGrowth[0]?.followerGrowth || [],
      topPosts: topPosts.map(post => ({
        ...post,
        stats: {
          likeCount: post.likes.length,
          commentCount: post.comments.length,
          shareCount: post.shares.length,
          bookmarkCount: post.bookmarks.length
        }
      }))
    };

    res.json({
      analytics,
      success: true
    });

  } catch (error) {
    console.error('Get profile analytics error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch profile analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Helper function to validate URLs
const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

// Get User's Posts (stub function)
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const requesterId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: 'Invalid user ID',
        error: 'INVALID_USER_ID'
      });
    }

    const skip = (page - 1) * limit;
    
    const posts = await Post.find({
      user: userId,
      status: 'published',
      visibility: 'public'
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('user', 'username displayName profilePicture isVerified level')
    .lean();

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

    const totalPosts = await Post.countDocuments({
      user: userId,
      status: 'published',
      visibility: 'public'
    });

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

// Missing functions - adding stubs
exports.getUserMediaPosts = async (req, res) => {
  res.json({ posts: [], message: 'Media posts feature coming soon' });
};

exports.uploadProfilePicture = async (req, res) => {
  res.json({ message: 'Profile picture upload feature coming soon' });
};

exports.uploadCoverPhoto = async (req, res) => {
  res.json({ message: 'Cover photo upload feature coming soon' });
};

exports.deleteProfilePicture = async (req, res) => {
  res.json({ message: 'Delete profile picture feature coming soon' });
};

exports.deleteCoverPhoto = async (req, res) => {
  res.json({ message: 'Delete cover photo feature coming soon' });
};

exports.updateStatus = async (req, res) => {
  res.json({ message: 'Update status feature coming soon' });
};

exports.getProfileInsights = async (req, res) => {
  res.json({ insights: {}, message: 'Profile insights feature coming soon' });
};

exports.getEngagementMetrics = async (req, res) => {
  res.json({ metrics: {}, message: 'Engagement metrics feature coming soon' });
};

exports.getFollowerGrowth = async (req, res) => {
  res.json({ growth: [], message: 'Follower growth feature coming soon' });
};

exports.getUserLikedPosts = async (req, res) => {
  res.json({ posts: [], message: 'Liked posts feature coming soon' });
};

exports.getUserBookmarkedPosts = async (req, res) => {
  res.json({ posts: [], message: 'Bookmarked posts feature coming soon' });
};

exports.getUserSharedPosts = async (req, res) => {
  res.json({ posts: [], message: 'Shared posts feature coming soon' });
};

exports.getUserTaggedPosts = async (req, res) => {
  res.json({ posts: [], message: 'Tagged posts feature coming soon' });
};

module.exports = {
  getUserProfile: exports.getUserProfile,
  updateProfile: [upload.single('profilePicture'), exports.updateProfile],
  followUser: exports.followUser,
  blockUser: exports.blockUser,
  getUserFollowers: exports.getUserFollowers,
  getUserFollowing: exports.getUserFollowing,
  getProfileAnalytics: exports.getProfileAnalytics,
  getUserPosts: exports.getUserPosts,
  getUserMediaPosts: exports.getUserMediaPosts,
  uploadProfilePicture: exports.uploadProfilePicture,
  uploadCoverPhoto: exports.uploadCoverPhoto,
  deleteProfilePicture: exports.deleteProfilePicture,
  deleteCoverPhoto: exports.deleteCoverPhoto,
  updateStatus: exports.updateStatus,
  getProfileInsights: exports.getProfileInsights,
  getEngagementMetrics: exports.getEngagementMetrics,
  getFollowerGrowth: exports.getFollowerGrowth,
  getUserLikedPosts: exports.getUserLikedPosts,
  getUserBookmarkedPosts: exports.getUserBookmarkedPosts,
  getUserSharedPosts: exports.getUserSharedPosts,
  getUserTaggedPosts: exports.getUserTaggedPosts
};