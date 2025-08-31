// controllers/commentController.js
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// Enhanced Create Comment
exports.createComment = async (req, res) => {
  try {
    const { content, parentComment, mentions = [] } = req.body;
    const { postId } = req.params;
    const userId = req.userId;

    // Validation
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Comment content is required',
        error: 'EMPTY_COMMENT'
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({ 
        message: 'Comment too long (max 1000 characters)',
        error: 'COMMENT_TOO_LONG'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ 
        message: 'Invalid post ID',
        error: 'INVALID_POST_ID'
      });
    }

    // Check if post exists and allows comments
    const post = await Post.findById(postId).populate('user', 'username displayName');
    if (!post) {
      return res.status(404).json({ 
        message: 'Post not found',
        error: 'POST_NOT_FOUND'
      });
    }

    if (!post.settings.allowComments) {
      return res.status(403).json({ 
        message: 'Comments are disabled for this post',
        error: 'COMMENTS_DISABLED'
      });
    }

    // Check if this is a reply to another comment
    let parentCommentDoc = null;
    let depth = 0;
    
    if (parentComment) {
      if (!mongoose.Types.ObjectId.isValid(parentComment)) {
        return res.status(400).json({ 
          message: 'Invalid parent comment ID',
          error: 'INVALID_PARENT_COMMENT'
        });
      }

      parentCommentDoc = await Comment.findById(parentComment);
      if (!parentCommentDoc || parentCommentDoc.post.toString() !== postId) {
        return res.status(404).json({ 
          message: 'Parent comment not found or belongs to different post',
          error: 'PARENT_COMMENT_NOT_FOUND'
        });
      }

      depth = parentCommentDoc.depth + 1;
      
      // Limit reply depth to prevent infinite nesting
      if (depth > 5) {
        return res.status(400).json({ 
          message: 'Maximum reply depth reached',
          error: 'MAX_DEPTH_REACHED'
        });
      }
    }

    // Process mentions
    const processedMentions = [];
    if (mentions.length > 0) {
      const mentionedUsers = await User.find({
        $or: [
          { username: { $in: mentions } },
          { _id: { $in: mentions.filter(m => mongoose.Types.ObjectId.isValid(m)) } }
        ]
      }).select('_id username displayName');

      processedMentions.push(...mentionedUsers.map(user => user._id));
    }

    // Extract hashtags from content
    const hashtagRegex = /#[\w]+/g;
    const hashtags = content.match(hashtagRegex) || [];
    const processedHashtags = hashtags.map(tag => tag.toLowerCase().substring(1));

    // Create comment
    const newComment = new Comment({
      user: userId,
      post: postId,
      content: content.trim(),
      parentComment: parentComment || null,
      depth,
      mentions: processedMentions,
      hashtags: processedHashtags,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceInfo: req.deviceInfo
      }
    });

    const savedComment = await newComment.save();

    // Add comment to post's comments array
    post.comments.push(savedComment._id);
    
    // Update post engagement score
    post.engagement.score = post.likes.length * 1 + post.comments.length * 2 + post.shares.length * 3;
    await post.save();

    // If this is a reply, add to parent comment's replies
    if (parentCommentDoc) {
      parentCommentDoc.replies.push(savedComment._id);
      await parentCommentDoc.save();
    }

    // Award experience points
    const commenter = await User.findById(userId);
    await commenter.addExperience(5); // 5 XP for commenting

    // Populate comment for response
    const populatedComment = await Comment.findById(savedComment._id)
      .populate('user', 'username displayName profilePicture isVerified level badges')
      .populate('mentions', 'username displayName profilePicture')
      .populate({
        path: 'replies',
        populate: {
          path: 'user',
          select: 'username displayName profilePicture isVerified level'
        },
        options: { limit: 3, sort: { createdAt: -1 } }
      });

    // Create notifications
    const notifications = [];
    
    // Notify post author (if not commenting on own post)
    if (post.user._id.toString() !== userId) {
      notifications.push({
        recipient: post.user._id,
        sender: userId,
        type: 'comment',
        message: `${commenter.displayName || commenter.username} commented on your post`,
        relatedPost: postId,
        relatedComment: savedComment._id,
        data: {
          postContent: post.content?.substring(0, 50) + (post.content?.length > 50 ? '...' : ''),
          commentContent: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          senderInfo: {
            username: commenter.username,
            displayName: commenter.displayName,
            profilePicture: commenter.profilePicture
          }
        }
      });
    }

    // Notify parent comment author (if replying and not replying to self)
    if (parentCommentDoc && parentCommentDoc.user.toString() !== userId) {
      const parentAuthor = await User.findById(parentCommentDoc.user).select('username displayName');
      notifications.push({
        recipient: parentCommentDoc.user,
        sender: userId,
        type: 'reply',
        message: `${commenter.displayName || commenter.username} replied to your comment`,
        relatedPost: postId,
        relatedComment: savedComment._id,
        data: {
          parentComment: parentCommentDoc.content.substring(0, 50) + (parentCommentDoc.content.length > 50 ? '...' : ''),
          replyContent: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          senderInfo: {
            username: commenter.username,
            displayName: commenter.displayName,
            profilePicture: commenter.profilePicture
          }
        }
      });
    }

    // Notify mentioned users
    for (const mentionedUserId of processedMentions) {
      if (mentionedUserId.toString() !== userId) {
        const mentionedUser = await User.findById(mentionedUserId).select('username displayName');
        notifications.push({
          recipient: mentionedUserId,
          sender: userId,
          type: 'mention',
          message: `${commenter.displayName || commenter.username} mentioned you in a comment`,
          relatedPost: postId,
          relatedComment: savedComment._id,
          data: {
            commentContent: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
            senderInfo: {
              username: commenter.username,
              displayName: commenter.displayName,
              profilePicture: commenter.profilePicture
            }
          }
        });
      }
    }

    // Save all notifications
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // Real-time notifications via Socket.IO
    const io = req.app.get('io');
    
    // Notify post author
    if (post.user._id.toString() !== userId) {
      io.to(`user_${post.user._id}`).emit('new_notification', {
        type: 'comment',
        message: `${commenter.displayName || commenter.username} commented on your post`,
        sender: {
          username: commenter.username,
          displayName: commenter.displayName,
          profilePicture: commenter.profilePicture
        },
        postId,
        commentId: savedComment._id
      });
    }

    // Notify all users in the post (for real-time comment updates)
    io.to(`post_${postId}`).emit('new_comment', {
      comment: populatedComment,
      postId
    });

    res.status(201).json({
      message: 'Comment posted successfully! 💬',
      comment: populatedComment,
      experienceGained: 5,
      success: true
    });

  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ 
      message: 'Failed to create comment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Get Comments for a Post
