// js/auth.js - SocialWave Authentication System
// Authentication related functionality

// DOM elements - Updated to match SocialWave structure
const authModal = document.getElementById('auth-modal');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const authButtons = document.getElementById('auth-buttons');
const userMenu = document.getElementById('user-menu');
const navLinks = document.querySelectorAll('.nav-link');

// Current user state
let currentUser = null;
let authState = {
    isAuthenticated: false,
    user: null,
    loading: false
};

// Initialize authentication system
const initAuth = async () => {
    try {
        // Show loading state
        setAuthLoading(true);
        
        // Check for existing authentication
        await checkAuthStatus();
        
        // Setup event listeners
        setupAuthEventListeners();
        
        // Setup WebSocket if authenticated
        if (authState.isAuthenticated) {
            setupWebSocket();
        }
        
    } catch (error) {
        console.error('Auth initialization error:', error);
        showUnauthenticatedUI();
    } finally {
        setAuthLoading(false);
    }
};

// Check if user is logged in
const checkAuthStatus = async () => {
    try {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('currentUser');
        
        if (!token) {
            showUnauthenticatedUI();
            return;
        }

        // Try to get current user from API
        currentUser = await ApiService.getCurrentUser();
        
        if (currentUser) {
            authState.isAuthenticated = true;
            authState.user = currentUser;
            showAuthenticatedUI();
            showNotification(`Welcome back, ${currentUser.name}! 👋`, 'success');
        } else {
            // Token is invalid, clear storage
            clearAuthData();
            showUnauthenticatedUI();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        clearAuthData();
        showUnauthenticatedUI();
    }
};

// Setup all authentication event listeners
const setupAuthEventListeners = () => {
    // Auth modal triggers
    if (loginBtn) {
        loginBtn.addEventListener('click', () => openAuthModal('login'));
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', () => openAuthModal('register'));
    }

    // Form submissions
    setupFormHandlers();
    
    // Modal close handlers
    setupModalHandlers();
    
    // Global auth event listeners
    window.addEventListener('auth:login', handleAuthLogin);
    window.addEventListener('auth:logout', handleAuthLogout);
    window.addEventListener('auth:error', handleAuthError);
};

// Setup form submission handlers
const setupFormHandlers = () => {
    // Login form
    const loginFormElement = loginForm?.querySelector('form');
    if (loginFormElement) {
        loginFormElement.addEventListener('submit', handleLogin);
    }

    // Register form
    const registerFormElement = registerForm?.querySelector('form');
    if (registerFormElement) {
        registerFormElement.addEventListener('submit', handleRegister);
    }
};

// Setup modal handlers
const setupModalHandlers = () => {
    // Close modal when clicking backdrop
    const modalBackdrop = authModal?.querySelector('.modal-backdrop');
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', closeAuthModal);
    }

    // ESC key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !authModal?.classList.contains('hidden')) {
            closeAuthModal();
        }
    });
};

