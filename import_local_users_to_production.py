#!/usr/bin/env python3
"""
Import users from local database to production database
"""

import psycopg2
import sqlite3
import os
from urllib.parse import urlparse

# Production database URL
DATABASE_URL = "postgresql://family_finance_db_ac3v_user:L2H5CXr6jzM6z0X5q3HRvLMNqjQX05mX@dpg-d3ahb10d13ps73eqmpcg-a.frankfurt-postgres.render.com/family_finance_db_ac3v?sslmode=require"

def get_local_users():
    """Get users from local SQLite database"""
    conn = sqlite3.connect('instance/family_finance.db')
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT username, email, password_hash, password, role, is_active, created_at, updated_at
        FROM user 
        WHERE password IS NOT NULL AND password != ''
    """)
    
    users = cursor.fetchall()
    conn.close()
    
    print(f"📋 Found {len(users)} users in local database:")
    for user in users:
        username, email, password_hash, password, role, is_active, created_at, updated_at = user
        print(f"  - {email} ({role}) - Password: {password}")
    
    return users

def import_users_to_production(users):
    """Import users to production PostgreSQL database"""
    try:
        # Parse the database URL
        url = urlparse(DATABASE_URL)
        
        # Connect to PostgreSQL
        conn = psycopg2.connect(
            database=url.path[1:],  # Remove leading slash
            user=url.username,
            password=url.password,
            host=url.hostname,
            port=url.port,
            sslmode='require'
        )
        
        cursor = conn.cursor()
        
        # Create users table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS "user" (
                id SERIAL PRIMARY KEY,
                username VARCHAR(80) UNIQUE NOT NULL,
                email VARCHAR(120) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                password VARCHAR(255),
                role VARCHAR(20) DEFAULT 'user',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Clear existing users
        cursor.execute('DELETE FROM "user"')
        print("🗑️  Cleared existing users from production database")
        
        # Insert users
        for user_data in users:
            username, email, password_hash, password, role, is_active, created_at, updated_at = user_data
            
            cursor.execute("""
                INSERT INTO "user" (username, email, password_hash, password, role, is_active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (username, email, password_hash, password, role, bool(is_active), created_at, updated_at))
            
            print(f"✅ Imported user: {email}")
        
        # Commit changes
        conn.commit()
        
        # Verify users were imported
        cursor.execute('SELECT email, role, password FROM "user"')
        imported_users = cursor.fetchall()
        print(f"\n📋 Users in production database:")
        for user in imported_users:
            email, role, password = user
            print(f"  - {email} ({role}) - Password: {password}")
        
        cursor.close()
        conn.close()
        
        print(f"\n✅ Successfully imported {len(users)} users to production database!")
        
    except Exception as e:
        print(f"❌ Error importing users: {e}")
        import traceback
        traceback.print_exc()

def main():
    print("🔄 Getting users from local database...")
    users = get_local_users()
    
    print(f"\n🚀 Importing users to production database...")
    import_users_to_production(users)

if __name__ == "__main__":
    main()
