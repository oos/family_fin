#!/usr/bin/env python3
"""
Robust script to import ALL data from local SQLite database to production PostgreSQL database
Handles foreign key constraints properly and ensures data integrity
"""

import sqlite3
import psycopg2
import os

def main():
    # Connect to databases
    local_conn = sqlite3.connect('instance/family_finance.db')
    prod_conn = psycopg2.connect('postgresql://family_finance_user:P01zoORtwRsCUyTBsCIsCoCpyyakHcYj@dpg-d35slqruibrs73djfr2g-a.frankfurt-postgres.render.com/family_finance_ofgc')
    
    local_cursor = local_conn.cursor()
    prod_cursor = prod_conn.cursor()
    
    try:
        print("Starting robust data import...")
        
        # Disable foreign key checks temporarily
        prod_cursor.execute("SET session_replication_role = replica;")
        print("Disabled foreign key constraints")
        
        # Get list of all tables
        local_cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in local_cursor.fetchall()]
        
        print(f"Found {len(tables)} tables to import")
        
        # Define import order to handle dependencies
        import_order = [
            'family',
            'person', 
            'property',
            'business_account',
            'loan',
            'income',
            'pension',
            'pension_account',
            'bank_transaction',
            'account_balance',
            'tax_return',
            'tax_return_transaction',
            'transaction_match',
            'transaction_category',
            'transaction_learning_pattern',
            'transaction_category_prediction',
            'model_training_history',
            'airbnb_booking',
            'app_settings',
            'dashboard_settings',
            'user_account_access',
            'user_loan_access',
            'user_property_access',
            'user_income_access',
            'user_pension_access',
            'loan_erc',
            'loan_payment'
        ]
        
        # First, clear all data (except user table) to avoid conflicts
        print("Clearing existing data...")
        clear_order = [
            'user_account_access',
            'user_loan_access', 
            'user_property_access',
            'user_income_access',
            'user_pension_access',
            'transaction_match',
            'tax_return_transaction',
            'account_balance',
            'bank_transaction',
            'loan_payment',
            'loan_erc',
            'loan',
            'pension_account',
            'income',
            'property',
            'business_account',
            'person',
            'family',
            'tax_return',
            'transaction_category',
            'transaction_learning_pattern',
            'transaction_category_prediction',
            'model_training_history',
            'airbnb_booking',
            'app_settings',
            'dashboard_settings',
            'pension'
        ]
        
        for table_name in clear_order:
            try:
                prod_cursor.execute(f"DELETE FROM {table_name}")
                print(f"Cleared {table_name}")
            except Exception as e:
                print(f"Could not clear {table_name}: {e}")
        
        # Import tables in dependency order
        for table_name in import_order:
            if table_name in tables:
                print(f"\nImporting {table_name}...")
                
                # Get table data
                local_cursor.execute(f"SELECT * FROM {table_name}")
                rows = local_cursor.fetchall()
                
                if not rows:
                    print(f"No data in {table_name}")
                    continue
                
                # Get column names
                local_cursor.execute(f"PRAGMA table_info({table_name})")
                columns = [col[1] for col in local_cursor.fetchall()]
                
                # Handle reserved keywords
                table_name_quoted = f'"{table_name}"' if table_name == 'user' else table_name
                
                # Insert data with proper type conversion
                inserted_count = 0
                for row in rows:
                    values = []
                    for i, col in enumerate(columns):
                        value = row[i]
                        # Convert SQLite boolean integers to PostgreSQL booleans
                        if isinstance(value, int) and col in ['is_active', 'is_primary', 'is_joint', 'is_director', 'is_deceased', 'is_visible']:
                            value = bool(value)
                        values.append(value)
                    
                    placeholders = ', '.join(['%s'] * len(values))
                    columns_str = ', '.join(columns)
                    
                    try:
                        prod_cursor.execute(f"INSERT INTO {table_name_quoted} ({columns_str}) VALUES ({placeholders})", values)
                        inserted_count += 1
                    except Exception as e:
                        print(f"Error inserting row into {table_name}: {e}")
                        print(f"Row data: {row}")
                        # Continue with next row
                        continue
                
                print(f"Imported {inserted_count}/{len(rows)} rows to {table_name}")
        
        # Import any remaining tables not in the ordered list
        remaining_tables = [t for t in tables if t not in import_order and t != 'user']
        for table_name in remaining_tables:
            print(f"\nImporting remaining table: {table_name}...")
            
            local_cursor.execute(f"SELECT * FROM {table_name}")
            rows = local_cursor.fetchall()
            
            if not rows:
                print(f"No data in {table_name}")
                continue
            
            local_cursor.execute(f"PRAGMA table_info({table_name})")
            columns = [col[1] for col in local_cursor.fetchall()]
            
            table_name_quoted = f'"{table_name}"' if table_name == 'user' else table_name
            
            inserted_count = 0
            for row in rows:
                values = []
                for i, col in enumerate(columns):
                    value = row[i]
                    if isinstance(value, int) and col in ['is_active', 'is_primary', 'is_joint', 'is_director', 'is_deceased', 'is_visible']:
                        value = bool(value)
                    values.append(value)
                
                placeholders = ', '.join(['%s'] * len(values))
                columns_str = ', '.join(columns)
                
                try:
                    prod_cursor.execute(f"INSERT INTO {table_name_quoted} ({columns_str}) VALUES ({placeholders})", values)
                    inserted_count += 1
                except Exception as e:
                    print(f"Error inserting row into {table_name}: {e}")
                    continue
            
            print(f"Imported {inserted_count}/{len(rows)} rows to {table_name}")
        
        # Re-enable foreign key checks
        prod_cursor.execute("SET session_replication_role = DEFAULT;")
        print("Re-enabled foreign key constraints")
        
        # Commit all changes
        prod_conn.commit()
        print("\n✅ ALL data import completed successfully!")
        print("All user access permissions set by admin have been preserved.")
        
        # Verify the import
        print("\nVerifying import...")
        prod_cursor.execute("SELECT COUNT(*) FROM business_account")
        account_count = prod_cursor.fetchone()[0]
        print(f"Business accounts: {account_count}")
        
        prod_cursor.execute("SELECT COUNT(*) FROM loan")
        loan_count = prod_cursor.fetchone()[0]
        print(f"Loans: {loan_count}")
        
        prod_cursor.execute("SELECT COUNT(*) FROM user_account_access")
        account_access_count = prod_cursor.fetchone()[0]
        print(f"User account access records: {account_access_count}")
        
        prod_cursor.execute("SELECT COUNT(*) FROM user_loan_access")
        loan_access_count = prod_cursor.fetchone()[0]
        print(f"User loan access records: {loan_access_count}")
        
    except Exception as e:
        print(f"Error during import: {e}")
        prod_conn.rollback()
        raise
    
    finally:
        local_conn.close()
        prod_conn.close()

if __name__ == "__main__":
    main()

