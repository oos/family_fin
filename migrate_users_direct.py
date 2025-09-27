#!/usr/bin/env python3
"""
Direct database migration using psycopg2
Bypasses SQLAlchemy compatibility issues
"""

import os
import psycopg2
from urllib.parse import urlparse

def get_database_connection():
    """Get database connection using DATABASE_URL"""
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL not found in environment")
        return None
    
    try:
        # Parse the database URL
        url = urlparse(database_url)
        
        # Connect to PostgreSQL
        conn = psycopg2.connect(
            database=url.path[1:],  # Remove leading slash
            user=url.username,
            password=url.password,
            host=url.hostname,
            port=url.port,
            sslmode='require'
        )
        return conn
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return None

def import_users_direct():
    """Import users using direct psycopg2 connection"""
    conn = get_database_connection()
    if not conn:
        return
    
    # Users data from local database
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
    
    try:
        cursor = conn.cursor()
        
        # Check if users table exists and has data
        cursor.execute('SELECT COUNT(*) FROM "user"')
        count = cursor.fetchone()[0]
        
        if count > 0:
            print(f"Users already exist ({count} users), skipping import")
            cursor.close()
            conn.close()
            return
        
        print(f"Importing {len(users_data)} users...")
        
        # Insert users
        for user_data in users_data:
            cursor.execute("""
                INSERT INTO "user" (username, email, password, role, is_active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
            """, (
                user_data['username'],
                user_data['email'],
                user_data['password'],
                user_data['role'],
                user_data['is_active']
            ))
            
            print(f"✅ Imported user: {user_data['email']}")
        
        # Commit changes
        conn.commit()
        print("🎉 All users imported successfully!")
        
        # Verify users were imported
        cursor.execute('SELECT email, role, password FROM "user"')
        imported_users = cursor.fetchall()
        print(f"\n📋 Users in production database:")
        for user in imported_users:
            email, role, password = user
            print(f"  - {email} ({role}) - Password: {password}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error importing users: {e}")
        conn.rollback()
        cursor.close()
        conn.close()

if __name__ == "__main__":
    import_users_direct()
