from datetime import datetime
from app import db
import bcrypt

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=True, index=True)
    password_hash = db.Column(db.String(255), nullable=True)
    wallet_address = db.Column(db.String(42), unique=True, nullable=True, index=True)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    verification_token = db.Column(db.String(255), nullable=True)
    verification_token_expires = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login = db.Column(db.DateTime, nullable=True)
    
    def set_password(self, password):
        """Hash and set user password"""
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        if not self.password_hash:
            return False
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def set_verification_token(self, token):
        """Set email verification token with expiration"""
        self.verification_token = token
        self.verification_token_expires = datetime.utcnow().replace(hour=23, minute=59, second=59)
    
    def is_verification_token_valid(self, token):
        """Check if verification token is valid and not expired"""
        if not self.verification_token or not self.verification_token_expires:
            return False
        return self.verification_token == token and datetime.utcnow() < self.verification_token_expires
    
    def verify_email(self):
        """Mark user as verified and clear token"""
        self.is_verified = True
        self.verification_token = None
        self.verification_token_expires = None
    
    def to_dict(self):
        """Convert user object to dictionary"""
        return {
            'id': self.id,
            'email': self.email,
            'wallet_address': self.wallet_address,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }
    
    @staticmethod
    def find_by_email_or_wallet(email=None, wallet_address=None):
        """Find user by email or wallet address"""
        if email:
            return User.query.filter_by(email=email).first()
        if wallet_address:
            return User.query.filter_by(wallet_address=wallet_address.lower()).first()
        return None
    
    def __repr__(self):
        return f'<User {self.email}>'
