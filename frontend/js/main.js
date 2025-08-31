
// js/main.js
// Main application logic

// Helper function to show toast notifications
const showToast = (message, type = 'info') => {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Remove toast after animation completes
    setTimeout(() => {
        toast.remove();
    }, 3000);
};

// Helper function to hide all content sections
const hideAllSections = () => {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
};

// Initialize the application
const initApp = () => {
    // Check if user is logged in
    checkAuthStatus();
    
    // Set active navigation
    
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Home link functionality
    document.getElementById('home-link').addEventListener('click', (e) => {
        e.preventDefault();
        if (currentUser) {
            hideAllSections();
            feedSection.style.display = 'block';
            loadPosts();
        } else {
            hideAllSections();
            welcomeSection.style.display = 'block';
        }
    });
};

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);