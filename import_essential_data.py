#!/usr/bin/env python3
"""
Script to import essential data for Sean's access
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
        print("Importing essential data for Sean...")
        
        # 1. Import business accounts
        print("Importing business accounts...")
        local_cursor.execute("SELECT * FROM business_account")
        accounts = local_cursor.fetchall()
        
        # Get column names
        local_cursor.execute("PRAGMA table_info(business_account)")
        columns = [col[1] for col in local_cursor.fetchall()]
        
        prod_cursor.execute("DELETE FROM business_account")
        for account in accounts:
            values = []
            for i, col in enumerate(columns):
                value = account[i]
                # Convert boolean fields
                if col in ['is_active'] and isinstance(value, int):
                    value = bool(value)
                values.append(value)
            
            placeholders = ', '.join(['%s'] * len(values))
            columns_str = ', '.join(columns)
            prod_cursor.execute(f"INSERT INTO business_account ({columns_str}) VALUES ({placeholders})", values)
        
        print(f"Imported {len(accounts)} business accounts")
        
        # 2. Import properties
        print("Importing properties...")
        local_cursor.execute("SELECT * FROM property")
        properties = local_cursor.fetchall()
        
        local_cursor.execute("PRAGMA table_info(property)")
        columns = [col[1] for col in local_cursor.fetchall()]
        
        prod_cursor.execute("DELETE FROM property")
        for property in properties:
            values = []
            for i, col in enumerate(columns):
                value = property[i]
                # Convert boolean fields
                if col in ['is_active', 'is_primary'] and isinstance(value, int):
                    value = bool(value)
                values.append(value)
            
            placeholders = ', '.join(['%s'] * len(values))
            columns_str = ', '.join(columns)
            prod_cursor.execute(f"INSERT INTO property ({columns_str}) VALUES ({placeholders})", values)
        
        print(f"Imported {len(properties)} properties")
        
        # 3. Import loans
        print("Importing loans...")
        local_cursor.execute("SELECT * FROM loan")
        loans = local_cursor.fetchall()
        
        local_cursor.execute("PRAGMA table_info(loan)")
        columns = [col[1] for col in local_cursor.fetchall()]
        
        prod_cursor.execute("DELETE FROM loan")
        for loan in loans:
            values = []
            for i, col in enumerate(columns):
                value = loan[i]
                # Convert boolean fields
                if col in ['is_active'] and isinstance(value, int):
                    value = bool(value)
                values.append(value)
            
            placeholders = ', '.join(['%s'] * len(values))
            columns_str = ', '.join(columns)
            prod_cursor.execute(f"INSERT INTO loan ({columns_str}) VALUES ({placeholders})", values)
        
        print(f"Imported {len(loans)} loans")
        
        # 4. Give Sean access to all accounts
        print("Setting up Sean's access...")
        prod_cursor.execute("DELETE FROM user_account_access WHERE user_id = 1")
        
        # Get all business account IDs
        prod_cursor.execute("SELECT id FROM business_account")
        account_ids = [row[0] for row in prod_cursor.fetchall()]
        
        for account_id in account_ids:
            prod_cursor.execute("INSERT INTO user_account_access (user_id, business_account_id, created_at) VALUES (1, %s, NOW())", (account_id,))
        
        print(f"Gave Sean access to {len(account_ids)} accounts")
        
        # 5. Give Sean access to all loans
        prod_cursor.execute("DELETE FROM user_loan_access WHERE user_id = 1")
        
        prod_cursor.execute("SELECT id FROM loan")
        loan_ids = [row[0] for row in prod_cursor.fetchall()]
        
        for loan_id in loan_ids:
            prod_cursor.execute("INSERT INTO user_loan_access (user_id, loan_id, created_at) VALUES (1, %s, NOW())", (loan_id,))
        
        print(f"Gave Sean access to {len(loan_ids)} loans")
        
        # Commit all changes
        prod_conn.commit()
        print("✅ Essential data import completed successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
        prod_conn.rollback()
        raise
    
    finally:
        local_conn.close()
        prod_conn.close()

if __name__ == "__main__":
    main()

