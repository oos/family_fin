#!/usr/bin/env python3
"""
Database migration script to import users
Uses Alembic for database operations
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

def get_database_connection():
    """Get database connection using DATABASE_URL"""
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL not found in environment")
        sys.exit(1)
    
    engine = create_engine(database_url)
    return engine

def import_users_via_sql():
    """Import users using direct SQL commands"""
    engine = get_database_connection()
    
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
        with engine.connect() as conn:
            # Check if users table exists and has data
            result = conn.execute(text("SELECT COUNT(*) FROM \"user\""))
            count = result.scalar()
            
            if count > 0:
                print(f"Users already exist ({count} users), skipping import")
                return
            
            print(f"Importing {len(users_data)} users...")
            
            # Insert users
            for user_data in users_data:
                insert_sql = text("""
                    INSERT INTO "user" (username, email, password, role, is_active, created_at, updated_at)
                    VALUES (:username, :email, :password, :role, :is_active, NOW(), NOW())
                """)
                
                conn.execute(insert_sql, {
                    'username': user_data['username'],
                    'email': user_data['email'],
                    'password': user_data['password'],
                    'role': user_data['role'],
                    'is_active': user_data['is_active']
                })
                
                print(f"✅ Imported user: {user_data['email']}")
            
            conn.commit()
            print("🎉 All users imported successfully!")
            
    except Exception as e:
        print(f"❌ Error importing users: {e}")
        sys.exit(1)

if __name__ == "__main__":
    import_users_via_sql()
