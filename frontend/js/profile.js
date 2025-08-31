javascript
// js/profile.js
// Profile related functionality

// DOM elements
const profileSection = document.getElementById('profile-section');
const profileLink = document.getElementById('profile-link');
const profileUsername = document.getElementById('profile-username');
const profileBio = document.getElementById('profile-bio');
const profilePicture = document.getElementById('profile-picture');
const followersCount = document.getElementById('followers-count');
const followingCount = document.getElementById('following-count');
const editProfileBtn = document.getElementById('edit-profile-btn');
const followBtn = document.getElementById('follow-btn');
const editProfileForm = document.getElementById('edit-profile-form');
const profileEditForm = document.getElementById('profile-edit-form');
const cancelEditBtn = document.getElementById('cancel-edit');
const userPostsContainer = document.getElementById('user-posts-container');

// Current profile being viewed
let currentProfile = null;

// Navigate to a user's profile
const navigateToProfile = async (userId) => {
    try {
        const profileData = await ApiService.getUserProfile(userId);
        currentProfile = profileData.user;
        
        // Update UI
        profileUsername.textContent = currentProfile.username;
        profileBio.textContent = currentProfile.bio || 'No bio yet';
        profilePicture.src = currentProfile.profilePicture || 'images/default-profile.jpg';
        followersCount.textContent = `${currentProfile.followers.length} followers`;
        followingCount.textContent = `${currentProfile.following.length} following`;
        
        // Show/hide edit profile button based on if it's the current user's profile
        const isCurrentUser = currentUser && currentProfile._id === currentUser.id;
        editProfileBtn.style.display = isCurrentUser ? 'inline-block' : 'none';
        followBtn.style.display = isCurrentUser ? 'none' : 'inline-block';
        
        // Update follow button text
        if (!isCurrentUser && currentUser) {
            const isFollowing = currentProfile.followers.some(follower => follower._id === currentUser.id);
            followBtn.textContent = isFollowing ? 'Unfollow' : 'Follow';
        }
        
        // Render user's posts
        renderUserPosts(profileData.posts);
        
        // Show profile section
        hideAllSections();
        profileSection.style.display = 'block';
    } catch (error) {
        console.error('Load profile error:', error);
        showToast('Failed to load profile', 'error');
    }
};

// Render user's posts
const renderUserPosts = (posts) => {
    userPostsContainer.innerHTML = '';
    
    if (posts.length === 0) {
        userPostsContainer.innerHTML = '<p class="no-posts">No posts yet.</p>';
        return;
    }
    
    posts.forEach(post => {
        const postElement = createPostElement(post);
        userPostsContainer.appendChild(postElement);
    });
};

// Event Listeners
profileLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentUser) {
        navigateToProfile(currentUser.id);
    } else {
        showToast('Please log in to view your profile', 'error');
    }
});

editProfileBtn.addEventListener('click', () => {
    // Populate form with current values
    document.getElementById('edit-bio').value = currentProfile.bio || '';
    document.getElementById('edit-profile-picture').value = currentProfile.profilePicture || '';
    
    // Show edit form
    editProfileForm.style.display = 'block';
});

cancelEditBtn.addEventListener('click', () => {
    editProfileForm.style.display = 'none';
});

profileEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const bio = document.getElementById('edit-bio').value;
    const profilePicture = document.getElementById('edit-profile-picture').value;
    
    try {
        const updatedProfile = await ApiService.updateProfile(currentUser.id, { bio, profilePicture });
        
        // Update current profile
        currentProfile.bio = updatedProfile.bio;
        currentProfile.profilePicture = updatedProfile.profilePicture;
        
        // Update UI
        profileBio.textContent = currentProfile.bio || 'No bio yet';
        document.getElementById('profile-picture').src = currentProfile.profilePicture || 'images/default-profile.jpg';
        
        // Hide edit form
        editProfileForm.style.display = 'none';
        
        showToast('Profile updated successfully', 'success');
    } catch (error) {
        console.error('Update profile error:', error);
        showToast('Failed to update profile', 'error');
    }
});

followBtn.addEventListener('click', async () => {
    try {
        const response = await ApiService.followUser(currentProfile._id);
        
        // Reload profile to update followers count
        navigateToProfile(currentProfile._id);
        
        showToast(response.message, 'success');
    } catch (error) {
        console.error('Follow user error:', error);
        showToast('Failed to follow/unfollow user', 'error');
    }
});