#!/usr/bin/env python3
"""
Script to reconstruct GL 2024 by mapping business transactions to GL accounts
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models import TaxReturnTransaction, TaxReturn
from datetime import date

def reconstruct_gl_2024():
    """Reconstruct GL 2024 by mapping business transactions to proper GL accounts"""
    with app.app_context():
        try:
            # Get the tax return for 2024
            tax_return = TaxReturn.query.filter_by(
                user_id=1,  # omarosullivan@gmail.com
                year=2024
            ).first()
            
            if not tax_return:
                print("No 2024 tax return found")
                return
            
            print(f"Reconstructing GL for tax return: {tax_return.id}")
            
            # Define GL account mappings with actual transaction data
            gl_accounts = {
                '172C00 Airbnb': {
                    'description': 'Airbnb Revenue',
                    'transactions': [
                        {'name': '683B00 Revolut - Airbnb (Euro)', 'debit': 246056.49, 'credit': 0.0, 'reference': 'Airbnb Revenue'},
                        # Add all the "Money added from AIRBNB PAYMENTS" transactions
                        {'name': 'Airbnb Payments Total', 'debit': 0.0, 'credit': 246056.49, 'reference': 'Airbnb Payments'},
                    ]
                },
                '207C00 Hosting Fee\'s': {
                    'description': 'Hosting Fees',
                    'transactions': [
                        {'name': 'YOURCITYCOHOST LIMITED', 'debit': 65612.69, 'credit': 0.0, 'reference': 'Hosting Fees'},
                    ]
                },
                '210C00 Contancy Services': {
                    'description': 'Consultancy Services',
                    'transactions': [
                        {'name': 'To Niall Crotty', 'debit': 44569.84, 'credit': 0.0, 'reference': 'Consultancy'},
                        {'name': 'To Dwayne O\'Sullivan', 'debit': 93201.00, 'credit': 0.0, 'reference': 'Consultancy'},
                        {'name': 'consultancy chargew for year - sean', 'debit': 18000.0, 'credit': 0.0, 'reference': 'Consultancy'},
                    ]
                },
                '243C00 Rent': {
                    'description': 'Rent Expenses',
                    'transactions': [
                        {'name': 'being rent chg for year', 'debit': 57000.0, 'credit': 0.0, 'reference': 'Rent'},
                    ]
                },
                '300C01 Directors Salaries': {
                    'description': 'Directors Salaries',
                    'transactions': [
                        {'name': 'Directors current Account - Omar', 'debit': 13666.82, 'credit': 0.0, 'reference': 'Salary'},
                    ]
                }
            }
            
            # Create GL transactions
            transaction_id = 1
            for account_code, account_data in gl_accounts.items():
                print(f"Creating account: {account_code}")
                
                # Create opening balance transaction
                opening_transaction = TaxReturnTransaction(
                    id=transaction_id,
                    tax_return_id=tax_return.id,
                    user_id=1,
                    name=account_code,
                    date=date(2024, 1, 1),
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
                transaction_id += 1
                
                # Create actual business transactions
                for trans_data in account_data['transactions']:
                    business_transaction = TaxReturnTransaction(
                        id=transaction_id,
                        tax_return_id=tax_return.id,
                        user_id=1,
                        name=account_code,
                        date=date(2024, 6, 15),  # Mid-year date
                        number='',
                        reference=trans_data['reference'],
                        source='GL',
                        annotation=trans_data['name'],
                        debit=trans_data['debit'],
                        credit=trans_data['credit'],
                        balance=trans_data['debit'] - trans_data['credit'],
                        category_heading=None
                    )
                    db.session.add(business_transaction)
                    transaction_id += 1
                
                # Create closing balance transaction
                total_debit = sum(t['debit'] for t in account_data['transactions'])
                total_credit = sum(t['credit'] for t in account_data['transactions'])
                net_balance = total_debit - total_credit
                
                closing_transaction = TaxReturnTransaction(
                    id=transaction_id,
                    tax_return_id=tax_return.id,
                    user_id=1,
                    name=account_code,
                    date=date(2024, 12, 31),
                    number='',
                    reference='Closing',
                    source='GL',
                    annotation='',
                    debit=0.0,
                    credit=0.0,
                    balance=net_balance,
                    category_heading=None
                )
                db.session.add(closing_transaction)
                transaction_id += 1
            
            # Commit all transactions
            db.session.commit()
            
            print(f"Successfully created GL with {len(gl_accounts)} accounts")
            print("GL 2024 reconstructed successfully!")
            
        except Exception as e:
            print(f"Error reconstructing GL: {e}")
            db.session.rollback()
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    reconstruct_gl_2024()
