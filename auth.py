from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
from app.controllers.auth_controller import AuthController

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register new user with email and password"""
    return AuthController.register_email()

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user with email and password"""
    return AuthController.login_email()

@auth_bp.route('/verify-email', methods=['GET'])
def verify_email():
    """Verify user email with token"""
    return AuthController.verify_email()

@auth_bp.route('/wallet/nonce', methods=['POST'])
def request_wallet_nonce():
    """Request nonce for wallet authentication"""
    return AuthController.request_wallet_nonce()

@auth_bp.route('/wallet/authenticate', methods=['POST'])
def authenticate_wallet():
    """Authenticate user with wallet signature"""
    return AuthController.authenticate_wallet()

@auth_bp.route('/wallet/link', methods=['POST'])
@jwt_required()
def link_wallet():
    """Link wallet to existing user account"""
    return AuthController.link_wallet()

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    try:
        current_user_id = get_jwt_identity()
        new_token = create_access_token(identity=current_user_id)
        return jsonify({'access_token': new_token}), 200
    except Exception as e:
        return jsonify({'error': 'Token refresh failed'}), 500
