#!/usr/bin/env python3
"""
Import only essential data and permissions
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

def import_table_safely(local_cursor, prod_cursor, table_name):
    """Import table data safely with error handling"""
    try:
        print(f"Importing {table_name}...")
        
        # Get table structure
        local_cursor.execute(f"PRAGMA table_info({table_name})")
        columns = [col[1] for col in local_cursor.fetchall()]
        
        if not columns:
            print(f"  No columns found for {table_name}")
            return True
        
        # Get data
        local_cursor.execute(f"SELECT * FROM {table_name}")
        rows = local_cursor.fetchall()
        
        if not rows:
            print(f"  No data found for {table_name}")
            return True
        
        # Clear existing data
        prod_cursor.execute(f'DELETE FROM "{table_name}"')
        print(f"  Cleared existing {table_name} data")
        
        # Insert data
        placeholders = ', '.join(['%s'] * len(columns))
        columns_str = ', '.join([f'"{col}"' for col in columns])
        
        success_count = 0
        error_count = 0
        
        for row in rows:
            try:
                # Convert values
                values = [convert_value(value, col) for value, col in zip(row, columns)]
                
                # Insert row
                prod_cursor.execute(f'INSERT INTO "{table_name}" ({columns_str}) VALUES ({placeholders})', values)
                success_count += 1
                
            except Exception as e:
                error_count += 1
                print(f"    Error inserting row: {e}")
                continue
        
        print(f"  Successfully imported {success_count} rows, {error_count} errors")
        return True
        
    except Exception as e:
        print(f"  Error importing {table_name}: {e}")
        return False

def main():
    print("=== ESSENTIAL DATA IMPORT SCRIPT ===")
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
        # Import essential tables in order
        essential_tables = [
            'family',
            'person', 
            'property',
            'business_account',
            'loan',
            'pension',
            'income',
            'user_account_access',
            'user_loan_access',
            'user_property_access',
            'user_pension_access',
            'user_income_access'
        ]
        
        success_count = 0
        total_count = len(essential_tables)
        
        for table_name in essential_tables:
            if import_table_safely(local_cursor, prod_cursor, table_name):
                success_count += 1
            else:
                print(f"✗ Failed to import {table_name}")
        
        # Commit all changes
        prod_conn.commit()
        print(f"\n✓ Import completed: {success_count}/{total_count} tables imported successfully")
        
        # Verify import
        print("\n=== VERIFICATION ===")
        for table in ['user', 'business_account', 'loan', 'user_account_access', 'user_loan_access']:
            try:
                prod_cursor.execute(f'SELECT COUNT(*) FROM "{table}"')
                count = prod_cursor.fetchone()[0]
                print(f"{table}: {count} records")
            except Exception as e:
                print(f"{table}: Error - {e}")
        
    except Exception as e:
        print(f"✗ Import failed: {e}")
        prod_conn.rollback()
    finally:
        local_conn.close()
        prod_conn.close()

if __name__ == "__main__":
    main()
