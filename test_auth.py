import pytest
import json
from app import create_app, db
from app.models.user import User

@pytest.fixture
def app():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def auth_headers(client):
    # Create and login a test user
    user_data = {
        'email': 'test@example.com',
        'password': 'TestPass123!'
    }
    
    # Register user
    client.post('/api/auth/register', 
               data=json.dumps(user_data),
               content_type='application/json')
    
    # Login user
    response = client.post('/api/auth/login',
                          data=json.dumps(user_data),
                          content_type='application/json')
    
    token = json.loads(response.data)['access_token']
    return {'Authorization': f'Bearer {token}'}

class TestAuth:
    def test_register_success(self, client):
        """Test successful user registration"""
        user_data = {
            'email': 'newuser@example.com',
            'password': 'NewPass123!'
        }
        
        response = client.post('/api/auth/register',
                              data=json.dumps(user_data),
                              content_type='application/json')
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert 'user_id' in data
        assert 'message' in data
    
    def test_register_duplicate_email(self, client):
        """Test registration with duplicate email"""
        user_data = {
            'email': 'duplicate@example.com',
            'password': 'TestPass123!'
        }
        
        # Register first user
        client.post('/api/auth/register',
                   data=json.dumps(user_data),
                   content_type='application/json')
        
        # Try to register same email again
        response = client.post('/api/auth/register',
                              data=json.dumps(user_data),
                              content_type='application/json')
        
        assert response.status_code == 409
        data = json.loads(response.data)
        assert 'already exists' in data['error']
    
    def test_register_invalid_email(self, client):
        """Test registration with invalid email"""
        user_data = {
            'email': 'invalid-email',
            'password': 'TestPass123!'
        }
        
        response = client.post('/api/auth/register',
                              data=json.dumps(user_data),
                              content_type='application/json')
        
        assert response.status_code == 400
    
    def test_register_weak_password(self, client):
        """Test registration with weak password"""
        user_data = {
            'email': 'weak@example.com',
            'password': '123'
        }
        
        response = client.post('/api/auth/register',
                              data=json.dumps(user_data),
                              content_type='application/json')
        
        assert response.status_code == 400
    
    def test_login_success(self, client):
        """Test successful login"""
        # First register a user
        user_data = {
            'email': 'login@example.com',
            'password': 'LoginPass123!'
        }
        client.post('/api/auth/register',
                   data=json.dumps(user_data),
                   content_type='application/json')
        
        # Now login
        response = client.post('/api/auth/login',
                              data=json.dumps(user_data),
                              content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert 'user' in data
    
    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials"""
        user_data = {
            'email': 'wrong@example.com',
            'password': 'wrongpass'
        }
        
        response = client.post('/api/auth/login',
                              data=json.dumps(user_data),
                              content_type='application/json')
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'Invalid credentials' in data['error']
    
    def test_wallet_nonce_request(self, client):
        """Test wallet nonce generation"""
        wallet_data = {
            'wallet_address': '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b'
        }
        
        response = client.post('/api/auth/wallet/nonce',
                              data=json.dumps(wallet_data),
                              content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'nonce' in data
        assert 'message' in data
        assert 'wallet_address' in data
    
    def test_wallet_auth_invalid_signature(self, client):
        """Test wallet authentication with invalid signature"""
        auth_data = {
            'wallet_address': '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b',
            'signature': 'invalid_signature',
            'nonce': 'test_nonce'
        }
        
        response = client.post('/api/auth/wallet/authenticate',
                              data=json.dumps(auth_data),
                              content_type='application/json')
        
        assert response.status_code == 401

class TestUser:
    def test_get_profile(self, client, auth_headers):
        """Test getting user profile"""
        response = client.get('/api/user/profile', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'user' in data
        assert 'email' in data['user']
    
    def test_get_profile_unauthorized(self, client):
        """Test getting profile without authentication"""
        response = client.get('/api/user/profile')
        
        assert response.status_code == 401
