#!/usr/bin/env python3
"""
Script to import historical balance data from Dad's Totals CSV file.
This script will prompt the user to confirm mappings between CSV columns and database entities.
"""

import pandas as pd
import sys
from datetime import datetime
from app import app, db
from models import AccountBalance, Loan, BusinessAccount, User

def parse_currency(value):
    """Parse currency string like '€18,276.15' to float"""
    if pd.isna(value) or value == '' or value == 'Unknown':
        return None
    
    # Remove € symbol and commas
    value_str = str(value).replace('€', '').replace(',', '').strip()
    try:
        return float(value_str)
    except ValueError:
        return None

def get_user_id():
    """Get the user ID for Sean (Dad)"""
    with app.app_context():
        user = User.query.filter_by(email='seanosullivan@gmail.com').first()
        if not user:
            print("Error: Sean user not found. Please create the user first.")
            return None
        return user.id

def show_mapping_options():
    """Show available accounts and loans for mapping"""
    with app.app_context():
        print("\n=== Available Accounts ===")
        accounts = BusinessAccount.query.all()
        for i, account in enumerate(accounts, 1):
            print(f"{i}. {account.account_name} (ID: {account.id})")
        
        print("\n=== Available Loans ===")
        loans = Loan.query.all()
        for i, loan in enumerate(loans, 1):
            print(f"{i}. {loan.loan_name} (ID: {loan.id})")
        
        return accounts, loans

def get_column_mappings(accounts, loans):
    """Get user confirmation for column mappings"""
    print("\n=== Column Mapping ===")
    print("Please map each CSV column to the corresponding account or loan:")
    
    mappings = {}
    
    # CSV columns (excluding Date and Comment)
    csv_columns = [
        "Revolut RRLtd IRL",
        "033 Dw", 
        "084 Biz",
        "BoI Biz Loan",
        "Joe O'Reilly Loan",
        "Om Loan"
    ]
    
    for col in csv_columns:
        print(f"\nColumn: '{col}'")
        print("1. Map to Account")
        print("2. Map to Loan") 
        print("3. Skip this column")
        
        while True:
            choice = input("Choose option (1-3): ").strip()
            if choice in ['1', '2', '3']:
                break
            print("Invalid choice. Please enter 1, 2, or 3.")
        
        if choice == '3':
            mappings[col] = None
            continue
            
        if choice == '1':
            print("Available accounts:")
            for i, account in enumerate(accounts, 1):
                print(f"{i}. {account.account_name}")
            
            while True:
                try:
                    account_idx = int(input("Enter account number: ")) - 1
                    if 0 <= account_idx < len(accounts):
                        mappings[col] = {
                            'type': 'account',
                            'id': accounts[account_idx].id,
                            'name': accounts[account_idx].account_name
                        }
                        break
                    else:
                        print("Invalid account number.")
                except ValueError:
                    print("Please enter a valid number.")
        
        elif choice == '2':
            print("Available loans:")
            for i, loan in enumerate(loans, 1):
                print(f"{i}. {loan.loan_name}")
            
            while True:
                try:
                    loan_idx = int(input("Enter loan number: ")) - 1
                    if 0 <= loan_idx < len(loans):
                        mappings[col] = {
                            'type': 'loan',
                            'id': loans[loan_idx].id,
                            'name': loans[loan_idx].loan_name
                        }
                        break
                    else:
                        print("Invalid loan number.")
                except ValueError:
                    print("Please enter a valid number.")
    
    return mappings

def import_balances(df, mappings, user_id):
    """Import the balance data using the mappings"""
    with app.app_context():
        imported_count = 0
        skipped_count = 0
        
        for index, row in df.iterrows():
            # Skip rows with all empty values
            if row.isna().all():
                continue
                
            # Skip rows with comments only
            if row['Comment'] and not pd.isna(row['Comment']) and row['Comment'].strip():
                if all(pd.isna(row[col]) or row[col] == '' for col in mappings.keys()):
                    print(f"Skipping row {index + 1}: {row['Comment']}")
                    skipped_count += 1
                    continue
            
            # Process each mapped column
            for col, mapping in mappings.items():
                if mapping is None:
                    continue
                    
                balance_value = parse_currency(row[col])
                if balance_value is None:
                    continue
                
                # Create balance entry
                balance_entry = AccountBalance(
                    user_id=user_id,
                    balance=balance_value,
                    currency='EUR',  # Default to EUR, could be made configurable
                    date_entered=datetime.now().date(),  # Use current date since CSV dates are "Unknown"
                    notes=f"Imported from historical data - {col}"
                )
                
                if mapping['type'] == 'account':
                    balance_entry.account_id = mapping['id']
                else:
                    balance_entry.loan_id = mapping['id']
                
                db.session.add(balance_entry)
                imported_count += 1
        
        # Commit all changes
        db.session.commit()
        print(f"\nImport completed!")
        print(f"Imported: {imported_count} balance entries")
        print(f"Skipped: {skipped_count} rows")

def main():
    """Main function"""
    print("=== Historical Balance Data Import ===")
    print("This script will import balance data from Dad's Totals CSV file.")
    
    # Load CSV file
    csv_path = "omar_uploaded/Dad-totals/Dad's Totals historical data.csv"
    try:
        df = pd.read_csv(csv_path)
        print(f"Loaded CSV file with {len(df)} rows")
    except Exception as e:
        print(f"Error loading CSV file: {e}")
        return
    
    # Get user ID
    user_id = get_user_id()
    if not user_id:
        return
    
    # Show available accounts and loans
    accounts, loans = show_mapping_options()
    
    # Get column mappings
    mappings = get_column_mappings(accounts, loans)
    
    # Show summary of mappings
    print("\n=== Mapping Summary ===")
    for col, mapping in mappings.items():
        if mapping:
            print(f"'{col}' -> {mapping['type'].title()}: {mapping['name']}")
        else:
            print(f"'{col}' -> Skipped")
    
    # Confirm before importing
    confirm = input("\nProceed with import? (y/N): ").strip().lower()
    if confirm != 'y':
        print("Import cancelled.")
        return
    
    # Import the data
    import_balances(df, mappings, user_id)

if __name__ == "__main__":
    main()
