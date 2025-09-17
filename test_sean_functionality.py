"""
Comprehensive regression tests for Sean's user-specific functionality.
This ensures all features work correctly and don't break with future changes.
"""

import pytest
import json
import requests
from datetime import datetime, date
from app import app, db
from models import User, Family, Person, Loan, BusinessAccount, AccountBalance, DashboardSettings, UserLoanAccess, UserAccountAccess

class TestSeanFunctionality:
    """Test suite for Sean's user-specific functionality"""
    
    @pytest.fixture(autouse=True)
    def setup_test_data(self):
        """Set up test data for Sean's functionality tests"""
        with app.app_context():
            # Clean up any existing test data
            AccountBalance.query.filter_by(user_id=999).delete()
            UserLoanAccess.query.filter_by(user_id=999).delete()
            UserAccountAccess.query.filter_by(user_id=999).delete()
            DashboardSettings.query.filter_by(user_id=999).delete()
            User.query.filter_by(email='sean.test@example.com').delete()
            Family.query.filter_by(id=999).delete()
            Person.query.filter_by(id=999).delete()
            Loan.query.filter(Loan.id.in_([999, 998])).delete()
            BusinessAccount.query.filter(BusinessAccount.id.in_([999, 998])).delete()
            
            # Create Sean test user
            sean_user = User(
                id=999,
                email='sean.test@example.com',
                username='sean.test',
                role='user'
            )
            sean_user.set_password('password123')
            db.session.add(sean_user)
            
            # Create test family
            test_family = Family(
                id=999,
                name='Test Family',
                code='TEST999',
                description='Test Family for Sean'
            )
            db.session.add(test_family)
            
            # Create test person for Sean
            test_person = Person(
                id=999,
                name='Sean Test',
                family_id=999,
                relationship='self'
            )
            db.session.add(test_person)
            
            # Create test loans
            test_loan1 = Loan(
                id=999,
                loan_name='Test Mortgage',
                lender='Test Bank',
                loan_type='Mortgage',
                principal_amount=200000.00,
                interest_rate=3.5,
                term_years=25,
                monthly_payment=1200.00,
                current_balance=180000.00,
                start_date=date(2020, 1, 1)
            )
            test_loan2 = Loan(
                id=998,
                loan_name='Test Personal Loan',
                lender='Test Credit Union',
                loan_type='Personal',
                principal_amount=10000.00,
                interest_rate=5.0,
                term_years=3,
                monthly_payment=300.00,
                current_balance=8000.00,
                start_date=date(2021, 6, 1)
            )
            db.session.add(test_loan1)
            db.session.add(test_loan2)
            
            # Create test business accounts
            test_account1 = BusinessAccount(
                id=999,
                account_name='Test Business Account',
                bank_name='Test Bank',
                account_number='123456789',
                company_name='Test Company Ltd'
            )
            test_account2 = BusinessAccount(
                id=998,
                account_name='Test Savings Account',
                bank_name='Test Credit Union',
                account_number='987654321',
                company_name='Test Company Ltd'
            )
            db.session.add(test_account1)
            db.session.add(test_account2)
            
            # Create dashboard settings for Sean
            dashboard_settings = [
                DashboardSettings(user_id=999, section='properties', is_visible=True),
                DashboardSettings(user_id=999, section='loans', is_visible=True),
                DashboardSettings(user_id=999, section='account_balances', is_visible=True),
                DashboardSettings(user_id=999, section='bank_accounts', is_visible=True),
                DashboardSettings(user_id=999, section='income', is_visible=True)
            ]
            for setting in dashboard_settings:
                db.session.add(setting)
            
            # Create loan access for Sean
            loan_access = [
                UserLoanAccess(user_id=999, loan_id=999),
                UserLoanAccess(user_id=999, loan_id=998)
            ]
            for access in loan_access:
                db.session.add(access)
            
            # Create account access for Sean
            account_access = [
                UserAccountAccess(user_id=999, business_account_id=999),
                UserAccountAccess(user_id=999, business_account_id=998)
            ]
            for access in account_access:
                db.session.add(access)
            
            # Create test balance entries for Sean
            balance_entries = [
                # Loan balances
                AccountBalance(user_id=999, loan_id=999, balance=180000.00, date_entered=date(2024, 1, 1), notes='Initial balance'),
                AccountBalance(user_id=999, loan_id=999, balance=175000.00, date_entered=date(2024, 2, 1), notes='After payment'),
                AccountBalance(user_id=999, loan_id=999, balance=185000.00, date_entered=date(2024, 3, 1), notes='Best ever balance'),
                AccountBalance(user_id=999, loan_id=998, balance=8000.00, date_entered=date(2024, 1, 1), notes='Initial personal loan'),
                AccountBalance(user_id=999, loan_id=998, balance=7500.00, date_entered=date(2024, 2, 1), notes='After payment'),
                
                # Account balances
                AccountBalance(user_id=999, account_id=999, balance=5000.00, date_entered=date(2024, 1, 1), notes='Initial business account'),
                AccountBalance(user_id=999, account_id=999, balance=5500.00, date_entered=date(2024, 2, 1), notes='After deposit'),
                AccountBalance(user_id=999, account_id=999, balance=6000.00, date_entered=date(2024, 3, 1), notes='Best ever account balance'),
                AccountBalance(user_id=999, account_id=998, balance=2000.00, date_entered=date(2024, 1, 1), notes='Initial savings'),
                AccountBalance(user_id=999, account_id=998, balance=1800.00, date_entered=date(2024, 2, 1), notes='After withdrawal'),
            ]
            for balance in balance_entries:
                db.session.add(balance)
            
            db.session.commit()
            yield
            
            # Cleanup after tests
            AccountBalance.query.filter_by(user_id=999).delete()
            UserLoanAccess.query.filter_by(user_id=999).delete()
            UserAccountAccess.query.filter_by(user_id=999).delete()
            DashboardSettings.query.filter_by(user_id=999).delete()
            User.query.filter_by(email='sean.test@example.com').delete()
            Family.query.filter_by(id=999).delete()
            Person.query.filter_by(id=999).delete()
            Loan.query.filter(Loan.id.in_([999, 998])).delete()
            BusinessAccount.query.filter(BusinessAccount.id.in_([999, 998])).delete()
            db.session.commit()

    def test_sean_login(self):
        """Test Sean can login successfully"""
        with app.test_client() as client:
            response = client.post('/api/auth/login', json={
                'email': 'sean.test@example.com',
                'password': 'password123'
            })
            
            assert response.status_code == 200
            data = response.get_json()
            assert 'access_token' in data
            assert data['user']['email'] == 'sean.test@example.com'
            assert data['user']['username'] == 'sean.test'

    def test_sean_dashboard_access(self):
        """Test Sean can access his dashboard with correct data"""
        with app.test_client() as client:
            # Login first
            login_response = client.post('/api/auth/login', json={
                'email': 'sean.test@example.com',
                'password': 'password123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test dashboard endpoint
            response = client.get('/api/user-dashboard', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            
            # Check dashboard structure
            assert 'user' in data
            assert 'dashboard' in data
            assert data['user']['email'] == 'sean.test@example.com'
            assert data['user']['role'] == 'user'

    def test_sean_loans_access(self):
        """Test Sean can access loans he has permission for"""
        with app.test_client() as client:
            # Login first
            login_response = client.post('/api/auth/login', json={
                'email': 'sean.test@example.com',
                'password': 'password123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test loans endpoint
            response = client.get('/api/loans', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            
            assert data['success'] == True
            assert 'data' in data
            loans = data['data']
            assert len(loans) == 2  # Should have access to both test loans
            
            # Check loan names
            loan_names = [loan['loan_name'] for loan in loans]
            assert 'Test Mortgage' in loan_names
            assert 'Test Personal Loan' in loan_names

    def test_sean_accounts_access(self):
        """Test Sean can access accounts he has permission for"""
        with app.test_client() as client:
            # Login first
            login_response = client.post('/api/auth/login', json={
                'email': 'sean.test@example.com',
                'password': 'password123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test accounts endpoint
            response = client.get('/api/business-accounts', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            
            assert data['success'] == True
            assert 'data' in data
            accounts = data['data']
            assert len(accounts) == 2  # Should have access to both test accounts
            
            # Check account names
            account_names = [account['account_name'] for account in accounts]
            assert 'Test Business Account' in account_names
            assert 'Test Savings Account' in account_names

    def test_sean_loan_balances_retrieval(self):
        """Test Sean can retrieve his loan balance entries"""
        with app.test_client() as client:
            # Login first
            login_response = client.post('/api/auth/login', json={
                'email': 'sean.test@example.com',
                'password': 'password123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test loan balances endpoint
            response = client.get('/api/user-loan-balances', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            
            assert data['success'] == True
            assert 'balances' in data
            balances = data['balances']
            
            # Should have 5 loan balance entries (3 for loan 999, 2 for loan 998)
            assert len(balances) == 5
            
            # Check that all balances belong to Sean
            for balance in balances:
                assert balance['user_id'] == 999
                assert balance['loan_id'] in [999, 998]

    def test_sean_account_balances_retrieval(self):
        """Test Sean can retrieve his account balance entries"""
        with app.test_client() as client:
            # Login first
            login_response = client.post('/api/auth/login', json={
                'email': 'sean.test@example.com',
                'password': 'password123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test account balances endpoint
            response = client.get('/api/user-account-balances', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            
            assert data['success'] == True
            assert 'balances' in data
            balances = data['balances']
            
            # Should have 5 account balance entries (3 for account 999, 2 for account 998)
            assert len(balances) == 5
            
            # Check that all balances belong to Sean
            for balance in balances:
                assert balance['user_id'] == 999
                assert balance['account_id'] in [999, 998]

    def test_sean_add_loan_balance(self):
        """Test Sean can add new loan balance entries"""
        with app.test_client() as client:
            # Login first
            login_response = client.post('/api/auth/login', json={
                'email': 'sean.test@example.com',
                'password': 'password123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Add new loan balance
            new_balance = {
                'loan_id': 999,
                'balance': 170000.00,
                'date_entered': '2024-04-01',
                'notes': 'Test new loan balance entry'
            }
            
            response = client.post('/api/user-loan-balances', json=new_balance, headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            
            assert data['success'] == True
            assert 'message' in data
            
            # Verify the balance was added
            balances_response = client.get('/api/user-loan-balances', headers=headers)
            balances = balances_response.get_json()['balances']
            
            # Should now have 6 loan balance entries
            assert len(balances) == 6
            
            # Check the new entry exists
            new_entries = [b for b in balances if b['balance'] == 170000.00 and b['notes'] == 'Test new loan balance entry']
            assert len(new_entries) == 1

    def test_sean_add_account_balance(self):
        """Test Sean can add new account balance entries"""
        with app.test_client() as client:
            # Login first
            login_response = client.post('/api/auth/login', json={
                'email': 'sean.test@example.com',
                'password': 'password123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Add new account balance
            new_balance = {
                'account_id': 999,
                'balance': 6500.00,
                'date_entered': '2024-04-01',
                'notes': 'Test new account balance entry'
            }
            
            response = client.post('/api/user-account-balances', json=new_balance, headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            
            assert data['success'] == True
            assert 'message' in data
            
            # Verify the balance was added
            balances_response = client.get('/api/user-account-balances', headers=headers)
            balances = balances_response.get_json()['balances']
            
            # Should now have 6 account balance entries
            assert len(balances) == 6
            
            # Check the new entry exists
            new_entries = [b for b in balances if b['balance'] == 6500.00 and b['notes'] == 'Test new account balance entry']
            assert len(new_entries) == 1

    def test_sean_cannot_access_other_user_data(self):
        """Test Sean cannot access other users' balance data"""
        with app.test_client() as client:
            # Login as Sean
            login_response = client.post('/api/auth/login', json={
                'email': 'sean.test@example.com',
                'password': 'password123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Try to access balances (should only get Sean's data)
            response = client.get('/api/user-loan-balances', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            
            balances = data['balances']
            # All balances should belong to Sean (user_id 999)
            for balance in balances:
                assert balance['user_id'] == 999

    def test_sean_balance_comparison_logic(self):
        """Test the balance comparison logic works correctly"""
        with app.test_client() as client:
            # Login first
            login_response = client.post('/api/auth/login', json={
                'email': 'sean.test@example.com',
                'password': 'password123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Get loan balances
            response = client.get('/api/user-loan-balances', headers=headers)
            balances = response.get_json()['balances']
            
            # Filter for loan 999 (Test Mortgage)
            loan_999_balances = [b for b in balances if b['loan_id'] == 999]
            assert len(loan_999_balances) == 3
            
            # Sort by date (most recent first)
            loan_999_balances.sort(key=lambda x: x['date_entered'], reverse=True)
            
            # Check that we have the expected balances
            expected_balances = [185000.00, 175000.00, 180000.00]  # Best, middle, initial
            actual_balances = [b['balance'] for b in loan_999_balances]
            assert actual_balances == expected_balances
            
            # The first entry (185000.00) should be the best ever
            # The second entry (175000.00) should be worse than the first
            # The third entry (180000.00) should be better than the second but worse than the first

    def test_sean_admin_panel_access_denied(self):
        """Test Sean cannot access admin panel"""
        with app.test_client() as client:
            # Login as Sean
            login_response = client.post('/api/auth/login', json={
                'email': 'sean.test@example.com',
                'password': 'password123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Try to access admin endpoints
            response = client.get('/api/users', headers=headers)
            assert response.status_code == 403  # Should be forbidden for non-admin users

    def test_sean_password_change(self):
        """Test Sean's password can be changed"""
        with app.app_context():
            # Get Sean's user
            sean = User.query.filter_by(email='sean.test@example.com').first()
            assert sean is not None
            
            # Change password
            from werkzeug.security import generate_password_hash
            sean.password = generate_password_hash('newpassword123')
            db.session.commit()
            
            # Test login with new password
            with app.test_client() as client:
                response = client.post('/api/auth/login', json={
                    'email': 'sean.test@example.com',
                    'password': 'newpassword123'
                })
                assert response.status_code == 200
                
                # Test old password no longer works
                response = client.post('/api/auth/login', json={
                    'email': 'sean.test@example.com',
                    'password': 'password123'
                })
                assert response.status_code == 401

    def test_sean_dashboard_settings(self):
        """Test Sean's dashboard settings are properly configured"""
        with app.app_context():
            settings = DashboardSettings.query.filter_by(user_id=999).all()
            assert len(settings) == 5
            
            # Check all required sections are enabled
            section_names = [s.section for s in settings]
            required_sections = ['properties', 'loans', 'account_balances', 'bank_accounts', 'income']
            for section in required_sections:
                assert section in section_names
            
            # Check all settings are enabled
            for setting in settings:
                assert setting.is_visible == True

    def test_sean_access_control_integrity(self):
        """Test Sean's access control settings are properly configured"""
        with app.app_context():
            # Check loan access
            loan_access = UserLoanAccess.query.filter_by(user_id=999).all()
            assert len(loan_access) == 2
            loan_ids = [access.loan_id for access in loan_access]
            assert 999 in loan_ids  # Test Mortgage
            assert 998 in loan_ids  # Test Personal Loan
            
            # Check account access
            account_access = UserAccountAccess.query.filter_by(user_id=999).all()
            assert len(account_access) == 2
            account_ids = [access.account_id for access in account_access]
            assert 999 in account_ids  # Test Business Account
            assert 998 in account_ids  # Test Savings Account

    def test_sean_balance_data_integrity(self):
        """Test Sean's balance data integrity and relationships"""
        with app.app_context():
            # Check loan balances have proper relationships
            loan_balances = AccountBalance.query.filter_by(user_id=999, loan_id=999).all()
            assert len(loan_balances) == 3
            
            for balance in loan_balances:
                assert balance.loan_id == 999
                assert balance.user_id == 999
                assert balance.account_id is None
                assert balance.balance > 0
                assert balance.date_entered is not None
            
            # Check account balances have proper relationships
            account_balances = AccountBalance.query.filter_by(user_id=999, account_id=999).all()
            assert len(account_balances) == 3
            
            for balance in account_balances:
                assert balance.account_id == 999
                assert balance.user_id == 999
                assert balance.loan_id is None
                assert balance.balance > 0
                assert balance.date_entered is not None

    def test_sean_multiple_balance_entries_per_loan(self):
        """Test that Sean can have multiple balance entries per loan/account"""
        with app.test_client() as client:
            # Login first
            login_response = client.post('/api/auth/login', json={
                'email': 'sean.test@example.com',
                'password': 'password123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Add multiple entries for the same loan
            entries = [
                {'loan_id': 999, 'balance': 160000.00, 'date_entered': '2024-05-01', 'notes': 'May entry'},
                {'loan_id': 999, 'balance': 155000.00, 'date_entered': '2024-06-01', 'notes': 'June entry'},
                {'loan_id': 999, 'balance': 150000.00, 'date_entered': '2024-07-01', 'notes': 'July entry'}
            ]
            
            for entry in entries:
                response = client.post('/api/user-loan-balances', json=entry, headers=headers)
                assert response.status_code == 200
            
            # Verify all entries were added
            balances_response = client.get('/api/user-loan-balances', headers=headers)
            balances = balances_response.get_json()['balances']
            
            # Should now have 8 loan balance entries (3 original + 3 new + 2 for other loan)
            loan_999_balances = [b for b in balances if b['loan_id'] == 999]
            assert len(loan_999_balances) == 6  # 3 original + 3 new
            
            # Check all new entries exist
            new_balance_values = [160000.00, 155000.00, 150000.00]
            actual_balance_values = [b['balance'] for b in loan_999_balances if b['notes'].startswith('May') or b['notes'].startswith('June') or b['notes'].startswith('July')]
            for value in new_balance_values:
                assert value in actual_balance_values

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
