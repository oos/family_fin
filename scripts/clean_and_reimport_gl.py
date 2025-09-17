#!/usr/bin/env python3
"""
Script to completely clean and reimport GL data from original files
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from app import app, db
from models import TaxReturnTransaction, TaxReturn, TransactionMatch
from datetime import datetime

def clean_and_reimport_gl():
    """Completely clean and reimport GL data from original files"""
    with app.app_context():
        try:
            print("Starting complete GL data cleanup and reimport...")
            
            # Get the tax return for 2024
            tax_return = TaxReturn.query.filter_by(
                user_id=1,  # omarosullivan@gmail.com
                year=2024
            ).first()
            
            if not tax_return:
                print("No 2024 tax return found")
                return
            
            # Clear ALL existing data
            print("Clearing all existing GL data...")
            TransactionMatch.query.filter_by(user_id=1).delete()
            TaxReturnTransaction.query.filter_by(tax_return_id=tax_return.id).delete()
            db.session.commit()
            print("All GL data cleared")
            
            # Read the Excel file
            print("Reading original GL Excel file...")
            df = pd.read_excel('omar_uploaded/GL_docs/2024_General Ledger 2024.xlsx')
            
            # Clean up the data - remove header rows and get actual data
            data_start = 6
            gl_data = df.iloc[data_start:].copy()
            gl_data.columns = ['name', 'date', 'number', 'reference', 'source', 'annotation', 'debit', 'credit', 'balance']
            
            # Clean up the data
            gl_data = gl_data.dropna(subset=['name'])  # Remove rows without names
            gl_data = gl_data[gl_data['name'] != '']  # Remove empty name rows
            
            # Convert data types
            gl_data['debit'] = pd.to_numeric(gl_data['debit'], errors='coerce').fillna(0)
            gl_data['credit'] = pd.to_numeric(gl_data['credit'], errors='coerce').fillna(0)
            gl_data['balance'] = pd.to_numeric(gl_data['balance'], errors='coerce').fillna(0)
            
            # Convert dates
            gl_data['date'] = pd.to_datetime(gl_data['date'], errors='coerce')
            
            # Fill NaN values
            gl_data['number'] = gl_data['number'].fillna('')
            gl_data['reference'] = gl_data['reference'].fillna('')
            gl_data['source'] = gl_data['source'].fillna('')
            gl_data['annotation'] = gl_data['annotation'].fillna('')
            
            print(f"Loaded {len(gl_data)} GL transactions from Excel file")
            
            # Process the data exactly as it appears in the original document
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
                    # Add all rows that belong to this GL account
                    gl_accounts[current_gl_account].append(row)
            
            print(f"Found {len(gl_accounts)} GL accounts")
            
            # Import the data exactly as it appears
            transaction_count = 0
            for gl_account, transactions in gl_accounts.items():
                print(f"Processing {gl_account}: {len(transactions)} transactions")
                
                # Process each transaction exactly as it appears
                for trans in transactions:
                    # Skip completely empty rows
                    if (pd.isna(trans['debit']) or trans['debit'] == 0) and (pd.isna(trans['credit']) or trans['credit'] == 0) and trans['reference'] == '' and trans['name'] == '':
                        continue
                    
                    # Use the original values exactly as they appear
                    debit = float(trans['debit']) if not pd.isna(trans['debit']) else 0.0
                    credit = float(trans['credit']) if not pd.isna(trans['credit']) else 0.0
                    balance = float(trans['balance']) if not pd.isna(trans['balance']) else (debit - credit)
                    
                    # Create the transaction
                    transaction = TaxReturnTransaction(
                        tax_return_id=tax_return.id,
                        user_id=1,
                        name=gl_account,
                        date=trans['date'] if not pd.isna(trans['date']) else None,
                        number=str(trans['number']),
                        reference=str(trans['reference']),
                        source=str(trans['source']),
                        annotation=str(trans['annotation']),
                        debit=debit,
                        credit=credit,
                        balance=balance,
                        category_heading=None
                    )
                    db.session.add(transaction)
                    transaction_count += 1
            
            # Commit all transactions
            db.session.commit()
            
            print(f"Successfully imported {transaction_count} GL transactions")
            print("2024 GL data imported exactly as per original document!")
            
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
            print(f"Error in clean and reimport: {e}")
            db.session.rollback()
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    clean_and_reimport_gl()
