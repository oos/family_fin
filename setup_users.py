#!/usr/bin/env python3
"""Script to set up users and roles"""

from app import app, db
from models import User, DashboardSettings
from werkzeug.security import generate_password_hash

def setup_users():
    with app.app_context():
        # Create admin user (Omar)
        admin_user = User.query.filter_by(email='omarosullivan@gmail.com').first()
        if admin_user:
            admin_user.role = 'admin'
            print("Updated Omar's role to admin")
        else:
            admin_user = User(
                username='omarosullivan',
                email='omarosullivan@gmail.com',
                role='admin'
            )
            admin_user.set_password('Gestalt,69')
            db.session.add(admin_user)
            print("Created admin user for Omar")
        
        # Create Sean's user account
        sean_user = User.query.filter_by(email='seanosullivan@gmail.com').first()
        if not sean_user:
            sean_user = User(
                username='seanosullivan',
                email='seanosullivan@gmail.com',
                role='user'
            )
            sean_user.set_password('Secodwom01!')
            db.session.add(sean_user)
            print("Created user account for Sean")
        else:
            print("Sean's account already exists")
        
        db.session.commit()
        
        # Set up default dashboard settings for Sean
        sean_id = sean_user.id
        default_sections = [
            'properties',
            'loans', 
            'account_balances',
            'bank_accounts'
        ]
        
        # Clear existing settings
        DashboardSettings.query.filter_by(user_id=sean_id).delete()
        
        # Create default settings (all visible initially)
        for section in default_sections:
            setting = DashboardSettings(
                user_id=sean_id,
                section=section,
                is_visible=True
            )
            db.session.add(setting)
        
        db.session.commit()
        print("Set up default dashboard settings for Sean")
        
        print("\nUsers created successfully!")
        print("Admin: omarosullivan@gmail.com")
        print("User: seanosullivan@gmail.com")

if __name__ == '__main__':
    setup_users()
