// js/api.js - SocialWave API Service
const API_URL = 'http://localhost:5006/api';

// API Service for making requests to our backend
const ApiService = {
    // Helper method for making authenticated requests
    makeRequest: async (url, options = {}) => {
        const token = localStorage.getItem('token');
        const defaultHeaders = {
            'Content-Type': 'application/json',
            ...(token && { 'x-auth-token': token })
        };

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        try {
            const response = await fetch(`${API_URL}${url}`, config);
            
            // Handle unauthorized responses
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                window.dispatchEvent(new CustomEvent('auth:logout'));
                throw new Error('Unauthorized');
            }

            // Handle other error responses
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    },

    // Auth endpoints
    register: async (userData) => {
        try {
            const result = await ApiService.makeRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            if (result.token) {
                localStorage.setItem('token', result.token);
                localStorage.setItem('currentUser', JSON.stringify(result.user));
                window.dispatchEvent(new CustomEvent('auth:login', { detail: result.user }));
            }

            return result;
        } catch (error) {
            throw new Error(error.message || 'Registration failed');
        }
    },

    login: async (credentials) => {
        try {
            const result = await ApiService.makeRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });

            if (result.token) {
                localStorage.setItem('token', result.token);
                localStorage.setItem('currentUser', JSON.stringify(result.user));
                window.dispatchEvent(new CustomEvent('auth:login', { detail: result.user }));
            }

            return result;
        } catch (error) {
            throw new Error(error.message || 'Login failed');
        }
    },

    logout: async () => {
        try {
            await ApiService.makeRequest('/auth/logout', {
                method: 'POST'
            });
        } catch (error) {
            console.warn('Logout request failed:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            window.dispatchEvent(new CustomEvent('auth:logout'));
        }
    },

    getCurrentUser: async () => {
        const token = localStorage.getItem('token');
        if (!token) return null;

        try {
            const user = await ApiService.makeRequest('/auth/me');
            localStorage.setItem('currentUser', JSON.stringify(user));
            return user;
        } catch (error) {
            console.error('Failed to get current user:', error);
            return null;
        }
    },

    refreshToken: async () => {
        try {
            const result = await ApiService.makeRequest('/auth/refresh', {
                method: 'POST'
            });

            if (result.token) {
                localStorage.setItem('token', result.token);
            }

            return result;
        } catch (error) {
            throw new Error('Token refresh failed');
        }
    },

    // Post endpoints
    getPosts: async (page = 1, limit = 10) => {
        try {
            return await ApiService.makeRequest(`/posts?page=${page}&limit=${limit}`);
        } catch (error) {
            throw new Error('Failed to fetch posts');
        }
    },

    getPost: async (postId) => {
        try {
            return await ApiService.makeRequest(`/posts/${postId}`);
        } catch (error) {
            throw new Error('Failed to fetch post');
        }
    },

    createPost: async (postData) => {
        try {
            const result = await ApiService.makeRequest('/posts', {
                method: 'POST',
                body: JSON.stringify(postData)
            });

            window.dispatchEvent(new CustomEvent('post:created', { detail: result }));
            return result;
        } catch (error) {
            throw new Error(error.message || 'Failed to create post');
        }
    },

    updatePost: async (postId, postData) => {
        try {
            const result = await ApiService.makeRequest(`/posts/${postId}`, {
                method: 'PUT',
                body: JSON.stringify(postData)
            });

            window.dispatchEvent(new CustomEvent('post:updated', { detail: result }));
            return result;
        } catch (error) {
            throw new Error('Failed to update post');
        }
    },

    deletePost: async (postId) => {
        try {
            const result = await ApiService.makeRequest(`/posts/${postId}`, {
                method: 'DELETE'
            });

            window.dispatchEvent(new CustomEvent('post:deleted', { detail: { postId } }));
            return result;
        } catch (error) {
            throw new Error('Failed to delete post');
        }
    },

    likePost: async (postId) => {
        try {
            const result = await ApiService.makeRequest(`/posts/${postId}/like`, {
                method: 'POST'
            });

            window.dispatchEvent(new CustomEvent('post:liked', { 
                detail: { postId, liked: result.liked, likesCount: result.likesCount } 
            }));
            return result;
        } catch (error) {
            throw new Error('Failed to like post');
        }
    },

    sharePost: async (postId) => {
        try {
            const result = await ApiService.makeRequest(`/posts/${postId}/share`, {
                method: 'POST'
            });

            window.dispatchEvent(new CustomEvent('post:shared', { 
                detail: { postId, sharesCount: result.sharesCount } 
            }));
            return result;
        } catch (error) {
            throw new Error('Failed to share post');
        }
    },

    // Comment endpoints
    getComments: async (postId, page = 1, limit = 10) => {
        try {
            return await ApiService.makeRequest(`/posts/${postId}/comments?page=${page}&limit=${limit}`);
        } catch (error) {
            throw new Error('Failed to fetch comments');
        }
    },

    addComment: async (postId, content) => {
        try {
            const result = await ApiService.makeRequest(`/posts/${postId}/comments`, {
                method: 'POST',
                body: JSON.stringify({ content })
            });

            window.dispatchEvent(new CustomEvent('comment:added', { 
                detail: { postId, comment: result } 
            }));
            return result;
        } catch (error) {
            throw new Error('Failed to add comment');
        }
    },

    updateComment: async (commentId, content) => {
        try {
            const result = await ApiService.makeRequest(`/posts/comments/${commentId}`, {
                method: 'PUT',
                body: JSON.stringify({ content })
            });

            window.dispatchEvent(new CustomEvent('comment:updated', { detail: result }));
            return result;
        } catch (error) {
            throw new Error('Failed to update comment');
        }
    },

    deleteComment: async (commentId) => {
        try {
            const result = await ApiService.makeRequest(`/posts/comments/${commentId}`, {
                method: 'DELETE'
            });

            window.dispatchEvent(new CustomEvent('comment:deleted', { detail: { commentId } }));
            return result;
        } catch (error) {
            throw new Error('Failed to delete comment');
        }
    },

    likeComment: async (commentId) => {
        try {
            const result = await ApiService.makeRequest(`/posts/comments/${commentId}/like`, {
                method: 'POST'
            });

            window.dispatchEvent(new CustomEvent('comment:liked', { 
                detail: { commentId, liked: result.liked, likesCount: result.likesCount } 
            }));
            return result;
        } catch (error) {
            throw new Error('Failed to like comment');
        }
    },

    // Profile endpoints
    getUserProfile: async (userId) => {
        try {
            return await ApiService.makeRequest(`/profiles/${userId}`);
        } catch (error) {
            throw new Error('Failed to fetch user profile');
        }
    },

    updateProfile: async (userId, profileData) => {
        try {
            const result = await ApiService.makeRequest(`/profiles/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });

            window.dispatchEvent(new CustomEvent('profile:updated', { detail: result }));
            return result;
        } catch (error) {
            throw new Error('Failed to update profile');
        }
    },

    uploadProfilePicture: async (userId, file) => {
        try {
            const formData = new FormData();
            formData.append('profilePicture', file);

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/profiles/${userId}/picture`, {
                method: 'POST',
                headers: {
                    'x-auth-token': token
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const result = await response.json();
            window.dispatchEvent(new CustomEvent('profile:pictureUpdated', { detail: result }));
            return result;
        } catch (error) {
            throw new Error('Failed to upload profile picture');
        }
    },

    // Follow/Unfollow endpoints
    followUser: async (userId) => {
        try {
            const result = await ApiService.makeRequest(`/profiles/${userId}/follow`, {
                method: 'POST'
            });

            window.dispatchEvent(new CustomEvent('user:followed', { 
                detail: { userId, following: result.following } 
            }));
            return result;
        } catch (error) {
            throw new Error('Failed to follow user');
        }
    },

    unfollowUser: async (userId) => {
        try {
            const result = await ApiService.makeRequest(`/profiles/${userId}/follow`, {
                method: 'DELETE'
            });

            window.dispatchEvent(new CustomEvent('user:unfollowed', { 
                detail: { userId, following: result.following } 
            }));
            return result;
        } catch (error) {
            throw new Error('Failed to unfollow user');
        }
    },

    getFollowers: async (userId, page = 1, limit = 20) => {
        try {
            return await ApiService.makeRequest(`/profiles/${userId}/followers?page=${page}&limit=${limit}`);
        } catch (error) {
            throw new Error('Failed to fetch followers');
        }
    },

    getFollowing: async (userId, page = 1, limit = 20) => {
        try {
            return await ApiService.makeRequest(`/profiles/${userId}/following?page=${page}&limit=${limit}`);
        } catch (error) {
            throw new Error('Failed to fetch following');
        }
    },

    // Search endpoints
    searchUsers: async (query, page = 1, limit = 10) => {
        try {
            return await ApiService.makeRequest(`/search/users?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
        } catch (error) {
            throw new Error('Failed to search users');
        }
    },

    searchPosts: async (query, page = 1, limit = 10) => {
        try {
            return await ApiService.makeRequest(`/search/posts?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
        } catch (error) {
            throw new Error('Failed to search posts');
        }
    },

    // Notification endpoints
    getNotifications: async (page = 1, limit = 20) => {
        try {
            return await ApiService.makeRequest(`/notifications?page=${page}&limit=${limit}`);
        } catch (error) {
            throw new Error('Failed to fetch notifications');
        }
    },

    markNotificationAsRead: async (notificationId) => {
        try {
            const result = await ApiService.makeRequest(`/notifications/${notificationId}/read`, {
                method: 'PUT'
            });

            window.dispatchEvent(new CustomEvent('notification:read', { 
                detail: { notificationId } 
            }));
            return result;
        } catch (error) {
            throw new Error('Failed to mark notification as read');
        }
    },

    markAllNotificationsAsRead: async () => {
        try {
            const result = await ApiService.makeRequest('/notifications/read-all', {
                method: 'PUT'
            });

            window.dispatchEvent(new CustomEvent('notifications:allRead'));
            return result;
        } catch (error) {
            throw new Error('Failed to mark all notifications as read');
        }
    },

    // Message endpoints
    getConversations: async (page = 1, limit = 20) => {
        try {
            return await ApiService.makeRequest(`/messages/conversations?page=${page}&limit=${limit}`);
        } catch (error) {
            throw new Error('Failed to fetch conversations');
        }
    },

    getMessages: async (conversationId, page = 1, limit = 50) => {
        try {
            return await ApiService.makeRequest(`/messages/${conversationId}?page=${page}&limit=${limit}`);
        } catch (error) {
            throw new Error('Failed to fetch messages');
        }
    },

    sendMessage: async (recipientId, content) => {
        try {
            const result = await ApiService.makeRequest('/messages', {
                method: 'POST',
                body: JSON.stringify({ recipientId, content })
            });

            window.dispatchEvent(new CustomEvent('message:sent', { detail: result }));
            return result;
        } catch (error) {
            throw new Error('Failed to send message');
        }
    },

    markMessageAsRead: async (messageId) => {
        try {
            const result = await ApiService.makeRequest(`/messages/${messageId}/read`, {
                method: 'PUT'
            });

            window.dispatchEvent(new CustomEvent('message:read', { detail: { messageId } }));
            return result;
        } catch (error) {
            throw new Error('Failed to mark message as read');
        }
    },

    // File upload endpoints
    uploadFile: async (file, type = 'post') => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                headers: {
                    'x-auth-token': token
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            return await response.json();
        } catch (error) {
            throw new Error('Failed to upload file');
        }
    },

    // Analytics endpoints
    getPostAnalytics: async (postId) => {
        try {
            return await ApiService.makeRequest(`/analytics/posts/${postId}`);
        } catch (error) {
            throw new Error('Failed to fetch post analytics');
        }
    },

    getProfileAnalytics: async (userId) => {
        try {
            return await ApiService.makeRequest(`/analytics/profiles/${userId}`);
        } catch (error) {
            throw new Error('Failed to fetch profile analytics');
        }
    },

    // Utility methods
    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    },

    getCurrentUserFromStorage: () => {
        const userStr = localStorage.getItem('currentUser');
        return userStr ? JSON.parse(userStr) : null;
    },

    // WebSocket connection helper
    connectWebSocket: () => {
        const token = localStorage.getItem('token');
        if (!token) return null;

        const wsUrl = API_URL.replace('http', 'ws') + '/ws';
        const ws = new WebSocket(`${wsUrl}?token=${token}`);

        ws.onopen = () => {
            console.log('WebSocket connected');
            window.dispatchEvent(new CustomEvent('ws:connected'));
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            window.dispatchEvent(new CustomEvent('ws:disconnected'));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                window.dispatchEvent(new CustomEvent('ws:message', { detail: data }));
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        return ws;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiService;
} else if (typeof window !== 'undefined') {
    window.ApiService = ApiService;
}

// Auto-refresh token every 15 minutes if authenticated
if (typeof window !== 'undefined') {
    setInterval(async () => {
        if (ApiService.isAuthenticated()) {
            try {
                await ApiService.refreshToken();
            } catch (error) {
                console.warn('Token refresh failed:', error);
            }
        }
    }, 15 * 60 * 1000); // 15 minutes
}