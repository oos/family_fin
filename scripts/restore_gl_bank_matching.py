#!/usr/bin/env python3
"""
Script to restore GL-Bank transaction matching
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models import TaxReturnTransaction, BankTransaction, TaxReturn, TransactionMatch
from datetime import datetime, timedelta
import difflib

def restore_gl_bank_matching():
    """Restore matching between GL transactions and bank transactions"""
    with app.app_context():
        try:
            print("Starting GL-Bank transaction matching...")
            
            # Get all GL transactions for 2024
            gl_transactions = TaxReturnTransaction.query.join(TaxReturn).filter(
                TaxReturn.year == 2024,
                TaxReturn.user_id == 1
            ).all()
            
            # Get all bank transactions
            bank_transactions = BankTransaction.query.all()
            
            print(f"Found {len(gl_transactions)} GL transactions and {len(bank_transactions)} bank transactions")
            
            matches_created = 0
            
            # Match GL transactions to bank transactions
            for gl_tx in gl_transactions:
                if gl_tx.debit == 0 and gl_tx.credit == 0:
                    continue  # Skip zero-value transactions
                
                gl_amount = gl_tx.debit if gl_tx.debit > 0 else -gl_tx.credit
                gl_date = gl_tx.date
                
                if not gl_date:
                    continue
                
                # Find potential matches within 7 days
                date_range_start = gl_date - timedelta(days=7)
                date_range_end = gl_date + timedelta(days=7)
                
                potential_matches = BankTransaction.query.filter(
                    BankTransaction.transaction_date >= date_range_start,
                    BankTransaction.transaction_date <= date_range_end,
                    BankTransaction.amount == gl_amount
                ).all()
                
                # If no exact amount match, try fuzzy matching
                if not potential_matches:
                    potential_matches = BankTransaction.query.filter(
                        BankTransaction.transaction_date >= date_range_start,
                        BankTransaction.transaction_date <= date_range_end,
                        BankTransaction.amount.between(gl_amount * 0.95, gl_amount * 1.05)  # 5% tolerance
                    ).all()
                
                # If still no matches, try description matching
                if not potential_matches and gl_tx.annotation:
                    potential_matches = BankTransaction.query.filter(
                        BankTransaction.transaction_date >= date_range_start,
                        BankTransaction.transaction_date <= date_range_end
                    ).all()
                    
                    # Filter by description similarity
                    best_matches = []
                    for bank_tx in potential_matches:
                        if gl_tx.annotation and bank_tx.description:
                            similarity = difflib.SequenceMatcher(
                                None, 
                                gl_tx.annotation.lower(), 
                                bank_tx.description.lower()
                            ).ratio()
                            if similarity > 0.6:  # 60% similarity threshold
                                best_matches.append((bank_tx, similarity))
                    
                    # Sort by similarity and take the best match
                    best_matches.sort(key=lambda x: x[1], reverse=True)
                    if best_matches:
                        potential_matches = [best_matches[0][0]]
                
                # Create matches
                for bank_tx in potential_matches:
                    # Check if match already exists
                    existing_match = TransactionMatch.query.filter_by(
                        tax_return_transaction_id=gl_tx.id,
                        bank_transaction_id=bank_tx.id
                    ).first()
                    
                    if not existing_match:
                        # Create the match
                        match = TransactionMatch(
                            tax_return_transaction_id=gl_tx.id,
                            bank_transaction_id=bank_tx.id,
                            user_id=1,
                            confidence_score=1.0,
                            match_method='auto_amount'
                        )
                        db.session.add(match)
                        matches_created += 1
                        
                        if matches_created % 100 == 0:
                            print(f"Created {matches_created} matches...")
            
            # Commit all matches
            db.session.commit()
            
            print(f"Successfully created {matches_created} GL-Bank transaction matches!")
            
            # Show summary
            gl_with_matches = db.session.query(TransactionMatch.tax_return_transaction_id).distinct().count()
            bank_with_matches = db.session.query(TransactionMatch.bank_transaction_id).distinct().count()
            
            print(f"GL transactions with matches: {gl_with_matches}")
            print(f"Bank transactions with matches: {bank_with_matches}")
            
            # Show some sample matches
            print("\nSample matches:")
            sample_matches = db.session.query(TransactionMatch).join(TaxReturnTransaction).limit(5).all()
            
            for match in sample_matches:
                gl_tx = match.tax_return_transaction
                bank_tx = match.bank_transaction
                print(f"GL: {gl_tx.name} - {gl_tx.debit}/{gl_tx.credit} ({gl_tx.date})")
                print(f"  -> Bank: {bank_tx.description} - {bank_tx.amount} ({bank_tx.transaction_date})")
            
        except Exception as e:
            print(f"Error restoring matches: {e}")
            db.session.rollback()
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    restore_gl_bank_matching()
