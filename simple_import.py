#!/usr/bin/env python3
import pandas as pd
from datetime import datetime
from app import app, db
from models import User, AccountBalance

def import_historical_data():
    with app.app_context():
        # Get Sean user
        sean_user = User.query.filter_by(email='seanosullivan@gmail.com').first()
        if not sean_user:
            print("Sean user not found")
            return
        
        # Clear existing balances
        AccountBalance.query.filter_by(user_id=sean_user.id).delete()
        
        # Read CSV
        df = pd.read_csv('omar_uploaded/Dad-totals/Dad\'s Totals historical data.csv')
        
        # Mappings - using correct IDs from database
        mappings = {
            'Revolut RRLtd IRL': ('business_account', 1),  # Revolut RRLtd IRL
            '033 Dw': ('business_account', 1),  # Map to Revolut RRLtd IRL (closest match)
            '084 Biz': ('business_account', 3),  # AIB 084
            'BoI Biz Loan': ('loan', 3),  # BOI (mortgage)
            'Joe O\'Reilly Loan': ('loan', 7),  # JO'R
            'Om Loan': ('loan', 8)  # Om (personal)
        }
        
        # Process data
        print(f'Processing {len(df)} rows from CSV')
        balances_added = 0
        
        for index, row in df.iterrows():
            balance_date = datetime(2024, 1, 1)  # Default date
            
            for csv_col, (entity_type, entity_id) in mappings.items():
                if csv_col in row:
                    value = row[csv_col]
                    if pd.notna(value) and value != '' and value != 'Unknown':
                        try:
                            if isinstance(value, str):
                                value = value.replace('€', '').replace(',', '').strip()
                            balance_amount = float(value)
                            
                            balance = AccountBalance(
                                user_id=sean_user.id,
                                date_entered=balance_date.date(),
                                balance=balance_amount
                            )
                            
                            if entity_type == 'business_account':
                                balance.account_id = entity_id
                            elif entity_type == 'loan':
                                balance.loan_id = entity_id
                            
                            db.session.add(balance)
                            balances_added += 1
                            
                        except (ValueError, TypeError) as e:
                            print(f'Error processing {csv_col}: {value} - {e}')
        
        print(f'Added {balances_added} balance records')
        
        db.session.commit()
        print("Import completed successfully!")

if __name__ == "__main__":
    import_historical_data()