exports.getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'newest',
      parentOnly = false 
    } = req.query;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ 
        message: 'Invalid post ID',
        error: 'INVALID_POST_ID'
      });
    }

    const skip = (page - 1) * limit;

    // Build query
    let query = { 
      post: postId,
      status: 'active'
    };

    // If parentOnly is true, only get top-level comments
    if (parentOnly === 'true') {
      query.parentComment = null;
    }

    // Build sort options
    let sortOptions = {};
    switch (sortBy) {
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'popular':
        sortOptions = { 
          likeCount: -1, 
          createdAt: -1 
        };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
    }

    // Get comments with aggregation for better performance
    const comments = await Comment.aggregate([
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
          from: 'users',
          localField: 'mentions',
          foreignField: '_id',
          as: 'mentions',
          pipeline: [
            {
              $project: {
                username: 1,
                displayName: 1,
                profilePicture: 1
              }
            }
          ]
        }
      },
      {
        $lookup: {
          from: 'comments',
          localField: 'replies',
          foreignField: '_id',
          as: 'replies',
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
                isLiked: req.userId ? { $in: [new mongoose.Types.ObjectId(req.userId), '$likes'] } : false,
                likeCount: { $size: '$likes' },
                replyCount: { $size: '$replies' }
              }
            }
          ]
        }
      },
      {
        $addFields: {
          isLiked: req.userId ? { $in: [new mongoose.Types.ObjectId(req.userId), '$likes'] } : false,
          likeCount: { $size: '$likes' },
          replyCount: { $size: '$replies' }
        }
      },
      { $sort: sortOptions },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    // Get total count for pagination
    const totalComments = await Comment.countDocuments(query);

    res.json({
      comments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(totalComments / limit),
        total: totalComments,
        hasNext: page * limit < totalComments,
        hasPrev: page > 1
      },
      filters: {
        sortBy,
        parentOnly
      }
    });

  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch comments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Get Single Comment with Replies
