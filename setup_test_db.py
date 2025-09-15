#!/usr/bin/env python3
"""
Setup script for test database.
"""
import os
import sys
import tempfile
from flask import Flask
from app import app, db, User
from werkzeug.security import generate_password_hash

def setup_test_database():
    """Set up a test database with sample data."""
    # Create a temporary database
    db_fd, db_path = tempfile.mkstemp()
    
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path}',
        'JWT_SECRET_KEY': 'test-secret-key',
        'WTF_CSRF_ENABLED': False
    })
    
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Create test users
        test_users = [
            {
                'username': 'testuser@example.com',
                'email': 'testuser@example.com',
                'password': 'testpassword123'
            },
            {
                'username': 'admin@example.com',
                'email': 'admin@example.com',
                'password': 'adminpassword123'
            }
        ]
        
        for user_data in test_users:
            user = User(
                username=user_data['username'],
                email=user_data['email'],
                password_hash=generate_password_hash(user_data['password']),
                is_active=True
            )
            db.session.add(user)
        
        db.session.commit()
        
        print(f"✅ Test database created at: {db_path}")
        print(f"✅ Created {len(test_users)} test users")
        print(f"✅ Database URI: sqlite:///{db_path}")
        
        return db_path

if __name__ == "__main__":
    setup_test_database()
