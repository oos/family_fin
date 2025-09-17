#!/usr/bin/env python3
"""
Fixed script to import GL data without duplicate closing entries
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from app import app, db
from models import TaxReturnTransaction, TaxReturn, TransactionMatch
from datetime import datetime

def import_gl_fixed():
    """Import GL data with proper structure - no duplicate closing entries"""
    with app.app_context():
        try:
            print("Starting fixed GL data import...")
            
            # Get the tax return for 2024
            tax_return = TaxReturn.query.filter_by(
                user_id=1,  # omarosullivan@gmail.com
                year=2024
            ).first()
            
            if not tax_return:
                print("No 2024 tax return found")
                return
            
            # Read the Excel file
            print("Reading original GL Excel file...")
            df = pd.read_excel('omar_uploaded/GL_docs/2024_General Ledger 2024.xlsx')
            
            # Clean up the data - remove header rows and get actual data
            data_start = 6
            gl_data = df.iloc[data_start:].copy()
            gl_data.columns = ['name', 'date', 'number', 'reference', 'source', 'annotation', 'debit', 'credit', 'balance']
            
            # Convert data types
            gl_data['debit'] = pd.to_numeric(gl_data['debit'], errors='coerce').fillna(0)
            gl_data['credit'] = pd.to_numeric(gl_data['credit'], errors='coerce').fillna(0)
            gl_data['balance'] = pd.to_numeric(gl_data['balance'], errors='coerce').fillna(0)
            gl_data['date'] = pd.to_datetime(gl_data['date'], errors='coerce')
            
            # Fill NaN values
            gl_data['name'] = gl_data['name'].fillna('')
            gl_data['number'] = gl_data['number'].fillna('')
            gl_data['reference'] = gl_data['reference'].fillna('')
            gl_data['source'] = gl_data['source'].fillna('')
            gl_data['annotation'] = gl_data['annotation'].fillna('')
            
            print(f"Loaded {len(gl_data)} GL transactions from Excel file")
            
            # Process the data with proper GL structure
            current_gl_account = None
            gl_accounts = {}
            
            for _, row in gl_data.iterrows():
                name = str(row['name'])
                
                # Check if this is a GL account header
                if name.startswith(('172C00', '207C00', '210C00', '243C00', '300C01', '311C04', '314C00', '316C00', '317C00', '326C00', '332C00', '333C00', '334C00', '335C00', '338C00', '340C00', '343C00', '344C00', '353C00', '361C00')):
                    current_gl_account = name
                    if current_gl_account not in gl_accounts:
                        gl_accounts[current_gl_account] = []
                elif current_gl_account:
                    # Add all rows that belong to this GL account, including summary rows
                    gl_accounts[current_gl_account].append(row)
            
            print(f"Found {len(gl_accounts)} GL accounts")
            
            # Import the data with proper GL structure
            transaction_count = 0
            for gl_account, transactions in gl_accounts.items():
                print(f"Processing {gl_account}: {len(transactions)} transactions")
                
                # Calculate totals for this account - EXCLUDE summary rows from calculation
                business_transactions = [t for t in transactions if t['reference'] not in ['Opening', 'Change', 'Close'] and (t['debit'] > 0 or t['credit'] > 0)]
                total_debit = sum(t['debit'] for t in business_transactions)
                total_credit = sum(t['credit'] for t in business_transactions)
                net_change = total_debit - total_credit
                
                print(f"  Business transactions: {len(business_transactions)}")
                print(f"  Total debit: {total_debit:,.2f}, Total credit: {total_credit:,.2f}, Net: {net_change:,.2f}")
                
                # Create Opening transaction
                opening_transaction = TaxReturnTransaction(
                    tax_return_id=tax_return.id,
                    user_id=1,
                    name=gl_account,
                    date=None,
                    number='',
                    reference='Opening',
                    source='GL',
                    annotation='',
                    debit=0.0,
                    credit=0.0,
                    balance=0.0,
                    category_heading=None
                )
                db.session.add(opening_transaction)
                transaction_count += 1
                
                # Add all business transactions (exclude summary rows from the original data)
                for trans in business_transactions:
                    transaction = TaxReturnTransaction(
                        tax_return_id=tax_return.id,
                        user_id=1,
                        name=gl_account,
                        date=trans['date'] if not pd.isna(trans['date']) else None,
                        number=str(trans['number']),
                        reference=str(trans['reference']),
                        source=str(trans['source']),
                        annotation=str(trans['annotation']),
                        debit=float(trans['debit']),
                        credit=float(trans['credit']),
                        balance=float(trans['balance']) if not pd.isna(trans['balance']) else (float(trans['debit']) - float(trans['credit'])),
                        category_heading=None
                    )
                    db.session.add(transaction)
                    transaction_count += 1
                
                # Create Change transaction with CORRECT totals
                change_transaction = TaxReturnTransaction(
                    tax_return_id=tax_return.id,
                    user_id=1,
                    name=gl_account,
                    date=None,
                    number='',
                    reference='Change',
                    source='GL',
                    annotation='',
                    debit=total_debit,
                    credit=total_credit,
                    balance=net_change,
                    category_heading=None
                )
                db.session.add(change_transaction)
                transaction_count += 1
                
                # Create Closing transaction
                closing_transaction = TaxReturnTransaction(
                    tax_return_id=tax_return.id,
                    user_id=1,
                    name=gl_account,
                    date=None,
                    number='',
                    reference='Closing',
                    source='GL',
                    annotation='',
                    debit=0.0,
                    credit=0.0,
                    balance=net_change,
                    category_heading=None
                )
                db.session.add(closing_transaction)
                transaction_count += 1
            
            # Commit all transactions
            db.session.commit()
            
            print(f"Successfully imported {transaction_count} GL transactions")
            print("2024 GL data imported with correct structure - no duplicate closing entries!")
            
            # Show summary by account
            print("\nAccount summary:")
            accounts = db.session.query(
                TaxReturnTransaction.name,
                db.func.sum(TaxReturnTransaction.debit).label('total_debit'),
                db.func.sum(TaxReturnTransaction.credit).label('total_credit')
            ).filter(
                TaxReturnTransaction.tax_return_id == tax_return.id
            ).group_by(TaxReturnTransaction.name).order_by(db.func.sum(TaxReturnTransaction.debit).desc()).all()
            
            for account in accounts[:10]:  # Show first 10 accounts
                net = account.total_debit - account.total_credit
                print(f"  {account.name}: debit={account.total_debit:,.2f}, credit={account.total_credit:,.2f}, net={net:,.2f}")
            
            # Now restore the GL-Bank matching
            print("\nRestoring GL-Bank transaction matching...")
            from scripts.restore_gl_bank_matching import restore_gl_bank_matching
            restore_gl_bank_matching()
            
        except Exception as e:
            print(f"Error in fixed import: {e}")
            db.session.rollback()
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    import_gl_fixed()
