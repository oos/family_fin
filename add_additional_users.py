#!/usr/bin/env python3
"""
Script to add additional users to the Family Finance Management System
"""

from app import app, db
from models import User, DashboardSettings
from werkzeug.security import generate_password_hash
from datetime import datetime

def add_users():
    """Add the additional users to the system"""
    
    users_to_add = [
        {
            'username': 'sean.osullivan',
            'email': 'sean.osullivan@gmail.com',
            'role': 'user'
        },
        {
            'username': 'dwayneosullivan',
            'email': 'dwayneosullivan@gmail.com',
            'role': 'user'
        },
        {
            'username': 'heidiosullivan',
            'email': 'heidiosullivan@gmail.com',
            'role': 'user'
        },
        {
            'username': 'lenamosulivan',
            'email': 'lenamosulivan@gmail.com',
            'role': 'user'
        }
    ]
    
    password = 'Secodwom01!'
    
    with app.app_context():
        try:
            for user_data in users_to_add:
                # Check if user already exists
                existing_user = User.query.filter(
                    (User.username == user_data['username']) | 
                    (User.email == user_data['email'])
                ).first()
                
                if existing_user:
                    print(f"User {user_data['email']} already exists, skipping...")
                    continue
                
                # Create new user
                new_user = User(
                    username=user_data['username'],
                    email=user_data['email'],
                    role=user_data['role'],
                    is_active=True,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                
                # Set password
                new_user.set_password(password)
                
                # Add to database
                db.session.add(new_user)
                db.session.flush()  # Get the user ID
                
                # Create default dashboard settings for the user
                default_sections = [
                    'properties', 'loans', 'account_balances', 'bank_accounts',
                    'income', 'pension', 'bookings', 'transactions'
                ]
                
                for section in default_sections:
                    setting = DashboardSettings(
                        user_id=new_user.id,
                        section=section,
                        is_visible=True,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.session.add(setting)
                
                print(f"✅ Created user: {user_data['email']} (Role: {user_data['role']})")
            
            # Commit all changes
            db.session.commit()
            print(f"\n🎉 Successfully added {len(users_to_add)} users!")
            print(f"📧 All users have password: {password}")
            
            # Display all users
            print(f"\n📋 Current users in system:")
            all_users = User.query.all()
            for user in all_users:
                print(f"  - {user.email} ({user.role})")
                
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error adding users: {str(e)}")
            raise

if __name__ == '__main__':
    add_users()
