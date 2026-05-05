from datetime import datetime, timedelta
from flask import request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity
from app import db
from app.models.user import User
from app.utils import TokenManager, validate_registration_data, sanitize_input
import os

class AuthController:
    
    @staticmethod
    def register():
        """Handle user registration"""
        try:
            data = request.get_json()
            email = sanitize_input(data.get('email', '')).lower()
            password = data.get('password', '')
            
            if not email or not password:
                return jsonify({'error': 'Email and password are required'}), 400
            
            # Validate the input
            is_valid, errors, _ = validate_registration_data(email, password)
            if not is_valid:
                return jsonify({'errors': errors}), 400
            
            # Check if user already exists
            if User.query.filter_by(email=email).first():
                return jsonify({'error': 'An account with this email already exists'}), 409
            
            # Create new user
            user = User(email=email, is_verified=False)
            user.set_password(password)
            
            # Generate verification token
            token = TokenManager.generate_verification_token()
            user.set_verification_token(token)
            
            db.session.add(user)
            db.session.commit()
            
            # Send verification email
            email_sent, _ = TokenManager.send_verification_email(email, token)
            
            return jsonify({
                'message': 'Registration successful! Please check your email for verification.',
                'user_id': user.id,
                'email_verification_sent': email_sent
            }), 201
            
        except Exception as e:
            current_app.logger.error(f'Registration error: {str(e)}')
            db.session.rollback()
            return jsonify({'error': 'Registration failed. Please try again.'}), 500
    
    @staticmethod
    def login():
        """Handle user login"""
        try:
            data = request.get_json()
            email = sanitize_input(data.get('email', '')).lower()
            password = data.get('password', '')
            
            if not email or not password:
                return jsonify({'error': 'Email and password are required'}), 400
            
            # Find user
            user = User.query.filter_by(email=email).first()
            if not user or not user.check_password(password):
                return jsonify({'error': 'Invalid email or password'}), 401
            
            # Update last login
            user.last_login = datetime.utcnow()
            db.session.commit()
            
            # Create tokens
            access_token = create_access_token(
                identity=str(user.id),
                expires_delta=timedelta(hours=1)
            )
            refresh_token = create_refresh_token(
                identity=str(user.id),
                expires_delta=timedelta(days=30)
            )
            
            return jsonify({
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': user.to_dict()
            }), 200
            
        except Exception as e:
            current_app.logger.error(f'Login error: {str(e)}')
            return jsonify({'error': 'Login failed. Please try again.'}), 500
    
    @staticmethod
    def verify():
        """Handle email verification"""
        try:
            token = request.args.get('token')
            if not token:
                return jsonify({'error': 'Verification token is required'}), 400
            
            # Find user by token
            user = User.query.filter_by(verification_token=token).first()
            if not user:
                return jsonify({'error': 'Invalid verification token'}), 400
            
            # Check if token is still valid
            if not user.is_verification_token_valid(token):
                return jsonify({'error': 'Verification token has expired'}), 400
            
            # Verify the email
            user.verify_email()
            db.session.commit()
            
            return jsonify({
                'message': 'Email verified successfully!',
                'user': user.to_dict()
            }), 200
            
        except Exception as e:
            current_app.logger.error(f'Email verification error: {str(e)}')
            return jsonify({'error': 'Email verification failed'}), 500
    
    @staticmethod
    def get_nonce():
        """Get nonce for wallet authentication"""
        try:
            data = request.get_json()
            wallet_address = data.get('wallet_address', '')
            
            if not wallet_address:
                return jsonify({'error': 'Wallet address is required'}), 400
            
            # Basic validation
            if not wallet_address.startswith('0x') or len(wallet_address) != 42:
                return jsonify({'error': 'Invalid wallet address format'}), 400
            
            wallet_address = wallet_address.lower()
            
            # Generate nonce and message
            nonce = TokenManager.generate_wallet_nonce()
            message = TokenManager.create_wallet_message(nonce)
            
            return jsonify({
                'nonce': nonce,
                'message': message,
                'wallet_address': wallet_address
            }), 200
            
        except Exception as e:
            current_app.logger.error(f'Nonce generation error: {str(e)}')
            return jsonify({'error': 'Failed to generate nonce'}), 500
    
    @staticmethod
    def auth_wallet():
        """Handle wallet authentication"""
        try:
            data = request.get_json()
            wallet_address = data.get('wallet_address', '')
            signature = data.get('signature', '')
            nonce = data.get('nonce', '')
            
            if not all([wallet_address, signature, nonce]):
                return jsonify({'error': 'Wallet address, signature, and nonce are required'}), 400
            
            # Validate wallet address
            if not wallet_address.startswith('0x') or len(wallet_address) != 42:
                return jsonify({'error': 'Invalid wallet address format'}), 400
            
            wallet_address = wallet_address.lower()
            
            # For demo purposes, we'll skip actual signature verification
            # In production, you'd verify the signature here
            print(f'Wallet auth attempt for {wallet_address}')
            
            # Find or create user
            user = User.query.filter_by(wallet_address=wallet_address).first()
            
            if not user:
                # Create new wallet user
                user = User(
                    wallet_address=wallet_address,
                    is_verified=True
                )
                db.session.add(user)
                db.session.commit()
            else:
                # Update last login
                user.last_login = datetime.utcnow()
                db.session.commit()
            
            # Create tokens
            access_token = create_access_token(
                identity=str(user.id),
                expires_delta=timedelta(hours=1)
            )
            refresh_token = create_refresh_token(
                identity=str(user.id),
                expires_delta=timedelta(days=30)
            )
            
            return jsonify({
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': user.to_dict()
            }), 200
            
        except Exception as e:
            current_app.logger.error(f'Wallet authentication error: {str(e)}')
            return jsonify({'error': 'Wallet authentication failed'}), 500
    
    @staticmethod
    def link_wallet():
        """Link wallet to existing account"""
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return jsonify({'error': 'Authentication required'}), 401
            
            data = request.get_json()
            wallet_address = data.get('wallet_address', '')
            signature = data.get('signature', '')
            nonce = data.get('nonce', '')
            
            if not all([wallet_address, signature, nonce]):
                return jsonify({'error': 'Wallet address, signature, and nonce are required'}), 400
            
            # Validate wallet address
            if not wallet_address.startswith('0x') or len(wallet_address) != 42:
                return jsonify({'error': 'Invalid wallet address format'}), 400
            
            wallet_address = wallet_address.lower()
            
            # For demo purposes, skip signature verification
            print(f'Wallet linking attempt for user {user_id}')
            
            # Check if wallet is already linked
            existing_user = User.query.filter_by(wallet_address=wallet_address).first()
            if existing_user and existing_user.id != user_id:
                return jsonify({'error': 'This wallet is already linked to another account'}), 409
            
            # Get current user and link wallet
            user = User.query.get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            user.wallet_address = wallet_address
            db.session.commit()
            
            return jsonify({
                'message': 'Wallet linked successfully!',
                'user': user.to_dict()
            }), 200
            
        except Exception as e:
            current_app.logger.error(f'Wallet linking error: {str(e)}')
            return jsonify({'error': 'Failed to link wallet'}), 500
    
    @staticmethod
    def refresh():
        """Refresh JWT token"""
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return jsonify({'error': 'Invalid token'}), 401
            
            new_token = create_access_token(identity=str(current_user_id))
            return jsonify({'access_token': new_token}), 200
            
        except Exception as e:
            current_app.logger.error(f'Token refresh error: {str(e)}')
            return jsonify({'error': 'Token refresh failed'}), 500
