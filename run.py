from app import create_app, db
from app.models import User
import os

app = create_app()

@app.cli.command()
def init_db():
    """Initialize the database"""
    with app.app_context():
        db.create_all()
    print("Database initialized successfully!")

@app.cli.command()
def create_admin():
    """Create an admin user for testing"""
    admin_email = os.getenv('ADMIN_EMAIL', 'admin@example.com')
    admin_password = os.getenv('ADMIN_PASSWORD', 'Admin123!')
    
    with app.app_context():
        # Check if admin already exists
        existing_admin = User.query.filter_by(email=admin_email).first()
        if existing_admin:
            print(f"Admin user {admin_email} already exists!")
            return
        
        # Create admin user
        admin = User(
            email=admin_email,
            is_verified=True
        )
        admin.set_password(admin_password)
        
        db.session.add(admin)
        db.session.commit()
        
        print(f"Admin user {admin_email} created successfully!")

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)
