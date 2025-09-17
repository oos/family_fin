#!/usr/bin/env python3
"""
Script to clean up GL data for re-import
"""

from app import app, db
from models import TaxReturnTransaction, TaxReturn

def clean_gl_data():
    """Clean up existing GL data for 2024"""
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
            
            print(f"Found 2024 tax return: {tax_return.id}")
            
            # Count existing transactions
            existing_count = TaxReturnTransaction.query.filter_by(
                tax_return_id=tax_return.id
            ).count()
            
            print(f"Found {existing_count} existing transactions")
            
            # Delete all transactions for this tax return
            TaxReturnTransaction.query.filter_by(
                tax_return_id=tax_return.id
            ).delete()
            
            # Commit the deletion
            db.session.commit()
            
            print(f"Deleted {existing_count} transactions")
            print("GL data cleaned successfully!")
            
        except Exception as e:
            print(f"Error cleaning GL data: {e}")
            db.session.rollback()

if __name__ == '__main__':
    clean_gl_data()
