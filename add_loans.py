#!/usr/bin/env python3

from app import app, db
from models import Loan
from datetime import date

def add_loans():
    with app.app_context():
        try:
            # Check if loans already exist
            jo_loan = Loan.query.filter_by(loan_name="JO'R").first()
            so_loan = Loan.query.filter_by(loan_name="SO'S").first()
            
            if jo_loan:
                print("JO'R loan already exists")
            else:
                # Add JO'R loan
                jo_loan = Loan(
                    loan_name="JO'R",
                    lender="JO'R",
                    loan_type="mortgage",
                    principal_amount=70000,
                    interest_rate=4.0,
                    term_years=25,
                    start_date=date(2024, 1, 1),
                    monthly_payment=400,
                    current_balance=70000,
                    is_active=True
                )
                db.session.add(jo_loan)
                print("Added JO'R loan")
            
            if so_loan:
                print("SO'S loan already exists")
            else:
                # Add SO'S loan
                so_loan = Loan(
                    loan_name="SO'S",
                    lender="SO'S",
                    loan_type="mortgage",
                    principal_amount=110000,
                    interest_rate=4.0,
                    term_years=25,
                    start_date=date(2024, 1, 1),
                    monthly_payment=630,
                    current_balance=110000,
                    is_active=True
                )
                db.session.add(so_loan)
                print("Added SO'S loan")
            
            db.session.commit()
            print("Successfully committed loans to database")
            
            # Show all loans
            all_loans = Loan.query.all()
            print(f"\nTotal loans in database: {len(all_loans)}")
            for loan in all_loans:
                print(f"- {loan.loan_name} ({loan.lender}): €{loan.principal_amount:,.0f}")
                
        except Exception as e:
            print(f"Error: {e}")
            db.session.rollback()

if __name__ == "__main__":
    add_loans()


