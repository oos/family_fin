#!/usr/bin/env python3
"""
Script to fix Sean's email address
- Delete the duplicate user with incorrect email
- Update the original user with correct email
"""

from app import app, db
from models import User, DashboardSettings
from datetime import datetime

def fix_sean_email():
    """Fix Sean's email address"""
    
    with app.app_context():
        try:
            # Find the duplicate user with incorrect email
            duplicate_user = User.query.filter_by(email='seanosullivan@gmail.com').first()
            
            # Find the user with correct email
            correct_user = User.query.filter_by(email='sean.osullivan@gmail.com').first()
            
            if duplicate_user and correct_user:
                print(f"Found duplicate user: {duplicate_user.email}")
                print(f"Found correct user: {correct_user.email}")
                
                # Delete the duplicate user's dashboard settings first
                DashboardSettings.query.filter_by(user_id=duplicate_user.id).delete()
                
                # Delete the duplicate user
                db.session.delete(duplicate_user)
                
                # Update the correct user's username to match the email
                correct_user.username = 'sean.osullivan'
                correct_user.updated_at = datetime.utcnow()
                
                db.session.commit()
                
                print(f"✅ Deleted duplicate user: seanosullivan@gmail.com")
                print(f"✅ Updated correct user: sean.osullivan@gmail.com")
                
            elif duplicate_user and not correct_user:
                # Only duplicate exists, update it
                print(f"Found user with incorrect email: {duplicate_user.email}")
                duplicate_user.email = 'sean.osullivan@gmail.com'
                duplicate_user.username = 'sean.osullivan'
                duplicate_user.updated_at = datetime.utcnow()
                
                db.session.commit()
                
                print(f"✅ Updated user email to: sean.osullivan@gmail.com")
                
            else:
                print("❌ Could not find the users to update")
                return
            
            # Display all users
            print(f"\n📋 Current users in system:")
            all_users = User.query.all()
            for user in all_users:
                print(f"  - {user.email} ({user.role}) - Username: {user.username}")
                
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error fixing Sean's email: {str(e)}")
            raise

if __name__ == '__main__':
    fix_sean_email()
