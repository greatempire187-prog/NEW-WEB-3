// Authentication Module - Human-written style
class AuthManager {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.currentUser = null;
        this.accessToken = localStorage.getItem('accessToken');
        this.refreshToken = localStorage.getItem('refreshToken');
        
        this.init();
    }
    
    init() {
        // Check if user is already logged in
        if (this.accessToken) {
            this.validateToken();
        }
    }
    
    async register(email, password) {
        try {
            const response = await this.makeRequest('/auth/register', 'POST', {
                email: email.toLowerCase().trim(),
                password
            });
            
            this.showSuccess('Registration successful! Please check your email for verification.');
            return response;
        } catch (error) {
            this.showError('Registration failed: ' + error.message);
            throw error;
        }
    }
    
    async login(email, password) {
        try {
            const response = await this.makeRequest('/auth/login', 'POST', {
                email: email.toLowerCase().trim(),
                password
            });
            
            this.setTokens(response.access_token, response.refresh_token);
            this.setCurrentUser(response.user);
            this.showSuccess('Login successful!');
            return response;
        } catch (error) {
            this.showError('Login failed: ' + error.message);
            throw error;
        }
    }
    
    async logout() {
        try {
            this.clearTokens();
            this.currentUser = null;
            this.updateUIForLoggedOutUser();
            this.showInfo('Logged out successfully');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    async validateToken() {
        try {
            const response = await this.makeRequest('/user/profile', 'GET');
            if (response.user) {
                this.setCurrentUser(response.user);
                return true;
            }
        } catch (error) {
            this.clearTokens();
            return false;
        }
    }
    
    async refreshAccessToken() {
        try {
            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.refreshToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.accessToken = data.access_token;
                localStorage.setItem('accessToken', data.access_token);
                return data.access_token;
            } else {
                throw new Error('Token refresh failed');
            }
        } catch (error) {
            this.clearTokens();
            throw error;
        }
    }
    
    async makeRequest(endpoint, method = 'GET', data = null) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        
        const options = {
            method,
            headers
        };
        
        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }
        
        let response = await fetch(url, options);
        
        // Handle 401 Unauthorized - try to refresh token
        if (response.status === 401 && this.refreshToken && endpoint !== '/auth/refresh') {
            try {
                await this.refreshAccessToken();
                headers['Authorization'] = `Bearer ${this.accessToken}`;
                response = await fetch(url, options);
            } catch (refreshError) {
                this.clearTokens();
                throw new Error('Session expired. Please login again.');
            }
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Request failed');
        }
        
        return await response.json();
    }
    
    setTokens(accessToken, refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
    }
    
    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    }
    
    setCurrentUser(user) {
        this.currentUser = user;
        this.updateUIForLoggedInUser(user);
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    isAuthenticated() {
        return !!this.accessToken && !!this.currentUser;
    }
    
    async verifyEmail(token) {
        try {
            const response = await this.makeRequest(`/auth/verify?token=${token}`, 'GET');
            if (this.currentUser) {
                this.currentUser.is_verified = response.user.is_verified;
                this.updateUIForLoggedInUser(this.currentUser);
            }
            this.showSuccess('Email verified successfully!');
            return response;
        } catch (error) {
            this.showError('Email verification failed: ' + error.message);
            throw error;
        }
    }
    
    async linkWallet(walletAddress, signature, nonce) {
        try {
            const response = await this.makeRequest('/auth/wallet/link', 'POST', {
                wallet_address: walletAddress,
                signature,
                nonce
            });
            
            this.setCurrentUser(response.user);
            this.showSuccess('Wallet linked successfully!');
            return response;
        } catch (error) {
            this.showError('Failed to link wallet: ' + error.message);
            throw error;
        }
    }
    
    updateUIForLoggedInUser(user) {
        const userEmail = document.getElementById('userEmail');
        const profileEmail = document.getElementById('profileEmail');
        const profileWallet = document.getElementById('profileWallet');
        const profileCreated = document.getElementById('profileCreated');
        const profileLastLogin = document.getElementById('profileLastLogin');
        const emailVerified = document.getElementById('emailVerified');
        const emailNotVerified = document.getElementById('emailNotVerified');
        const linkWalletBtn = document.getElementById('linkWalletBtn');
        const userMenu = document.getElementById('userMenu');
        const authButtons = document.querySelectorAll('#loginBtn, #registerBtn, #walletBtn');
        
        if (userEmail) userEmail.textContent = user.email;
        if (profileEmail) profileEmail.textContent = user.email;
        if (profileWallet) {
            if (user.wallet_address) {
                profileWallet.textContent = this.formatAddress(user.wallet_address);
                if (linkWalletBtn) linkWalletBtn.style.display = 'none';
            } else {
                profileWallet.textContent = 'Not linked';
                if (linkWalletBtn) linkWalletBtn.style.display = 'inline-flex';
            }
        }
        if (profileCreated && user.created_at) {
            profileCreated.textContent = new Date(user.created_at).toLocaleDateString();
        }
        if (profileLastLogin && user.last_login) {
            profileLastLogin.textContent = new Date(user.last_login).toLocaleDateString();
        }
        
        // Email verification status
        if (emailVerified && emailNotVerified) {
            if (user.is_verified) {
                emailVerified.style.display = 'inline-block';
                emailNotVerified.style.display = 'none';
            } else {
                emailVerified.style.display = 'none';
                emailNotVerified.style.display = 'inline-block';
            }
        }
        
        // Update navigation
        if (userMenu) userMenu.style.display = 'flex';
        if (authButtons) {
            authButtons.forEach(btn => btn.style.display = 'none');
        }
    }
    
    updateUIForLoggedOutUser() {
        const app = window.web3AuthApp;
        if (app) {
            app.showSection('landing');
        }
        
        // Reset navigation
        const userMenu = document.getElementById('userMenu');
        const authButtons = document.querySelectorAll('#loginBtn, #registerBtn, #walletBtn');
        
        if (userMenu) userMenu.style.display = 'none';
        if (authButtons) {
            authButtons.forEach(btn => btn.style.display = 'inline-flex');
        }
    }
    
    formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    
    showSuccess(message) {
        this.showToast(message, 'success');
    }
    
    showError(message) {
        this.showToast(message, 'error');
    }
    
    showInfo(message) {
        this.showToast(message, 'info');
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
                toast.remove();
            }
        }, 5000);
    }
}

// Initialize auth manager
const authManager = new AuthManager();
