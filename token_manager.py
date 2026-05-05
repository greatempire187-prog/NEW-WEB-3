import secrets
import string
from datetime import datetime, timedelta
from flask import current_app
import os

class TokenManager:
    @staticmethod
    def generate_verification_token(length=32):
        """Generate secure verification token"""
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    @staticmethod
    def generate_wallet_nonce():
        """Generate nonce for wallet signature verification"""
        return secrets.token_hex(32)
    
    @staticmethod
    def send_verification_email(user_email, verification_token):
        """Mock email verification for demo purposes"""
        print(f"Email verification sent to {user_email}")
        print(f"Verification token: {verification_token}")
        return True, "Verification email sent successfully"
    
    @staticmethod
    def is_token_expired(token_expires):
        """Check if token has expired"""
        return datetime.utcnow() > token_expires
    
    @staticmethod
    def create_wallet_message(nonce):
        """Create message for wallet signature"""
        return f"Sign this message to authenticate with Web3 Auth System. Nonce: {nonce}"
