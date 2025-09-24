#!/usr/bin/env python3
"""
Test login logic locally
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from models import User
from werkzeug.security import check_password_hash

def test_login():
    with app.app_context():
        # Test Sean's login
        email = "sean.osullivan@gmail.com"
        password = "Secodwom01"
        
        print(f"Testing login for: {email}")
        
        # Find user
        user = User.query.filter(
            (User.username == email) | (User.email == email)
        ).first()
        
        if not user:
            print("❌ User not found")
            return False
        
        print(f"✓ User found: {user.email}")
        print(f"  Username: {user.username}")
        print(f"  Is Active: {user.is_active}")
        print(f"  Role: {user.role}")
        print(f"  Password Hash: {user.password_hash[:50]}...")
        
        # Test password check
        if user.check_password(password):
            print("✓ Password check successful")
            return True
        else:
            print("❌ Password check failed")
            return False

if __name__ == "__main__":
    test_login()