exports.getComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ 
        message: 'Invalid comment ID',
        error: 'INVALID_COMMENT_ID'
      });
    }

    const comment = await Comment.findById(commentId)
      .populate('user', 'username displayName profilePicture isVerified level badges')
      .populate('mentions', 'username displayName profilePicture')
      .populate({
        path: 'replies',
        match: { status: 'active' },
        populate: {
          path: 'user',
          select: 'username displayName profilePicture isVerified level'
        },
        options: { sort: { createdAt: -1 } }
      })
      .lean();

    if (!comment || comment.status !== 'active') {
      return res.status(404).json({ 
        message: 'Comment not found',
        error: 'COMMENT_NOT_FOUND'
      });
    }

    // Add interaction data
    comment.isLiked = userId ? comment.likes.includes(userId) : false;
    comment.likeCount = comment.likes.length;
    comment.replyCount = comment.replies.length;

    // Add interaction data to replies
    comment.replies = comment.replies.map(reply => ({
      ...reply,
      isLiked: userId ? reply.likes.includes(userId) : false,
      likeCount: reply.likes.length,
      replyCount: reply.replies.length
    }));

    res.json({
      comment,
      success: true
    });

  } catch (error) {
    console.error('Get comment error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch comment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Update Comment
exports.updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ 
        message: 'Invalid comment ID',
        error: 'INVALID_COMMENT_ID'
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Comment content is required',
        error: 'EMPTY_COMMENT'
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({ 
        message: 'Comment too long (max 1000 characters)',
        error: 'COMMENT_TOO_LONG'
      });
    }

    const comment = await Comment.findById(commentId);
    
    if (!comment || comment.status !== 'active') {
      return res.status(404).json({ 
        message: 'Comment not found',
        error: 'COMMENT_NOT_FOUND'
      });
    }
    
    // Check ownership
    if (comment.user.toString() !== userId) {
      return res.status(403).json({ 
        message: 'You can only edit your own comments',
        error: 'UNAUTHORIZED_EDIT'
      });
    }

    // Check edit time limit (15 minutes for free users)
    const user = await User.findById(userId);
    const minutesSinceCreation = (Date.now() - comment.createdAt.getTime()) / (1000 * 60);
    
    if (user.subscription.type === 'free' && minutesSinceCreation > 15) {
      return res.status(403).json({ 
        message: 'Comments can only be edited within 15 minutes (upgrade to Premium for unlimited editing)',
        error: 'EDIT_TIME_EXPIRED'
      });
    }

    // Extract hashtags from new content
    const hashtagRegex = /#[\w]+/g;
    const hashtags = content.match(hashtagRegex) || [];
    const processedHashtags = hashtags.map(tag => tag.toLowerCase().substring(1));

    // Update comment
    comment.content = content.trim();
    comment.hashtags = processedHashtags;
    comment.editedAt = new Date();
    comment.editCount = (comment.editCount || 0) + 1;

    await comment.save();

    // Populate updated comment
    const updatedComment = await Comment.findById(commentId)
      .populate('user', 'username displayName profilePicture isVerified level')
      .populate('mentions', 'username displayName profilePicture');

    // Real-time update
    const io = req.app.get('io');
    io.to(`post_${comment.post}`).emit('comment_updated', {
      comment: updatedComment
    });

    res.json({
      message: 'Comment updated successfully! ✨',
      comment: updatedComment,
      success: true
    });

  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ 
      message: 'Failed to update comment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Enhanced Delete Comment
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ 
        message: 'Invalid comment ID',
        error: 'INVALID_COMMENT_ID'
      });
    }

    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({ 
        message: 'Comment not found',
        error: 'COMMENT_NOT_FOUND'
      });
    }
    
    // Check ownership or admin privileges
    const user = await User.findById(userId);
    if (comment.user.toString() !== userId && !user.isAdmin) {
      return res.status(403).json({ 
        message: 'You can only delete your own comments',
        error: 'UNAUTHORIZED_DELETE'
      });
    }

    // Soft delete - mark as deleted instead of removing
    comment.status = 'deleted';
    comment.deletedAt = new Date();
    comment.deletedBy = userId;
    
    // If admin deleted it, mark as moderated
    if (user.isAdmin && comment.user.toString() !== userId) {
      comment.moderatedBy = userId;
      comment.moderationReason = 'Admin deletion';
    }

    await comment.save();

    // Remove from post's comments array
    await Post.findByIdAndUpdate(comment.post, {
      $pull: { comments: commentId }
    });

    // Remove from parent comment's replies if it's a reply
    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(comment.parentComment, {
        $pull: { replies: commentId }
      });
    }

    // Recursively soft delete all replies
    const deleteReplies = async (parentId) => {
      const replies = await Comment.find({ parentComment: parentId, status: 'active' });
      for (const reply of replies) {
        reply.status = 'deleted';
        reply.deletedAt = new Date();
        reply.deletedBy = userId;
        await reply.save();
        
        // Recursively delete nested replies
        await deleteReplies(reply._id);
      }
    };

    await deleteReplies(commentId);

    // Real-time update
    const io = req.app.get('io');
    io.to(`post_${comment.post}`).emit('comment_deleted', {
      commentId,
      postId: comment.post
    });

    res.json({
      message: 'Comment deleted successfully! 🗑️',
      success: true
    });

  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ 
      message: 'Failed to delete comment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Enhanced Like/Unlike Comment
