
// js/posts.js
// Posts related functionality

// DOM elements
const postsContainer = document.getElementById('posts-container');
const postForm = document.getElementById('post-form');

// Load all posts for the feed
const loadPosts = async () => {
    try {
        const posts = await ApiService.getPosts();
        renderPosts(posts);
    } catch (error) {
        console.error('Load posts error:', error);
        showToast('Failed to load posts', 'error');
    }
};

// Render posts to the DOM
const renderPosts = (posts) => {
    postsContainer.innerHTML = '';
    
    if (posts.length === 0) {
        postsContainer.innerHTML = '<p class="no-posts">No posts yet. Be the first to post!</p>';
        return;
    }
    
    posts.forEach(post => {
        const postElement = createPostElement(post);
        postsContainer.appendChild(postElement);
    });
};

// Create a post element
const createPostElement = (post) => {
    const postElement = document.createElement('div');
    postElement.classList.add('post');
    postElement.dataset.id = post._id;
    
    const isCurrentUserPost = currentUser && post.user._id === currentUser.id;
    
    postElement.innerHTML = `
        <div class="post-header">
            <img src="${post.user.profilePicture || 'images/default-profile.jpg'}" alt="Profile Picture">
            <a href="#" class="post-username" data-userid="${post.user._id}">${post.user.username}</a>
            <span class="post-date">${formatDate(post.createdAt)}</span>
            ${isCurrentUserPost ? '<button class="delete-post-btn"><i class="fas fa-trash"></i></button>' : ''}
        </div>
        <div class="post-content">
            <p>${post.content}</p>
            ${post.image ? `<img src="${post.image}" alt="Post Image" class="post-image">` : ''}
        </div>
        <div class="post-actions">
            <button class="like-btn ${post.likes.includes(currentUser?.id) ? 'liked' : ''}">
                <i class="fas fa-heart"></i> <span class="likes-count">${post.likes.length}</span> Likes
            </button>
            <button class="comment-btn">
                <i class="fas fa-comment"></i> <span class="comments-count">${post.comments.length}</span> Comments
            </button>
        </div>
        <div class="post-comments">
            ${renderComments(post.comments)}
            <div class="add-comment">
                <input type="text" placeholder="Add a comment..." class="comment-input">
                <button class="comment-submit-btn">Post</button>
            </div>
        </div>
    `;
    
    // Add event listeners
    const likeBtn = postElement.querySelector('.like-btn');
    likeBtn.addEventListener('click', () => handleLikePost(post._id, likeBtn));
    
    const commentInput = postElement.querySelector('.comment-input');
    const commentSubmitBtn = postElement.querySelector('.comment-submit-btn');
    commentSubmitBtn.addEventListener('click', () => handleAddComment(post._id, commentInput));
    
    if (isCurrentUserPost) {
        const deleteBtn = postElement.querySelector('.delete-post-btn');
        deleteBtn.addEventListener('click', () => handleDeletePost(post._id));
    }
    
    const usernameLink = postElement.querySelector('.post-username');
    usernameLink.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToProfile(post.user._id);
    });
    
    return postElement;
};

// Render comments for a post
const renderComments = (comments) => {
    if (!comments || comments.length === 0) return '';
    
    return comments.map(comment => `
        <div class="comment" data-id="${comment._id}">
            <img src="${comment.user.profilePicture || 'images/default-profile.jpg'}" alt="Profile Picture">
            <div class="comment-content">
                <a href="#" class="comment-username" data-userid="${comment.user._id}">${comment.user.username}</a>
                <p>${comment.content}</p>
                ${comment.user._id === currentUser?.id ? 
                    '<button class="delete-comment-btn"><i class="fas fa-times"></i></button>' : ''}
            </div>
        </div>
    `).join('');
};

// Handle post form submission
postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const content = document.getElementById('post-content').value;
    const image = document.getElementById('post-image').value;
    
    try {
        const newPost = await ApiService.createPost({ content, image });
        
        // Clear form
        document.getElementById('post-content').value = '';
        document.getElementById('post-image').value = '';
        
        // Reload posts
        loadPosts();
        showToast('Post created successfully', 'success');
    } catch (error) {
        console.error('Create post error:', error);
        showToast('Failed to create post', 'error');
    }
});

// Handle liking a post
const handleLikePost = async (postId, likeBtn) => {
    try {
        const likes = await ApiService.likePost(postId);
        const likesCount = likeBtn.querySelector('.likes-count');
        likesCount.textContent = likes.length;
        
        if (likes.includes(currentUser.id)) {
            
            likeBtn.classList.add('liked');
        } else {
            likeBtn.classList.remove('liked');
        }
    } catch (error) {
        console.error('Like post error:', error);
        showToast('Failed to like post', 'error');
    }
};

// Handle adding a comment
const handleAddComment = async (postId, commentInput) => {
    const content = commentInput.value.trim();
    
    if (!content) return;
    
    try {
        const newComment = await ApiService.addComment(postId, content);
        
        // Clear input
        commentInput.value = '';
        
        // Reload posts to show new comment
        loadPosts();
    } catch (error) {
        console.error('Add comment error:', error);
        showToast('Failed to add comment', 'error');
    }
};

// Handle deleting a post
const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
        await ApiService.deletePost(postId);
        loadPosts();
        showToast('Post deleted successfully', 'success');
    } catch (error) {
        console.error('Delete post error:', error);
        showToast('Failed to delete post', 'error');
    }
};

// Format date for display
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};