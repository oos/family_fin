#!/usr/bin/env python3
"""
Import all users and their permissions
"""

import sqlite3
import psycopg2
import os
from datetime import datetime

# Database connections
LOCAL_DB = 'instance/family_finance.db'
PROD_DB_URL = 'postgresql://family_finance_user:P01zoORtwRsCUyTBsCIsCoCpyyakHcYj@dpg-d35slqruibrs73djfr2g-a.frankfurt-postgres.render.com/family_finance_ofgc'

def convert_value(value, col_name):
    """Convert SQLite values to PostgreSQL compatible types"""
    if value is None:
        return None
    
    # Handle boolean fields
    if col_name in ['is_active', 'is_primary', 'is_joint', 'is_director', 'is_deceased', 'is_visible']:
        return bool(value) if isinstance(value, int) else value
    
    # Handle date fields
    if col_name in ['created_at', 'updated_at', 'date', 'start_date', 'end_date']:
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace('Z', '+00:00'))
            except:
                return value
        return value
    
    return value

def import_users(local_cursor, prod_cursor):
    """Import all users from local to production"""
    print("Importing users...")
    
    try:
        # Get all users from local
        local_cursor.execute("SELECT * FROM user")
        users = local_cursor.fetchall()
        
        # Get table structure
        local_cursor.execute("PRAGMA table_info(user)")
        columns = [col[1] for col in local_cursor.fetchall()]
        
        success_count = 0
        error_count = 0
        
        for user in users:
            try:
                # Convert values
                values = [convert_value(value, col) for value, col in zip(user, columns)]
                
                # Insert user (ignore if already exists)
                placeholders = ', '.join(['%s'] * len(columns))
                columns_str = ', '.join([f'"{col}"' for col in columns])
                
                prod_cursor.execute(f'INSERT INTO "user" ({columns_str}) VALUES ({placeholders}) ON CONFLICT (id) DO NOTHING', values)
                success_count += 1
                
            except Exception as e:
                error_count += 1
                print(f"    Error inserting user {user[0]}: {e}")
                continue
        
        print(f"  Successfully imported {success_count} users, {error_count} errors")
        return True
        
    except Exception as e:
        print(f"  Error importing users: {e}")
        return False

def import_user_permissions(local_cursor, prod_cursor):
    """Import user access permissions"""
    print("Importing user permissions...")
    
    # Import user_account_access
    try:
        local_cursor.execute("SELECT user_id, business_account_id FROM user_account_access")
        access_records = local_cursor.fetchall()
        
        success_count = 0
        error_count = 0
        
        for record in access_records:
            try:
                prod_cursor.execute('INSERT INTO "user_account_access" (user_id, business_account_id) VALUES (%s, %s) ON CONFLICT DO NOTHING', record)
                success_count += 1
            except Exception as e:
                error_count += 1
                print(f"    Error inserting account access {record}: {e}")
                continue
        
        print(f"  Successfully imported {success_count} account access records, {error_count} errors")
        
    except Exception as e:
        print(f"  Error importing account access: {e}")
    
    # Import user_loan_access
    try:
        local_cursor.execute("SELECT user_id, loan_id FROM user_loan_access")
        access_records = local_cursor.fetchall()
        
        success_count = 0
        error_count = 0
        
        for record in access_records:
            try:
                prod_cursor.execute('INSERT INTO "user_loan_access" (user_id, loan_id) VALUES (%s, %s) ON CONFLICT DO NOTHING', record)
                success_count += 1
            except Exception as e:
                error_count += 1
                print(f"    Error inserting loan access {record}: {e}")
                continue
        
        print(f"  Successfully imported {success_count} loan access records, {error_count} errors")
        
    except Exception as e:
        print(f"  Error importing loan access: {e}")

def main():
    print("=== USER AND PERMISSION IMPORT SCRIPT ===")
    print(f"Local DB: {LOCAL_DB}")
    print(f"Production DB: {PROD_DB_URL[:50]}...")
    
    # Connect to databases
    try:
        local_conn = sqlite3.connect(LOCAL_DB)
        local_cursor = local_conn.cursor()
        print("✓ Connected to local SQLite database")
    except Exception as e:
        print(f"✗ Failed to connect to local database: {e}")
        return
    
    try:
        prod_conn = psycopg2.connect(PROD_DB_URL)
        prod_cursor = prod_conn.cursor()
        print("✓ Connected to production PostgreSQL database")
    except Exception as e:
        print(f"✗ Failed to connect to production database: {e}")
        local_conn.close()
        return
    
    try:
        # Import users first
        if import_users(local_cursor, prod_cursor):
            # Then import permissions
            import_user_permissions(local_cursor, prod_cursor)
        
        # Commit all changes
        prod_conn.commit()
        print("\n✓ Import completed successfully")
        
        # Verify import
        print("\n=== VERIFICATION ===")
        for table in ['user', 'user_account_access', 'user_loan_access']:
            try:
                prod_cursor.execute(f'SELECT COUNT(*) FROM "{table}"')
                count = prod_cursor.fetchone()[0]
                print(f"{table}: {count} records")
            except Exception as e:
                print(f"{table}: Error - {e}")
        
        # Show user details
        print("\n=== USERS IN PRODUCTION ===")
        prod_cursor.execute('SELECT id, email, role FROM "user" ORDER BY id')
        users = prod_cursor.fetchall()
        for user in users:
            print(f"ID: {user[0]}, Email: {user[1]}, Role: {user[2]}")
        
    except Exception as e:
        print(f"✗ Import failed: {e}")
        prod_conn.rollback()
    finally:
        local_conn.close()
        prod_conn.close()

if __name__ == "__main__":
    main()