// Handle login form submission
const handleLogin = async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const email = formData.get('email') || form.querySelector('input[type="email"]')?.value;
    const password = formData.get('password') || form.querySelector('input[type="password"]')?.value;
    
    if (!email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const buttonText = submitBtn.querySelector('.button-text');
    const spinner = submitBtn.querySelector('.loading-spinner');
    
    try {
        // Show loading state
        setButtonLoading(submitBtn, buttonText, spinner, true);
        
        const response = await ApiService.login({ email, password });
        
        if (response.token && response.user) {
            // Store auth data
            localStorage.setItem('token', response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            
            // Update state
            currentUser = response.user;
            authState.isAuthenticated = true;
            authState.user = response.user;
            
            // Update UI
            showAuthenticatedUI();
            closeAuthModal();
            
            // Show success message
            showNotification(`Welcome back, ${response.user.name}! 🎉`, 'success');
            
            // Setup WebSocket connection
            setupWebSocket();
            
        } else {
            throw new Error(response.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification(error.message || 'Login failed. Please try again.', 'error');
    } finally {
        setButtonLoading(submitBtn, buttonText, spinner, false);
    }
};

// Handle register form submission
const handleRegister = async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    // Get form fields
    const firstName = formData.get('firstName') || form.querySelector('input[placeholder*="First"]')?.value;
    const lastName = formData.get('lastName') || form.querySelector('input[placeholder*="Last"]')?.value;
    const email = formData.get('email') || form.querySelector('input[type="email"]')?.value;
    const password = formData.get('password') || form.querySelector('input[type="password"]')?.value;
    
    // Validation
    if (!firstName || !lastName || !email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters long', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const buttonText = submitBtn.querySelector('.button-text');
    const spinner = submitBtn.querySelector('.loading-spinner');
    
    try {
        // Show loading state
        setButtonLoading(submitBtn, buttonText, spinner, true);
        
        const userData = {
            name: `${firstName} ${lastName}`,
            firstName,
            lastName,
            email,
            password
        };
        
        const response = await ApiService.register(userData);
        
        if (response.token && response.user) {
            // Store auth data
            localStorage.setItem('token', response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            
            // Update state
            currentUser = response.user;
            authState.isAuthenticated = true;
            authState.user = response.user;
            
            // Update UI
            showAuthenticatedUI();
            closeAuthModal();
            
            // Show success message
            showNotification(`Welcome to SocialWave, ${response.user.name}! 🎉`, 'success');
            
            // Setup WebSocket connection
            setupWebSocket();
            
        } else {
            throw new Error(response.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification(error.message || 'Registration failed. Please try again.', 'error');
    } finally {
        setButtonLoading(submitBtn, buttonText, spinner, false);
    }
};

// Handle logout
const handleLogout = async () => {
    try {
        // Call logout API
        await ApiService.logout();
    } catch (error) {
        console.warn('Logout API call failed:', error);
    } finally {
        // Clear local data regardless of API response
        clearAuthData();
        showUnauthenticatedUI();
        showNotification('Logged out successfully! 👋', 'success');
    }
};

// Show UI for authenticated users
const showAuthenticatedUI = () => {
    if (authButtons) authButtons.classList.add('hidden');
    if (userMenu) userMenu.classList.remove('hidden');
    
    // Update navigation to show authenticated sections
    navLinks.forEach(link => {
        link.style.pointerEvents = 'auto';
        link.style.opacity = '1';
    });
    
    // Switch to home section
    switchSection('home');
    
    // Update user menu with current user info
    updateUserMenu();
    
    // Load initial data
    loadInitialData();
};

// Show UI for unauthenticated users
const showUnauthenticatedUI = () => {
    if (authButtons) authButtons.classList.remove('hidden');
    if (userMenu) userMenu.classList.add('hidden');
    
    // Limit navigation for unauthenticated users
    navLinks.forEach(link => {
        if (link.dataset.section !== 'home') {
            link.style.pointerEvents = 'none';
            link.style.opacity = '0.5';
        }
    });
    
    // Switch to home section
    switchSection('home');
};

// Update user menu with current user information
const updateUserMenu = () => {
    if (!currentUser || !userMenu) return;
    
    const userAvatar = userMenu.querySelector('img') || userMenu.querySelector('.w-8');
    const userName = userMenu.querySelector('.text-white');
    
    if (userAvatar && currentUser.avatar) {
        userAvatar.src = currentUser.avatar;
        userAvatar.alt = currentUser.name;
    }
    
    if (userName) {
        userName.textContent = currentUser.name;
    }
};

// Load initial data for authenticated users
const loadInitialData = async () => {
    try {
        // Load posts, notifications, etc.
        if (typeof loadPosts === 'function') {
            await loadPosts();
        }
        
        if (typeof loadNotifications === 'function') {
            await loadNotifications();
        }
        
    } catch (error) {
        console.error('Failed to load initial data:', error);
    }
};

// Open authentication modal
const openAuthModal = (mode = 'login') => {
    if (!authModal) return;
    
    const loginFormEl = document.getElementById('login-form');
    const registerFormEl = document.getElementById('register-form');
    
    if (mode === 'login') {
        loginFormEl?.classList.remove('hidden');
        registerFormEl?.classList.add('hidden');
    } else {
        loginFormEl?.classList.add('hidden');
        registerFormEl?.classList.remove('hidden');
    }
    
    authModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Focus on first input
    setTimeout(() => {
        const firstInput = authModal.querySelector('input:not([type="hidden"])');
        if (firstInput) firstInput.focus();
    }, 100);
};

// Close authentication modal
const closeAuthModal = () => {
    if (!authModal) return;
    
    authModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    
    // Clear form data
    const forms = authModal.querySelectorAll('form');
    forms.forEach(form => form.reset());
};

// Switch between login and register forms
const switchToLogin = () => {
    const loginFormEl = document.getElementById('login-form');
    const registerFormEl = document.getElementById('register-form');
    
    registerFormEl?.classList.add('hidden');
    loginFormEl?.classList.remove('hidden');
};

const switchToRegister = () => {
    const loginFormEl = document.getElementById('login-form');
    const registerFormEl = document.getElementById('register-form');
    
    loginFormEl?.classList.add('hidden');
    registerFormEl?.classList.remove('hidden');
};

// Utility functions
const setAuthLoading = (loading) => {
    authState.loading = loading;
    // You can add loading UI updates here
};

const setButtonLoading = (button, textEl, spinnerEl, loading) => {
    if (!button) return;
    
    button.disabled = loading;
    
    if (textEl) {
        textEl.classList.toggle('hidden', loading);
    }
    
    if (spinnerEl) {
        spinnerEl.classList.toggle('hidden', !loading);
    }
};

const clearAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    currentUser = null;
    authState.isAuthenticated = false;
    authState.user = null;
};

const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// WebSocket setup for real-time features
let websocket = null;

const setupWebSocket = () => {
    if (!authState.isAuthenticated) return;
    
    try {
        websocket = ApiService.connectWebSocket();
        
        if (websocket) {
            websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleWebSocketMessage(data);
                } catch (error) {
                    console.error('WebSocket message parse error:', error);
                }
            };
        }
    } catch (error) {
        console.error('WebSocket setup error:', error);
    }
};

const handleWebSocketMessage = (data) => {
    switch (data.type) {
        case 'notification':
            showNotification(data.message, 'info');
            if (typeof updateNotificationBadge === 'function') {
                updateNotificationBadge();
            }
            break;
        case 'message':
            if (typeof handleNewMessage === 'function') {
                handleNewMessage(data);
            }
            break;
        case 'post_update':
            if (typeof handlePostUpdate === 'function') {
                handlePostUpdate(data);
            }
            break;
        default:
            console.log('Unknown WebSocket message type:', data.type);
    }
};

// Event handlers for global auth events
const handleAuthLogin = (event) => {
    currentUser = event.detail;
    authState.isAuthenticated = true;
    authState.user = event.detail;
    showAuthenticatedUI();
};

const handleAuthLogout = () => {
    clearAuthData();
    showUnauthenticatedUI();
    
    // Close WebSocket connection
    if (websocket) {
        websocket.close();
        websocket = null;
    }
};

const handleAuthError = (event) => {
    const error = event.detail;
    showNotification(error.message || 'Authentication error', 'error');
    
    if (error.code === 'TOKEN_EXPIRED') {
        clearAuthData();
        showUnauthenticatedUI();
    }
};

// Public API
const Auth = {
    init: initAuth,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    openModal: openAuthModal,
    closeModal: closeAuthModal,
    switchToLogin,
    switchToRegister,
    getCurrentUser: () => currentUser,
    isAuthenticated: () => authState.isAuthenticated,
    getAuthState: () => ({ ...authState })
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.Auth = Auth;
    window.switchToLogin = switchToLogin;
    window.switchToRegister = switchToRegister;
    window.closeAuthModal = closeAuthModal;
}

// Periodic auth check (every 5 minutes)
setInterval(() => {
    if (authState.isAuthenticated) {
        checkAuthStatus();
    }
}, 5 * 60 * 1000);