exports.likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ 
        message: 'Invalid comment ID',
        error: 'INVALID_COMMENT_ID'
      });
    }

    const comment = await Comment.findById(commentId).populate('user', 'username displayName');
    
    if (!comment || comment.status !== 'active') {
      return res.status(404).json({ 
        message: 'Comment not found',
        error: 'COMMENT_NOT_FOUND'
      });
    }

    const isLiked = comment.likes.includes(userId);
    let action, message;

    if (isLiked) {
      // Unlike the comment
      comment.likes = comment.likes.filter(like => like.toString() !== userId);
      action = 'unliked';
      message = 'Comment unliked';
    } else {
      // Like the comment
      comment.likes.push(userId);
      action = 'liked';
      message = 'Comment liked! ❤️';

      // Award experience to comment author (but not to self)
      if (comment.user._id.toString() !== userId) {
        await User.findByIdAndUpdate(comment.user._id, {
          $inc: { experience: 1 }
        });

        // Create notification for comment author
        const liker = await User.findById(userId).select('username displayName profilePicture');
        
        await new Notification({
          recipient: comment.user._id,
          sender: userId,
          type: 'comment_like',
          message: `${liker.displayName || liker.username} liked your comment`,
          relatedPost: comment.post,
          relatedComment: commentId,
          data: {
            commentContent: comment.content.substring(0, 50) + (comment.content.length > 50 ? '...' : ''),
            senderInfo: {
              username: liker.username,
              displayName: liker.displayName,
              profilePicture: liker.profilePicture
            }
          }
        }).save();

        // Real-time notification
        const io = req.app.get('io');
        io.to(`user_${comment.user._id}`).emit('new_notification', {
          type: 'comment_like',
          message: `${liker.displayName || liker.username} liked your comment`,
          sender: liker,
          commentId
        });
      }
    }

    await comment.save();

    // Real-time update
    const io = req.app.get('io');
    io.to(`post_${comment.post}`).emit('comment_liked', {
      commentId,
      likeCount: comment.likes.length,
      isLiked: !isLiked,
      action
    });

    res.json({
      message,
      action,
      likeCount: comment.likes.length,
      isLiked: !isLiked,
      success: true
    });

  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({ 
      message: 'Failed to process like',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Report Comment
exports.reportComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { reason, description } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ 
        message: 'Invalid comment ID',
        error: 'INVALID_COMMENT_ID'
      });
    }

    const comment = await Comment.findById(commentId);
    
    if (!comment || comment.status !== 'active') {
      return res.status(404).json({ 
        message: 'Comment not found',
        error: 'COMMENT_NOT_FOUND'
      });
    }

    // Check if user already reported this comment
    const existingReport = comment.reports.find(report => report.reporter.toString() === userId);
    if (existingReport) {
      return res.status(400).json({ 
        message: 'You have already reported this comment',
        error: 'ALREADY_REPORTED'
      });
    }

    // Add report
    comment.reports.push({
      reporter: userId,
      reason,
      description,
      reportedAt: new Date()
    });

    // If comment has multiple reports, flag for moderation
    if (comment.reports.length >= 3) {
      comment.status = 'flagged';
      comment.flaggedAt = new Date();
    }

    await comment.save();

    res.json({
      message: 'Comment reported successfully. Thank you for helping keep our community safe! 🛡️',
      success: true
    });

  } catch (error) {
    console.error('Report comment error:', error);
    res.status(500).json({ 
      message: 'Failed to report comment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

// Get Comment Analytics (for comment author)
exports.getCommentAnalytics = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ 
        message: 'Invalid comment ID',
        error: 'INVALID_COMMENT_ID'
      });
    }

    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({ 
        message: 'Comment not found',
        error: 'COMMENT_NOT_FOUND'
      });
    }

    // Check ownership
    if (comment.user.toString() !== userId) {
      return res.status(403).json({ 
        message: 'You can only view analytics for your own comments',
        error: 'UNAUTHORIZED_ACCESS'
      });
    }

    const analytics = {
      commentId,
      stats: {
        likes: comment.likes.length,
        replies: comment.replies.length,
        reports: comment.reports.length
      },
      engagement: {
        totalInteractions: comment.likes.length + comment.replies.length,
        engagementRate: comment.likes.length > 0 ? (comment.replies.length / comment.likes.length * 100).toFixed(2) : 0
      },
      timeline: {
        createdAt: comment.createdAt,
        editedAt: comment.editedAt,
        editCount: comment.editCount || 0
      }
    };

    res.json({
      analytics,
      success: true
    });

  } catch (error) {
    console.error('Get comment analytics error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch comment analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  createComment: exports.createComment,
  getComments: exports.getComments,
  getComment: exports.getComment,
  updateComment: exports.updateComment,
  deleteComment: exports.deleteComment,
  likeComment: exports.likeComment,
  reportComment: exports.reportComment,
  getCommentAnalytics: exports.getCommentAnalytics
};