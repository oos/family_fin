#!/usr/bin/env python3
"""
Script to initialize production database via API
"""

import requests
import time
import json

def init_production_database():
    """Initialize production database via API call"""
    
    api_url = "https://family-finance-api-ycku.onrender.com"
    
    print("🔧 Initializing production database...")
    print(f"API URL: {api_url}")
    
    # Wait for deployment to complete
    print("⏳ Waiting for deployment...")
    time.sleep(30)
    
    # Try the database initialization endpoint
    try:
        print("📡 Calling database initialization endpoint...")
        response = requests.post(
            f"{api_url}/api/admin/init-database",
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ Database initialized successfully!")
                print(f"Sean's user ID: {data.get('sean_user_id')}")
                print(f"Login credentials:")
                creds = data.get('login_credentials', {})
                print(f"  Email: {creds.get('email')}")
                print(f"  Password: {creds.get('password')}")
                return True
            else:
                print(f"❌ Database initialization failed: {data.get('error')}")
                return False
        else:
            print(f"❌ API call failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error calling API: {str(e)}")
        return False

def test_login():
    """Test if login works after database initialization"""
    
    api_url = "https://family-finance-api-ycku.onrender.com"
    
    print("\n🧪 Testing login...")
    
    try:
        response = requests.post(
            f"{api_url}/api/auth/login",
            json={'email': 'sean.osullivan@gmail.com', 'password': 'Secodwom01'},
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"Login response status: {response.status_code}")
        print(f"Login response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Login successful!")
            return True
        else:
            print("❌ Login failed")
            return False
            
    except Exception as e:
        print(f"❌ Error testing login: {str(e)}")
        return False

if __name__ == '__main__':
    print("🚀 Initializing production database...")
    print("=" * 60)
    
    # Initialize database
    db_initialized = init_production_database()
    
    if db_initialized:
        # Test login
        login_works = test_login()
        
        print("=" * 60)
        if login_works:
            print("🎉 SUCCESS! Database initialized and login works!")
            print("You can now login at: https://family-finance-frontend.onrender.com/login")
            print("Email: sean.osullivan@gmail.com")
            print("Password: Secodwom01")
        else:
            print("⚠️ Database initialized but login still not working")
    else:
        print("💥 Database initialization failed")

