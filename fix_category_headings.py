#!/usr/bin/env python3
"""
Script to fix category headings in the database by replacing code-only headings
with their proper full names that include descriptions.
"""

from app import app, db
from models import TaxReturnTransaction
import re

def fix_category_headings():
    with app.app_context():
        # Mapping of code-only headings to their proper full names
        category_mapping = {
            '172C00': '172C00 Airbnb',
            '207C00': '207C00 Hosting Fee\'s',
            '210C00': '210C00 Contancy Services',
            '243C00': '243C00 Rent',
            '314C00': '314C00 Internet, Phone & TV',
            '316C00': '316C00 Car parking - space rental',
            '317C00': '317C00 Cleaning & Refuse',
            '326C00': '326C00 Software/Server Expenses (Vivos)',
            '332C00': '332C00 Accountancy Fees',
            '333C00': '333C00 Legal and professional Fees',
            '334C00': '334C00 Property Management fees',
            '335C00': '335C00 General Expenses',
            '338C00': '338C00 Laundry and Bedding',
            '339C00': '339C00',  # This one doesn't have a description in the original
            '340C00': '340C00 Insurances',
            '343C00': '343C00 Light & Heat',
            '344C00': '344C00 Repairs and maintenance',
            '353C00': '353C00 Bank Charges',
            '361C00': '361C00 Depreciation of Plant & Equipment',
            '410C00': '410C00',  # This one doesn't have a description in the original
            '410C50': '410C50 Rental Income - Gross',
            '411C50': '411C50 Rental Expenses - Gross',
            '470C01': '470C01 Corporation tax on income for the period',
            '600B00': '600B00 Share capital - fully paid b/fwd',
            '610B00': '610B00 Balance at Beginning of Year',
            '665B00': '665B00 VAT Total Account',
            '668B00': '668B00 PAYE/PRSI',
            '675B00': '675B00 Accruals',
            '680B00': '680B00 AIB 79715007 (Vivos)',
            '681B00': '681B00 AIB 79715197 (Airbnb)',
            '682B00': '682B00 Reinvented Recruitment - Credit Card',
            '683B00': '683B00 Revolut - Airbnb',  # Use the main one, not the Euro variant
            '684B00': '684B00 Revolut - Vivos',
            '685B00': '685B00 Revolut - Sterling',
            '686B00': '686B00 Revolut - Dollar',
            '687B00': '687B00 NEXO Account',
            '748B01': '748B01 Plant and Machinery -  cost b/fwd',
            '748B02': '748B02',  # This one doesn't have a description in the original
            '748D01': '748D01 Plant and Machinery-depn b/fwd',
            '748D02': '748D02 Plant and Machinery-depn chg:Owned',
            '781B02': '781B02 Investment in subsidiary co\'s - additions',
            '786B01': '786B01 Unlisted investments - cost b/fwd',
            '786B02': '786B02 Unlisted investments - additions',
            '786B03': '786B03 Unlisted investments - disposals',
            '800B00': '800B00 Debtors Control A/C',
            '860B00': '860B00',  # This one doesn't have a description in the original
            '860B01': '860B01 Cash Account',
            '875B00': '875B00 Directors current Account - Omar',
            '876B30': '876B30 Amounts owed to/from own subsidiary companies',
            '877B01': '877B01 Sean & Coral - related parties',
            '877B02': '877B02 Dwayne - related parties',
            '880B00': '880B00 Corporation tax payable / repayable within 1 year',
            '890B00': '890B00 Contra Code',
            '899B00': '899B00 Suspense'
        }
        
        # Get all transactions with code-only category headings
        transactions = TaxReturnTransaction.query.filter(
            TaxReturnTransaction.category_heading.isnot(None)
        ).all()
        
        updated_count = 0
        for transaction in transactions:
            if transaction.category_heading and re.match(r'^[0-9]+[A-Z]+[0-9]+$', transaction.category_heading):
                if transaction.category_heading in category_mapping:
                    old_heading = transaction.category_heading
                    new_heading = category_mapping[transaction.category_heading]
                    transaction.category_heading = new_heading
                    updated_count += 1
                    print(f"Updated: {old_heading} -> {new_heading}")
        
        if updated_count > 0:
            db.session.commit()
            print(f"\nSuccessfully updated {updated_count} transactions")
        else:
            print("No transactions needed updating")

if __name__ == "__main__":
    fix_category_headings()
