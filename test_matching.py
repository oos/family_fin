#!/usr/bin/env python3
import json
from datetime import datetime

def load_data():
    with open('gl_transactions.json', 'r') as f:
        gl_data = json.load(f)
    
    with open('bank_transactions.json', 'r') as f:
        bank_data = json.load(f)
    
    return gl_data['transactions'], bank_data['transactions']

def find_matching_bank_transaction(gl_transaction, bank_transactions):
    if gl_transaction['source'] != 'PJ':
        return None
    
    # Match by amount and date
    gl_amount = abs(gl_transaction.get('debit', 0) or gl_transaction.get('credit', 0) or 0)
    gl_date = gl_transaction['date']
    
    for bank_tx in bank_transactions:
        bank_amount = abs(bank_tx.get('amount', 0) or 0)
        bank_date = bank_tx.get('transaction_date') or bank_tx.get('date')
        
        # Match by amount (within 0.01 tolerance) and date
        if (abs(gl_amount - bank_amount) < 0.01 and 
            gl_date == bank_date):
            return bank_tx
    
    return None

def main():
    gl_transactions, bank_transactions = load_data()
    
    print(f"Total GL transactions: {len(gl_transactions)}")
    print(f"Total Bank transactions: {len(bank_transactions)}")
    
    # Filter for PJ transactions only
    pj_transactions = [tx for tx in gl_transactions if tx['source'] == 'PJ']
    print(f"PJ transactions: {len(pj_transactions)}")
    
    # Count matches
    matches = []
    for gl_tx in pj_transactions:
        match = find_matching_bank_transaction(gl_tx, bank_transactions)
        if match:
            matches.append({
                'gl_id': gl_tx['id'],
                'gl_amount': abs(gl_tx.get('debit', 0) or gl_tx.get('credit', 0) or 0),
                'gl_date': gl_tx['date'],
                'bank_id': match['id'],
                'bank_amount': match['amount'],
                'bank_date': match.get('transaction_date') or match.get('date')
            })
    
    print(f"\n=== MATCHING RESULTS ===")
    print(f"Successfully matched PJ transactions: {len(matches)} out of {len(pj_transactions)}")
    print(f"Match rate: {(len(matches) / len(pj_transactions)) * 100:.1f}%")
    
    if matches:
        print(f"\nFirst 5 matches:")
        for i, match in enumerate(matches[:5]):
            print(f"  {i+1}. GL ID {match['gl_id']} (€{match['gl_amount']:.2f} on {match['gl_date']}) -> Bank ID {match['bank_id']} (€{match['bank_amount']:.2f} on {match['bank_date']})")
    
    # Show some unmatched examples
    unmatched = []
    for gl_tx in pj_transactions:
        match = find_matching_bank_transaction(gl_tx, bank_transactions)
        if not match:
            unmatched.append(gl_tx)
    
    if unmatched:
        print(f"\nFirst 5 unmatched PJ transactions:")
        for i, tx in enumerate(unmatched[:5]):
            amount = abs(tx.get('debit', 0) or tx.get('credit', 0) or 0)
            print(f"  {i+1}. GL ID {tx['id']} (€{amount:.2f} on {tx['date']}) - {tx.get('name', 'No description')}")

if __name__ == "__main__":
    main()
