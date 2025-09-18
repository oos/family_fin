"""
Complete regression test suite for ALL users and ALL functionality.
This ensures the entire application works correctly for both admin and user roles.
"""

import pytest
import json
import requests
from datetime import datetime, date
from app import app, db
from models import User, Family, Person, Loan, BusinessAccount, AccountBalance, DashboardSettings, UserLoanAccess, UserAccountAccess, Property, Income, TaxReturn, TaxReturnTransaction

class TestCompleteRegression:
    """Complete regression test suite for all functionality"""
    
    @pytest.fixture(autouse=True)
    def setup_test_data(self):
        """Set up comprehensive test data for all users and functionality"""
        with app.app_context():
            # Clean up any existing test data
            AccountBalance.query.filter(AccountBalance.user_id.in_([998, 999])).delete()
            UserLoanAccess.query.filter(UserLoanAccess.user_id.in_([998, 999])).delete()
            UserAccountAccess.query.filter(UserAccountAccess.user_id.in_([998, 999])).delete()
            DashboardSettings.query.filter(DashboardSettings.user_id.in_([998, 999])).delete()
            User.query.filter(User.email.in_(['admin.test@example.com', 'user.test@example.com'])).delete()
            Family.query.filter(Family.id.in_([998, 999])).delete()
            Person.query.filter(Person.id.in_([998, 999])).delete()
            Loan.query.filter(Loan.id.in_([998, 999])).delete()
            BusinessAccount.query.filter(BusinessAccount.id.in_([998, 999])).delete()
            Property.query.filter(Property.id.in_([998, 999])).delete()
            Income.query.filter(Income.id.in_([998, 999])).delete()
            
            # Create admin test user
            admin_user = User(
                id=998,
                email='admin.test@example.com',
                username='admin.test',
                role='admin',
                password='admin123'
            )
            db.session.add(admin_user)

            # Create user test user
            user_user = User(
                id=999,
                email='user.test@example.com',
                username='user.test',
                role='user',
                password='user123'
            )
            db.session.add(user_user)
            
            # Create test family
            test_family = Family(
                id=999,
                name='Test Family',
                code='TEST999',
                description='Test Family for regression testing'
            )
            db.session.add(test_family)
            
            # Create test person
            test_person = Person(
                id=999,
                name='Test Person',
                family_id=999,
                relationship='self'
            )
            db.session.add(test_person)
            
            # Create test property
            test_property = Property(
                id=999,
                address='123 Test Street, Test City',
                nickname='Test Property',
                valuation=350000.00,
                rental_income_yearly=0,
                lender='Test Bank',
                omar_ownership=100.0,
                heidi_ownership=0.0,
                dwayne_ownership=0.0,
                sean_ownership=0.0
            )
            db.session.add(test_property)
            
            # Create test income
            test_income = Income(
                id=999,
                income_type='Salary',
                income_category='Employment',
                amount_monthly=5000.00,
                amount_yearly=60000.00,
                person_id=999
            )
            db.session.add(test_income)
            
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
            
            # Create dashboard settings for user
            dashboard_settings = [
                DashboardSettings(user_id=999, section='properties', is_visible=True),
                DashboardSettings(user_id=999, section='loans', is_visible=True),
                DashboardSettings(user_id=999, section='account_balances', is_visible=True),
                DashboardSettings(user_id=999, section='bank_accounts', is_visible=True),
                DashboardSettings(user_id=999, section='income', is_visible=True)
            ]
            for setting in dashboard_settings:
                db.session.add(setting)
            
            # Create loan access for user
            loan_access = [
                UserLoanAccess(user_id=999, loan_id=999),
                UserLoanAccess(user_id=999, loan_id=998)
            ]
            for access in loan_access:
                db.session.add(access)
            
            # Create account access for user
            account_access = [
                UserAccountAccess(user_id=999, business_account_id=999),
                UserAccountAccess(user_id=999, business_account_id=998)
            ]
            for access in account_access:
                db.session.add(access)
            
            # Create test balance entries for user
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
            AccountBalance.query.filter(AccountBalance.user_id.in_([998, 999])).delete()
            UserLoanAccess.query.filter(UserLoanAccess.user_id.in_([998, 999])).delete()
            UserAccountAccess.query.filter(UserAccountAccess.user_id.in_([998, 999])).delete()
            DashboardSettings.query.filter(DashboardSettings.user_id.in_([998, 999])).delete()
            User.query.filter(User.email.in_(['admin.test@example.com', 'user.test@example.com'])).delete()
            Family.query.filter_by(id=999).delete()
            Person.query.filter_by(id=999).delete()
            Loan.query.filter(Loan.id.in_([998, 999])).delete()
            BusinessAccount.query.filter(BusinessAccount.id.in_([998, 999])).delete()
            Property.query.filter(Property.id.in_([998, 999])).delete()
            Income.query.filter(Income.id.in_([998, 999])).delete()
            db.session.commit()

    # ==================== AUTHENTICATION TESTS ====================
    
    def test_admin_login(self):
        """Test admin can login successfully"""
        with app.test_client() as client:
            response = client.post('/api/auth/login', json={
                'email': 'admin.test@example.com',
                'password': 'admin123'
            })
            
            assert response.status_code == 200
            data = response.get_json()
            assert 'access_token' in data
            assert data['user']['email'] == 'admin.test@example.com'
            assert data['user']['username'] == 'admin.test'

    def test_user_login(self):
        """Test user can login successfully"""
        with app.test_client() as client:
            response = client.post('/api/auth/login', json={
                'email': 'user.test@example.com',
                'password': 'user123'
            })
            
            assert response.status_code == 200
            data = response.get_json()
            assert 'access_token' in data
            assert data['user']['email'] == 'user.test@example.com'
            assert data['user']['username'] == 'user.test'

    def test_invalid_login(self):
        """Test invalid login is rejected"""
        with app.test_client() as client:
            response = client.post('/api/auth/login', json={
                'email': 'nonexistent@example.com',
                'password': 'wrongpassword'
            })
            
            assert response.status_code == 401

    # ==================== ADMIN FUNCTIONALITY TESTS ====================
    
    def test_admin_dashboard_access(self):
        """Test admin can access dashboard"""
        with app.test_client() as client:
            # Login as admin
            login_response = client.post('/api/auth/login', json={
                'email': 'admin.test@example.com',
                'password': 'admin123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test dashboard endpoint
            response = client.get('/api/user-dashboard', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert 'dashboard' in data

    def test_admin_users_access(self):
        """Test admin can access users list"""
        with app.test_client() as client:
            # Login as admin
            login_response = client.post('/api/auth/login', json={
                'email': 'admin.test@example.com',
                'password': 'admin123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test users endpoint
            response = client.get('/api/users', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert 'users' in data

    def test_admin_gl_transactions_access(self):
        """Test admin can access GL transactions"""
        with app.test_client() as client:
            # Login as admin
            login_response = client.post('/api/auth/login', json={
                'email': 'admin.test@example.com',
                'password': 'admin123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test GL transactions endpoint
            response = client.get('/api/gl-transactions', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert 'transactions' in data

    def test_admin_properties_access(self):
        """Test admin can access properties"""
        with app.test_client() as client:
            # Login as admin
            login_response = client.post('/api/auth/login', json={
                'email': 'admin.test@example.com',
                'password': 'admin123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test properties endpoint
            response = client.get('/api/properties', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert 'properties' in data

    def test_admin_income_access(self):
        """Test admin can access income data"""
        with app.test_client() as client:
            # Login as admin
            login_response = client.post('/api/auth/login', json={
                'email': 'admin.test@example.com',
                'password': 'admin123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test income endpoint
            response = client.get('/api/income', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert 'income' in data

    def test_admin_loans_access(self):
        """Test admin can access all loans"""
        with app.test_client() as client:
            # Login as admin
            login_response = client.post('/api/auth/login', json={
                'email': 'admin.test@example.com',
                'password': 'admin123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test loans endpoint
            response = client.get('/api/loans', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert 'loans' in data

    def test_admin_business_accounts_access(self):
        """Test admin can access all business accounts"""
        with app.test_client() as client:
            # Login as admin
            login_response = client.post('/api/auth/login', json={
                'email': 'admin.test@example.com',
                'password': 'admin123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test business accounts endpoint
            response = client.get('/api/business-accounts', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert 'accounts' in data

    # ==================== USER FUNCTIONALITY TESTS ====================
    
    def test_user_dashboard_access(self):
        """Test user can access their dashboard"""
        with app.test_client() as client:
            # Login as user
            login_response = client.post('/api/auth/login', json={
                'email': 'user.test@example.com',
                'password': 'user123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test dashboard endpoint
            response = client.get('/api/user-dashboard', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert 'dashboard' in data

    def test_user_loans_access(self):
        """Test user can access their permitted loans"""
        with app.test_client() as client:
            # Login as user
            login_response = client.post('/api/auth/login', json={
                'email': 'user.test@example.com',
                'password': 'user123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test loans endpoint
            response = client.get('/api/loans', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert 'loans' in data
            assert len(data['loans']) == 2  # Should have access to both test loans

    def test_user_accounts_access(self):
        """Test user can access their permitted accounts"""
        with app.test_client() as client:
            # Login as user
            login_response = client.post('/api/auth/login', json={
                'email': 'user.test@example.com',
                'password': 'user123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test business accounts endpoint
            response = client.get('/api/business-accounts', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert 'accounts' in data
            assert len(data['accounts']) == 2  # Should have access to both test accounts

    def test_user_loan_balances_management(self):
        """Test user can manage their loan balances"""
        with app.test_client() as client:
            # Login as user
            login_response = client.post('/api/auth/login', json={
                'email': 'user.test@example.com',
                'password': 'user123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test loan balances retrieval
            response = client.get('/api/user-loan-balances', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert 'balances' in data
            assert len(data['balances']) == 5  # Should have 5 loan balance entries
            
            # Test adding new loan balance
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

    def test_user_account_balances_management(self):
        """Test user can manage their account balances"""
        with app.test_client() as client:
            # Login as user
            login_response = client.post('/api/auth/login', json={
                'email': 'user.test@example.com',
                'password': 'user123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test account balances retrieval
            response = client.get('/api/user-account-balances', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert 'balances' in data
            assert len(data['balances']) == 5  # Should have 5 account balance entries
            
            # Test adding new account balance
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

    # ==================== ACCESS CONTROL TESTS ====================
    
    def test_user_cannot_access_admin_functions(self):
        """Test user cannot access admin-only functions"""
        with app.test_client() as client:
            # Login as user
            login_response = client.post('/api/auth/login', json={
                'email': 'user.test@example.com',
                'password': 'user123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test admin-only endpoints
            response = client.get('/api/users', headers=headers)
            assert response.status_code == 403  # Should be forbidden for non-admin users
            
            response = client.get('/api/gl-transactions', headers=headers)
            assert response.status_code == 403  # Should be forbidden for non-admin users

    def test_user_data_isolation(self):
        """Test users can only access their own data"""
        with app.test_client() as client:
            # Login as user
            login_response = client.post('/api/auth/login', json={
                'email': 'user.test@example.com',
                'password': 'user123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test that user only sees their own balance data
            response = client.get('/api/user-loan-balances', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            
            # All balances should belong to the user (user_id=999)
            for balance in data['balances']:
                assert balance['user_id'] == 999

    def test_admin_can_access_all_data(self):
        """Test admin can access all data"""
        with app.test_client() as client:
            # Login as admin
            login_response = client.post('/api/auth/login', json={
                'email': 'admin.test@example.com',
                'password': 'admin123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test admin can access all endpoints
            endpoints = [
                '/api/users',
                '/api/properties',
                '/api/income',
                '/api/loans',
                '/api/business-accounts'
            ]
            
            for endpoint in endpoints:
                response = client.get(endpoint, headers=headers)
                assert response.status_code == 200, f"Admin should be able to access {endpoint}"

    # ==================== CORE FEATURE TESTS ====================
    
    def test_gl_transactions_functionality(self):
        """Test GL transactions functionality works for admin"""
        with app.test_client() as client:
            # Login as admin
            login_response = client.post('/api/auth/login', json={
                'email': 'admin.test@example.com',
                'password': 'admin123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test GL transactions endpoint
            response = client.get('/api/gl-transactions', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert 'transactions' in data

    def test_dashboard_summary_functionality(self):
        """Test dashboard summary functionality"""
        with app.test_client() as client:
            # Login as admin
            login_response = client.post('/api/auth/login', json={
                'email': 'admin.test@example.com',
                'password': 'admin123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test dashboard summary endpoint
            response = client.get('/api/dashboard/summary', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert 'summary' in data

    def test_properties_functionality(self):
        """Test properties functionality"""
        with app.test_client() as client:
            # Login as admin
            login_response = client.post('/api/auth/login', json={
                'email': 'admin.test@example.com',
                'password': 'admin123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test properties endpoint
            response = client.get('/api/properties', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert 'properties' in data

    def test_income_functionality(self):
        """Test income functionality"""
        with app.test_client() as client:
            # Login as admin
            login_response = client.post('/api/auth/login', json={
                'email': 'admin.test@example.com',
                'password': 'admin123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test income endpoint
            response = client.get('/api/income', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert 'income' in data

    def test_loans_functionality(self):
        """Test loans functionality"""
        with app.test_client() as client:
            # Login as admin
            login_response = client.post('/api/auth/login', json={
                'email': 'admin.test@example.com',
                'password': 'admin123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test loans endpoint
            response = client.get('/api/loans', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert 'loans' in data

    def test_business_accounts_functionality(self):
        """Test business accounts functionality"""
        with app.test_client() as client:
            # Login as admin
            login_response = client.post('/api/auth/login', json={
                'email': 'admin.test@example.com',
                'password': 'admin123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test business accounts endpoint
            response = client.get('/api/business-accounts', headers=headers)
            assert response.status_code == 200
            data = response.get_json()
            assert 'accounts' in data

    # ==================== DATA INTEGRITY TESTS ====================
    
    def test_balance_comparison_logic(self):
        """Test balance comparison logic works correctly"""
        with app.test_client() as client:
            # Login as user
            login_response = client.post('/api/auth/login', json={
                'email': 'user.test@example.com',
                'password': 'user123'
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

    def test_multiple_balance_entries_per_loan(self):
        """Test that users can have multiple balance entries per loan/account"""
        with app.test_client() as client:
            # Login as user
            login_response = client.post('/api/auth/login', json={
                'email': 'user.test@example.com',
                'password': 'user123'
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

    def test_dashboard_settings_integrity(self):
        """Test dashboard settings are properly configured"""
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

    def test_access_control_integrity(self):
        """Test access control settings are properly configured"""
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
            account_ids = [access.business_account_id for access in account_access]
            assert 999 in account_ids  # Test Business Account
            assert 998 in account_ids  # Test Savings Account

    # ==================== ERROR HANDLING TESTS ====================
    
    def test_unauthorized_access(self):
        """Test unauthorized access is properly handled"""
        with app.test_client() as client:
            # Test endpoints without authentication
            endpoints = [
                '/api/user-dashboard',
                '/api/users',
                '/api/properties',
                '/api/income',
                '/api/loans',
                '/api/business-accounts',
                '/api/user-loan-balances',
                '/api/user-account-balances'
            ]
            
            for endpoint in endpoints:
                response = client.get(endpoint)
                assert response.status_code == 401, f"Unauthorized access to {endpoint} should return 401"

    def test_invalid_token(self):
        """Test invalid token is properly handled"""
        with app.test_client() as client:
            headers = {'Authorization': 'Bearer invalid_token'}
            
            response = client.get('/api/user-dashboard', headers=headers)
            assert response.status_code == 401

    def test_malformed_request(self):
        """Test malformed requests are properly handled"""
        with app.test_client() as client:
            # Login as user
            login_response = client.post('/api/auth/login', json={
                'email': 'user.test@example.com',
                'password': 'user123'
            })
            token = login_response.get_json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test malformed balance entry
            malformed_balance = {
                'loan_id': 999,
                'balance': 'invalid_balance',  # Invalid balance format
                'date_entered': 'invalid_date',  # Invalid date format
                'notes': 'Test malformed entry'
            }
            
            response = client.post('/api/user-loan-balances', json=malformed_balance, headers=headers)
            assert response.status_code == 400  # Should return bad request

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
