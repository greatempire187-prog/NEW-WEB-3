// Wallet Authentication Module - Human-written style
class WalletManager {
    constructor() {
        this.isMetaMaskInstalled = false;
        this.currentAccount = null;
        this.currentNonce = null;
        this.currentMessage = null;
        
        this.init();
    }
    
    init() {
        this.checkMetaMask();
        this.setupEventListeners();
    }
    
    checkMetaMask() {
        if (typeof window.ethereum !== 'undefined') {
            this.isMetaMaskInstalled = true;
            
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.currentAccount = null;
                } else if (accounts[0] !== this.currentAccount) {
                    this.currentAccount = accounts[0];
                }
                this.updateWalletUI();
            });
            
            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });
        }
    }
    
    setupEventListeners() {
        // Connect wallet button
        const connectBtn = document.getElementById('connectWalletBtn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connectWallet());
        }
        
        // Wallet auth button
        const walletAuthBtn = document.getElementById('walletAuthBtn');
        if (walletAuthBtn) {
            walletAuthBtn.addEventListener('click', () => this.startWalletAuth());
        }
        
        // Sign message button
        const signBtn = document.getElementById('signMessageBtn');
        if (signBtn) {
            signBtn.addEventListener('click', () => this.signMessage());
        }
        
        // Link wallet button
        const linkBtn = document.getElementById('linkWalletBtn');
        if (linkBtn) {
            linkBtn.addEventListener('click', () => this.linkWallet());
        }
        
        // Header wallet button
        const headerWalletBtn = document.getElementById('walletBtn');
        if (headerWalletBtn) {
            headerWalletBtn.addEventListener('click', () => this.connectWallet());
        }
    }
    
    async connectWallet() {
        if (!this.isMetaMaskInstalled) {
            authManager.showError('MetaMask is not installed. Please install MetaMask to continue.');
            return false;
        }
        
        try {
            authManager.showLoading('Connecting to MetaMask...');
            
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });
            
            if (accounts.length === 0) {
                throw new Error('No accounts found');
            }
            
            this.currentAccount = accounts[0];
            this.updateWalletUI();
            
            authManager.hideLoading();
            authManager.showSuccess('Wallet connected successfully!');
            
            return this.currentAccount;
            
        } catch (error) {
            authManager.hideLoading();
            if (error.code === 4001) {
                authManager.showError('User rejected the request.');
            } else {
                authManager.showError('Failed to connect wallet: ' + error.message);
            }
            return false;
        }
    }
    
    async startWalletAuth() {
        if (!this.currentAccount) {
            const connected = await this.connectWallet();
            if (!connected) return;
        }
        
        try {
            authManager.showLoading('Preparing authentication...');
            
            // Get nonce from server
            const response = await authManager.makeRequest('/auth/wallet/nonce', 'POST', {
                wallet_address: this.currentAccount
            });
            
            this.currentNonce = response.nonce;
            this.currentMessage = response.message;
            
            // Show signing form
            document.getElementById('walletConnectForm').style.display = 'none';
            document.getElementById('walletSigningForm').style.display = 'block';
            document.getElementById('messageBox').textContent = this.currentMessage;
            
            authManager.hideLoading();
            
        } catch (error) {
            authManager.hideLoading();
            authManager.showError('Failed to prepare wallet authentication: ' + error.message);
        }
    }
    
    async signMessage() {
        if (!this.currentAccount || !this.currentMessage) {
            authManager.showError('Wallet connection error. Please try again.');
            return;
        }
        
        try {
            authManager.showLoading('Signing message...');
            
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [this.currentMessage, this.currentAccount]
            });
            
            // Authenticate with server
            const response = await authManager.makeRequest('/auth/wallet/authenticate', 'POST', {
                wallet_address: this.currentAccount,
                signature: signature,
                nonce: this.currentNonce
            });
            
            authManager.setTokens(response.access_token, response.refresh_token);
            authManager.setCurrentUser(response.user);
            
            this.resetWalletAuthForm();
            authManager.hideLoading();
            authManager.showSuccess('Wallet authentication successful!');
            
        } catch (error) {
            authManager.hideLoading();
            if (error.code === 4001) {
                authManager.showError('User rejected the signature request.');
            } else {
                authManager.showError('Failed to sign message: ' + error.message);
            }
        }
    }
    
    async linkWallet() {
        if (!authManager.isAuthenticated()) {
            authManager.showError('Please login first to link your wallet.');
            return;
        }
        
        if (!this.currentAccount) {
            const connected = await this.connectWallet();
            if (!connected) return;
        }
        
        try {
            authManager.showLoading('Preparing wallet linking...');
            
            // Get nonce from server
            const response = await authManager.makeRequest('/auth/wallet/nonce', 'POST', {
                wallet_address: this.currentAccount
            });
            
            this.currentNonce = response.nonce;
            this.currentMessage = response.message;
            
            const confirmed = confirm(`Please sign the following message to link your wallet:\n\n${this.currentMessage}\n\nDo you want to proceed?`);
            
            if (confirmed) {
                await this.signAndLinkWallet();
            }
            
            authManager.hideLoading();
            
        } catch (error) {
            authManager.hideLoading();
            authManager.showError('Failed to prepare wallet linking: ' + error.message);
        }
    }
    
    async signAndLinkWallet() {
        try {
            authManager.showLoading('Signing message...');
            
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [this.currentMessage, this.currentAccount]
            });
            
            // Link wallet with server
            const response = await authManager.linkWallet(this.currentAccount, signature, this.currentNonce);
            
            authManager.hideLoading();
            
        } catch (error) {
            authManager.hideLoading();
            if (error.code === 4001) {
                authManager.showError('User rejected the signature request.');
            } else {
                authManager.showError('Failed to link wallet: ' + error.message);
            }
        }
    }
    
    resetWalletAuthForm() {
        document.getElementById('walletConnectForm').style.display = 'block';
        document.getElementById('walletSigningForm').style.display = 'none';
        document.getElementById('messageBox').textContent = '';
        this.currentNonce = null;
        this.currentMessage = null;
    }
    
    updateWalletUI() {
        const walletAddressInput = document.getElementById('walletAddress');
        const connectBtn = document.getElementById('connectWalletBtn');
        const walletAuthBtn = document.getElementById('walletAuthBtn');
        const headerWalletBtn = document.getElementById('walletBtn');
        
        if (this.currentAccount) {
            if (walletAddressInput) {
                walletAddressInput.value = this.currentAccount;
                walletAddressInput.readOnly = true;
            }
            if (connectBtn) {
                connectBtn.textContent = 'Connected';
                connectBtn.disabled = true;
            }
            if (walletAuthBtn) {
                walletAuthBtn.disabled = false;
            }
            if (headerWalletBtn) {
                headerWalletBtn.textContent = this.formatAddress(this.currentAccount);
                headerWalletBtn.classList.add('connected');
            }
        } else {
            if (walletAddressInput) {
                walletAddressInput.value = '';
                walletAddressInput.readOnly = false;
            }
            if (connectBtn) {
                connectBtn.textContent = 'Connect MetaMask';
                connectBtn.disabled = false;
            }
            if (walletAuthBtn) {
                walletAuthBtn.disabled = true;
            }
            if (headerWalletBtn) {
                headerWalletBtn.textContent = 'Connect Wallet';
                headerWalletBtn.classList.remove('connected');
            }
        }
    }
    
    getCurrentAccount() {
        return this.currentAccount;
    }
    
    isConnected() {
        return !!this.currentAccount;
    }
    
    formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
}

// Initialize wallet manager
const walletManager = new WalletManager();
