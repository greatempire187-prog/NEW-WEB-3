import re
from email_validator import validate_email, EmailNotValidError

def validate_email_format(email):
    """Validate email format using email-validator"""
    try:
        validate_email(email)
        return True, None
    except EmailNotValidError as e:
        return False, str(e)

def validate_password_strength(password):
    """Validate password strength"""
    errors = []
    
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    
    if not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter")
    
    if not re.search(r'[a-z]', password):
        errors.append("Password must contain at least one lowercase letter")
    
    if not re.search(r'\d', password):
        errors.append("Password must contain at least one number")
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        errors.append("Password must contain at least one special character")
    
    return len(errors) == 0, errors

def validate_wallet_address(address):
    """Validate Ethereum wallet address (mock implementation)"""
    if not address:
        return False, "Wallet address is required"
    
    # Basic validation for mock implementation
    if not address.startswith('0x') or len(address) != 42:
        return False, "Invalid wallet address format"
    
    # Check if it contains only hex characters after 0x
    hex_part = address[2:]
    if not all(c in '0123456789abcdefABCDEF' for c in hex_part):
        return False, "Invalid wallet address format"
    
    return True, address.lower()

def sanitize_input(input_string):
    """Basic input sanitization"""
    if not input_string:
        return ""
    
    # Remove potential XSS characters
    dangerous_chars = ['<', '>', '&', '"', "'", '/', '\\']
    sanitized = input_string
    
    for char in dangerous_chars:
        sanitized = sanitized.replace(char, '')
    
    return sanitized.strip()

def validate_registration_data(email, password, wallet_address=None):
    """Comprehensive validation for registration data"""
    errors = {}
    
    # Email validation
    is_valid_email, email_error = validate_email_format(email)
    if not is_valid_email:
        errors['email'] = email_error
    
    # Password validation (only if provided)
    if password:
        is_valid_password, password_errors = validate_password_strength(password)
        if not is_valid_password:
            errors['password'] = password_errors
    
    # Wallet address validation (only if provided)
    if wallet_address:
        is_valid_wallet, wallet_result = validate_wallet_address(wallet_address)
        if not is_valid_wallet:
            errors['wallet_address'] = wallet_result
        else:
            # Store the normalized address for later use
            wallet_address = wallet_result
    
    return len(errors) == 0, errors, wallet_address
