#!/usr/bin/env python3
"""
Script to add two new personal loans: Om (personal) and Dad (personal)
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models import Loan, User, UserLoanAccess
from datetime import date

def add_personal_loans():
    with app.app_context():
        try:
            # Create Om (personal) loan
            om_loan = Loan(
                loan_name='Om (personal)',
                lender='Personal',
                loan_type='personal',
                principal_amount=0.0,  # Will be updated when balance is entered
                monthly_payment=0.0,   # Will be updated when balance is entered
                current_balance=0.0,   # Will be updated when balance is entered
                interest_rate=0.0,     # Will be updated when balance is entered
                term_years=0,          # Will be updated when balance is entered
                start_date=date.today()
            )
            db.session.add(om_loan)
            
            # Create Dad (personal) loan
            dad_loan = Loan(
                loan_name='Dad (personal)',
                lender='Personal',
                loan_type='personal',
                principal_amount=0.0,  # Will be updated when balance is entered
                monthly_payment=0.0,   # Will be updated when balance is entered
                current_balance=0.0,   # Will be updated when balance is entered
                interest_rate=0.0,     # Will be updated when balance is entered
                term_years=0,          # Will be updated when balance is entered
                start_date=date.today()
            )
            db.session.add(dad_loan)
            
            # Commit the loans
            db.session.commit()
            
            print(f"✅ Created loan: {om_loan.loan_name} (ID: {om_loan.id})")
            print(f"✅ Created loan: {dad_loan.loan_name} (ID: {dad_loan.id})")
            
            # Get all users to give them access to these loans
            users = User.query.all()
            print(f"\n📋 Found {len(users)} users in the system")
            
            # Give all users access to these new loans
            for user in users:
                # Add access for Om (personal) loan
                om_access = UserLoanAccess(
                    user_id=user.id,
                    loan_id=om_loan.id
                )
                db.session.add(om_access)
                
                # Add access for Dad (personal) loan
                dad_access = UserLoanAccess(
                    user_id=user.id,
                    loan_id=dad_loan.id
                )
                db.session.add(dad_access)
                
                print(f"✅ Granted {user.username} access to both personal loans")
            
            # Commit all access permissions
            db.session.commit()
            
            print(f"\n🎉 Successfully added 2 personal loans and granted access to all {len(users)} users!")
            
            # Display summary
            print(f"\n📊 Loan Summary:")
            all_loans = Loan.query.all()
            for loan in all_loans:
                print(f"  - {loan.loan_name} (ID: {loan.id}, Lender: {loan.lender})")
                
        except Exception as e:
            print(f"❌ Error: {e}")
            db.session.rollback()
            return False
            
    return True

if __name__ == "__main__":
    print("🚀 Adding personal loans to the database...")
    success = add_personal_loans()
    if success:
        print("\n✅ Personal loans added successfully!")
    else:
        print("\n❌ Failed to add personal loans!")
        sys.exit(1)
