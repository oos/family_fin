"""
Pytest configuration and fixtures for the Family Finance App test suite.
"""
import pytest
import os
import tempfile
from flask import Flask
from app import app, db, User, Person, Property, Income, Loan, Family, BusinessAccount, Pension, PensionAccount, LoanERC, LoanPayment, BankTransaction, AirbnbBooking, DashboardSettings, AccountBalance, TaxReturn, TaxReturnTransaction, TransactionMatch, TransactionLearningPattern, TransactionCategoryPrediction, ModelTrainingHistory, TransactionCategory, AppSettings
from werkzeug.security import generate_password_hash
from datetime import date
import json

@pytest.fixture(scope='session')
def test_app():
    """Create and configure a test Flask application."""
    # Create a temporary database
    db_fd, db_path = tempfile.mkstemp()
    
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path}',
        'JWT_SECRET_KEY': 'test-secret-key',
        'WTF_CSRF_ENABLED': False
    })
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()
    
    os.close(db_fd)
    os.unlink(db_path)

@pytest.fixture
def client(test_app):
    """Create a test client for the Flask application."""
    return test_app.test_client()

@pytest.fixture
def auth_headers(client):
    """Create authentication headers for API requests."""
    # Check if test user already exists
    test_user = User.query.filter_by(email='testuser@example.com').first()
    if not test_user:
        test_user = User(
            username='testuser@example.com',
            email='testuser@example.com',
            password_hash=generate_password_hash('testpassword123')
        )
        test_user.is_active = True
        db.session.add(test_user)
        db.session.commit()
    
    # Login to get token
    response = client.post('/api/auth/login', 
                          json={'username': 'testuser@example.com', 'password': 'testpassword123'})
    token = response.json['access_token']
    
    return {'Authorization': f'Bearer {token}'}

@pytest.fixture
def sample_data(test_app):
    """Create sample data for testing."""
    with test_app.app_context():
        # Check if test user already exists
        test_user = User.query.filter_by(email='testuser@example.com').first()
        if not test_user:
            test_user = User(
                username='testuser@example.com',
                email='testuser@example.com',
                password_hash=generate_password_hash('testpassword123')
            )
            test_user.is_active = True
            db.session.add(test_user)
            db.session.commit()
        
        # Create test family
        test_family = Family.query.filter_by(code='TEST001').first()
        if not test_family:
            test_family = Family(
                name='Test Family',
                code='TEST001',
                description='Test family for testing'
            )
            db.session.add(test_family)
            db.session.commit()
        
        # Create test person
        test_person = Person(
            name='John Doe',
            relationship='Self',
            family_id=test_family.id
        )
        db.session.add(test_person)
        db.session.commit()
        
        # Create test property
        test_property = Property(
            address='123 Test Street',
            nickname='Test Property',
            valuation=350000,
            rental_income_yearly=0,
            omar_ownership=100
        )
        db.session.add(test_property)
        db.session.commit()
        
        # Create test business account
        test_account = BusinessAccount(
            account_name='Test Bank Account',
            account_number='123456789',
            bank_name='Test Bank',
            company_name='Test Company'
        )
        db.session.add(test_account)
        db.session.commit()
        
        # Create test income
        test_income = Income(
            person_id=test_person.id,
            income_type='external_source',
            income_category='non_rental',
            amount_yearly=50000,
            amount_monthly=4166.67
        )
        db.session.add(test_income)
        db.session.commit()
        
        # Create test loan
        test_loan = Loan(
            property_id=test_property.id,
            loan_name='Test Mortgage',
            lender='Test Bank',
            loan_type='mortgage',
            principal_amount=250000,
            interest_rate=3.5,
            term_years=30,
            start_date=date(2024, 1, 1),
            monthly_payment=1200,
            current_balance=250000
        )
        db.session.add(test_loan)
        db.session.commit()
        
        # Create test pension
        test_pension = Pension(
            person_id=test_person.id,
            pension_type='personal',
            contribution_amount=500,
            contribution_frequency='monthly',
            tax_year=2024
        )
        db.session.add(test_pension)
        db.session.commit()
        
        # Create test tax return
        test_tax_return = TaxReturn(
            user_id=test_user.id,
            year='2024',
            filename='test_return.csv',
            file_content=b'test,data\n1,2',
            file_size=10,
            transaction_count=2
        )
        db.session.add(test_tax_return)
        db.session.commit()
        
        # Create test GL transactions
        test_gl_transaction = TaxReturnTransaction(
            tax_return_id=test_tax_return.id,
            user_id=test_user.id,
            name='Test Transaction',
            date=date(2024, 1, 1),
            source='PJ',
            debit=100.0,
            credit=0.0,
            category_heading='Test Category'
        )
        db.session.add(test_gl_transaction)
        db.session.commit()
        
        # Create test bank transaction
        test_bank_transaction = BankTransaction(
            business_account_id=test_account.id,
            transaction_date=date(2024, 1, 1),
            description='Test Bank Transaction',
            amount=-100.0,
            balance=1000.0,
            reference='TEST123'
        )
        db.session.add(test_bank_transaction)
        db.session.commit()
        
        return {
            'user': test_user,
            'family': test_family,
            'person': test_person,
            'property': test_property,
            'account': test_account,
            'income': test_income,
            'loan': test_loan,
            'pension': test_pension,
            'tax_return': test_tax_return,
            'gl_transaction': test_gl_transaction,
            'bank_transaction': test_bank_transaction
        }

@pytest.fixture
def mock_external_apis(monkeypatch):
    """Mock external API calls for testing."""
    def mock_revolut_api(*args, **kwargs):
        return {
            'transactions': [
                {
                    'id': 'test-txn-1',
                    'date': '2024-01-01',
                    'description': 'Mock Transaction',
                    'amount': -100.0,
                    'balance': 1000.0
                }
            ]
        }
    
    monkeypatch.setattr('requests.get', mock_revolut_api)
    monkeypatch.setattr('requests.post', mock_revolut_api)
