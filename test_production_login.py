#!/usr/bin/env python3
"""
Test production login logic
"""

import psycopg2
from werkzeug.security import check_password_hash

# Production database connection
PROD_DB_URL = 'postgresql://family_finance_user:P01zoORtwRsCUyTBsCIsCoCpyyakHcYj@dpg-d35slqruibrs73djfr2g-a.frankfurt-postgres.render.com/family_finance_ofgc'

def test_production_login():
    try:
        conn = psycopg2.connect(PROD_DB_URL)
        cursor = conn.cursor()
        
        print("✓ Connected to production database")
        
        # Test Sean's login
        email = "sean.osullivan@gmail.com"
        password = "Secodwom01"
        
        print(f"Testing login for: {email}")
        
        # Find user
        cursor.execute('SELECT id, username, email, password_hash, is_active, role FROM "user" WHERE email = %s', (email,))
        user = cursor.fetchone()
        
        if not user:
            print("❌ User not found")
            return False
        
        user_id, username, user_email, password_hash, is_active, role = user
        
        print(f"✓ User found: {user_email}")
        print(f"  ID: {user_id}")
        print(f"  Username: {username}")
        print(f"  Is Active: {is_active}")
        print(f"  Role: {role}")
        print(f"  Password Hash: {password_hash[:50]}...")
        
        # Test password check
        if check_password_hash(password_hash, password):
            print("✓ Password check successful")
            return True
        else:
            print("❌ Password check failed")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    test_production_login()
