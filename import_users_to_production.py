#!/usr/bin/env python3
"""
Export users from local database and import to production
"""

import sqlite3
import os
import requests
import json

def export_users_from_local():
    """Export users from local SQLite database"""
    conn = sqlite3.connect('instance/family_finance.db')
    cursor = conn.cursor()
    
    # Get all users with plain text passwords
    cursor.execute("""
        SELECT email, username, role, password, is_active 
        FROM user 
        WHERE password IS NOT NULL AND password != ''
    """)
    
    users = cursor.fetchall()
    conn.close()
    
    print(f"📋 Found {len(users)} users in local database:")
    for user in users:
        email, username, role, password, is_active = user
        print(f"  - {email} ({role}) - Password: {password}")
    
    return users

def create_users_in_production(users):
    """Create users in production database via API"""
    api_url = "https://family-finance-api.onrender.com"
    
    for user_data in users:
        email, username, role, password, is_active = user_data
        
        # Create user data
        user_payload = {
            "email": email,
            "username": username,
            "role": role,
            "password": password,
            "is_active": bool(is_active)
        }
        
        try:
            # Try to create user via API
            response = requests.post(f"{api_url}/api/users", 
                                   json=user_payload,
                                   headers={"Content-Type": "application/json"})
            
            if response.status_code == 201:
                print(f"✅ Created user: {email}")
            elif response.status_code == 400 and "already exists" in response.text:
                print(f"ℹ️  User already exists: {email}")
            else:
                print(f"❌ Failed to create {email}: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Error creating {email}: {e}")

def main():
    print("🔄 Exporting users from local database...")
    users = export_users_from_local()
    
    print(f"\n🚀 Creating users in production database...")
    create_users_in_production(users)
    
    print(f"\n✅ User import completed!")

if __name__ == "__main__":
    main()
