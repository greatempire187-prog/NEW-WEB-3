// Main Application Controller - Human-written style
class Web3AuthApp {
    constructor() {
        this.currentSection = 'landing';
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupFormHandlers();
        this.checkAuthStatus();
        this.setupResponsiveHandlers();
    }
    
    setupEventListeners() {
        // Navigation buttons
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const walletBtn = document.getElementById('walletBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (loginBtn) loginBtn.addEventListener('click', () => this.showSection('emailAuth', 'login'));
        if (registerBtn) registerBtn.addEventListener('click', () => this.showSection('emailAuth', 'register'));
        if (walletBtn) walletBtn.addEventListener('click', () => this.showSection('walletAuth'));
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
        
        // Auth option cards
        const startEmailAuth = document.getElementById('startEmailAuth');
        const startWalletAuth = document.getElementById('startWalletAuth');
        
        if (startEmailAuth) startEmailAuth.addEventListener('click', () => this.showSection('emailAuth', 'login'));
        if (startWalletAuth) startWalletAuth.addEventListener('click', () => this.showSection('walletAuth'));
        
        // Email auth tabs
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        
        if (loginTab) loginTab.addEventListener('click', () => this.switchAuthTab('login'));
        if (registerTab) registerTab.addEventListener('click', () => this.switchAuthTab('register'));
        
        // Verification section
        const backToLogin = document.getElementById('backToLogin');
        const resendVerification = document.getElementById('resendVerification');
        
        if (backToLogin) backToLogin.addEventListener('click', () => this.showSection('landing'));
        if (resendVerification) resendVerification.addEventListener('click', () => this.resendVerification());
        
        // Forgot password
        const forgotPassword = document.getElementById('forgotPassword');
        if (forgotPassword) {
            forgotPassword.addEventListener('click', (e) => {
                e.preventDefault();
                this.showToast('Password reset coming soon!', 'info');
            });
        }
        
        // Logo click - return to landing
        const logo = document.querySelector('.logo');
        if (logo) {
            logo.addEventListener('click', (e) => {
                e.preventDefault();
                if (!authManager.isAuthenticated()) {
                    this.showSection('landing');
                }
            });
        }
    }
    
    setupResponsiveHandlers() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Handle orientation change for mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleResize();
            }, 100);
        });
        
        // Handle keyboard events for better mobile UX
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.handleEscape();
            }
        });
        
        // Handle touch events for mobile
        this.setupTouchHandlers();
    }
    
    setupTouchHandlers() {
        let touchStartY = 0;
        let touchEndY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartY = e.changedTouches[0].screenY;
        });
        
        document.addEventListener('touchend', (e) => {
            touchEndY = e.changedTouches[0].screenY;
            this.handleSwipe(touchStartY, touchEndY);
        });
    }
    
    handleSwipe(startY, endY) {
        const swipeThreshold = 50;
        const diff = startY - endY;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe up - could be used for page transitions
                console.log('Swipe up detected');
            } else {
                // Swipe down - could be used for page transitions
                console.log('Swipe down detected');
            }
        }
    }
    
    handleResize() {
        // Adjust UI elements based on screen size
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
        
        // Update navigation for mobile
        this.updateNavigationForScreenSize(isMobile, isTablet);
        
        // Adjust form layouts if needed
        this.adjustFormLayouts(isMobile);
    }
    
    updateNavigationForScreenSize(isMobile, isTablet) {
        const nav = document.querySelector('.nav');
        if (!nav) return;
        
        if (isMobile) {
            nav.style.flexWrap = 'wrap';
            nav.style.justifyContent = 'center';
        } else {
            nav.style.flexWrap = 'nowrap';
            nav.style.justifyContent = 'flex-end';
        }
    }
    
    adjustFormLayouts(isMobile) {
        // Adjust form layouts for mobile if needed
        const authContainers = document.querySelectorAll('.auth-container');
        authContainers.forEach(container => {
            if (isMobile) {
                container.style.padding = '1.5rem';
            } else {
                container.style.padding = '2rem';
            }
        });
    }
    
    handleEscape() {
        // Close any open modals or return to previous section
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay && loadingOverlay.style.display === 'flex') {
            authManager.hideLoading();
        }
    }
    
    setupFormHandlers() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
            
            // Password strength indicator
            const passwordInput = document.getElementById('registerPassword');
            if (passwordInput) {
                passwordInput.addEventListener('input', (e) => this.updatePasswordStrength(e.target.value));
            }
        }
        
        // Add input validation for better UX
        this.setupInputValidation();
    }
    
    setupInputValidation() {
        // Email validation
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            input.addEventListener('blur', (e) => {
                if (e.target.value && !this.validateEmail(e.target.value)) {
                    this.showInputError(e.target, 'Please enter a valid email address');
                } else {
                    this.clearInputError(e.target);
                }
            });
        });
        
        // Password validation
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        passwordInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                if (e.target.value.length > 0 && e.target.value.length < 8) {
                    this.showInputError(e.target, 'Password must be at least 8 characters');
                } else {
                    this.clearInputError(e.target);
                }
            });
        });
    }
    
    showInputError(input, message) {
        const errorElement = document.getElementById(`${input.id}Error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        input.style.borderColor = '#e53e3e';
    }
    
    clearInputError(input) {
        const errorElement = document.getElementById(`${input.id}Error`);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
        input.style.borderColor = '';
    }
    
    async checkAuthStatus() {
        if (authManager.isAuthenticated()) {
            this.showSection('profile');
        } else {
            this.showSection('landing');
        }
    }
    
    showSection(sectionName, authTab = null) {
        // Hide all sections with animation
        const sections = ['landingSection', 'emailAuthSection', 'walletAuthSection', 'profileSection', 'verificationSection'];
        sections.forEach(section => {
            const element = document.getElementById(section);
            if (element && element.style.display !== 'none') {
                element.style.opacity = '0';
                setTimeout(() => {
                    element.style.display = 'none';
                }, 150);
            }
        });
        
        // Show target section with animation
        setTimeout(() => {
            const targetSection = document.getElementById(sectionName + 'Section');
            if (targetSection) {
                targetSection.style.display = 'block';
                setTimeout(() => {
                    targetSection.style.opacity = '1';
                }, 50);
            }
        }, 200);
        
        this.currentSection = sectionName;
        
        // Switch auth tab if specified
        if (authTab && sectionName === 'emailAuth') {
            this.switchAuthTab(authTab);
        }
        
        // Update navigation
        this.updateNavigation();
        
        // Scroll to top for better UX
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    switchAuthTab(tab) {
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginTab && registerTab && loginForm && registerForm) {
            if (tab === 'login') {
                loginTab.classList.add('active');
                registerTab.classList.remove('active');
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
            } else {
                loginTab.classList.remove('active');
                registerTab.classList.add('active');
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
            }
        }
    }
    
    updateNavigation() {
        const userMenu = document.getElementById('userMenu');
        const authButtons = document.querySelectorAll('#loginBtn, #registerBtn, #walletBtn');
        
        if (authManager.isAuthenticated()) {
            if (userMenu) userMenu.style.display = 'flex';
            if (authButtons) {
                authButtons.forEach(btn => btn.style.display = 'none');
            }
        } else {
            if (userMenu) userMenu.style.display = 'none';
            if (authButtons) {
                authButtons.forEach(btn => btn.style.display = 'inline-flex');
            }
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        // Clear previous errors
        this.clearFormErrors('login');
        
        // Validate
        if (!this.validateEmail(email)) {
            this.showFormError('loginEmail', 'Please enter a valid email address');
            return;
        }
        
        if (!password) {
            this.showFormError('loginPassword', 'Password is required');
            return;
        }
        
        try {
            this.showLoading('Logging in...');
            await authManager.login(email, password);
            this.hideLoading();
            this.showSection('profile');
        } catch (error) {
            this.hideLoading();
            this.showToast(error.message, 'error');
        }
    }
    
    async handleRegister(e) {
        e.preventDefault();
        
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Clear previous errors
        this.clearFormErrors('register');
        
        // Validate
        const errors = [];
        
        if (!this.validateEmail(email)) {
            errors.push({ field: 'registerEmail', message: 'Please enter a valid email address' });
        }
        
        if (!password) {
            errors.push({ field: 'registerPassword', message: 'Password is required' });
        }
        
        if (password) {
            const strength = this.checkPasswordStrength(password);
            if (strength.score < 3) {
                errors.push({ field: 'registerPassword', message: 'Password is too weak. Please include uppercase, lowercase, numbers, and special characters.' });
            }
        }
        
        if (password !== confirmPassword) {
            errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
        }
        
        if (errors.length > 0) {
            errors.forEach(error => this.showFormError(error.field, error.message));
            return;
        }
        
        try {
            this.showLoading('Creating account...');
            await authManager.register(email, password);
            this.hideLoading();
            this.showSection('verification');
        } catch (error) {
            this.hideLoading();
            this.showToast(error.message, 'error');
        }
    }
    
    async logout() {
        try {
            await authManager.logout();
            this.showSection('landing');
            this.showToast('Logged out successfully', 'info');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    async resendVerification() {
        try {
            this.showToast('Verification email resent!', 'success');
            // In a real app, you'd call an API endpoint here
        } catch (error) {
            this.showToast('Failed to resend verification', 'error');
        }
    }
    
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    checkPasswordStrength(password) {
        let strength = 0;
        const feedback = [];
        
        if (password.length >= 8) strength++;
        else feedback.push('At least 8 characters');
        
        if (/[A-Z]/.test(password)) strength++;
        else feedback.push('One uppercase letter');
        
        if (/[a-z]/.test(password)) strength++;
        else feedback.push('One lowercase letter');
        
        if (/\d/.test(password)) strength++;
        else feedback.push('One number');
        
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
        else feedback.push('One special character');
        
        const levels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        const colors = ['#e53e3e', '#ed8936', '#f6ad55', '#48bb78'];
        
        return {
            level: levels[strength],
            color: colors[strength],
            feedback,
            score: strength
        };
    }
    
    updatePasswordStrength(password) {
        const strengthElement = document.getElementById('passwordStrength');
        if (!strengthElement) return;
        
        if (password.length === 0) {
            strengthElement.innerHTML = '';
            return;
        }
        
        const strength = this.checkPasswordStrength(password);
        const feedback = strength.feedback.length > 0 
            ? `<div style="color: #666; font-size: 0.75rem; margin-top: 0.25rem;">Missing: ${strength.feedback.join(', ')}</div>`
            : '';
        
        strengthElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div style="flex: 1; height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden;">
                    <div style="width: ${(strength.score / 5) * 100}%; height: 100%; background: ${strength.color}; transition: all 0.3s ease;"></div>
                </div>
                <span style="color: ${strength.color}; font-size: 0.75rem; font-weight: 500;">${strength.level}</span>
            </div>
            ${feedback}
        `;
    }
    
    clearFormErrors(formType) {
        const fields = formType === 'login' 
            ? ['loginEmail', 'loginPassword']
            : ['registerEmail', 'registerPassword', 'confirmPassword'];
        
        fields.forEach(field => this.clearFormError(field));
    }
    
    showFormError(fieldId, message) {
        const errorElement = document.getElementById(`${fieldId}Error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }
    
    clearFormError(fieldId) {
        const errorElement = document.getElementById(`${fieldId}Error`);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }
    
    showLoading(text = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.opacity = '1';
            }, 50);
        }
        
        if (loadingText) loadingText.textContent = text;
    }
    
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 150);
        }
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✓',
            error: '✗',
            info: 'ℹ'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        container.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                setTimeout(() => {
                    toast.remove();
                }, 150);
            }
        }, 5000);
    }
}

// Handle URL parameters for email verification
function handleURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
        authManager.verifyEmail(token);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.web3AuthApp = new Web3AuthApp();
    handleURLParams();
    
    // Global error handlers
    window.addEventListener('error', (e) => {
        console.error('Global error:', e.error);
        window.web3AuthApp?.showToast('An unexpected error occurred. Please try again.', 'error');
    });
    
    window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled promise rejection:', e.reason);
        window.web3AuthApp?.showToast('An unexpected error occurred. Please try again.', 'error');
    });
    
    // Add smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Add loading states for better UX
    window.addEventListener('load', () => {
        document.body.style.opacity = '1';
    });
});
