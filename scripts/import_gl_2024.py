#!/usr/bin/env python3
"""
Script to import the actual 2024 GL data from Excel file
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from app import app, db
from models import TaxReturnTransaction, TaxReturn
from datetime import datetime

def import_gl_2024():
    """Import the actual 2024 GL data from Excel file"""
    with app.app_context():
        try:
            # Read the Excel file
            df = pd.read_excel('omar_uploaded/GL_docs/2024_General Ledger 2024.xlsx')
            
            # Clean up the data - remove header rows and get actual data
            # The data starts from row 6 (index 6) based on the column headers
            data_start = 6
            gl_data = df.iloc[data_start:].copy()
            
            # Rename columns to match our database
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
            
            # Get the tax return for 2024
            tax_return = TaxReturn.query.filter_by(
                user_id=1,  # omarosullivan@gmail.com
                year=2024
            ).first()
            
            if not tax_return:
                print("No 2024 tax return found")
                return
            
            # Clear existing data
            TaxReturnTransaction.query.filter_by(tax_return_id=tax_return.id).delete()
            db.session.commit()
            print("Cleared existing GL data")
            
            # Import the data
            transaction_id = 1
            for _, row in gl_data.iterrows():
                # Skip rows that are not actual transactions
                if pd.isna(row['date']) and row['reference'] not in ['Opening', 'Change', 'Close']:
                    continue
                
                # Create transaction
                transaction = TaxReturnTransaction(
                    id=transaction_id,
                    tax_return_id=tax_return.id,
                    user_id=1,
                    name=str(row['name']),
                    date=row['date'] if not pd.isna(row['date']) else None,
                    number=str(row['number']),
                    reference=str(row['reference']),
                    source=str(row['source']),
                    annotation=str(row['annotation']),
                    debit=float(row['debit']),
                    credit=float(row['credit']),
                    balance=float(row['balance']),
                    category_heading=None
                )
                
                db.session.add(transaction)
                transaction_id += 1
                
                if transaction_id % 100 == 0:
                    print(f"Processed {transaction_id} transactions...")
            
            # Commit all transactions
            db.session.commit()
            
            print(f"Successfully imported {transaction_id - 1} GL transactions")
            print("2024 GL data imported successfully!")
            
            # Show summary by account
            print("\nAccount summary:")
            accounts = db.session.query(
                TaxReturnTransaction.name,
                db.func.sum(TaxReturnTransaction.debit).label('total_debit'),
                db.func.sum(TaxReturnTransaction.credit).label('total_credit')
            ).filter(
                TaxReturnTransaction.tax_return_id == tax_return.id
            ).group_by(TaxReturnTransaction.name).all()
            
            for account in accounts[:10]:  # Show first 10 accounts
                net = account.total_debit - account.total_credit
                print(f"  {account.name}: debit={account.total_debit:,.2f}, credit={account.total_credit:,.2f}, net={net:,.2f}")
            
        except Exception as e:
            print(f"Error importing GL data: {e}")
            db.session.rollback()
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    import_gl_2024()
