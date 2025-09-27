#!/usr/bin/env python3
"""
One-time user setup script for Render deployment
This script creates users directly in the production database
"""

import os
import sys
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from models import db, User

def create_app():
    """Create Flask app with database connection"""
    app = Flask(__name__)
    
    # Use production database URL
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    return app

def setup_users():
    """Create users in production database"""
    app = create_app()
    
    with app.app_context():
        try:
            # Check if users already exist
            if User.query.count() > 0:
                print("Users already exist, skipping setup")
                return
            
            # Create users from local database data
            users_data = [
                {
                    'username': 'omarosullivan@gmail.com',
                    'email': 'omarosullivan@gmail.com',
                    'password': 'admin123',
                    'role': 'admin',
                    'is_active': True
                },
                {
                    'username': 'dwayneosullivan',
                    'email': 'dwayneosullivan@gmail.com',
                    'password': 'dwayne123',
                    'role': 'user',
                    'is_active': True
                },
                {
                    'username': 'heidiosullivan',
                    'email': 'heidiosullivan@gmail.com',
                    'password': 'heidi123',
                    'role': 'user',
                    'is_active': True
                },
                {
                    'username': 'lenamosulivan',
                    'email': 'lenamosulivan@gmail.com',
                    'password': 'lena123',
                    'role': 'user',
                    'is_active': True
                },
                {
                    'username': 'sean',
                    'email': 'sean.osullivan@gmail.com',
                    'password': 'Secodwom01',
                    'role': 'user',
                    'is_active': True
                }
            ]
            
            print(f"Creating {len(users_data)} users...")
            
            for user_data in users_data:
                user = User(
                    username=user_data['username'],
                    email=user_data['email'],
                    password=user_data['password'],  # Plain text for v2.6.0
                    role=user_data['role'],
                    is_active=user_data['is_active']
                )
                db.session.add(user)
                print(f"✅ Added user: {user_data['email']}")
            
            db.session.commit()
            print("🎉 All users created successfully!")
            
        except Exception as e:
            print(f"❌ Error creating users: {e}")
            db.session.rollback()
            sys.exit(1)

if __name__ == "__main__":
    setup_users()
