from flask import Flask, request, jsonify, Response
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash
import hashlib
from datetime import datetime, timedelta
import pandas as pd
import json
import re
import math
import pdfplumber
import PyPDF2
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, precision_recall_fscore_support
import numpy as np
import os
import csv
import io
import requests
import re
from difflib import SequenceMatcher
from icalendar import Calendar
from dotenv import load_dotenv

load_dotenv()

# File storage utility functions
def save_uploaded_file(file, model_instance, file_fields):
    """
    Generic function to save uploaded file content to any model instance
    
    Args:
        file: The uploaded file object
        model_instance: The database model instance to save to
        file_fields: Dict mapping field names to values:
            {
                'file_name_field': 'filename',
                'file_content_field': 'file_content', 
                'file_size_field': 'file_size',
                'uploaded_at_field': 'uploaded_at'
            }
    """
    file.seek(0)  # Reset file pointer
    file_content = file.read()
    
    # Set file information on the model instance
    setattr(model_instance, file_fields['file_name_field'], file.filename)
    setattr(model_instance, file_fields['file_content_field'], file_content)
    setattr(model_instance, file_fields['file_size_field'], len(file_content))
    setattr(model_instance, file_fields['uploaded_at_field'], datetime.utcnow())
    
    return file_content

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///family_finance.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-string')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# Import models and db
from models import db, User, Person, Property, Income, Loan, Family, BusinessAccount, Pension, PensionAccount, LoanERC, LoanPayment, BankTransaction, AirbnbBooking, DashboardSettings, AccountBalance, TaxReturn, TaxReturnTransaction, TransactionMatch, TransactionLearningPattern, TransactionCategoryPrediction, ModelTrainingHistory, TransactionCategory

# Initialize extensions
db.init_app(app)
jwt = JWTManager(app)
migrate = Migrate(app, db)
CORS(app, 
     origins=['http://localhost:3007'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization'],
     supports_credentials=True)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Family Finance API is running'})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username') or data.get('email')  # Accept both username and email
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'message': 'Username and password are required'}), 400
    
    # Find user by username or email
    user = User.query.filter(
        (User.username == username) | (User.email == username)
    ).first()
    
    if user and user.check_password(password) and user.is_active:
        access_token = create_access_token(identity=user.username)
        return jsonify({
            'access_token': access_token,
            'user': {
                'username': user.username,
                'email': user.email
            }
        }), 200
    
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/people', methods=['GET'])
@jwt_required()
def get_people():
    people = Person.query.all()
    return jsonify([person.to_dict() for person in people])

@app.route('/api/people', methods=['POST'])
@jwt_required()
def create_person():
    data = request.get_json()
    person = Person(
        name=data['name'],
        relationship=data['relationship'],
        is_director=data.get('is_director', False),
        is_deceased=data.get('is_deceased', False)
    )
    db.session.add(person)
    db.session.commit()
    return jsonify(person.to_dict()), 201

@app.route('/api/people/<int:person_id>', methods=['PUT'])
@jwt_required()
def update_person(person_id):
    person = Person.query.get_or_404(person_id)
    data = request.get_json()
    
    person.name = data.get('name', person.name)
    person.relationship = data.get('relationship', person.relationship)
    person.is_director = data.get('is_director', person.is_director)
    person.is_deceased = data.get('is_deceased', person.is_deceased)
    
    db.session.commit()
    return jsonify(person.to_dict())

@app.route('/api/people/<int:person_id>', methods=['DELETE'])
@jwt_required()
def delete_person(person_id):
    person = Person.query.get_or_404(person_id)
    db.session.delete(person)
    db.session.commit()
    return jsonify({'message': 'Person deleted successfully'})

# Family API endpoints
@app.route('/api/families', methods=['GET'])
@jwt_required()
def get_families():
    families = Family.query.all()
    return jsonify([family.to_dict() for family in families])

@app.route('/api/families', methods=['POST'])
@jwt_required()
def create_family():
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'code']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({'error': f'{field} is required'}), 400
    
    try:
        family = Family(
            name=data['name'],
            code=data['code'],
            description=data.get('description', '')
        )
        
        db.session.add(family)
        db.session.commit()
        return jsonify(family.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/families/<int:family_id>', methods=['PUT'])
@jwt_required()
def update_family(family_id):
    family = Family.query.get_or_404(family_id)
    data = request.get_json()
    
    try:
        family.name = data.get('name', family.name)
        family.code = data.get('code', family.code)
        family.description = data.get('description', family.description)
        
        db.session.commit()
        return jsonify(family.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/families/<int:family_id>', methods=['DELETE'])
@jwt_required()
def delete_family(family_id):
    family = Family.query.get_or_404(family_id)
    
    try:
        db.session.delete(family)
        db.session.commit()
        return jsonify({'message': 'Family deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/properties', methods=['GET'])
@jwt_required()
def get_properties():
    properties = Property.query.all()
    loans = Loan.query.all()
    loans_data = [loan.to_dict() for loan in loans]
    return jsonify([property.to_dict(loans_data) for property in properties])

@app.route('/api/properties', methods=['POST'])
@jwt_required()
def create_property():
    data = request.get_json()
    property = Property(
        address=data['address'],
        nickname=data['nickname'],
        valuation=data['valuation'],
        rental_income_yearly=data.get('rental_income_yearly', 0),
        lender=data.get('lender', ''),
        omar_ownership=data.get('omar_ownership', 0),
        heidi_ownership=data.get('heidi_ownership', 0),
        dwayne_ownership=data.get('dwayne_ownership', 0),
        sean_ownership=data.get('sean_ownership', 0),
        lena_ownership=data.get('lena_ownership', 0)
    )
    db.session.add(property)
    db.session.commit()
    loans = Loan.query.all()
    loans_data = [loan.to_dict() for loan in loans]
    return jsonify(property.to_dict(loans_data)), 201

@app.route('/api/properties/<int:property_id>', methods=['PUT'])
@jwt_required()
def update_property(property_id):
    property = Property.query.get_or_404(property_id)
    data = request.get_json()
    
    property.address = data.get('address', property.address)
    property.nickname = data.get('nickname', property.nickname)
    property.valuation = data.get('valuation', property.valuation)
    property.rental_income_yearly = data.get('rental_income_yearly', property.rental_income_yearly)
    property.lender = data.get('lender', property.lender)
    property.omar_ownership = data.get('omar_ownership', property.omar_ownership)
    property.heidi_ownership = data.get('heidi_ownership', property.heidi_ownership)
    property.dwayne_ownership = data.get('dwayne_ownership', property.dwayne_ownership)
    property.sean_ownership = data.get('sean_ownership', property.sean_ownership)
    property.lena_ownership = data.get('lena_ownership', property.lena_ownership)
    
    db.session.commit()
    loans = Loan.query.all()
    loans_data = [loan.to_dict() for loan in loans]
    return jsonify(property.to_dict(loans_data))

@app.route('/api/properties/<int:property_id>', methods=['DELETE'])
@jwt_required()
def delete_property(property_id):
    property = Property.query.get_or_404(property_id)
    db.session.delete(property)
    db.session.commit()
    return jsonify({'message': 'Property deleted successfully'})

@app.route('/api/business-accounts', methods=['GET'])
@jwt_required()
def get_business_accounts():
    accounts = BusinessAccount.query.all()
    accounts_with_calculated_balance = []
    
    for account in accounts:
        account_dict = account.to_dict()
        
        # Calculate current balance from last transaction
        last_transaction = BankTransaction.query.filter_by(
            business_account_id=account.id
        ).filter(BankTransaction.balance.isnot(None)).order_by(
            BankTransaction.transaction_date.desc()
        ).first()
        
        if last_transaction:
            account_dict['balance'] = last_transaction.balance
            account_dict['balance_source'] = 'calculated_from_transactions'
            account_dict['balance_date'] = last_transaction.transaction_date.isoformat()
        else:
            account_dict['balance'] = 0.0
            account_dict['balance_source'] = 'no_transactions'
            account_dict['balance_date'] = None
        
        accounts_with_calculated_balance.append(account_dict)
    
    return jsonify(accounts_with_calculated_balance)

@app.route('/api/business-accounts', methods=['POST'])
@jwt_required()
def create_business_account():
    data = request.get_json()
    account = BusinessAccount(
        account_name=data['account_name'],
        account_number=data['account_number'],
        bank_name=data['bank_name'],
        company_name=data['company_name'],
        is_active=data.get('is_active', True)
    )
    db.session.add(account)
    db.session.commit()
    return jsonify(account.to_dict()), 201

@app.route('/api/business-accounts/<int:account_id>', methods=['PUT'])
@jwt_required()
def update_business_account(account_id):
    account = BusinessAccount.query.get_or_404(account_id)
    data = request.get_json()
    
    account.account_name = data.get('account_name', account.account_name)
    account.account_number = data.get('account_number', account.account_number)
    account.bank_name = data.get('bank_name', account.bank_name)
    account.company_name = data.get('company_name', account.company_name)
    account.is_active = data.get('is_active', account.is_active)
    
    db.session.commit()
    return jsonify(account.to_dict())

@app.route('/api/business-accounts/<int:account_id>', methods=['DELETE'])
@jwt_required()
def delete_business_account(account_id):
    account = BusinessAccount.query.get_or_404(account_id)
    db.session.delete(account)
    db.session.commit()
    return jsonify({'message': 'Business account deleted successfully'})

@app.route('/api/income', methods=['GET'])
@jwt_required()
def get_income():
    income_records = Income.query.all()
    return jsonify([income.to_dict() for income in income_records])

@app.route('/api/income', methods=['POST'])
@jwt_required()
def create_income():
    data = request.get_json()
    income = Income(
        person_id=data['person_id'],
        income_type=data['income_type'],
        income_category=data.get('income_category', 'non_rental'),
        amount_yearly=data['amount_yearly'],
        amount_monthly=data['amount_monthly']
    )
    db.session.add(income)
    db.session.commit()
    return jsonify(income.to_dict()), 201

@app.route('/api/income/<int:income_id>', methods=['PUT'])
@jwt_required()
def update_income(income_id):
    income = Income.query.get_or_404(income_id)
    data = request.get_json()
    
    income.person_id = data.get('person_id', income.person_id)
    income.income_type = data.get('income_type', income.income_type)
    income.income_category = data.get('income_category', income.income_category)
    income.amount_yearly = data.get('amount_yearly', income.amount_yearly)
    income.amount_monthly = data.get('amount_monthly', income.amount_monthly)
    
    db.session.commit()
    return jsonify(income.to_dict())

@app.route('/api/income/<int:income_id>', methods=['DELETE'])
@jwt_required()
def delete_income(income_id):
    income = Income.query.get_or_404(income_id)
    db.session.delete(income)
    db.session.commit()
    return jsonify({'message': 'Income record deleted successfully'})

@app.route('/api/loans', methods=['GET'])
@jwt_required()
def get_loans():
    loans = Loan.query.all()
    return jsonify([loan.to_dict() for loan in loans])

@app.route('/api/loans', methods=['POST'])
@jwt_required()
def create_loan():
    data = request.get_json()
    
    # Calculate monthly payment if not provided
    monthly_payment = data.get('monthly_payment')
    if not monthly_payment:
        # Create a temporary loan object to calculate payment
        temp_loan = Loan(
            principal_amount=data['principal_amount'],
            interest_rate=data['interest_rate'],
            term_years=data['term_years']
        )
        monthly_payment = temp_loan.calculate_monthly_payment()
    
    loan = Loan(
        property_id=data.get('property_id'),
        loan_name=data['loan_name'],
        lender=data['lender'],
        loan_type=data['loan_type'],
        principal_amount=data['principal_amount'],
        interest_rate=data['interest_rate'],
        term_years=data['term_years'],
        start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date(),
        monthly_payment=monthly_payment,
        current_balance=data.get('current_balance', data['principal_amount']),
        is_active=data.get('is_active', True),
        regular_overpayment=data.get('regular_overpayment', 0),
        overpayment_start_month=data.get('overpayment_start_month', 1),
        overpayment_end_month=data.get('overpayment_end_month'),
        max_extra_payment=data.get('max_extra_payment', 0)
    )
    db.session.add(loan)
    db.session.commit()
    return jsonify(loan.to_dict()), 201

@app.route('/api/loans/<int:loan_id>', methods=['PUT'])
@jwt_required()
def update_loan(loan_id):
    loan = Loan.query.get_or_404(loan_id)
    data = request.get_json()
    
    # Update fields
    loan.property_id = data.get('property_id', loan.property_id)
    loan.loan_name = data.get('loan_name', loan.loan_name)
    loan.lender = data.get('lender', loan.lender)
    loan.loan_type = data.get('loan_type', loan.loan_type)
    loan.principal_amount = data.get('principal_amount', loan.principal_amount)
    loan.interest_rate = data.get('interest_rate', loan.interest_rate)
    loan.term_years = data.get('term_years', loan.term_years)
    loan.current_balance = data.get('current_balance', loan.current_balance)
    loan.is_active = data.get('is_active', loan.is_active)
    loan.regular_overpayment = data.get('regular_overpayment', loan.regular_overpayment)
    loan.overpayment_start_month = data.get('overpayment_start_month', loan.overpayment_start_month)
    loan.overpayment_end_month = data.get('overpayment_end_month', loan.overpayment_end_month)
    loan.max_extra_payment = data.get('max_extra_payment', loan.max_extra_payment)
    
    if 'start_date' in data:
        loan.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
    
    # Recalculate monthly payment if rate or term changed
    if 'interest_rate' in data or 'term_years' in data or 'principal_amount' in data:
        loan.monthly_payment = loan.calculate_monthly_payment()
    
    db.session.commit()
    return jsonify(loan.to_dict())

@app.route('/api/loans/<int:loan_id>', methods=['DELETE'])
@jwt_required()
def delete_loan(loan_id):
    loan = Loan.query.get_or_404(loan_id)
    db.session.delete(loan)
    db.session.commit()
    return jsonify({'message': 'Loan deleted successfully'})

@app.route('/api/loans/<int:loan_id>/schedule', methods=['GET'])
@jwt_required()
def get_loan_schedule(loan_id):
    loan = Loan.query.get_or_404(loan_id)
    months = request.args.get('months', 12, type=int)
    schedule_data = loan.get_payment_schedule(months)
    return jsonify({
        'loan': loan.to_dict(),
        'schedule': schedule_data['schedule'],
        'summary': schedule_data['summary']
    })

@app.route('/api/people/<int:person_id>/networth', methods=['GET'])
@jwt_required()
def get_person_networth(person_id):
    person = Person.query.get_or_404(person_id)
    
    # Calculate property ownership value with detailed breakdown
    properties = Property.query.all()
    loans = Loan.query.all()
    loans_data = [loan.to_dict() for loan in loans]
    
    property_value = 0
    property_equity = 0
    property_mortgages = 0
    property_breakdown = []
    
    for prop in properties:
        # Calculate ownership percentage for this person
        ownership_percentage = 0
        if person.name == 'Omar':
            ownership_percentage = prop.omar_ownership / 100
        elif person.name == 'Heidi':
            ownership_percentage = prop.heidi_ownership / 100
        elif person.name == 'Dwayne':
            ownership_percentage = prop.dwayne_ownership / 100
        elif person.name == 'Lena':
            ownership_percentage = prop.lena_ownership / 100
        elif person.name == 'Sean':
            ownership_percentage = prop.sean_ownership / 100
        
        if ownership_percentage > 0:
            person_property_value = prop.valuation * ownership_percentage
            
            # Calculate mortgage balance from loans
            property_loans = [loan for loan in loans_data if loan.get('property_id') == prop.id and loan.get('is_active', True)]
            property_mortgage_balance = sum(loan.get('current_balance', 0) for loan in property_loans)
            person_mortgage = property_mortgage_balance * ownership_percentage
            person_equity = person_property_value - person_mortgage
            
            property_value += person_property_value
            property_equity += person_equity
            property_mortgages += person_mortgage
            
            property_breakdown.append({
                'property_name': prop.nickname,
                'ownership_percentage': ownership_percentage * 100,
                'property_value': person_property_value,
                'mortgage_balance': person_mortgage,
                'equity': person_equity
            })
    
    # Calculate income with detailed breakdown
    income_records = Income.query.filter_by(person_id=person_id).all()
    total_income = sum(inc.amount_yearly for inc in income_records)
    income_breakdown = []
    for inc in income_records:
        income_breakdown.append({
            'source': inc.income_type,
            'category': inc.income_category,
            'amount_yearly': inc.amount_yearly,
            'amount_monthly': inc.amount_monthly
        })
    
    # Calculate business account ownership (assuming equal split for directors)
    business_value = 0
    business_breakdown = []
    if person.is_director:
        # For now, we'll set a placeholder value or calculate based on other factors
        # In a real implementation, you'd need to add balance field to BusinessAccount model
        business_value = 0
        business_breakdown.append({
            'account_name': 'RRltd Business Account',
            'value': 0,
            'note': 'Requires additional data fields in business account model'
        })
    
    # Calculate loan liabilities with detailed breakdown
    loans = Loan.query.filter_by(property_id=None).all()  # Non-property loans
    loan_liabilities = 0
    loan_breakdown = []
    for loan in loans:
        loan_liabilities += loan.current_balance
        loan_breakdown.append({
            'loan_name': loan.loan_name,
            'current_balance': loan.current_balance,
            'interest_rate': loan.interest_rate,
            'monthly_payment': loan.monthly_payment
        })
    
    # Calculate net worth
    total_assets = property_equity + business_value
    total_liabilities = loan_liabilities
    net_worth = total_assets - total_liabilities
    
    return jsonify({
        'person': person.to_dict(),
        'net_worth': {
            'total_net_worth': net_worth,
            'assets': {
                'property_equity': property_equity,
                'business_value': business_value,
                'total_assets': total_assets,
                'breakdown': {
                    'properties': property_breakdown,
                    'business_accounts': business_breakdown
                }
            },
            'liabilities': {
                'loan_liabilities': loan_liabilities,
                'total_liabilities': total_liabilities,
                'breakdown': loan_breakdown
            },
            'property_details': {
                'total_property_value': property_value,
                'total_mortgages': property_mortgages,
                'net_equity': property_equity
            },
            'income': {
                'total_annual_income': total_income,
                'monthly_income': total_income / 12,
                'breakdown': income_breakdown
            }
        }
    })

@app.route('/api/dashboard/summary', methods=['GET'])
@jwt_required()
def get_dashboard_summary():
    # Calculate total property values
    properties = Property.query.all()
    total_property_value = sum(p.valuation for p in properties)
    total_rental_income = sum(p.rental_income_yearly for p in properties)
    
    # Calculate total mortgage balance from loans
    loans = Loan.query.filter_by(is_active=True).all()
    total_mortgage_balance = sum(loan.current_balance for loan in loans if loan.current_balance)
    
    # Calculate total income
    income_records = Income.query.all()
    total_family_income = sum(i.amount_yearly for i in income_records)
    
    return jsonify({
        'total_property_value': total_property_value,
        'total_mortgage_balance': total_mortgage_balance,
        'total_rental_income': total_rental_income,
        'total_family_income': total_family_income,
        'net_worth': total_property_value - total_mortgage_balance,
        'total_monthly_income': total_rental_income / 12 + total_family_income / 12
    })

# Pension API endpoints
@app.route('/api/pensions', methods=['GET'])
@jwt_required()
def get_pensions():
    pensions = Pension.query.all()
    return jsonify([pension.to_dict() for pension in pensions])

@app.route('/api/pensions', methods=['POST'])
@jwt_required()
def create_pension():
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['person_id', 'pension_type', 'contribution_amount', 'contribution_frequency', 'tax_year']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({'error': f'{field} is required'}), 400
    
    try:
        pension = Pension(
            person_id=data['person_id'],
            pension_type=data['pension_type'],
            contribution_amount=data['contribution_amount'],
            contribution_frequency=data['contribution_frequency'],
            tax_year=data['tax_year'],
            is_company_contribution=data.get('is_company_contribution', False),
            company_name=data.get('company_name', ''),
            pension_provider=data.get('pension_provider', ''),
            notes=data.get('notes', '')
        )
        
        db.session.add(pension)
        db.session.commit()
        
        return jsonify(pension.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/pensions/<int:pension_id>', methods=['PUT'])
@jwt_required()
def update_pension(pension_id):
    pension = Pension.query.get_or_404(pension_id)
    data = request.get_json()
    
    try:
        pension.person_id = data.get('person_id', pension.person_id)
        pension.pension_type = data.get('pension_type', pension.pension_type)
        pension.contribution_amount = data.get('contribution_amount', pension.contribution_amount)
        pension.contribution_frequency = data.get('contribution_frequency', pension.contribution_frequency)
        pension.tax_year = data.get('tax_year', pension.tax_year)
        pension.is_company_contribution = data.get('is_company_contribution', pension.is_company_contribution)
        pension.company_name = data.get('company_name', pension.company_name)
        pension.pension_provider = data.get('pension_provider', pension.pension_provider)
        pension.notes = data.get('notes', pension.notes)
        pension.updated_at = datetime.utcnow()
        
        db.session.commit()
        return jsonify(pension.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/pensions/<int:pension_id>', methods=['DELETE'])
@jwt_required()
def delete_pension(pension_id):
    pension = Pension.query.get_or_404(pension_id)
    
    try:
        db.session.delete(pension)
        db.session.commit()
        return jsonify({'message': 'Pension record deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Pension Account API endpoints
@app.route('/api/pension-accounts', methods=['GET'])
@jwt_required()
def get_pension_accounts():
    accounts = PensionAccount.query.all()
    return jsonify([account.to_dict() for account in accounts])

@app.route('/api/pension-accounts', methods=['POST'])
@jwt_required()
def create_pension_account():
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['person_id', 'account_name', 'account_type', 'provider']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({'error': f'{field} is required'}), 400
    
    try:
        account = PensionAccount(
            person_id=data['person_id'],
            account_name=data['account_name'],
            account_type=data['account_type'],
            provider=data['provider'],
            account_number=data.get('account_number'),
            current_balance=data.get('current_balance', 0),
            is_active=data.get('is_active', True),
            opened_date=datetime.strptime(data['opened_date'], '%Y-%m-%d').date() if data.get('opened_date') else None,
            notes=data.get('notes')
        )
        
        db.session.add(account)
        db.session.commit()
        return jsonify(account.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/pension-accounts/<int:account_id>', methods=['PUT'])
@jwt_required()
def update_pension_account(account_id):
    account = PensionAccount.query.get_or_404(account_id)
    data = request.get_json()
    
    try:
        account.account_name = data.get('account_name', account.account_name)
        account.account_type = data.get('account_type', account.account_type)
        account.provider = data.get('provider', account.provider)
        account.account_number = data.get('account_number', account.account_number)
        account.current_balance = data.get('current_balance', account.current_balance)
        account.is_active = data.get('is_active', account.is_active)
        account.opened_date = datetime.strptime(data['opened_date'], '%Y-%m-%d').date() if data.get('opened_date') else account.opened_date
        account.notes = data.get('notes', account.notes)
        
        db.session.commit()
        return jsonify(account.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/pension-accounts/<int:account_id>', methods=['DELETE'])
@jwt_required()
def delete_pension_account(account_id):
    account = PensionAccount.query.get_or_404(account_id)
    
    try:
        db.session.delete(account)
        db.session.commit()
        return jsonify({'message': 'Pension account deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ERC API endpoints
@app.route('/api/loans/<int:loan_id>/erc', methods=['GET'])
@jwt_required()
def get_loan_erc_entries(loan_id):
    loan = Loan.query.get_or_404(loan_id)
    erc_entries = LoanERC.query.filter_by(loan_id=loan_id).order_by(LoanERC.start_date).all()
    return jsonify([erc.to_dict() for erc in erc_entries])

@app.route('/api/loans/<int:loan_id>/erc', methods=['POST'])
@jwt_required()
def create_loan_erc_entry(loan_id):
    loan = Loan.query.get_or_404(loan_id)
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['start_date', 'end_date', 'erc_rate']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({'error': f'{field} is required'}), 400
    
    try:
        erc_entry = LoanERC(
            loan_id=loan_id,
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date(),
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date(),
            erc_rate=data['erc_rate'],
            description=data.get('description', '')
        )
        
        db.session.add(erc_entry)
        db.session.commit()
        
        return jsonify(erc_entry.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/erc/<int:erc_id>', methods=['PUT'])
@jwt_required()
def update_loan_erc_entry(erc_id):
    erc_entry = LoanERC.query.get_or_404(erc_id)
    data = request.get_json()
    
    try:
        if 'start_date' in data:
            erc_entry.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        if 'end_date' in data:
            erc_entry.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        if 'erc_rate' in data:
            erc_entry.erc_rate = data['erc_rate']
        if 'description' in data:
            erc_entry.description = data['description']
        erc_entry.updated_at = datetime.utcnow()
        
        db.session.commit()
        return jsonify(erc_entry.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/erc/<int:erc_id>', methods=['DELETE'])
@jwt_required()
def delete_loan_erc_entry(erc_id):
    erc_entry = LoanERC.query.get_or_404(erc_id)
    
    try:
        db.session.delete(erc_entry)
        db.session.commit()
        return jsonify({'message': 'ERC entry deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Loan Payment API endpoints
@app.route('/api/loans/<int:loan_id>/payments', methods=['GET'])
@jwt_required()
def get_loan_payments(loan_id):
    loan = Loan.query.get_or_404(loan_id)
    payments = LoanPayment.query.filter_by(loan_id=loan_id).order_by(LoanPayment.month).all()
    return jsonify([payment.to_dict() for payment in payments])

@app.route('/api/loans/<int:loan_id>/payments', methods=['POST'])
@jwt_required()
def create_loan_payment(loan_id):
    loan = Loan.query.get_or_404(loan_id)
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['month']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({'error': f'{field} is required'}), 400
    
    try:
        payment = LoanPayment(
            loan_id=loan_id,
            month=data['month'],
            actual_payment=data.get('actual_payment'),
            lump_sum_payment=data.get('lump_sum_payment', 0),
            payment_date=datetime.strptime(data['payment_date'], '%Y-%m-%d').date() if data.get('payment_date') else None,
            notes=data.get('notes', '')
        )
        
        db.session.add(payment)
        db.session.commit()
        
        return jsonify(payment.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/payments/<int:payment_id>', methods=['PUT'])
@jwt_required()
def update_loan_payment(payment_id):
    payment = LoanPayment.query.get_or_404(payment_id)
    data = request.get_json()
    
    try:
        if 'actual_payment' in data:
            payment.actual_payment = data['actual_payment']
        if 'lump_sum_payment' in data:
            payment.lump_sum_payment = data['lump_sum_payment']
        if 'payment_date' in data:
            payment.payment_date = datetime.strptime(data['payment_date'], '%Y-%m-%d').date() if data['payment_date'] else None
        if 'notes' in data:
            payment.notes = data['notes']
        payment.updated_at = datetime.utcnow()
        
        db.session.commit()
        return jsonify(payment.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/payments/<int:payment_id>', methods=['DELETE'])
@jwt_required()
def delete_loan_payment(payment_id):
    payment = LoanPayment.query.get_or_404(payment_id)
    
    try:
        db.session.delete(payment)
        db.session.commit()
        return jsonify({'message': 'Payment record deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Bank API Integration endpoints
@app.route('/api/business-accounts/<int:account_id>/refresh-transactions', methods=['POST'])
@jwt_required()
def refresh_account_transactions(account_id):
    """Refresh transactions for a specific business account via Revolut Business API"""
    try:
        account = BusinessAccount.query.get_or_404(account_id)
        
        # Check if account has bank API credentials configured
        if not account.api_credentials:
            return jsonify({
                'success': False,
                'message': 'Bank API credentials not configured for this account'
            }), 400
        
        # Extract API credentials
        api_creds = account.api_credentials
        api_url = api_creds.get('bank_api_url', '')
        access_token = api_creds.get('access_token', '')
        
        if not api_url or not access_token:
            return jsonify({
                'success': False,
                'message': 'Incomplete API credentials. Please check your configuration.'
            }), 400
        
        # Make API call to Revolut Business API
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        # Get transactions from last 30 days
        from_date = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')
        params = {
            'from': from_date,
            'count': 100  # Get up to 100 transactions
        }
        
        response = requests.get(
            f"{api_url}/transactions",
            headers=headers,
            params=params,
            timeout=30
        )
        
        if response.status_code == 200:
            transactions_data = response.json()
            transaction_count = len(transactions_data) if isinstance(transactions_data, list) else 0
            
            # Update account with real data
            account.last_refreshed = datetime.utcnow()
            # Calculate new balance from transactions (simplified)
            if transaction_count > 0:
                total_amount = sum(t.get('amount', 0) for t in transactions_data if isinstance(t, dict))
                account.balance = total_amount  # Simplified balance calculation
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': f'Successfully refreshed {transaction_count} transactions for {account.account_name}',
                'account': account.to_dict(),
                'transactions_count': transaction_count,
                'api_response': transactions_data[:5] if transaction_count > 0 else []  # Return first 5 for preview
            })
        elif response.status_code == 401:
            return jsonify({
                'success': False,
                'message': 'Authentication failed. Please check your access token.'
            }), 401
        else:
            return jsonify({
                'success': False,
                'message': f'API request failed with status {response.status_code}: {response.text}'
            }), response.status_code
            
    except requests.exceptions.Timeout:
        return jsonify({
            'success': False,
            'message': 'API request timed out. Please try again.'
        }), 408
    except requests.exceptions.RequestException as e:
        return jsonify({
            'success': False,
            'message': f'API request failed: {str(e)}'
        }), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to refresh transactions: {str(e)}'
        }), 500

@app.route('/api/business-accounts/refresh-all', methods=['POST'])
@jwt_required()
def refresh_all_accounts():
    """Refresh transactions for all business accounts"""
    try:
        accounts = BusinessAccount.query.filter_by(is_active=True).all()
        
        if not accounts:
            return jsonify({
                'success': False,
                'message': 'No active accounts found'
            }), 400
        
        refreshed_accounts = []
        
        for account in accounts:
            if account.api_credentials:
                # Simulate bank API call for each account
                import time
                time.sleep(1)  # Simulate API call delay
                
                # Update account with mock data
                account.last_refreshed = datetime.utcnow()
                account.balance = account.balance + 50  # Mock balance update
                
                refreshed_accounts.append(account.to_dict())
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully refreshed {len(refreshed_accounts)} accounts',
            'accounts': refreshed_accounts
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to refresh accounts: {str(e)}'
        }), 500

@app.route('/api/business-accounts/<int:account_id>/configure-api', methods=['POST'])
@jwt_required()
def configure_account_api(account_id):
    """Configure bank API credentials for an account"""
    try:
        account = BusinessAccount.query.get_or_404(account_id)
        data = request.get_json()
        
        # Store API credentials (in production, these should be encrypted)
        account.api_credentials = {
            'bank_api_url': data.get('bank_api_url'),
            'client_id': data.get('client_id'),
            'client_secret': data.get('client_secret'),
            'access_token': data.get('access_token'),
            'refresh_token': data.get('refresh_token')
        }
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Bank API credentials configured successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to configure API credentials: {str(e)}'
        }), 500

def _safe_float(value):
    """Safely convert string to float, handling empty strings and non-numeric values"""
    if not value or value == '' or value.strip() == '':
        return None
    try:
        return float(str(value).replace(',', ''))
    except (ValueError, TypeError):
        return None

def _parse_airbnb_ical(ical_url, airbnb_listing_id):
    """Parse Airbnb iCal feed and return booking data with maximum extraction"""
    try:
        response = requests.get(ical_url, timeout=30)
        response.raise_for_status()
        
        cal = Calendar.from_ical(response.content)
        bookings = []
        
        for component in cal.walk():
            if component.name == "VEVENT":
                # Extract all available fields from iCal
                summary = str(component.get('summary', ''))
                uid = str(component.get('uid', ''))
                description = str(component.get('description', ''))
                
                # Get dates and timestamps
                dtstart = component.get('dtstart')
                dtend = component.get('dtend')
                dtstamp = component.get('dtstamp')
                created = component.get('created')
                last_modified = component.get('last-modified')
                
                if not dtstart or not dtend:
                    continue
                
                check_in = dtstart.dt.date() if hasattr(dtstart.dt, 'date') else dtstart.dt
                check_out = dtend.dt.date() if hasattr(dtend.dt, 'date') else dtend.dt
                
                # Calculate nights
                nights = (check_out - check_in).days
                
                # Extract all possible data from description
                reservation_url = None
                phone_last_4 = None
                confirmation_code = None
                guest_name = None
                guest_phone = None
                guest_email = None
                number_of_guests = None
                nightly_rate = None
                cleaning_fee = None
                service_fee = None
                total_amount = None
                cancellation_policy = None
                special_requests = None
                location = None
                organizer = None
                attendee = None
                
                # Extract reservation URL and confirmation code
                url_match = re.search(r'Reservation URL:\s*(https://[^\s\n]+)', description, re.IGNORECASE)
                if url_match:
                    reservation_url = url_match.group(1).strip()
                    # Extract confirmation code from URL
                    code_match = re.search(r'/([A-Z0-9]{10,})(?:\?|$)', reservation_url)
                    if code_match:
                        confirmation_code = code_match.group(1)
                
                # Extract phone number (multiple patterns)
                phone_patterns = [
                    r'Phone Number \(Last 4 Digits\):\s*(\d{4})',
                    r'Phone:\s*(\d{4})',
                    r'Last 4 Digits:\s*(\d{4})',
                    r'Phone Number:\s*.*?(\d{4})',
                    r'Contact:\s*.*?(\d{4})'
                ]
                for pattern in phone_patterns:
                    phone_match = re.search(pattern, description, re.IGNORECASE)
                    if phone_match:
                        phone_last_4 = phone_match.group(1)
                        break
                
                # Extract guest information (multiple patterns)
                guest_patterns = [
                    r'Guest:\s*([^\n]+)',
                    r'Guest Name:\s*([^\n]+)',
                    r'Name:\s*([^\n]+)',
                    r'Booked by:\s*([^\n]+)'
                ]
                for pattern in guest_patterns:
                    guest_match = re.search(pattern, description, re.IGNORECASE)
                    if guest_match:
                        guest_name = guest_match.group(1).strip()
                        break
                
                # Extract number of guests
                guests_patterns = [
                    r'Guests:\s*(\d+)',
                    r'Number of Guests:\s*(\d+)',
                    r'People:\s*(\d+)',
                    r'Adults:\s*(\d+)'
                ]
                for pattern in guests_patterns:
                    guests_match = re.search(pattern, description, re.IGNORECASE)
                    if guests_match:
                        number_of_guests = int(guests_match.group(1))
                        break
                
                # Extract financial information (multiple patterns)
                rate_patterns = [
                    r'Nightly Rate:\s*€?([\d,]+\.?\d*)',
                    r'Rate:\s*€?([\d,]+\.?\d*)',
                    r'Price per Night:\s*€?([\d,]+\.?\d*)',
                    r'Cost:\s*€?([\d,]+\.?\d*)'
                ]
                for pattern in rate_patterns:
                    rate_match = re.search(pattern, description, re.IGNORECASE)
                    if rate_match:
                        nightly_rate = float(rate_match.group(1).replace(',', ''))
                        break
                
                cleaning_patterns = [
                    r'Cleaning Fee:\s*€?([\d,]+\.?\d*)',
                    r'Cleaning:\s*€?([\d,]+\.?\d*)',
                    r'Cleaning Cost:\s*€?([\d,]+\.?\d*)'
                ]
                for pattern in cleaning_patterns:
                    cleaning_match = re.search(pattern, description, re.IGNORECASE)
                    if cleaning_match:
                        cleaning_fee = float(cleaning_match.group(1).replace(',', ''))
                        break
                
                service_patterns = [
                    r'Service Fee:\s*€?([\d,]+\.?\d*)',
                    r'Service:\s*€?([\d,]+\.?\d*)',
                    r'Platform Fee:\s*€?([\d,]+\.?\d*)'
                ]
                for pattern in service_patterns:
                    service_match = re.search(pattern, description, re.IGNORECASE)
                    if service_match:
                        service_fee = float(service_match.group(1).replace(',', ''))
                        break
                
                total_patterns = [
                    r'Total:\s*€?([\d,]+\.?\d*)',
                    r'Total Amount:\s*€?([\d,]+\.?\d*)',
                    r'Grand Total:\s*€?([\d,]+\.?\d*)'
                ]
                for pattern in total_patterns:
                    total_match = re.search(pattern, description, re.IGNORECASE)
                    if total_match:
                        total_amount = float(total_match.group(1).replace(',', ''))
                        break
                
                # Extract cancellation policy
                policy_patterns = [
                    r'Cancellation Policy:\s*([^\n]+)',
                    r'Policy:\s*([^\n]+)',
                    r'Cancel:\s*([^\n]+)'
                ]
                for pattern in policy_patterns:
                    policy_match = re.search(pattern, description, re.IGNORECASE)
                    if policy_match:
                        cancellation_policy = policy_match.group(1).strip()
                        break
                
                # Extract special requests
                requests_patterns = [
                    r'Special Requests:\s*([^\n]+)',
                    r'Requests:\s*([^\n]+)',
                    r'Notes:\s*([^\n]+)',
                    r'Comments:\s*([^\n]+)'
                ]
                for pattern in requests_patterns:
                    requests_match = re.search(pattern, description, re.IGNORECASE)
                    if requests_match:
                        special_requests = requests_match.group(1).strip()
                        break
                
                # Extract location if available
                location = str(component.get('location', '')) if component.get('location') else None
                
                # Extract organizer and attendee info
                organizer = str(component.get('organizer', '')) if component.get('organizer') else None
                attendee = str(component.get('attendee', '')) if component.get('attendee') else None
                
                # Process timestamps
                dtstamp_dt = None
                if dtstamp:
                    dtstamp_dt = dtstamp.dt if hasattr(dtstamp.dt, 'date') else dtstamp.dt
                
                created_dt = None
                if created:
                    created_dt = created.dt if hasattr(created.dt, 'date') else created.dt
                
                last_modified_dt = None
                if last_modified:
                    last_modified_dt = last_modified.dt if hasattr(last_modified.dt, 'date') else last_modified.dt
                
                # Determine status based on summary and other indicators
                status = 'reserved'
                if 'confirmed' in summary.lower():
                    status = 'confirmed'
                elif 'blocked' in summary.lower() or 'not available' in summary.lower():
                    status = 'blocked'
                elif 'cancelled' in summary.lower():
                    status = 'cancelled'
                elif 'completed' in summary.lower():
                    status = 'completed'
                
                # Calculate estimated income if we have financial data
                estimated_income = None
                if nightly_rate and nights:
                    estimated_income = nightly_rate * nights
                    if cleaning_fee:
                        estimated_income += cleaning_fee
                    if service_fee:
                        estimated_income -= service_fee  # Service fee is typically deducted
                
                booking = {
                    'listing_id': airbnb_listing_id,
                    'booking_uid': uid,
                    'reservation_url': reservation_url,
                    'phone_last_4': phone_last_4,
                    'check_in_date': check_in,
                    'check_out_date': check_out,
                    'nights': nights,
                    'status': status,
                    'estimated_income': estimated_income,
                    
                    # Additional iCal data
                    'summary': summary,
                    'description': description,
                    'dtstamp': dtstamp_dt,
                    'confirmation_code': confirmation_code,
                    'location': location,
                    'organizer': organizer,
                    'attendee': attendee,
                    'created': created_dt,
                    'last_modified': last_modified_dt,
                    
                    # Guest information
                    'guest_name': guest_name,
                    'guest_phone': guest_phone,
                    'guest_email': guest_email,
                    'number_of_guests': number_of_guests,
                    
                    # Financial details
                    'nightly_rate': nightly_rate,
                    'cleaning_fee': cleaning_fee,
                    'service_fee': service_fee,
                    'total_amount': total_amount,
                    
                    # Additional metadata
                    'booking_source': 'airbnb',
                    'cancellation_policy': cancellation_policy,
                    'special_requests': special_requests
                }
                
                bookings.append(booking)
        
        return bookings
        
    except Exception as e:
        print(f"Error parsing iCal feed: {str(e)}")
        return []

def _parse_vrbo_ical(ical_url, listing_id):
    """Parse VRBO iCal feed and return booking data with maximum extraction"""
    try:
        response = requests.get(ical_url, timeout=30)
        response.raise_for_status()
        
        cal = Calendar.from_ical(response.content)
        bookings = []
        
        for component in cal.walk():
            if component.name == "VEVENT":
                # Extract all available fields from iCal
                summary = str(component.get('summary', ''))
                uid = str(component.get('uid', ''))
                description = str(component.get('description', ''))
                
                # Get dates and timestamps
                dtstart = component.get('dtstart')
                dtend = component.get('dtend')
                dtstamp = component.get('dtstamp')
                created = component.get('created')
                last_modified = component.get('last-modified')
                
                if not dtstart or not dtend:
                    continue
                
                check_in = dtstart.dt.date() if hasattr(dtstart.dt, 'date') else dtstart.dt
                check_out = dtend.dt.date() if hasattr(dtend.dt, 'date') else dtend.dt
                
                # Calculate nights
                nights = (check_out - check_in).days
                
                # Extract all possible data from description
                reservation_url = None
                phone_last_4 = None
                confirmation_code = None
                guest_name = None
                guest_phone = None
                guest_email = None
                number_of_guests = None
                nightly_rate = None
                cleaning_fee = None
                service_fee = None
                total_amount = None
                cancellation_policy = None
                special_requests = None
                location = None
                organizer = None
                attendee = None
                
                # Extract reservation URL and confirmation code
                url_match = re.search(r'Reservation URL:\s*(https://[^\s\n]+)', description, re.IGNORECASE)
                if url_match:
                    reservation_url = url_match.group(1).strip()
                    # Extract confirmation code from URL
                    code_match = re.search(r'/([A-Z0-9]{10,})(?:\?|$)', reservation_url)
                    if code_match:
                        confirmation_code = code_match.group(1)
                
                # Extract phone number (VRBO patterns)
                phone_patterns = [
                    r'Phone Number \(Last 4 Digits\):\s*(\d{4})',
                    r'Phone:\s*(\d{4})',
                    r'Last 4 Digits:\s*(\d{4})',
                    r'Contact:\s*.*?(\d{4})',
                    r'Guest Phone:\s*.*?(\d{4})'
                ]
                for pattern in phone_patterns:
                    phone_match = re.search(pattern, description, re.IGNORECASE)
                    if phone_match:
                        phone_last_4 = phone_match.group(1)
                        break
                
                # Extract guest information (VRBO patterns)
                guest_patterns = [
                    r'Guest:\s*([^\n]+)',
                    r'Guest Name:\s*([^\n]+)',
                    r'Name:\s*([^\n]+)',
                    r'Booked by:\s*([^\n]+)',
                    r'Traveler:\s*([^\n]+)'
                ]
                for pattern in guest_patterns:
                    guest_match = re.search(pattern, description, re.IGNORECASE)
                    if guest_match:
                        guest_name = guest_match.group(1).strip()
                        break
                
                # Extract number of guests
                guests_patterns = [
                    r'Guests:\s*(\d+)',
                    r'Number of Guests:\s*(\d+)',
                    r'People:\s*(\d+)',
                    r'Adults:\s*(\d+)',
                    r'Travelers:\s*(\d+)'
                ]
                for pattern in guests_patterns:
                    guests_match = re.search(pattern, description, re.IGNORECASE)
                    if guests_match:
                        number_of_guests = int(guests_match.group(1))
                        break
                
                # Extract financial information (VRBO patterns)
                rate_patterns = [
                    r'Nightly Rate:\s*\$?([\d,]+\.?\d*)',
                    r'Rate:\s*\$?([\d,]+\.?\d*)',
                    r'Price per Night:\s*\$?([\d,]+\.?\d*)',
                    r'Cost:\s*\$?([\d,]+\.?\d*)',
                    r'Rental Rate:\s*\$?([\d,]+\.?\d*)'
                ]
                for pattern in rate_patterns:
                    rate_match = re.search(pattern, description, re.IGNORECASE)
                    if rate_match:
                        nightly_rate = float(rate_match.group(1).replace(',', ''))
                        break
                
                cleaning_patterns = [
                    r'Cleaning Fee:\s*\$?([\d,]+\.?\d*)',
                    r'Cleaning:\s*\$?([\d,]+\.?\d*)',
                    r'Cleaning Cost:\s*\$?([\d,]+\.?\d*)',
                    r'Housekeeping:\s*\$?([\d,]+\.?\d*)'
                ]
                for pattern in cleaning_patterns:
                    cleaning_match = re.search(pattern, description, re.IGNORECASE)
                    if cleaning_match:
                        cleaning_fee = float(cleaning_match.group(1).replace(',', ''))
                        break
                
                service_patterns = [
                    r'Service Fee:\s*\$?([\d,]+\.?\d*)',
                    r'Service:\s*\$?([\d,]+\.?\d*)',
                    r'Platform Fee:\s*\$?([\d,]+\.?\d*)',
                    r'Booking Fee:\s*\$?([\d,]+\.?\d*)'
                ]
                for pattern in service_patterns:
                    service_match = re.search(pattern, description, re.IGNORECASE)
                    if service_match:
                        service_fee = float(service_match.group(1).replace(',', ''))
                        break
                
                total_patterns = [
                    r'Total:\s*\$?([\d,]+\.?\d*)',
                    r'Total Amount:\s*\$?([\d,]+\.?\d*)',
                    r'Grand Total:\s*\$?([\d,]+\.?\d*)',
                    r'Total Cost:\s*\$?([\d,]+\.?\d*)'
                ]
                for pattern in total_patterns:
                    total_match = re.search(pattern, description, re.IGNORECASE)
                    if total_match:
                        total_amount = float(total_match.group(1).replace(',', ''))
                        break
                
                # Extract cancellation policy
                policy_patterns = [
                    r'Cancellation Policy:\s*([^\n]+)',
                    r'Policy:\s*([^\n]+)',
                    r'Cancel:\s*([^\n]+)',
                    r'Refund Policy:\s*([^\n]+)'
                ]
                for pattern in policy_patterns:
                    policy_match = re.search(pattern, description, re.IGNORECASE)
                    if policy_match:
                        cancellation_policy = policy_match.group(1).strip()
                        break
                
                # Extract special requests
                requests_patterns = [
                    r'Special Requests:\s*([^\n]+)',
                    r'Requests:\s*([^\n]+)',
                    r'Notes:\s*([^\n]+)',
                    r'Comments:\s*([^\n]+)',
                    r'Message:\s*([^\n]+)'
                ]
                for pattern in requests_patterns:
                    requests_match = re.search(pattern, description, re.IGNORECASE)
                    if requests_match:
                        special_requests = requests_match.group(1).strip()
                        break
                
                # Extract location if available
                location = str(component.get('location', '')) if component.get('location') else None
                
                # Extract organizer and attendee info
                organizer = str(component.get('organizer', '')) if component.get('organizer') else None
                attendee = str(component.get('attendee', '')) if component.get('attendee') else None
                
                # Process timestamps
                dtstamp_dt = None
                if dtstamp:
                    dtstamp_dt = dtstamp.dt if hasattr(dtstamp.dt, 'date') else dtstamp.dt
                
                created_dt = None
                if created:
                    created_dt = created.dt if hasattr(created.dt, 'date') else created.dt
                
                last_modified_dt = None
                if last_modified:
                    last_modified_dt = last_modified.dt if hasattr(last_modified.dt, 'date') else last_modified.dt
                
                # Determine status based on summary and other indicators
                status = 'reserved'
                if 'confirmed' in summary.lower():
                    status = 'confirmed'
                elif 'blocked' in summary.lower() or 'not available' in summary.lower():
                    status = 'blocked'
                elif 'cancelled' in summary.lower():
                    status = 'cancelled'
                elif 'completed' in summary.lower():
                    status = 'completed'
                elif 'booked' in summary.lower():
                    status = 'booked'
                
                # Calculate estimated income if we have financial data
                estimated_income = None
                if nightly_rate and nights:
                    estimated_income = nightly_rate * nights
                    if cleaning_fee:
                        estimated_income += cleaning_fee
                    if service_fee:
                        estimated_income -= service_fee  # Service fee is typically deducted
                
                booking = {
                    'listing_id': airbnb_listing_id,
                    'booking_uid': uid,
                    'reservation_url': reservation_url,
                    'phone_last_4': phone_last_4,
                    'check_in_date': check_in,
                    'check_out_date': check_out,
                    'nights': nights,
                    'status': status,
                    'estimated_income': estimated_income,
                    
                    # Additional iCal data
                    'summary': summary,
                    'description': description,
                    'dtstamp': dtstamp_dt,
                    'confirmation_code': confirmation_code,
                    'location': location,
                    'organizer': organizer,
                    'attendee': attendee,
                    'created': created_dt,
                    'last_modified': last_modified_dt,
                    
                    # Guest information
                    'guest_name': guest_name,
                    'guest_phone': guest_phone,
                    'guest_email': guest_email,
                    'number_of_guests': number_of_guests,
                    
                    # Financial details
                    'nightly_rate': nightly_rate,
                    'cleaning_fee': cleaning_fee,
                    'service_fee': service_fee,
                    'total_amount': total_amount,
                    
                    # Additional metadata
                    'booking_source': 'vrbo',
                    'cancellation_policy': cancellation_policy,
                    'special_requests': special_requests
                }
                
                bookings.append(booking)
        
        return bookings
        
    except Exception as e:
        print(f"Error parsing VRBO iCal feed: {str(e)}")
        return []

def _detect_transaction_warnings(transaction, all_transactions):
    """Detect warnings for a transaction based on patterns and anomalies"""
    warnings = []
    
    # Check for duplicates based on ID, date, amount, and description
    if transaction.transaction_id:
        duplicate_count = sum(1 for t in all_transactions 
                            if t.transaction_id == transaction.transaction_id and t.id != transaction.id)
        if duplicate_count > 0:
            warnings.append("Duplicate ID")
    
    # Check for duplicate based on date, amount, and description
    duplicate_pattern = sum(1 for t in all_transactions 
                          if (t.transaction_date == transaction.transaction_date and 
                              t.amount == transaction.amount and 
                              t.description == transaction.description and 
                              t.id != transaction.id))
    if duplicate_pattern > 0:
        warnings.append("Duplicate Pattern")
    
    # Check for unusual amounts
    if transaction.amount:
        if abs(transaction.amount) > 50000:  # Very large transaction
            warnings.append("Large Amount")
        elif abs(transaction.amount) < 0.01:  # Very small transaction
            warnings.append("Micro Amount")
    
    # Check for suspicious patterns
    if transaction.description:
        desc_lower = transaction.description.lower()
        
        # Check for test transactions
        if any(word in desc_lower for word in ['test', 'testing', 'sample', 'demo']):
            warnings.append("Test Transaction")
        
        # Check for suspicious merchants
        if any(word in desc_lower for word in ['casino', 'gambling', 'bet', 'poker']):
            warnings.append("Gambling")
        
        # Check for crypto-related
        if any(word in desc_lower for word in ['bitcoin', 'crypto', 'cryptocurrency', 'btc', 'eth']):
            warnings.append("Crypto")
    
    # Check for unusual timing (transactions outside business hours)
    if transaction.transaction_date:
        # This is a simplified check - in reality you'd check the actual time
        # For now, we'll just flag weekend transactions as potentially unusual
        weekday = transaction.transaction_date.weekday()
        if weekday >= 5:  # Saturday = 5, Sunday = 6
            warnings.append("Weekend")
    
    # Check for currency mismatches
    if transaction.orig_currency and transaction.payment_currency:
        if transaction.orig_currency != transaction.payment_currency and not transaction.exchange_rate:
            warnings.append("Currency Mismatch")
    
    # Check for missing critical data
    if not transaction.transaction_id and not transaction.reference:
        warnings.append("No Reference")
    
    if not transaction.description or transaction.description.strip() == '':
        warnings.append("No Description")
    
    # Check for round amounts (might indicate test or suspicious activity)
    if transaction.amount and transaction.amount % 100 == 0 and abs(transaction.amount) > 1000:
        warnings.append("Round Amount")
    
    return warnings

def _parse_datetime(value):
    """Safely parse datetime string, handling empty strings and various formats"""
    if not value or value == '' or value.strip() == '':
        return None
    try:
        # Try different datetime formats
        datetime_formats = [
            '%Y-%m-%d %H:%M:%S',  # 2025-09-09 14:30:00
            '%Y-%m-%d',           # 2025-09-09
            '%d/%m/%Y %H:%M:%S',  # 09/09/2025 14:30:00
            '%d/%m/%Y',           # 09/09/2025
            '%Y-%m-%dT%H:%M:%S',  # 2025-09-09T14:30:00
            '%Y-%m-%dT%H:%M:%SZ', # 2025-09-09T14:30:00Z
        ]
        
        for fmt in datetime_formats:
            try:
                return datetime.strptime(str(value).strip(), fmt)
            except ValueError:
                continue
        return None
    except (ValueError, TypeError):
        return None

@app.route('/api/business-accounts/<int:account_id>/import-csv', methods=['POST'])
@jwt_required()
def import_csv_transactions(account_id):
    """Import bank transactions from CSV file"""
    try:
        account = BusinessAccount.query.get_or_404(account_id)
        
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No file uploaded'
            }), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
        
        if not file.filename.lower().endswith('.csv'):
            return jsonify({
                'success': False,
                'message': 'File must be a CSV file'
            }), 400
        
        # Read CSV content
        csv_content = file.read().decode('utf-8')
        
        # Detect if it's tab-separated (common in bank exports)
        if '\t' in csv_content.split('\n')[0]:
            delimiter = '\t'
        else:
            delimiter = ','
        
        csv_reader = csv.DictReader(io.StringIO(csv_content), delimiter=delimiter)
        
        # Expected CSV columns (flexible mapping) - Enhanced for Revolut, AIB, and other banks
        expected_columns = {
            'date': ['date', 'transaction_date', 'Date', 'Transaction Date', 'Transaction date', 'Date completed', 'Completed date', 'Date completed (Europe/Dublin)', 'Date completed (UTC)', 'Posted Transactions Date'],
            'description': ['description', 'Description', 'Transaction Description', 'Narrative', 'Transaction details', 'Details', 'Payee', 'Merchant', 'Description1', 'Description2', 'Description3'],
            'amount': ['amount', 'Amount', 'Transaction Amount', 'Value', 'Paid out', 'Paid in', 'Money out', 'Money in', 'Out', 'In', 'Total amount', 'Debit Amount', 'Credit Amount', 'Local Currency Amount'],
            'balance': ['balance', 'Balance', 'Running Balance', 'Account balance', 'Balance after'],
            'reference': ['reference', 'Reference', 'Transaction Reference', 'Ref', 'Reference number', 'Transaction reference'],
            'type': ['type', 'Type', 'Transaction Type', 'Category', 'Category name', 'Transaction category']
        }
        
        # Revolut specific column mappings
        revolut_columns = {
            'date_started_utc': 'Date started (UTC)',
            'date_completed_utc': 'Date completed (UTC)',
            'date_started_dublin': 'Date started (Europe/Dublin)',
            'date_completed_dublin': 'Date completed (Europe/Dublin)',
            'transaction_id': 'ID',
            'state': 'State',
            'payer': 'Payer',
            'card_number': 'Card number',
            'card_label': 'Card label',
            'card_state': 'Card state',
            'orig_currency': 'Orig currency',
            'orig_amount': 'Orig amount',
            'payment_currency': 'Payment currency',
            'total_amount': 'Total amount',
            'exchange_rate': 'Exchange rate',
            'fee': 'Fee',
            'fee_currency': 'Fee currency',
            'account': 'Account',
            'beneficiary_account_number': 'Beneficiary account number',
            'beneficiary_sort_code': 'Beneficiary sort code or routing number',
            'beneficiary_iban': 'Beneficiary IBAN',
            'beneficiary_bic': 'Beneficiary BIC',
            'mcc': 'MCC',
            'related_transaction_id': 'Related transaction id',
            'spend_program': 'Spend program'
        }
        
        # AIB specific column mappings
        aib_columns = {
            'posted_account': 'Posted Account',
            'posted_transactions_date': 'Posted Transactions Date',
            'description1': 'Description1',
            'description2': 'Description2',
            'description3': 'Description3',
            'debit_amount': 'Debit Amount',
            'credit_amount': 'Credit Amount',
            'posted_currency': 'Posted Currency',
            'transaction_type': 'Transaction Type',
            'local_currency_amount': 'Local Currency Amount',
            'local_currency': 'Local Currency'
        }
        
        # Find column mappings
        original_headers = csv_reader.fieldnames
        # Trim whitespace from headers
        headers = [header.strip() for header in original_headers]
        # Create mapping from trimmed to original headers
        header_mapping = {trimmed: original for trimmed, original in zip(headers, original_headers)}
        column_mapping = {}
        
        for field, possible_names in expected_columns.items():
            for header in headers:
                if header.lower() in [name.lower() for name in possible_names]:
                    column_mapping[field] = header  # Use trimmed header
                    break
        
        # Special handling for AIB multiple description columns
        if 'Description1' in headers and 'description' not in column_mapping:
            # Check if we have Description1, Description2, Description3
            desc_columns = []
            for i in range(1, 4):  # Check Description1, Description2, Description3
                if f'Description{i}' in headers:
                    desc_columns.append(f'Description{i}')
            
            if desc_columns:
                column_mapping['description'] = desc_columns  # Store as list for special handling
        
        # Also map Revolut specific columns
        revolut_mapping = {}
        for field, column_name in revolut_columns.items():
            if column_name in headers:
                revolut_mapping[field] = column_name
        
        # Also map AIB specific columns
        aib_mapping = {}
        for field, column_name in aib_columns.items():
            if column_name in headers:
                aib_mapping[field] = column_name
        
        # Validate required columns
        required_columns = ['date', 'description', 'amount']
        missing_columns = [col for col in required_columns if col not in column_mapping]
        
        if missing_columns:
            return jsonify({
                'success': False,
                'message': f'Missing required columns: {", ".join(missing_columns)}. Available columns: {", ".join(headers)}'
            }), 400
        
        # Process transactions
        imported_count = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 because row 1 is header
            try:
                # Parse transaction date
                original_date_header = header_mapping[column_mapping['date']]
                date_str = row[original_date_header].strip()
                try:
                    # Try different date formats - Enhanced for Revolut and international formats
                    date_formats = [
                        '%Y-%m-%d',      # 2025-01-10
                        '%d/%m/%Y',      # 10/01/2025
                        '%m/%d/%Y',      # 01/10/2025
                        '%d-%m-%Y',      # 10-01-2025
                        '%Y/%m/%d',      # 2025/01/10
                        '%d.%m.%Y',      # 10.01.2025
                        '%d %b %Y',      # 10 Jan 2025
                        '%d %B %Y',      # 10 January 2025
                        '%b %d, %Y',     # Jan 10, 2025
                        '%B %d, %Y',     # January 10, 2025
                        '%Y-%m-%d %H:%M:%S',  # 2025-01-10 14:30:00
                        '%d/%m/%Y %H:%M:%S',  # 10/01/2025 14:30:00
                    ]
                    
                    for date_format in date_formats:
                        try:
                            transaction_date = datetime.strptime(date_str, date_format).date()
                            break
                        except ValueError:
                            continue
                    else:
                        raise ValueError(f"Unable to parse date: {date_str}")
                except ValueError as e:
                    errors.append(f"Row {row_num}: {str(e)}")
                    continue
                
                # Parse amount - handle different bank formats
                amount = 0.0
                if 'amount' in column_mapping:
                    # Standard amount column
                    original_amount_header = header_mapping[column_mapping['amount']]
                    amount_str = row[original_amount_header].strip().replace(',', '')
                    try:
                        amount = float(amount_str) if amount_str else 0.0
                    except ValueError:
                        errors.append(f"Row {row_num}: Invalid amount format: {amount_str}")
                        continue
                elif 'Debit Amount' in headers and 'Credit Amount' in headers:
                    # AIB format: separate Debit Amount and Credit Amount columns
                    debit_amount = 0.0
                    credit_amount = 0.0
                    
                    try:
                        debit_str = row['Debit Amount'].strip().replace(',', '')
                        debit_amount = float(debit_str) if debit_str else 0.0
                    except ValueError:
                        pass
                    
                    try:
                        credit_str = row['Credit Amount'].strip().replace(',', '')
                        credit_amount = float(credit_str) if credit_str else 0.0
                    except ValueError:
                        pass
                    
                    amount = credit_amount - debit_amount  # Positive for credits, negative for debits
                else:
                    # Try to find separate "Paid out" and "Paid in" columns (Revolut format)
                    paid_out = 0.0
                    paid_in = 0.0
                    
                    for header in headers:
                        if header.lower() in ['paid out', 'money out', 'out']:
                            try:
                                paid_out_str = row[header].strip().replace(',', '')
                                paid_out = float(paid_out_str) if paid_out_str else 0.0
                            except ValueError:
                                pass
                        elif header.lower() in ['paid in', 'money in', 'in']:
                            try:
                                paid_in_str = row[header].strip().replace(',', '')
                                paid_in = float(paid_in_str) if paid_in_str else 0.0
                            except ValueError:
                                pass
                    
                    amount = paid_in - paid_out  # Positive for money in, negative for money out
                
                # Get other fields
                if 'Description1' in headers and 'Description2' in headers and 'Description3' in headers:
                    # AIB format: combine multiple description columns
                    desc1 = row.get(' Description1', '').strip()  # Use original header with space
                    desc2 = row.get(' Description2', '').strip()  # Use original header with space
                    desc3 = row.get(' Description3', '').strip()  # Use original header with space
                    description = ' '.join([d for d in [desc1, desc2, desc3] if d])
                elif isinstance(column_mapping.get('description'), list):
                    # Handle case where description is mapped to multiple columns
                    desc_parts = []
                    for desc_col in column_mapping['description']:
                        original_desc_col = header_mapping[desc_col]
                        desc_part = row.get(original_desc_col, '').strip()
                        if desc_part:
                            desc_parts.append(desc_part)
                    description = ' '.join(desc_parts)
                else:
                    original_desc_header = header_mapping[column_mapping['description']]
                    description = row[original_desc_header].strip()
                balance = None
                if 'balance' in column_mapping:
                    original_balance_header = header_mapping[column_mapping['balance']]
                    balance_str = row[original_balance_header].strip().replace(',', '')
                    try:
                        balance = float(balance_str) if balance_str else None
                    except ValueError:
                        pass  # Balance is optional
                
                reference = None
                if 'reference' in column_mapping:
                    original_ref_header = header_mapping[column_mapping['reference']]
                    reference = row[original_ref_header].strip() or None
                
                transaction_type = None
                if 'type' in column_mapping:
                    original_type_header = header_mapping[column_mapping['type']]
                    transaction_type = row[original_type_header].strip() or None
                elif 'Transaction Type' in headers:
                    transaction_type = row['Transaction Type'].strip() or None
                
                # Create transaction record with ALL Revolut data
                transaction = BankTransaction(
                    business_account_id=account_id,
                    transaction_date=transaction_date,
                    description=description,
                    amount=amount,
                    balance=balance,
                    reference=reference,
                    transaction_type=transaction_type,
                    
                    # Revolut specific fields - use mapped column names
                    date_started_utc=_parse_datetime(row.get(revolut_mapping.get('date_started_utc', ''))),
                    date_completed_utc=_parse_datetime(row.get(revolut_mapping.get('date_completed_utc', ''))),
                    date_started_dublin=_parse_datetime(row.get(revolut_mapping.get('date_started_dublin', ''))),
                    date_completed_dublin=_parse_datetime(row.get(revolut_mapping.get('date_completed_dublin', ''))),
                    transaction_id=row.get(revolut_mapping.get('transaction_id', ''), '').strip() if row.get(revolut_mapping.get('transaction_id', '')) else None,
                    state=row.get(revolut_mapping.get('state', ''), '').strip() if row.get(revolut_mapping.get('state', '')) else None,
                    payer=row.get(revolut_mapping.get('payer', ''), '').strip() if row.get(revolut_mapping.get('payer', '')) else None,
                    card_number=row.get(revolut_mapping.get('card_number', ''), '').strip() if row.get(revolut_mapping.get('card_number', '')) else None,
                    card_label=row.get(revolut_mapping.get('card_label', ''), '').strip() if row.get(revolut_mapping.get('card_label', '')) else None,
                    card_state=row.get(revolut_mapping.get('card_state', ''), '').strip() if row.get(revolut_mapping.get('card_state', '')) else None,
                    orig_currency=row.get(revolut_mapping.get('orig_currency', ''), '').strip() if row.get(revolut_mapping.get('orig_currency', '')) else None,
                    orig_amount=_safe_float(row.get(revolut_mapping.get('orig_amount', ''))),
                    # Use AIB data if available, otherwise use Revolut data
                    account=row.get(aib_mapping.get('posted_account', ''), '').strip() if row.get(aib_mapping.get('posted_account', '')) else (row.get(revolut_mapping.get('account', ''), '').strip() if row.get(revolut_mapping.get('account', '')) else None),
                    payment_currency=row.get(aib_mapping.get('posted_currency', ''), '').strip() if row.get(aib_mapping.get('posted_currency', '')) else (row.get(revolut_mapping.get('payment_currency', ''), '').strip() if row.get(revolut_mapping.get('payment_currency', '')) else None),
                    total_amount=_safe_float(row.get(aib_mapping.get('local_currency_amount', ''))) if aib_mapping.get('local_currency_amount') else _safe_float(row.get(revolut_mapping.get('total_amount', ''))),
                    exchange_rate=_safe_float(row.get(revolut_mapping.get('exchange_rate', ''))),
                    fee=_safe_float(row.get(revolut_mapping.get('fee', ''))),
                    fee_currency=row.get(revolut_mapping.get('fee_currency', ''), '').strip() if row.get(revolut_mapping.get('fee_currency', '')) else None,
                    beneficiary_account_number=row.get(revolut_mapping.get('beneficiary_account_number', ''), '').strip() if row.get(revolut_mapping.get('beneficiary_account_number', '')) else None,
                    beneficiary_sort_code=row.get(revolut_mapping.get('beneficiary_sort_code', ''), '').strip() if row.get(revolut_mapping.get('beneficiary_sort_code', '')) else None,
                    beneficiary_iban=row.get(revolut_mapping.get('beneficiary_iban', ''), '').strip() if row.get(revolut_mapping.get('beneficiary_iban', '')) else None,
                    beneficiary_bic=row.get(revolut_mapping.get('beneficiary_bic', ''), '').strip() if row.get(revolut_mapping.get('beneficiary_bic', '')) else None,
                    mcc=row.get(revolut_mapping.get('mcc', ''), '').strip() if row.get(revolut_mapping.get('mcc', '')) else None,
                    related_transaction_id=row.get(revolut_mapping.get('related_transaction_id', ''), '').strip() if row.get(revolut_mapping.get('related_transaction_id', '')) else None,
                    spend_program=row.get(revolut_mapping.get('spend_program', ''), '').strip() if row.get(revolut_mapping.get('spend_program', '')) else None
                )
                
                db.session.add(transaction)
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
                continue
        
        # Save the original file content to the account record
        file.seek(0)  # Reset file pointer
        file_content = file.read()
        
        # Update account with file information
        account.last_imported_file_name = file.filename
        account.last_imported_file_content = file_content
        account.last_imported_file_size = len(file_content)
        account.last_imported_at = datetime.utcnow()
        
        # Commit all transactions and file data
        db.session.commit()
        
        # Update account balance if we have balance data
        if imported_count > 0:
            # Find the latest transaction with a balance
            latest_transaction = BankTransaction.query.filter_by(
                business_account_id=account_id
            ).filter(BankTransaction.balance.isnot(None)).order_by(
                BankTransaction.transaction_date.desc()
            ).first()
            
            if latest_transaction and latest_transaction.balance is not None:
                account.balance = latest_transaction.balance
                db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully imported {imported_count} transactions',
            'imported_count': imported_count,
            'errors': errors[:10],  # Return first 10 errors
            'total_errors': len(errors),
            'file_saved': True,
            'file_name': file.filename,
            'file_size': len(file_content)
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to import CSV: {str(e)}'
        }), 500

@app.route('/api/business-accounts/<int:account_id>/download-csv', methods=['GET'])
@jwt_required()
def download_business_account_csv(account_id):
    """Download the original CSV file for a business account"""
    try:
        account = BusinessAccount.query.get_or_404(account_id)
        
        if not account.last_imported_file_content:
            return jsonify({'error': 'No CSV file found for this account'}), 404
        
        return Response(
            account.last_imported_file_content,
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename="{account.last_imported_file_name}"'
            }
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files', methods=['GET'])
@jwt_required()
def get_all_files():
    """Get all uploaded files in the system"""
    try:
        current_user_id = get_jwt_identity()
        
        files_list = []
        
        # Get all tax return files
        tax_returns = TaxReturn.query.filter_by(user_id=current_user_id).all()
        for tr in tax_returns:
            files_list.append({
                'id': f'tax_return_{tr.id}',
                'type': 'tax_return',
                'name': tr.filename,
                'size': tr.file_size,
                'uploaded_at': tr.uploaded_at.isoformat() if tr.uploaded_at else None,
                'year': tr.year,
                'transaction_count': tr.transaction_count,
                'download_url': f'/api/tax-returns/{tr.id}/download',
                'view_data_url': f'/api/tax-returns/{tr.id}/data'
            })
        
        # Get all business account CSV files
        try:
            # Try to get business accounts with user_id if the field exists
            business_accounts = BusinessAccount.query.filter_by(user_id=current_user_id).all()
        except:
            # Fallback: get all business accounts if user_id field doesn't exist
            business_accounts = BusinessAccount.query.all()
        
        for ba in business_accounts:
            if ba.last_imported_file_name and ba.last_imported_file_content:
                files_list.append({
                    'id': f'business_account_{ba.id}',
                    'type': 'bank_csv',
                    'name': ba.last_imported_file_name,
                    'size': ba.last_imported_file_size,
                    'uploaded_at': ba.last_imported_at.isoformat() if ba.last_imported_at else None,
                    'account_name': ba.account_name,
                    'bank_name': ba.bank_name,
                    'company_name': ba.company_name,
                    'download_url': f'/api/business-accounts/{ba.id}/download-csv',
                    'view_transactions_url': f'/api/business-accounts/{ba.id}/transactions'
                })
        
        # Sort files by upload date (newest first)
        files_list.sort(key=lambda x: x['uploaded_at'] or '', reverse=True)
        
        return jsonify({
            'files': files_list,
            'total_count': len(files_list),
            'tax_returns_count': len([f for f in files_list if f['type'] == 'tax_return']),
            'bank_csvs_count': len([f for f in files_list if f['type'] == 'bank_csv'])
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/business-accounts/<int:account_id>/transactions', methods=['GET'])
@jwt_required()
def get_account_transactions(account_id):
    """Get all transactions for a specific business account"""
    try:
        account = BusinessAccount.query.get_or_404(account_id)
        transactions = BankTransaction.query.filter_by(business_account_id=account_id).order_by(BankTransaction.transaction_date.desc()).all()
        
        # Add warnings to each transaction
        transactions_with_warnings = []
        for transaction in transactions:
            transaction_dict = transaction.to_dict()
            warnings = _detect_transaction_warnings(transaction, transactions)
            transaction_dict['warnings'] = warnings
            transactions_with_warnings.append(transaction_dict)
        
        # Calculate current balance from last transaction
        current_balance = None
        if transactions:
            # Get the most recent transaction with a balance
            last_transaction_with_balance = next(
                (t for t in transactions if t.balance is not None), 
                None
            )
            if last_transaction_with_balance:
                current_balance = last_transaction_with_balance.balance
        
        # Create account dict with calculated balance
        account_dict = account.to_dict()
        account_dict['balance'] = current_balance if current_balance is not None else 0.0
        account_dict['balance_source'] = 'calculated_from_transactions' if current_balance is not None else 'no_transactions'
        
        # Add balance date
        if last_transaction_with_balance:
            account_dict['balance_date'] = last_transaction_with_balance.transaction_date.isoformat()
        else:
            account_dict['balance_date'] = None
        
        return jsonify({
            'success': True,
            'account': account_dict,
            'transactions': transactions_with_warnings,
            'count': len(transactions)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch transactions: {str(e)}'
        }), 500

# User Management API
@app.route('/api/users', methods=['POST'])
@jwt_required()
def create_user():
    """Create a new user (admin only)"""
    try:
        current_user_username = get_jwt_identity()
        current_user = User.query.filter_by(username=current_user_username).first()
        
        if not current_user or current_user.role != 'admin':
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'user')
        
        if not email or not password:
            return jsonify({
                'success': False,
                'message': 'Email and password are required'
            }), 400
        
        # Check if user already exists
        if User.query.filter_by(email=email).first():
            return jsonify({
                'success': False,
                'message': 'User with this email already exists'
            }), 400
        
        # Create new user
        new_user = User(
            username=email.split('@')[0],  # Use email prefix as username
            email=email,
            role=role
        )
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'User created successfully',
            'user': new_user.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to create user: {str(e)}'
        }), 500

@app.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    """Get all users (admin only)"""
    try:
        current_user_username = get_jwt_identity()
        current_user = User.query.filter_by(username=current_user_username).first()
        
        if not current_user or current_user.role != 'admin':
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        
        users = User.query.all()
        return jsonify({
            'success': True,
            'users': [user.to_dict() for user in users]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch users: {str(e)}'
        }), 500

@app.route('/api/users/<int:user_id>/reset-password', methods=['POST'])
@jwt_required()
def reset_user_password(user_id):
    """Reset password for a user (admin only)"""
    try:
        current_user_username = get_jwt_identity()
        current_user = User.query.filter_by(username=current_user_username).first()
        
        if not current_user or current_user.role != 'admin':
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        
        data = request.get_json()
        new_password = data.get('password')
        
        if not new_password:
            return jsonify({
                'success': False,
                'message': 'New password is required'
            }), 400
        
        # Find the user to reset
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Update the password
        target_user.set_password(new_password)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Password reset successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to reset password: {str(e)}'
        }), 500

# Dashboard Settings API
@app.route('/api/dashboard-settings/<int:user_id>', methods=['GET'])
@jwt_required()
def get_dashboard_settings(user_id):
    """Get dashboard settings for a user (admin only)"""
    try:
        current_user_username = get_jwt_identity()
        current_user = User.query.filter_by(username=current_user_username).first()
        
        if not current_user or current_user.role != 'admin':
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        
        settings = DashboardSettings.query.filter_by(user_id=user_id).all()
        return jsonify({
            'success': True,
            'settings': [setting.to_dict() for setting in settings]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch dashboard settings: {str(e)}'
        }), 500

@app.route('/api/dashboard-settings/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_dashboard_settings(user_id):
    """Update dashboard settings for a user (admin only)"""
    try:
        current_user_username = get_jwt_identity()
        current_user = User.query.filter_by(username=current_user_username).first()
        
        if not current_user or current_user.role != 'admin':
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        
        data = request.get_json()
        settings = data.get('settings', [])
        
        # Delete existing settings
        DashboardSettings.query.filter_by(user_id=user_id).delete()
        
        # Create new settings
        for setting_data in settings:
            new_setting = DashboardSettings(
                user_id=user_id,
                section=setting_data['section'],
                is_visible=setting_data['is_visible']
            )
            db.session.add(new_setting)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Dashboard settings updated successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to update dashboard settings: {str(e)}'
        }), 500

# Account Balances API
@app.route('/api/account-balances', methods=['GET'])
@jwt_required()
def get_account_balances():
    """Get account balances for current user"""
    try:
        current_user_username = get_jwt_identity()
        current_user = User.query.filter_by(username=current_user_username).first()
        if not current_user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        balances = AccountBalance.query.filter_by(user_id=current_user.id).order_by(AccountBalance.date_entered.desc()).all()
        
        return jsonify({
            'success': True,
            'balances': [balance.to_dict() for balance in balances]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch account balances: {str(e)}'
        }), 500

@app.route('/api/account-balances', methods=['POST'])
@jwt_required()
def create_account_balance():
    """Create a new account balance entry"""
    try:
        current_user_username = get_jwt_identity()
        current_user = User.query.filter_by(username=current_user_username).first()
        if not current_user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        data = request.get_json()
        
        new_balance = AccountBalance(
            user_id=current_user.id,
            account_id=data.get('account_id'),
            loan_id=data.get('loan_id'),
            balance=data.get('balance'),
            currency=data.get('currency', 'EUR'),
            notes=data.get('notes'),
            date_entered=datetime.strptime(data.get('date_entered'), '%Y-%m-%d').date()
        )
        
        db.session.add(new_balance)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Account balance created successfully',
            'balance': new_balance.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to create account balance: {str(e)}'
        }), 500

@app.route('/api/account-balances/<int:balance_id>', methods=['PUT'])
@jwt_required()
def update_account_balance(balance_id):
    """Update an account balance entry"""
    try:
        current_user_username = get_jwt_identity()
        current_user = User.query.filter_by(username=current_user_username).first()
        if not current_user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        balance = AccountBalance.query.filter_by(id=balance_id, user_id=current_user.id).first()
        
        if not balance:
            return jsonify({
                'success': False,
                'message': 'Account balance not found'
            }), 404
        
        data = request.get_json()
        balance.account_id = data.get('account_id', balance.account_id)
        balance.loan_id = data.get('loan_id', balance.loan_id)
        balance.balance = data.get('balance', balance.balance)
        balance.currency = data.get('currency', balance.currency)
        balance.notes = data.get('notes', balance.notes)
        balance.date_entered = datetime.strptime(data.get('date_entered'), '%Y-%m-%d').date()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Account balance updated successfully',
            'balance': balance.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to update account balance: {str(e)}'
        }), 500

@app.route('/api/account-balances/<int:balance_id>', methods=['DELETE'])
@jwt_required()
def delete_account_balance(balance_id):
    """Delete an account balance entry"""
    try:
        current_user_username = get_jwt_identity()
        current_user = User.query.filter_by(username=current_user_username).first()
        if not current_user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        balance = AccountBalance.query.filter_by(id=balance_id, user_id=current_user.id).first()
        
        if not balance:
            return jsonify({
                'success': False,
                'message': 'Account balance not found'
            }), 404
        
        db.session.delete(balance)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Account balance deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to delete account balance: {str(e)}'
        }), 500

# User Dashboard API
@app.route('/api/user-dashboard', methods=['GET'])
@jwt_required()
def get_user_dashboard():
    """Get personalized dashboard data for current user"""
    try:
        current_user_username = get_jwt_identity()
        current_user = User.query.filter_by(username=current_user_username).first()
        
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Get dashboard settings
        settings = DashboardSettings.query.filter_by(user_id=current_user.id).all()
        visible_sections = {setting.section: setting.is_visible for setting in settings}
        
        dashboard_data = {
            'user': current_user.to_dict(),
            'visible_sections': visible_sections,
            'data': {}
        }
        
        # Only include data for visible sections
        if visible_sections.get('properties', True):
            properties = Property.query.all()
            dashboard_data['data']['properties'] = [prop.to_dict() for prop in properties]
        
        if visible_sections.get('loans', True):
            loans = Loan.query.all()
            dashboard_data['data']['loans'] = [loan.to_dict() for loan in loans]
        
        if visible_sections.get('account_balances', True):
            balances = AccountBalance.query.filter_by(user_id=current_user.id).order_by(AccountBalance.date_entered.desc()).all()
            dashboard_data['data']['account_balances'] = [balance.to_dict() for balance in balances]
        
        if visible_sections.get('bank_accounts', True):
            # Note: BusinessAccount model may not have user_id field yet
            try:
                # First try to check if the user_id column exists
                from sqlalchemy import inspect
                inspector = inspect(db.engine)
                columns = [col['name'] for col in inspector.get_columns('business_account')]
                if 'user_id' in columns:
                    accounts = BusinessAccount.query.filter_by(user_id=current_user.id).all()
                else:
                    accounts = BusinessAccount.query.all()
            except Exception as e:
                # Fallback: get all accounts if user_id field doesn't exist
                accounts = BusinessAccount.query.all()
            dashboard_data['data']['bank_accounts'] = [account.to_dict() for account in accounts]
        
        return jsonify({
            'success': True,
            'dashboard': dashboard_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch dashboard data: {str(e)}'
        }), 500

@app.route('/api/bookings/sync', methods=['POST'])
@jwt_required()
def sync_bookings():
    """Sync bookings from iCal feed (supports multiple platforms)"""
    try:
        data = request.get_json()
        ical_url = data.get('ical_url')
        listing_id = data.get('listing_id')
        platform = data.get('platform', 'airbnb')
        property_id = data.get('property_id')  # Optional: link to property
        
        if not ical_url or not listing_id:
            return jsonify({
                'success': False,
                'message': 'ical_url and listing_id are required'
            }), 400
        
        # Parse iCal feed based on platform
        if platform == 'airbnb':
            bookings_data = _parse_airbnb_ical(ical_url, listing_id)
        elif platform == 'vrbo':
            bookings_data = _parse_vrbo_ical(ical_url, listing_id)
        else:
            return jsonify({
                'success': False,
                'message': f'Unsupported platform: {platform}'
            }), 400
        
        if not bookings_data:
            return jsonify({
                'success': False,
                'message': 'No bookings found in iCal feed or error parsing feed'
            }), 400
        
        # Process bookings
        synced_count = 0
        updated_count = 0
        
        for booking_data in bookings_data:
            # Check if booking already exists
            existing_booking = AirbnbBooking.query.filter_by(
                booking_uid=booking_data['booking_uid']
            ).first()
            
            if existing_booking:
                # Update existing booking with all fields
                existing_booking.check_in_date = booking_data['check_in_date']
                existing_booking.check_out_date = booking_data['check_out_date']
                existing_booking.nights = booking_data['nights']
                existing_booking.reservation_url = booking_data['reservation_url']
                existing_booking.phone_last_4 = booking_data['phone_last_4']
                existing_booking.status = booking_data['status']
                
                # Update additional iCal data
                existing_booking.summary = booking_data.get('summary')
                existing_booking.description = booking_data.get('description')
                existing_booking.dtstamp = booking_data.get('dtstamp')
                existing_booking.confirmation_code = booking_data.get('confirmation_code')
                
                # Update guest information
                existing_booking.guest_name = booking_data.get('guest_name')
                existing_booking.guest_phone = booking_data.get('guest_phone')
                existing_booking.guest_email = booking_data.get('guest_email')
                existing_booking.number_of_guests = booking_data.get('number_of_guests')
                
                # Update financial details
                existing_booking.nightly_rate = booking_data.get('nightly_rate')
                existing_booking.cleaning_fee = booking_data.get('cleaning_fee')
                existing_booking.service_fee = booking_data.get('service_fee')
                existing_booking.total_amount = booking_data.get('total_amount')
                
                # Update additional metadata
                existing_booking.booking_source = booking_data.get('booking_source', 'airbnb')
                existing_booking.cancellation_policy = booking_data.get('cancellation_policy')
                existing_booking.special_requests = booking_data.get('special_requests')
                
                # Update additional iCal fields
                existing_booking.location = booking_data.get('location')
                existing_booking.organizer = booking_data.get('organizer')
                existing_booking.attendee = booking_data.get('attendee')
                existing_booking.created = booking_data.get('created')
                existing_booking.last_modified = booking_data.get('last_modified')
                
                existing_booking.last_synced = datetime.utcnow()
                if property_id:
                    existing_booking.property_id = property_id
                updated_count += 1
            else:
                # Create new booking with all fields
                new_booking = AirbnbBooking(
                    property_id=property_id,
                    listing_id=booking_data['listing_id'],
                    booking_uid=booking_data['booking_uid'],
                    reservation_url=booking_data['reservation_url'],
                    phone_last_4=booking_data['phone_last_4'],
                    check_in_date=booking_data['check_in_date'],
                    check_out_date=booking_data['check_out_date'],
                    nights=booking_data['nights'],
                    status=booking_data['status'],
                    
                    # Additional iCal data
                    summary=booking_data.get('summary'),
                    description=booking_data.get('description'),
                    dtstamp=booking_data.get('dtstamp'),
                    confirmation_code=booking_data.get('confirmation_code'),
                    
                    # Guest information
                    guest_name=booking_data.get('guest_name'),
                    guest_phone=booking_data.get('guest_phone'),
                    guest_email=booking_data.get('guest_email'),
                    number_of_guests=booking_data.get('number_of_guests'),
                    
                    # Financial details
                    nightly_rate=booking_data.get('nightly_rate'),
                    cleaning_fee=booking_data.get('cleaning_fee'),
                    service_fee=booking_data.get('service_fee'),
                    total_amount=booking_data.get('total_amount'),
                    
                    # Additional metadata
                    booking_source=booking_data.get('booking_source', 'airbnb'),
                    cancellation_policy=booking_data.get('cancellation_policy'),
                    special_requests=booking_data.get('special_requests'),
                    
                    # Additional iCal fields
                    location=booking_data.get('location'),
                    organizer=booking_data.get('organizer'),
                    attendee=booking_data.get('attendee'),
                    created=booking_data.get('created'),
                    last_modified=booking_data.get('last_modified')
                )
                db.session.add(new_booking)
                synced_count += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully synced {synced_count} new bookings and updated {updated_count} existing bookings',
            'synced_count': synced_count,
            'updated_count': updated_count,
            'total_bookings': len(bookings_data)
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to sync Airbnb bookings: {str(e)}'
        }), 500

@app.route('/api/bookings', methods=['GET'])
@jwt_required()
def get_bookings():
    """Get all Airbnb bookings"""
    try:
        bookings = AirbnbBooking.query.order_by(AirbnbBooking.check_in_date.desc()).all()
        
        return jsonify({
            'success': True,
            'bookings': [booking.to_dict() for booking in bookings],
            'count': len(bookings)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch Airbnb bookings: {str(e)}'
        }), 500

@app.route('/api/airbnb/bookings/<int:booking_id>', methods=['PUT'])
@jwt_required()
def update_airbnb_booking(booking_id):
    """Update an Airbnb booking"""
    try:
        booking = AirbnbBooking.query.get_or_404(booking_id)
        data = request.get_json()
        
        # Update fields
        booking.estimated_income = data.get('estimated_income', booking.estimated_income)
        booking.currency = data.get('currency', booking.currency)
        booking.status = data.get('status', booking.status)
        booking.property_id = data.get('property_id', booking.property_id)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Booking updated successfully',
            'booking': booking.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to update booking: {str(e)}'
        }), 500

@app.route('/api/airbnb/bookings/<int:booking_id>', methods=['DELETE'])
@jwt_required()
def delete_airbnb_booking(booking_id):
    """Delete an Airbnb booking"""
    try:
        booking = AirbnbBooking.query.get_or_404(booking_id)
        db.session.delete(booking)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Booking deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to delete booking: {str(e)}'
        }), 500

# Tax Returns API endpoints
@app.route('/api/tax-returns', methods=['GET'])
@jwt_required()
def get_tax_returns():
    """Get all tax returns for the authenticated user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get all tax returns for the user
        tax_returns = TaxReturn.query.filter_by(user_id=current_user_id).order_by(TaxReturn.uploaded_at.desc()).all()
        
        return jsonify([{
            'id': tr.id,
            'year': tr.year,
            'filename': tr.filename,
            'file_size': tr.file_size,
            'uploaded_at': tr.uploaded_at.isoformat(),
            'transaction_count': tr.transaction_count
        } for tr in tax_returns])
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tax-returns/analytics', methods=['GET'])
@jwt_required()
def get_tax_returns_analytics():
    """Get financial analytics and insights for tax return transaction data"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get all tax returns for the user
        tax_returns = TaxReturn.query.filter_by(user_id=current_user_id).all()
        
        if not tax_returns:
            return jsonify({
                'message': 'No tax returns found',
                'financial_data': None,
                'insights': ['No tax returns uploaded yet. Upload your first file to see financial analytics!']
            })
        
        # Get all transactions for all tax returns
        all_transactions = []
        for tr in tax_returns:
            transactions = TaxReturnTransaction.query.filter_by(tax_return_id=tr.id).all()
            for txn in transactions:
                all_transactions.append({
                    'year': tr.year,
                    'name': txn.name,
                    'date': txn.date,
                    'debit': float(txn.debit or 0),
                    'credit': float(txn.credit or 0),
                    'reference': txn.reference,
                    'source': txn.source,
                    'annotation': txn.annotation
                })
        
        if not all_transactions:
            return jsonify({
                'message': 'No transaction data found',
                'financial_data': None,
                'insights': ['Tax returns uploaded but no transaction data available.']
            })
        
        # Analyze financial data
        financial_data = analyze_financial_data(all_transactions)
        
        return jsonify(financial_data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def analyze_financial_data(transactions):
    """Analyze financial data from tax return transactions"""
    
    # Group by year
    yearly_data = {}
    for txn in transactions:
        year = txn['year']
        if year not in yearly_data:
            yearly_data[year] = {
                'transactions': [],
                'total_income': 0,
                'total_expenses': 0,
                'net_profit': 0,
                'categories': {}
            }
        yearly_data[year]['transactions'].append(txn)
    
    # Calculate financial metrics for each year
    for year, data in yearly_data.items():
        total_income = 0
        total_expenses = 0
        categories = {}
        
        for txn in data['transactions']:
            # Determine if this is income or expense based on debit/credit
            amount = txn['debit'] if txn['debit'] > 0 else txn['credit']
            
            # Categorize based on name/annotation
            category = categorize_transaction(txn)
            
            if category not in categories:
                categories[category] = {'income': 0, 'expenses': 0, 'count': 0}
            
            categories[category]['count'] += 1
            
            # Determine if income or expense
            is_income = is_income_transaction(txn)
            
            if is_income:
                total_income += amount
                categories[category]['income'] += amount
            else:
                total_expenses += amount
                categories[category]['expenses'] += amount
        
        data['total_income'] = total_income
        data['total_expenses'] = total_expenses
        data['net_profit'] = total_income - total_expenses
        data['categories'] = categories
        data['transaction_count'] = len(data['transactions'])
    
    # Sort years
    sorted_years = sorted(yearly_data.keys())
    
    # Calculate trends
    trends = calculate_trends(yearly_data, sorted_years)
    
    # Generate insights
    insights = generate_financial_insights(yearly_data, sorted_years, trends)
    
    # Prepare response
    yearly_summary = []
    for year in sorted_years:
        data = yearly_data[year]
        yearly_summary.append({
            'year': year,
            'total_income': data['total_income'],
            'total_expenses': data['total_expenses'],
            'net_profit': data['net_profit'],
            'transaction_count': data['transaction_count'],
            'profit_margin': (data['net_profit'] / data['total_income'] * 100) if data['total_income'] > 0 else 0,
            'top_categories': get_top_categories(data['categories'])
        })
    
    return {
        'message': 'Financial analytics generated successfully',
        'financial_data': {
            'years_analyzed': len(sorted_years),
            'total_transactions': sum(len(data['transactions']) for data in yearly_data.values()),
            'yearly_summary': yearly_summary,
            'trends': trends,
            'category_analysis': analyze_categories_across_years(yearly_data),
            'profitability_analysis': analyze_profitability(yearly_data, sorted_years)
        },
        'insights': insights
    }

def categorize_transaction(txn):
    """Categorize a transaction based on its name, reference, and annotation"""
    name = (txn['name'] or '').lower()
    reference = (txn['reference'] or '').lower()
    annotation = (txn['annotation'] or '').lower()
    
    # Income categories
    if any(word in name for word in ['rent', 'rental', 'property']):
        return 'Rental Income'
    elif any(word in name for word in ['salary', 'wage', 'payroll']):
        return 'Salary/Wages'
    elif any(word in name for word in ['consulting', 'freelance', 'service']):
        return 'Consulting/Services'
    elif any(word in name for word in ['dividend', 'interest', 'investment']):
        return 'Investment Income'
    elif any(word in name for word in ['sale', 'revenue', 'income']):
        return 'Business Revenue'
    
    # Expense categories
    elif any(word in name for word in ['mortgage', 'loan', 'payment']):
        return 'Loan Payments'
    elif any(word in name for word in ['tax', 'vat', 'revenue']):
        return 'Taxes'
    elif any(word in name for word in ['insurance', 'premium']):
        return 'Insurance'
    elif any(word in name for word in ['maintenance', 'repair', 'upkeep']):
        return 'Maintenance'
    elif any(word in name for word in ['utility', 'electric', 'gas', 'water']):
        return 'Utilities'
    elif any(word in name for word in ['management', 'agent', 'letting']):
        return 'Management Fees'
    elif any(word in name for word in ['legal', 'solicitor', 'lawyer']):
        return 'Legal Fees'
    elif any(word in name for word in ['accounting', 'bookkeeping', 'audit']):
        return 'Accounting Fees'
    elif any(word in name for word in ['advertising', 'marketing', 'promotion']):
        return 'Marketing'
    elif any(word in name for word in ['travel', 'mileage', 'fuel']):
        return 'Travel'
    elif any(word in name for word in ['office', 'stationery', 'supplies']):
        return 'Office Expenses'
    else:
        return 'Other'

def is_income_transaction(txn):
    """Determine if a transaction is income based on its characteristics"""
    name = (txn['name'] or '').lower()
    reference = (txn['reference'] or '').lower()
    annotation = (txn['annotation'] or '').lower()
    
    # Exclude accounting adjustments and summaries
    exclude_terms = ['posting', 'summary', 'adjustment', 'closing', 'opening', 'balance', 'end', 'total', 'movement', 'split', 'being vat', 'being tax']
    if any(term in name for term in exclude_terms):
        return False
    
    # Only count major income sources, not individual transaction details
    major_income_patterns = [
        'aib 79715197 (airbnb)',  # Major Airbnb income (2023)
        'revolut x418 (rev airbnb)',  # Major Airbnb income (2024)
        'being rent charge for year',  # Rent income (2023)
        'being rent chg for year',  # Rent income (2024)
        'consultancy work',  # Consulting income (2023)
        'consultancy chargew for year',  # Consulting income (2024)
        'airbnb receipts owed at the year',  # Airbnb year-end receipts
        'reverse opening debtor - airbnb',  # Airbnb year-end receipts (2024)
        'money added from reinvented recruit',  # Business income
        'money added from sean francis o\'sul',  # Personal income
        'money added from track capital inve'  # Investment income (2024)
    ]
    
    # Check for major income patterns
    if any(pattern in name for pattern in major_income_patterns):
        return True
    
    # Include individual Airbnb payments but exclude very small amounts
    if 'money added from airbnb payments lu' in name and txn['credit'] > 100:
        return True
    
    # Exclude other individual transaction details
    if 'money added from' in name and 'airbnb' not in name and 'reinvented' not in name and 'sean' not in name and 'track' not in name:
        return False
    
    return False

def calculate_trends(yearly_data, sorted_years):
    """Calculate financial trends across years"""
    if len(sorted_years) < 2:
        return {'message': 'Need at least 2 years of data to calculate trends'}
    
    trends = {
        'income_trend': calculate_trend([yearly_data[year]['total_income'] for year in sorted_years]),
        'expense_trend': calculate_trend([yearly_data[year]['total_expenses'] for year in sorted_years]),
        'profit_trend': calculate_trend([yearly_data[year]['net_profit'] for year in sorted_years]),
        'transaction_volume_trend': calculate_trend([yearly_data[year]['transaction_count'] for year in sorted_years])
    }
    
    return trends

def calculate_trend(values):
    """Calculate trend direction and percentage change"""
    if len(values) < 2:
        return {'direction': 'stable', 'percentage_change': 0}
    
    first_value = values[0]
    last_value = values[-1]
    
    if first_value == 0:
        return {'direction': 'stable', 'percentage_change': 0}
    
    percentage_change = ((last_value - first_value) / first_value) * 100
    
    if percentage_change > 5:
        direction = 'increasing'
    elif percentage_change < -5:
        direction = 'decreasing'
    else:
        direction = 'stable'
    
    return {
        'direction': direction,
        'percentage_change': round(percentage_change, 1),
        'first_value': first_value,
        'last_value': last_value
    }

def get_top_categories(categories, limit=5):
    """Get top categories by total amount"""
    category_totals = []
    for category, data in categories.items():
        total = data['income'] + data['expenses']
        category_totals.append({
            'category': category,
            'total_amount': total,
            'income': data['income'],
            'expenses': data['expenses'],
            'count': data['count']
        })
    
    return sorted(category_totals, key=lambda x: x['total_amount'], reverse=True)[:limit]

def analyze_categories_across_years(yearly_data):
    """Analyze how categories perform across years"""
    all_categories = set()
    for year_data in yearly_data.values():
        all_categories.update(year_data['categories'].keys())
    
    category_analysis = {}
    for category in all_categories:
        category_analysis[category] = {
            'years_present': [],
            'total_across_years': 0,
            'average_per_year': 0,
            'trend': 'stable'
        }
        
        amounts = []
        for year, year_data in yearly_data.items():
            if category in year_data['categories']:
                total = year_data['categories'][category]['income'] + year_data['categories'][category]['expenses']
                category_analysis[category]['years_present'].append(year)
                category_analysis[category]['total_across_years'] += total
                amounts.append(total)
        
        if amounts:
            category_analysis[category]['average_per_year'] = sum(amounts) / len(amounts)
            if len(amounts) >= 2:
                trend = calculate_trend(amounts)
                category_analysis[category]['trend'] = trend['direction']
    
    return category_analysis

def analyze_profitability(yearly_data, sorted_years):
    """Analyze profitability patterns"""
    profitability = {
        'best_year': None,
        'worst_year': None,
        'most_volatile_year': None,
        'average_profit_margin': 0,
        'profit_growth_rate': 0
    }
    
    profits = []
    profit_margins = []
    
    for year in sorted_years:
        data = yearly_data[year]
        profit = data['net_profit']
        margin = (profit / data['total_income'] * 100) if data['total_income'] > 0 else 0
        
        profits.append(profit)
        profit_margins.append(margin)
        
        if profitability['best_year'] is None or profit > profitability['best_year']['profit']:
            profitability['best_year'] = {'year': year, 'profit': profit, 'margin': margin}
        
        if profitability['worst_year'] is None or profit < profitability['worst_year']['profit']:
            profitability['worst_year'] = {'year': year, 'profit': profit, 'margin': margin}
    
    if profits:
        profitability['average_profit_margin'] = sum(profit_margins) / len(profit_margins)
        
        if len(profits) >= 2:
            profit_trend = calculate_trend(profits)
            profitability['profit_growth_rate'] = profit_trend['percentage_change']
    
    return profitability

def generate_financial_insights(yearly_data, sorted_years, trends):
    """Generate financial insights based on the analysis"""
    insights = []
    
    if not yearly_data:
        return ['No financial data available for analysis']
    
    # Profitability insights
    latest_year = sorted_years[-1]
    latest_data = yearly_data[latest_year]
    
    if latest_data['net_profit'] > 0:
        insights.append(f"Profitable in {latest_year}: Net profit of €{latest_data['net_profit']:,.2f}")
    else:
        insights.append(f"Loss in {latest_year}: Net loss of €{abs(latest_data['net_profit']):,.2f}")
    
    # Trend insights
    if trends['profit_trend']['direction'] == 'increasing':
        insights.append(f"Profit trend: {trends['profit_trend']['percentage_change']:.1f}% increase over time")
    elif trends['profit_trend']['direction'] == 'decreasing':
        insights.append(f"Profit trend: {trends['profit_trend']['percentage_change']:.1f}% decrease over time")
    
    if trends['income_trend']['direction'] == 'increasing':
        insights.append(f"Income growth: {trends['income_trend']['percentage_change']:.1f}% increase")
    elif trends['income_trend']['direction'] == 'decreasing':
        insights.append(f"Income decline: {trends['income_trend']['percentage_change']:.1f}% decrease")
    
    # Category insights
    latest_categories = latest_data['categories']
    if latest_categories:
        top_category = max(latest_categories.items(), key=lambda x: x[1]['income'] + x[1]['expenses'])
        insights.append(f"Largest category in {latest_year}: {top_category[0]} (€{top_category[1]['income'] + top_category[1]['expenses']:,.2f})")
    
    # Year-over-year comparison
    if len(sorted_years) >= 2:
        prev_year = sorted_years[-2]
        prev_data = yearly_data[prev_year]
        
        profit_change = latest_data['net_profit'] - prev_data['net_profit']
        if profit_change > 0:
            insights.append(f"Profit improved by €{profit_change:,.2f} from {prev_year} to {latest_year}")
        elif profit_change < 0:
            insights.append(f"Profit decreased by €{abs(profit_change):,.2f} from {prev_year} to {latest_year}")
    
    return insights

def format_file_size(bytes):
    """Helper function to format file size"""
    if bytes == 0:
        return '0 Bytes'
    k = 1024
    sizes = ['Bytes', 'KB', 'MB', 'GB']
    i = int(math.floor(math.log(bytes) / math.log(k)))
    return f"{round(bytes / math.pow(k, i), 2)} {sizes[i]}"

def process_pdf_file(file):
    """Process PDF file and extract tabular data"""
    try:
        # Reset file pointer
        file.seek(0)
        
        # Try pdfplumber first (better for tables)
        with pdfplumber.open(file) as pdf:
            all_tables = []
            
            for page_num, page in enumerate(pdf.pages):
                # Extract tables from the page
                tables = page.extract_tables()
                
                for table in tables:
                    if table and len(table) > 1:  # Ensure table has data
                        try:
                            # Convert table to DataFrame
                            df_page = pd.DataFrame(table[1:], columns=table[0])  # Skip header row
                            all_tables.append(df_page)
                        except Exception as e:
                            print(f"DEBUG: Error processing table on page {page_num}: {str(e)}")
                            continue
            
            if all_tables:
                # Combine all tables
                df = pd.concat(all_tables, ignore_index=True)
            else:
                # If no tables found, try text extraction
                text_content = []
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        text_content.append(text)
                
                if not text_content:
                    raise Exception("No text content found in PDF")
                
                # Try to parse text as CSV-like data
                combined_text = '\n'.join(text_content)
                lines = combined_text.split('\n')
                
                # Look for lines that might be data rows
                data_lines = []
                for line in lines:
                    # Check if line contains multiple values separated by spaces or tabs
                    if len(line.split()) >= 3:  # Reduced minimum columns for more flexibility
                        data_lines.append(line)
                
                if data_lines:
                    # Try to create DataFrame from text lines
                    try:
                        df = pd.DataFrame([line.split() for line in data_lines])
                        print(f"DEBUG: Created DataFrame with {len(df.columns)} columns")
                        print(f"DEBUG: First few rows: {df.head()}")
                        
                        # Set column names based on expected structure
                        expected_columns = ['Name', 'Date', 'Number', 'Reference', 'Source', 'Annotation', 'Debit', 'Credit', 'Balance']
                        
                        # Handle variable column counts more flexibly
                        if len(df.columns) == len(expected_columns):
                            df.columns = expected_columns
                        elif len(df.columns) > len(expected_columns):
                            # If more columns than expected, use the first 9 and ignore extras
                            df = df.iloc[:, :len(expected_columns)]
                            df.columns = expected_columns
                        else:
                            # If fewer columns, pad with empty columns
                            for i in range(len(df.columns), len(expected_columns)):
                                df[f'col_{i}'] = ''
                            df.columns = expected_columns
                            
                    except Exception as e:
                        print(f"DEBUG: Error creating DataFrame from text: {str(e)}")
                        raise Exception(f"Could not parse PDF text into structured data: {str(e)}")
                else:
                    raise Exception("No structured data found in PDF - no lines with sufficient data")
        
        # Clean up the data
        if 'df' not in locals():
            raise Exception("No data extracted from PDF")
            
        df = df.dropna(how='all')  # Remove completely empty rows
        df = df.fillna('')  # Fill NaN values with empty strings
        
        # Remove rows where all values are empty
        df = df[~(df == '').all(axis=1)]
        
        if len(df) == 0:
            raise Exception("No valid data rows found in PDF after processing")
        
        return df
        
    except Exception as e:
        print(f"Error processing PDF with pdfplumber: {str(e)}")
        
        # Fallback to PyPDF2 for basic text extraction
        try:
            file.seek(0)
            pdf_reader = PyPDF2.PdfReader(file)
            text_content = ""
            
            for page in pdf_reader.pages:
                text_content += page.extract_text() + "\n"
            
            if not text_content.strip():
                raise Exception("No text content found in PDF using PyPDF2")
            
            # Try to parse the text as structured data
            lines = text_content.split('\n')
            data_lines = []
            
            for line in lines:
                # Look for lines that might contain transaction data
                if len(line.split()) >= 3:  # Reduced minimum for more flexibility
                    data_lines.append(line)
            
            if data_lines:
                try:
                    df = pd.DataFrame([line.split() for line in data_lines])
                    print(f"DEBUG: PyPDF2 created DataFrame with {len(df.columns)} columns")
                    
                    # Set basic column structure
                    expected_columns = ['Name', 'Date', 'Number', 'Reference', 'Source', 'Annotation', 'Debit', 'Credit', 'Balance']
                    
                    # Handle variable column counts more flexibly
                    if len(df.columns) == len(expected_columns):
                        df.columns = expected_columns
                    elif len(df.columns) > len(expected_columns):
                        # If more columns than expected, use the first 9 and ignore extras
                        df = df.iloc[:, :len(expected_columns)]
                        df.columns = expected_columns
                    else:
                        # If fewer columns, pad with empty columns
                        for i in range(len(df.columns), len(expected_columns)):
                            df[f'col_{i}'] = ''
                        df.columns = expected_columns
                    
                    # Clean up the data
                    df = df.dropna(how='all')
                    df = df.fillna('')
                    df = df[~(df == '').all(axis=1)]
                    
                    if len(df) == 0:
                        raise Exception("No valid data rows found after PyPDF2 processing")
                    
                    return df
                except Exception as e3:
                    raise Exception(f"Could not parse PDF text into structured data: {str(e3)}")
            else:
                raise Exception("No structured data found in PDF using PyPDF2 - no lines with sufficient data")
                
        except Exception as e2:
            raise Exception(f"Failed to process PDF. Please ensure the file is a valid PDF document with readable text or tables. Error details: {str(e)} and {str(e2)}")

@app.route('/api/tax-returns/upload', methods=['POST'])
@jwt_required()
def upload_tax_return():
    """Upload a tax return CSV file"""
    try:
        current_user_id = get_jwt_identity()
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
            
        file = request.files['file']
        year = request.form.get('year', str(datetime.now().year))
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
            
        if not (file.filename.lower().endswith('.csv') or file.filename.lower().endswith('.xlsx') or file.filename.lower().endswith('.pdf')):
            return jsonify({'error': 'File must be a CSV, Excel (.xlsx), or PDF file'}), 400
        
        # Read and validate file (CSV, Excel, or PDF)
        try:
            if file.filename.lower().endswith('.pdf'):
                # Process PDF file
                print(f"DEBUG: Processing PDF file: {file.filename}")
                df = process_pdf_file(file)
                print(f"DEBUG: PDF processed successfully, shape: {df.shape}")
            elif file.filename.lower().endswith('.xlsx'):
                # Skip first 5 rows and use row 6 as headers
                df = pd.read_excel(file, skiprows=5)
            else:
                # Skip first 5 rows and use row 6 as headers
                df = pd.read_csv(file, skiprows=5)
            
            # Clean up the data - remove empty rows and handle missing values
            df = df.dropna(how='all')  # Remove completely empty rows
            df = df.fillna('')  # Fill NaN values with empty strings
            
            # Debug: Log the actual columns found after skipping metadata rows
            print(f"DEBUG: File columns after skipping first 5 rows: {list(df.columns)}")
            print(f"DEBUG: First few rows after skipping:")
            print(df.head())
            
            required_columns = ['Name', 'Date', 'Number', 'Reference', 'Source', 'Annotation', 'Debit', 'Credit', 'Balance']
            
            # Check if required columns exist (case insensitive) - AFTER skipping metadata rows
            df_columns_lower = [col.lower() for col in df.columns]
            missing_columns = []
            for req_col in required_columns:
                if req_col.lower() not in df_columns_lower:
                    missing_columns.append(req_col)
            
            if missing_columns:
                return jsonify({
                    'error': f'Missing required columns: {", ".join(missing_columns)}. Found columns: {", ".join(df.columns)}'
                }), 400
            
            # Convert date column to proper format if needed
            if 'Date' in df.columns:
                try:
                    # Handle DD/MM/YY format (2-digit year)
                    df['Date'] = pd.to_datetime(df['Date'], format='%d/%m/%y', errors='coerce')
                except:
                    try:
                        # Fallback to DD/MM/YYYY format (4-digit year)
                        df['Date'] = pd.to_datetime(df['Date'], format='%d/%m/%Y', errors='coerce')
                    except:
                        # Final fallback to default parsing
                        df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
            
            # Convert numeric columns - handle comma separators
            numeric_columns = ['Debit', 'Credit', 'Balance']
            for col in numeric_columns:
                if col in df.columns:
                    # Remove commas and convert to numeric
                    df[col] = df[col].astype(str).str.replace(',', '')
                    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            
            # Filter out rows where Name is empty (these are usually summary rows)
            df = df[df['Name'].str.strip() != '']
            
            # Count actual transaction rows (excluding summary rows)
            transaction_count = len(df[df['Name'].str.strip() != ''])
                
        except Exception as e:
            print(f"DEBUG: Error processing file: {str(e)}")
            print(f"DEBUG: Error type: {type(e).__name__}")
            print(f"DEBUG: File type: {file.filename}")
            import traceback
            print(f"DEBUG: Full traceback: {traceback.format_exc()}")
            
            # Provide more specific error messages
            if file.filename.lower().endswith('.pdf'):
                return jsonify({'error': f'Failed to process PDF file. Please ensure it is a valid PDF document with readable text or tables. Error: {str(e)}'}), 400
            else:
                return jsonify({'error': f'Invalid file: {str(e)}'}), 400
        
        # Reset file pointer
        file.seek(0)
        file_content = file.read()
        
        # Check if a tax return already exists for this year and user
        existing_return = TaxReturn.query.filter_by(
            user_id=current_user_id, 
            year=year
        ).first()
        
        if existing_return:
            # Delete existing transactions first
            TaxReturnTransaction.query.filter_by(tax_return_id=existing_return.id).delete()
            # Delete the existing tax return
            db.session.delete(existing_return)
            db.session.flush()
        
        # Create tax return record
        tax_return = TaxReturn(
            user_id=current_user_id,
            year=year,
            filename=file.filename,
            file_content=file_content,
            file_size=len(file_content),
            transaction_count=transaction_count
        )
        
        db.session.add(tax_return)
        db.session.flush()  # Get the tax_return.id before committing
        
        # Save individual transactions to database with proper category mapping
        saved_transactions = 0
        current_category = None
        current_category_name = None
        
        for _, row in df.iterrows():
            if pd.notna(row['Name']) and str(row['Name']).strip() != '':
                row_name = str(row['Name']).strip()
                
                # Check if this row is a category heading (e.g., "207C00 Hosting Fee's")
                category_match = re.match(r'^(\d+[A-Z]\d+)\s*(.*)', row_name)
                if category_match:
                    # This is a category heading - update current category
                    current_category = category_match.group(1)  # e.g., "207C00"
                    current_category_name = row_name  # e.g., "207C00 Hosting Fee's"
                    print(f"DEBUG: Found category heading: {current_category_name}")
                    # Skip processing this row as it's just a category heading
                    continue
                else:
                    # This is an individual transaction - use current category if available
                    category_to_store = current_category_name if current_category_name else None
                    if category_to_store:
                        print(f"DEBUG: Storing transaction '{row_name}' under category '{category_to_store}'")                                                                                                         
                    else:
                        print(f"DEBUG: Storing transaction '{row_name}' without category")
                
                transaction = TaxReturnTransaction(
                    tax_return_id=tax_return.id,
                    user_id=current_user_id,
                    name=row_name,
                    date=row['Date'] if pd.notna(row['Date']) else None,
                    number=str(row['Number']).strip() if pd.notna(row['Number']) else None,
                    reference=str(row['Reference']).strip() if pd.notna(row['Reference']) else None,
                    source=str(row['Source']).strip() if pd.notna(row['Source']) else None,
                    annotation=str(row['Annotation']).strip() if pd.notna(row['Annotation']) else None,
                    debit=float(row['Debit']) if pd.notna(row['Debit']) else 0.0,
                    credit=float(row['Credit']) if pd.notna(row['Credit']) else 0.0,
                    balance=float(row['Balance']) if pd.notna(row['Balance']) else 0.0,
                    category_heading=category_to_store  # Store the category heading with each transaction
                )
                db.session.add(transaction)
                saved_transactions += 1
        
        db.session.commit()
        
        return jsonify({
            'message': 'Tax return uploaded successfully',
            'id': tax_return.id,
            'transaction_count': tax_return.transaction_count,
            'saved_transactions': saved_transactions
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/tax-returns/<int:tax_return_id>/download', methods=['GET'])
@jwt_required()
def download_tax_return(tax_return_id):
    """Download a tax return CSV file"""
    try:
        current_user_id = get_jwt_identity()
        
        tax_return = TaxReturn.query.filter_by(
            id=tax_return_id, 
            user_id=current_user_id
        ).first()
        
        if not tax_return:
            return jsonify({'error': 'Tax return not found'}), 404
        
        return Response(
            tax_return.file_content,
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename={tax_return.filename}'
            }
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tax-returns/<int:tax_return_id>', methods=['DELETE'])
@jwt_required()
def delete_tax_return(tax_return_id):
    """Delete a tax return and all related transactions"""
    try:
        current_user_id = get_jwt_identity()
        
        tax_return = TaxReturn.query.filter_by(
            id=tax_return_id, 
            user_id=current_user_id
        ).first()
        
        if not tax_return:
            return jsonify({'error': 'Tax return not found'}), 404
        
        # Delete the tax return - cascade will handle related transactions
        db.session.delete(tax_return)
        db.session.commit()
        
        return jsonify({'message': 'Tax return and all related transactions deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/tax-returns/<int:tax_return_id>/data', methods=['GET'])
@jwt_required()
def get_tax_return_data(tax_return_id):
    """Get parsed CSV data from a tax return"""
    try:
        current_user_id = get_jwt_identity()
        
        tax_return = TaxReturn.query.filter_by(
            id=tax_return_id, 
            user_id=current_user_id
        ).first()
        
        if not tax_return:
            return jsonify({'error': 'Tax return not found'}), 404
        
        # Parse the file data (CSV or Excel)
        import io
        if tax_return.filename.lower().endswith('.xlsx'):
            # For Excel files, we need to read from bytes
            # Skip the first 4 rows to get to the actual data header
            df = pd.read_excel(io.BytesIO(tax_return.file_content), skiprows=4, header=None)
            # Set the first row as column names
            if len(df) > 0:
                # Get the first row and clean up the column names
                header_row = df.iloc[0].values
                # Replace NaN values with generic column names
                clean_headers = []
                for i, header in enumerate(header_row):
                    if pd.isna(header) or header == '':
                        clean_headers.append(f'Column_{i+1}')
                    else:
                        clean_headers.append(str(header))
                df.columns = clean_headers
                df = df.drop(df.index[0])  # Remove the header row from data
                # Reset index after dropping the header row
                df = df.reset_index(drop=True)
                # Now filter out any remaining header rows (check if Name column exists first)
                if 'Name' in df.columns:
                    df = df[~df['Name'].astype(str).str.contains('Name|Date|Number|Reference|Source|Annotation|Debit|Credit|Balance', case=False, na=False)]
        else:
            # For CSV files
            csv_data = io.StringIO(tax_return.file_content.decode('utf-8'))
            df = pd.read_csv(csv_data)
        
        # Clean up the data
        df = df.dropna(how='all')
        df = df.fillna('')
        
        # Convert date column
        if 'Date' in df.columns:
            try:
                df['Date'] = pd.to_datetime(df['Date'], format='%d/%m/%Y', errors='coerce')
            except:
                df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
        
        # Convert numeric columns
        numeric_columns = ['Debit', 'Credit', 'Balance']
        for col in numeric_columns:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        
        # Filter out empty rows and header rows
        if 'Name' in df.columns:
            # Remove rows where Name is empty or contains column headers
            df = df[(df['Name'].astype(str).str.strip() != '') & 
                   (~df['Name'].astype(str).str.contains('Name|Date|Number|Reference|Source|Annotation|Debit|Credit|Balance', case=False, na=False))]
        else:
            # If no Name column, just remove completely empty rows
            df = df.dropna(how='all')
        
        # Add unique row ID to each record
        df['row_id'] = range(1, len(df) + 1)
        
        # Convert to JSON
        data = df.to_dict('records')
        
        return jsonify({
            'data': data,
            'total_rows': len(data),
            'columns': list(df.columns)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/gl-transactions', methods=['GET'])
@jwt_required()
def get_all_gl_transactions():
    """Get all GL transactions from all tax returns with filtering and pagination"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 100, type=int)
        search = request.args.get('search', '', type=str)
        date_from = request.args.get('date_from', '', type=str)
        date_to = request.args.get('date_to', '', type=str)
        amount_min = request.args.get('amount_min', '', type=str)
        amount_max = request.args.get('amount_max', '', type=str)
        source = request.args.get('source', '', type=str)
        category_heading = request.args.get('category_heading', '', type=str)
        year = request.args.get('year', '', type=str)
        transaction_type = request.args.get('transaction_type', '', type=str)
        sort_field = request.args.get('sort_field', 'date', type=str)
        sort_direction = request.args.get('sort_direction', 'desc', type=str)
        
        # Build query
        query = TaxReturnTransaction.query.join(TaxReturn).filter(TaxReturn.user_id == current_user_id)
        
        # Apply filters
        if search:
            query = query.filter(
                db.or_(
                    TaxReturnTransaction.name.contains(search),
                    TaxReturnTransaction.reference.contains(search),
                    TaxReturnTransaction.annotation.contains(search)
                )
            )
        
        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d')
                query = query.filter(TaxReturnTransaction.date >= from_date)
            except ValueError:
                pass
        
        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d')
                query = query.filter(TaxReturnTransaction.date <= to_date)
            except ValueError:
                pass
        
        if amount_min:
            try:
                min_amount = float(amount_min)
                query = query.filter(
                    db.or_(
                        TaxReturnTransaction.debit >= min_amount,
                        TaxReturnTransaction.credit >= min_amount
                    )
                )
            except ValueError:
                pass
        
        if amount_max:
            try:
                max_amount = float(amount_max)
                query = query.filter(
                    db.or_(
                        TaxReturnTransaction.debit <= max_amount,
                        TaxReturnTransaction.credit <= max_amount
                    )
                )
            except ValueError:
                pass
        
        if source:
            query = query.filter(TaxReturnTransaction.source.contains(source))
        
        if category_heading:
            query = query.filter(TaxReturnTransaction.category_heading.contains(category_heading))
        
        if year:
            query = query.filter(TaxReturn.year == year)
        
        if transaction_type:
            query = query.filter(TaxReturnTransaction.source == transaction_type)
        
        # Apply sorting
        valid_sort_fields = {
            'date': TaxReturnTransaction.date,
            'name': TaxReturnTransaction.name,
            'amount': db.func.abs(TaxReturnTransaction.debit + TaxReturnTransaction.credit),
            'source': TaxReturnTransaction.source,
            'category_heading': TaxReturnTransaction.category_heading,
            'tax_return_year': TaxReturn.year
        }
        
        sort_column = valid_sort_fields.get(sort_field, TaxReturnTransaction.date)
        if sort_direction == 'desc':
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
        
        # Get paginated results
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        # Format transactions
        transactions = []
        for transaction in pagination.items:
            transaction_data = transaction.to_dict()
            transaction_data['tax_return_year'] = transaction.tax_return.year if transaction.tax_return else None
            transaction_data['tax_return_filename'] = transaction.tax_return.filename if transaction.tax_return else None
            transactions.append(transaction_data)
        
        return jsonify({
            'transactions': transactions,
            'pagination': {
                'page': pagination.page,
                'pages': pagination.pages,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/gl-transactions/summary-counts', methods=['GET'])
@jwt_required()
def get_gl_transactions_summary_counts():
    """Get summary counts for GL transactions by type with optional year filtering"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get query parameters for filtering
        year = request.args.get('year', '', type=str)
        
        # Get all transactions for this user
        query = TaxReturnTransaction.query.join(TaxReturn).filter(TaxReturn.user_id == current_user_id)
        
        # Apply year filter if specified
        if year:
            query = query.filter(TaxReturn.year == int(year))
        
        all_transactions = query.all()
        
        # Count by source type
        counts = {
            'total': len(all_transactions),
            'pj': len([t for t in all_transactions if t.source == 'PJ']),
            'aj': len([t for t in all_transactions if t.source == 'AJ']),
            'ap': len([t for t in all_transactions if t.source == 'AP']),
            'se': len([t for t in all_transactions if t.source == 'SE']),
            'cd': len([t for t in all_transactions if t.source == 'CD']),
            'pl': len([t for t in all_transactions if t.source == 'PL']),
            'other': len([t for t in all_transactions if t.source not in ['PJ', 'AJ', 'AP', 'SE', 'CD', 'PL']])
        }
        
        return jsonify(counts)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/gl-transactions/filter-options', methods=['GET'])
@jwt_required()
def get_gl_transactions_filter_options():
    """Get filter options for GL transactions"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get all unique values for filtering
        query = TaxReturnTransaction.query.join(TaxReturn).filter(TaxReturn.user_id == current_user_id)
        
        # Get unique sources - filter out dates and meaningless values
        sources = db.session.query(TaxReturnTransaction.source).join(TaxReturn).filter(
            TaxReturn.user_id == current_user_id,
            TaxReturnTransaction.source.isnot(None),
            TaxReturnTransaction.source != ''
        ).distinct().all()
        sources = [s[0] for s in sources if s[0]]
        
        # Filter sources to only include meaningful values (PJ, AJ, and other non-date values)
        meaningful_sources = []
        for source in sources:
            # Skip if it's just a date pattern (DD/MM/YYYY or DD/MM/YY)
            if not re.match(r'^\d{1,2}/\d{1,2}/\d{2,4}$', source):
                # Skip if it's just special characters or very short meaningless strings
                if len(source) > 2 and not re.match(r'^[^a-zA-Z0-9]+$', source):
                    # Skip if it's just a number or amount
                    if not re.match(r'^[\d,\.]+$', source):
                        # Skip if it's a date with text appended
                        if not re.match(r'^\d{1,2}/\d{1,2}/\d{2,4}\w+$', source):
                            # Only include if it contains letters or is a known meaningful code
                            if re.search(r'[a-zA-Z]', source) or source in ['PJ', 'AJ', 'AP', 'LR', 'CC', 'C/C', 'AIB', 'Revolut', 'VAT', 'PAY', 'LEDGER']:
                                meaningful_sources.append(source)
        
        # Get unique category headings
        category_headings = db.session.query(TaxReturnTransaction.category_heading).join(TaxReturn).filter(
            TaxReturn.user_id == current_user_id,
            TaxReturnTransaction.category_heading.isnot(None),
            TaxReturnTransaction.category_heading != ''
        ).distinct().all()
        category_headings = [c[0] for c in category_headings if c[0]]
        
        # Filter category headings to remove duplicates (keep only those with descriptions)
        meaningful_categories = []
        seen_codes = set()
        
        for category in category_headings:
            # Extract the code part (before the first space)
            code_part = category.split(' ')[0] if ' ' in category else category
            
            # If this is a code with description, add it and mark the code as seen
            if ' ' in category and len(category) > len(code_part) + 1:
                meaningful_categories.append(category)
                seen_codes.add(code_part)
            # If this is just a code and we haven't seen it with a description, add it
            elif code_part not in seen_codes and ' ' not in category:
                meaningful_categories.append(category)
                seen_codes.add(code_part)
        
        # Get unique years
        years = db.session.query(TaxReturn.year).filter(
            TaxReturn.user_id == current_user_id
        ).distinct().all()
        years = [str(y[0]) for y in years if y[0]]
        
        # Get unique transaction types (sources that are PJ or AJ)
        transaction_types = [t for t in sources if t in ['PJ', 'AJ']]
        
        return jsonify({
            'sources': sorted(meaningful_sources),
            'category_headings': sorted(meaningful_categories),
            'years': sorted(years),
            'transaction_types': sorted(transaction_types)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tax-returns/<int:tax_return_id>/transactions', methods=['GET'])
@jwt_required()
def get_tax_return_transactions(tax_return_id):
    """Get saved transaction data from database for a tax return"""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify tax return belongs to user
        tax_return = TaxReturn.query.filter_by(
            id=tax_return_id, 
            user_id=current_user_id
        ).first()
        
        if not tax_return:
            return jsonify({'error': 'Tax return not found'}), 404
        
        # Get transactions from database
        transactions = TaxReturnTransaction.query.filter_by(
            tax_return_id=tax_return_id,
            user_id=current_user_id
        ).order_by(TaxReturnTransaction.date.asc(), TaxReturnTransaction.id.asc()).all()
        
        return jsonify({
            'transactions': [transaction.to_dict() for transaction in transactions],
            'total_count': len(transactions),
            'tax_return': {
                'id': tax_return.id,
                'year': tax_return.year,
                'filename': tax_return.filename,
                'uploaded_at': tax_return.uploaded_at.isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def calculate_amount_similarity(tax_amount, bank_amount):
    """Calculate similarity between tax and bank transaction amounts - EXACT MATCH ONLY"""
    if tax_amount == 0 and bank_amount == 0:
        return 1.0
    if tax_amount == 0 or bank_amount == 0:
        return 0.0
    
    # Check if amounts have the same sign (same direction)
    same_direction = (tax_amount > 0 and bank_amount > 0) or (tax_amount < 0 and bank_amount < 0)
    
    if not same_direction:
        # Different directions (e.g., expense vs income) - no match
        return 0.0
    
    # Use absolute values for comparison since direction is already checked
    abs_tax_amount = abs(tax_amount)
    abs_bank_amount = abs(bank_amount)
    
    # EXACT MATCH ONLY - no tolerance for differences
    if abs(abs_tax_amount - abs_bank_amount) < 0.01:
        return 1.0
    else:
        return 0.0

def calculate_date_similarity(tax_date, bank_date):
    """Calculate similarity between tax and bank transaction dates - only within 3 days"""
    if not tax_date or not bank_date:
        return 0.0
    
    days_diff = abs((tax_date - bank_date).days)
    
    # Strict 3-day rule: reject any matches beyond 3 days
    if days_diff > 3:
        return 0.0
    
    if days_diff == 0:
        return 1.0
    elif days_diff <= 1:
        return 0.9
    elif days_diff <= 2:
        return 0.8
    elif days_diff <= 3:
        return 0.7
    else:
        return 0.0

def calculate_description_similarity(tax_desc, bank_desc):
    """Calculate similarity between tax and bank transaction descriptions"""
    if not tax_desc or not bank_desc:
        return 0.0
    
    # Normalize descriptions by removing common prefixes and converting to lowercase
    tax_normalized = tax_desc.lower().strip()
    bank_normalized = bank_desc.lower().strip()
    
    # Remove common prefixes that indicate direction
    direction_prefixes = ['to:', 'from:', 'paid to', 'received from', 'payment to', 'refund from']
    
    for prefix in direction_prefixes:
        if tax_normalized.startswith(prefix):
            tax_normalized = tax_normalized[len(prefix):].strip()
        if bank_normalized.startswith(prefix):
            bank_normalized = bank_normalized[len(prefix):].strip()
    
    # Convert to word sets
    tax_words = set(tax_normalized.split())
    bank_words = set(bank_normalized.split())
    
    # Remove common words that don't add meaning
    stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'shall'}
    
    tax_words = tax_words - stop_words
    bank_words = bank_words - stop_words
    
    if not tax_words or not bank_words:
        return 0.0
    
    # Calculate Jaccard similarity
    intersection = tax_words.intersection(bank_words)
    union = tax_words.union(bank_words)
    
    jaccard = len(intersection) / len(union) if union else 0.0
    
    # Boost score if there are exact word matches
    exact_matches = len(intersection)
    if exact_matches >= 2:
        jaccard = min(1.0, jaccard + 0.2)
    
    return jaccard

def calculate_reference_similarity(tax_ref, bank_ref):
    """Calculate similarity between tax and bank transaction references"""
    if not tax_ref or not bank_ref:
        return 0.0
    
    # Exact match
    if tax_ref.strip().lower() == bank_ref.strip().lower():
        return 1.0
    
    # Partial match (one contains the other)
    tax_ref_lower = tax_ref.strip().lower()
    bank_ref_lower = bank_ref.strip().lower()
    
    if tax_ref_lower in bank_ref_lower or bank_ref_lower in tax_ref_lower:
        return 0.7
    
    # Character similarity
    similarity = SequenceMatcher(None, tax_ref_lower, bank_ref_lower).ratio()
    
    return similarity if similarity > 0.6 else 0.0

@app.route('/api/tax-returns/<int:tax_return_id>/match-transactions', methods=['GET'])
@jwt_required()
def get_potential_matches(tax_return_id):
    """Get potential bank transaction matches for tax return transactions"""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify tax return belongs to user
        tax_return = TaxReturn.query.filter_by(
            id=tax_return_id, 
            user_id=current_user_id
        ).first()
        
        if not tax_return:
            return jsonify({'error': 'Tax return not found'}), 404
        
        # Get all tax return transactions that don't have matches yet
        # First get all tax return transactions for this return
        all_tax_transactions = TaxReturnTransaction.query.filter_by(
            tax_return_id=tax_return_id,
            user_id=current_user_id
        ).all()
        
        # Get all matched transaction IDs for this user
        matched_tax_transaction_ids = [
            match.tax_return_transaction_id for match in 
            TransactionMatch.query.filter_by(user_id=current_user_id).all()
        ]
        
        # Filter out already matched transactions
        unmatched_tax_transactions = [
            tx for tx in all_tax_transactions 
            if tx.id not in matched_tax_transaction_ids
        ]
        
        # Get all bank transactions for the user
        # Note: BusinessAccount model may not have user_id field yet, or user_id might be null
        try:
            bank_transactions = BankTransaction.query.join(BusinessAccount).filter(
                BusinessAccount.user_id == current_user_id
            ).all()
            print(f"DEBUG: Found {len(bank_transactions)} bank transactions with user_id filter")
        except Exception as e:
            # Fallback: get all bank transactions if user_id field doesn't exist
            bank_transactions = BankTransaction.query.join(BusinessAccount).all()
            print(f"DEBUG: Using fallback (exception) - found {len(bank_transactions)} bank transactions (no user_id filter)")
        
        # Additional fallback: if no transactions found with user_id filter, get all
        if len(bank_transactions) == 0:
            bank_transactions = BankTransaction.query.join(BusinessAccount).all()
            print(f"DEBUG: No transactions with user_id filter, using all {len(bank_transactions)} bank transactions")
        
        # Get all already matched bank transaction IDs to avoid repeated queries
        matched_bank_transaction_ids = [
            match.bank_transaction_id for match in 
            TransactionMatch.query.filter_by(user_id=current_user_id).all()
        ]
        
        # Filter out already matched bank transactions
        unmatched_bank_transactions = [
            bt for bt in bank_transactions 
            if bt.id not in matched_bank_transaction_ids
        ]
        
        # Limit the number of transactions to process to prevent timeouts
        max_tax_transactions = 1000  # Increased to show more tax transactions
        max_bank_transactions = 2000  # Increased to show more bank transactions
        
        if len(unmatched_tax_transactions) > max_tax_transactions:
            unmatched_tax_transactions = unmatched_tax_transactions[:max_tax_transactions]
        
        if len(unmatched_bank_transactions) > max_bank_transactions:
            unmatched_bank_transactions = unmatched_bank_transactions[:max_bank_transactions]
        
        # EFFICIENT APPROACH: Pre-filter bank transactions by date range
        # Get all tax transaction dates to determine the overall date range
        tax_dates = [tx.date for tx in unmatched_tax_transactions if tx.date]
        
        if not tax_dates:
            return jsonify({
                'potential_matches': [],
                'total_unmatched': len(unmatched_tax_transactions),
                'auto_matched_count': 0,
                'message': 'No tax transactions with valid dates found'
            })
        
        # Calculate date range: min_date - 3 days to max_date + 3 days
        min_tax_date = min(tax_dates)
        max_tax_date = max(tax_dates)
        from datetime import timedelta
        
        search_start_date = min_tax_date - timedelta(days=3)
        search_end_date = max_tax_date + timedelta(days=3)
        
        # Pre-filter bank transactions to only those within the date range
        # This dramatically reduces the number of comparisons needed
        filtered_bank_transactions = [
            bt for bt in unmatched_bank_transactions 
            if bt.transaction_date and search_start_date <= bt.transaction_date <= search_end_date
        ]
        
        print(f"EFFICIENCY: Reduced bank transactions from {len(unmatched_bank_transactions)} to {len(filtered_bank_transactions)}")
        print(f"Date range: {search_start_date} to {search_end_date}")
        
        # Create potential matches with simplified algorithm (exact amount + date within 3 days)
        potential_matches = []
        auto_matched_count = 0
        
        print(f"DEBUG: Processing {len(unmatched_tax_transactions)} tax transactions against {len(filtered_bank_transactions)} bank transactions")
        
        for tax_transaction in unmatched_tax_transactions:
            # Calculate tax amount to match bank transaction format
            # Bank transactions are negative for money going out (debits), positive for money coming in (credits)
            if tax_transaction.debit > 0:
                tax_amount = -tax_transaction.debit  # Debit (expense) - negative to match bank format
            elif tax_transaction.credit > 0:
                tax_amount = tax_transaction.credit  # Credit (income) - positive to match bank format
            else:
                tax_amount = 0
            
            tax_date = tax_transaction.date
            
            # Skip if no date
            if not tax_date:
                continue
            
            matches = []
            
            # SIMPLIFIED MATCHING: Only exact amount + date within 3 days
            matches_found = 0
            for bank_transaction in filtered_bank_transactions:
                # Check date is within 3 days
                if bank_transaction.transaction_date:
                    days_diff = abs((tax_date - bank_transaction.transaction_date).days)
                    if days_diff > 3:
                        continue  # Skip this bank transaction entirely
                
                # Check for exact amount match
                if tax_amount == bank_transaction.amount:
                    # Perfect match! Same amount and date within 3 days
                    confidence = 1.0 - (days_diff * 0.05)  # Slight penalty for date difference
                    matches.append({
                        'bank_transaction': bank_transaction.to_dict(),
                        'confidence': confidence,
                        'amount_similarity': 1.0,
                        'date_similarity': 1.0 - (days_diff * 0.05),
                        'description_similarity': 0.0,  # Not used in simplified matching
                        'reference_similarity': 0.0     # Not used in simplified matching
                    })
                    matches_found += 1
            
            if matches_found > 0:
                print(f"DEBUG: Tax transaction {tax_transaction.id} (€{tax_amount} on {tax_date}) found {matches_found} matches")
            
            # Sort by confidence and take top 3 (reduced from 5 to avoid overwhelming)
            matches.sort(key=lambda x: x['confidence'], reverse=True)
            matches = matches[:3]
            
            # Check if we should auto-match the top result
            auto_matched = False
            if matches and matches[0]['confidence'] >= 0.8:  # Simplified threshold for exact matches
                best_match = matches[0]
                try:
                    # Get suggested category for this bank transaction
                    suggested_category = None
                    try:
                        # Get categories and find best match for this bank transaction
                        categories = TransactionCategory.query.filter_by(user_id=current_user_id).all()
                        best_category = None
                        best_score = 0.0
                        
                        for category in categories:
                            score, matches = category.calculate_similarity_score(best_match['bank_transaction'])
                            if score > best_score:
                                best_score = score
                                best_category = category
                        
                        if best_category and best_score > 0.3:  # Minimum threshold for category suggestion
                            suggested_category = best_category.category_name
                            print(f"DEBUG: Suggested category '{suggested_category}' (score: {best_score:.2f}) for bank transaction {best_match['bank_transaction']['id']}")
                        
                    except Exception as e:
                        print(f"DEBUG: Error getting category suggestion: {e}")
                    
                    # Auto-create match
                    match = TransactionMatch(
                        tax_return_transaction_id=tax_transaction.id,
                        bank_transaction_id=best_match['bank_transaction']['id'],
                        user_id=current_user_id,
                        confidence_score=best_match['confidence'],
                        match_method='auto_high_confidence',
                        accountant_category=suggested_category  # Auto-suggested category
                    )
                    db.session.add(match)
                    auto_matched = True
                    auto_matched_count += 1
                except Exception as e:
                    print(f"Error auto-matching: {e}")
            
            if not auto_matched:
                # Add category suggestions to potential matches
                category_suggestions = []
                try:
                    if matches:
                        # Use the first (best) potential match for category suggestions
                        best_bank_txn = matches[0]['bank_transaction']
                        categories = TransactionCategory.query.filter_by(user_id=current_user_id).all()
                        
                        for category in categories:
                            score, matches_count = category.calculate_similarity_score(best_bank_txn)
                            if score > 0.1:  # Lower threshold for suggestions
                                category_suggestions.append({
                                    'category_name': category.category_name,
                                    'category_type': category.category_type,
                                    'similarity_score': score,
                                    'keyword_matches': matches_count
                                })
                        
                        # Sort by similarity score
                        category_suggestions.sort(key=lambda x: x['similarity_score'], reverse=True)
                        category_suggestions = category_suggestions[:3]  # Top 3 suggestions
                        
                except Exception as e:
                    print(f"DEBUG: Error getting category suggestions for potential matches: {e}")
                
                potential_matches.append({
                    'tax_transaction': tax_transaction.to_dict(),
                    'potential_matches': matches[:5],
                    'category_suggestions': category_suggestions
                })
        
        # Commit auto-matches
        if auto_matched_count > 0:
            db.session.commit()
        
        return jsonify({
            'potential_matches': potential_matches,
            'total_unmatched': len(unmatched_tax_transactions),
            'auto_matched_count': auto_matched_count,
            'message': f'Automatically matched {auto_matched_count} high-confidence transactions' if auto_matched_count > 0 else None
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transaction-categories/extract', methods=['POST'])
@jwt_required()
def extract_transaction_categories():
    """Extract all categories from tax return transactions and populate the category table"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get all tax return transactions for the user
        tax_transactions = TaxReturnTransaction.query.join(TaxReturn).filter(
            TaxReturn.user_id == current_user_id
        ).all()
        
        if not tax_transactions:
            return jsonify({'message': 'No tax transactions found', 'categories_extracted': 0}), 200
        
        # Dictionary to store unique categories
        categories_dict = {}
        
        for tx in tax_transactions:
            # Extract category from transaction name (assuming it follows a pattern)
            category_name = extract_category_from_transaction(tx)
            category_type = determine_category_type(tx)
            
            if not category_name:
                continue
            
            # Create unique key for this category
            key = f"{category_name}_{category_type}"
            
            if key not in categories_dict:
                categories_dict[key] = {
                    'category_name': category_name,
                    'category_type': category_type,
                    'description_keywords': set(),
                    'payer_keywords': set(),
                    'reference_keywords': set(),
                    'usage_count': 0,
                    'total_amount': 0.0,
                    'amounts': [],
                    'years': set(),
                    'tax_return_ids': set()
                }
            
            category = categories_dict[key]
            category['usage_count'] += 1
            category['total_amount'] += abs(tx.debit or tx.credit or 0)
            category['amounts'].append(tx.debit or tx.credit or 0)
            category['years'].add(tx.tax_return.year if tx.tax_return else 'Unknown')
            category['tax_return_ids'].add(tx.tax_return_id)
            
            # Extract keywords from transaction fields
            if tx.name:
                category['description_keywords'].update(extract_keywords(tx.name))
            if tx.reference:
                category['reference_keywords'].update(extract_keywords(tx.reference))
            if tx.source:
                category['payer_keywords'].update(extract_keywords(tx.source))
        
        # Save categories to database
        categories_created = 0
        for key, category_data in categories_dict.items():
            # Check if category already exists
            existing = TransactionCategory.query.filter_by(
                user_id=current_user_id,
                category_name=category_data['category_name'],
                category_type=category_data['category_type']
            ).first()
            
            if not existing:
                # Calculate average amount
                avg_amount = sum(category_data['amounts']) / len(category_data['amounts']) if category_data['amounts'] else 0.0
                
                new_category = TransactionCategory(
                    user_id=current_user_id,
                    category_name=category_data['category_name'],
                    category_type=category_data['category_type'],
                    description_keywords=','.join(category_data['description_keywords']) if category_data['description_keywords'] else None,
                    payer_keywords=','.join(category_data['payer_keywords']) if category_data['payer_keywords'] else None,
                    reference_keywords=','.join(category_data['reference_keywords']) if category_data['reference_keywords'] else None,
                    usage_count=category_data['usage_count'],
                    total_amount=category_data['total_amount'],
                    average_amount=avg_amount,
                    source_years=','.join(sorted(category_data['years'])),
                    created_from_tax_return_id=min(category_data['tax_return_ids'])
                )
                
                db.session.add(new_category)
                categories_created += 1
        
        db.session.commit()
        
        return jsonify({
            'message': f'Successfully extracted {categories_created} categories from {len(tax_transactions)} transactions',
            'categories_extracted': categories_created,
            'total_transactions_processed': len(tax_transactions),
            'total_unique_categories': len(categories_dict)
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def extract_category_from_transaction(tx):
    """Extract category name from transaction"""
    if not tx.name:
        return None
    
    # Simple category extraction - look for common patterns
    name = tx.name.lower().strip()
    
    # Common accounting categories
    category_mappings = {
        'hosting': ['hosting', 'web hosting', 'server'],
        'consultancy': ['consultancy', 'consulting', 'consultant'],
        'rent': ['rent', 'rental', 'lease'],
        'insurance': ['insurance', 'premium'],
        'utilities': ['electricity', 'gas', 'water', 'utility'],
        'office supplies': ['office', 'supplies', 'stationery'],
        'travel': ['travel', 'mileage', 'transport'],
        'professional fees': ['legal', 'accountant', 'audit', 'professional'],
        'marketing': ['marketing', 'advertising', 'promotion'],
        'software': ['software', 'license', 'subscription'],
        'bank charges': ['bank', 'charge', 'fee'],
        'tax': ['tax', 'vat', 'revenue'],
        'salary': ['salary', 'wages', 'payroll'],
        'pension': ['pension', 'retirement'],
        'phone': ['phone', 'telephone', 'mobile'],
        'internet': ['internet', 'broadband', 'wifi']
    }
    
    for category, keywords in category_mappings.items():
        if any(keyword in name for keyword in keywords):
            return category.title()
    
    # If no specific category found, try to extract from the transaction name
    # Look for patterns like "To [Person/Company]" or common business terms
    if 'to ' in name:
        return 'Payments'
    elif 'from ' in name:
        return 'Receipts'
    elif 'posting' in name or 'summary' in name:
        return 'Accounting Adjustments'
    else:
        return 'Other'

def determine_category_type(tx):
    """Determine if this is income, expense, asset, or liability"""
    if tx.credit > 0:
        return 'income'
    elif tx.debit > 0:
        return 'expense'
    else:
        return 'other'

def extract_keywords(text):
    """Extract meaningful keywords from text"""
    if not text:
        return set()
    
    # Remove common words and extract meaningful terms
    common_words = {'to', 'from', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'by', 'for', 'with', 'of', 'payment', 'invoice', 'receipt'}
    
    words = text.lower().split()
    keywords = [word.strip('.,!?()[]{}') for word in words if len(word) > 2 and word not in common_words]
    
    return set(keywords)

@app.route('/api/transaction-categories', methods=['GET'])
@jwt_required()
def get_transaction_categories():
    """Get all transaction categories for the user"""
    try:
        current_user_id = get_jwt_identity()
        
        categories = TransactionCategory.query.filter_by(user_id=current_user_id).order_by(
            TransactionCategory.usage_count.desc(),
            TransactionCategory.category_name
        ).all()
        
        return jsonify([category.to_dict() for category in categories])
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transaction-categories/suggest', methods=['POST'])
@jwt_required()
def suggest_transaction_category():
    """Suggest category for a bank transaction based on existing categories"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        bank_transaction = data.get('bank_transaction')
        if not bank_transaction:
            return jsonify({'error': 'Bank transaction data required'}), 400
        
        # Get all categories for the user
        categories = TransactionCategory.query.filter_by(user_id=current_user_id).all()
        
        if not categories:
            return jsonify({'suggestions': [], 'message': 'No categories available. Please extract categories first.'})
        
        # Calculate similarity scores for each category
        suggestions = []
        for category in categories:
            score, matches = category.calculate_similarity_score(bank_transaction)
            if score > 0:
                suggestions.append({
                    'category': category.to_dict(),
                    'similarity_score': score,
                    'keyword_matches': matches
                })
        
        # Sort by similarity score
        suggestions.sort(key=lambda x: x['similarity_score'], reverse=True)
        
        return jsonify({
            'suggestions': suggestions[:5],  # Top 5 suggestions
            'total_categories_checked': len(categories)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tax-returns/<int:tax_return_id>/auto-matches', methods=['GET'])
@jwt_required()
def get_auto_matches(tax_return_id):
    """Get automatically matched transactions that need category assignment"""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify tax return belongs to user
        tax_return = TaxReturn.query.filter_by(
            id=tax_return_id, 
            user_id=current_user_id
        ).first()
        
        if not tax_return:
            return jsonify({'error': 'Tax return not found'}), 404
        
        # Get auto-matched transactions
        auto_matches = TransactionMatch.query.join(TaxReturnTransaction).filter(
            TaxReturnTransaction.tax_return_id == tax_return_id,
            TransactionMatch.user_id == current_user_id,
            TransactionMatch.match_method == 'auto_high_confidence'
            # Removed filter to see all auto-matches, including those with categories
        ).all()
        
        matches_data = []
        for match in auto_matches:
            tax_transaction = match.tax_return_transaction
            bank_transaction = match.bank_transaction
            
            matches_data.append({
                'match_id': match.id,
                'tax_transaction': tax_transaction.to_dict(),
                'bank_transaction': bank_transaction.to_dict(),
                'confidence_score': match.confidence_score,
                'match_method': match.match_method,
                'accountant_category': match.accountant_category
            })
        
        return jsonify({
            'auto_matches': matches_data,
            'total_auto_matched': len(matches_data)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tax-returns/<int:tax_return_id>/apply-category-suggestions', methods=['POST'])
@jwt_required()
def apply_category_suggestions_to_matches(tax_return_id):
    """Apply category suggestions to existing auto-matches that don't have categories"""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify tax return belongs to user
        tax_return = TaxReturn.query.filter_by(
            id=tax_return_id, 
            user_id=current_user_id
        ).first()
        
        if not tax_return:
            return jsonify({'error': 'Tax return not found'}), 404
        
        # Get auto-matched transactions without categories
        auto_matches = TransactionMatch.query.join(TaxReturnTransaction).filter(
            TaxReturnTransaction.tax_return_id == tax_return_id,
            TransactionMatch.user_id == current_user_id,
            TransactionMatch.match_method == 'auto_high_confidence',
            TransactionMatch.accountant_category.is_(None)
        ).all()
        
        updated_count = 0
        categories_applied = {}
        
        for match in auto_matches:
            try:
                bank_transaction = match.bank_transaction
                
                # Get categories and find best match for this bank transaction
                categories = TransactionCategory.query.filter_by(user_id=current_user_id).all()
                best_category = None
                best_score = 0.0
                
                for category in categories:
                    score, matches_count = category.calculate_similarity_score(bank_transaction.to_dict())
                    if score > best_score:
                        best_score = score
                        best_category = category
                
                if best_category and best_score > 0.3:  # Minimum threshold for category suggestion
                    match.accountant_category = best_category.category_name
                    updated_count += 1
                    
                    # Track which categories were applied
                    category_name = best_category.category_name
                    if category_name not in categories_applied:
                        categories_applied[category_name] = 0
                    categories_applied[category_name] += 1
                    
                    print(f"DEBUG: Applied category '{category_name}' (score: {best_score:.2f}) to match {match.id}")
                
            except Exception as e:
                print(f"DEBUG: Error applying category to match {match.id}: {e}")
        
        # Commit all updates
        if updated_count > 0:
            db.session.commit()
        
        return jsonify({
            'message': f'Successfully applied categories to {updated_count} matches',
            'updated_count': updated_count,
            'total_matches_checked': len(auto_matches),
            'categories_applied': categories_applied
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/transaction-matches', methods=['POST'])
@jwt_required()
def create_transaction_match():
    """Create a match between a tax return transaction and a bank transaction"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        tax_return_transaction_id = data.get('tax_return_transaction_id')
        bank_transaction_id = data.get('bank_transaction_id')
        match_method = data.get('match_method', 'manual')
        confidence_score = data.get('confidence_score', 1.0)
        accountant_category = data.get('accountant_category')
        
        # Verify both transactions belong to the user
        tax_transaction = TaxReturnTransaction.query.filter_by(
            id=tax_return_transaction_id,
            user_id=current_user_id
        ).first()
        
        # Note: BusinessAccount model may not have user_id field yet
        try:
            bank_transaction = BankTransaction.query.join(BusinessAccount).filter(
                BankTransaction.id == bank_transaction_id,
                BusinessAccount.user_id == current_user_id
            ).first()
        except Exception as e:
            # Fallback: get bank transaction without user_id filter
            bank_transaction = BankTransaction.query.join(BusinessAccount).filter(
                BankTransaction.id == bank_transaction_id
            ).first()
        
        if not tax_transaction or not bank_transaction:
            return jsonify({'error': 'Transaction not found or access denied'}), 404
        
        # Check if match already exists
        existing_match = TransactionMatch.query.filter_by(
            tax_return_transaction_id=tax_return_transaction_id,
            bank_transaction_id=bank_transaction_id,
            user_id=current_user_id
        ).first()
        
        if existing_match:
            return jsonify({'error': 'Match already exists'}), 400
        
        # Create the match
        match = TransactionMatch(
            tax_return_transaction_id=tax_return_transaction_id,
            bank_transaction_id=bank_transaction_id,
            user_id=current_user_id,
            confidence_score=confidence_score,
            match_method=match_method,
            accountant_category=accountant_category
        )
        
        db.session.add(match)
        
        # Update bank transaction category if provided
        if accountant_category:
            bank_transaction.category = accountant_category
        
        db.session.commit()
        
        # Learn patterns from this match
        learn_from_match(tax_transaction, bank_transaction, accountant_category, current_user_id)
        
        return jsonify({
            'message': 'Match created successfully',
            'match': match.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/transaction-matches/<int:match_id>/category', methods=['PUT'])
@jwt_required()
def update_match_category(match_id):
    """Update the category for an auto-matched transaction"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        category = data.get('category')
        if not category:
            return jsonify({'error': 'Category is required'}), 400
        
        # Get the match
        match = TransactionMatch.query.filter_by(
            id=match_id,
            user_id=current_user_id
        ).first()
        
        if not match:
            return jsonify({'error': 'Match not found'}), 404
        
        # Update the category
        match.accountant_category = category
        
        # Update the bank transaction category
        bank_transaction = match.bank_transaction
        bank_transaction.category = category
        
        db.session.commit()
        
        # Learn from this match
        learn_from_match(match.tax_return_transaction, bank_transaction, category, current_user_id)
        
        return jsonify({
            'message': 'Category updated successfully',
            'match': match.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def learn_from_match(tax_transaction, bank_transaction, category, user_id):
    """Learn patterns from a successful match"""
    try:
        # Learn description patterns
        if tax_transaction.name and bank_transaction.description and category:
            # Extract key words from both descriptions
            tax_words = set(tax_transaction.name.lower().split())
            bank_words = set(bank_transaction.description.lower().split())
            common_words = tax_words.intersection(bank_words)
            
            for word in common_words:
                if len(word) > 3:  # Only learn meaningful words
                    pattern = TransactionLearningPattern.query.filter_by(
                        user_id=user_id,
                        pattern_type='description',
                        pattern_value=word,
                        category=category
                    ).first()
                    
                    if pattern:
                        pattern.times_used += 1
                        pattern.success_rate = (pattern.success_rate * (pattern.times_used - 1) + 1.0) / pattern.times_used
                    else:
                        pattern = TransactionLearningPattern(
                            user_id=user_id,
                            pattern_type='description',
                            pattern_value=word,
                            category=category,
                            confidence=0.8,
                            times_used=1,
                            success_rate=1.0
                        )
                        db.session.add(pattern)
        
        # Learn amount patterns
        if category:
            amount = abs(bank_transaction.amount)
            amount_range = f"{amount * 0.95:.2f}-{amount * 1.05:.2f}"
            
            pattern = TransactionLearningPattern.query.filter_by(
                user_id=user_id,
                pattern_type='amount',
                pattern_value=amount_range,
                category=category
            ).first()
            
            if pattern:
                pattern.times_used += 1
                pattern.success_rate = (pattern.success_rate * (pattern.times_used - 1) + 1.0) / pattern.times_used
            else:
                pattern = TransactionLearningPattern(
                    user_id=user_id,
                    pattern_type='amount',
                    pattern_value=amount_range,
                    category=category,
                    confidence=0.6,
                    times_used=1,
                    success_rate=1.0
                )
                db.session.add(pattern)
        
        db.session.commit()
        
    except Exception as e:
        print(f"Error learning from match: {e}")
        # Don't fail the main operation if learning fails

class TransactionCategoryPredictor:
    """Machine learning service for predicting transaction categories"""
    
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self.model_version = "1.0"
        self.is_trained = False
        self.training_history = []
    
    def extract_features(self, transaction):
        """Extract features from a bank transaction for ML prediction"""
        features = {}
        
        # Text features from description
        description = str(transaction.description or '').lower()
        features['description_length'] = len(description)
        features['has_numbers'] = bool(re.search(r'\d', description))
        features['has_currency'] = bool(re.search(r'[€$£]', description))
        features['word_count'] = len(description.split())
        
        # Amount features
        amount = abs(transaction.amount)
        features['amount'] = amount
        features['amount_log'] = np.log(amount + 1) if amount > 0 else 0
        features['is_positive'] = transaction.amount > 0
        features['is_round_amount'] = amount % 1 == 0
        
        # Date features
        if transaction.transaction_date:
            features['day_of_week'] = transaction.transaction_date.weekday()
            features['day_of_month'] = transaction.transaction_date.day
            features['month'] = transaction.transaction_date.month
            features['year'] = transaction.transaction_date.year
            features['is_weekend'] = transaction.transaction_date.weekday() >= 5
            features['is_month_end'] = transaction.transaction_date.day >= 28
            features['is_quarter_end'] = transaction.transaction_date.month in [3, 6, 9, 12] and transaction.transaction_date.day >= 28
            features['is_year_end'] = transaction.transaction_date.month == 12 and transaction.transaction_date.day >= 28
        
        # Reference features
        reference = str(transaction.reference or '')
        features['has_reference'] = bool(reference)
        features['reference_length'] = len(reference)
        
        return features
    
    def prepare_training_data(self, user_id):
        """Prepare training data from matched transactions"""
        # Get all matched transactions with categories
        matches = TransactionMatch.query.filter_by(
            user_id=user_id,
            accountant_category=TransactionMatch.accountant_category.isnot(None)
        ).join(BankTransaction).all()
        
        if len(matches) < 10:  # Need minimum data for training
            return None, None
        
        X = []  # Features
        y = []  # Categories
        
        for match in matches:
            features = self.extract_features(match.bank_transaction)
            X.append(features)
            y.append(match.accountant_category)
        
        return X, y
    
    def train_model(self, user_id, incremental=False):
        """Train the ML model on matched transaction data"""
        import time
        start_time = time.time()
        
        try:
            # Get training data
            X, y = self.prepare_training_data(user_id)
            
            if X is None or len(X) < 10:
                return False, "Not enough training data. Need at least 10 matched transactions with categories."
            
            # Get tax return years for tracking
            tax_return_years = self.get_tax_return_years(user_id)
            
            # Convert features to DataFrame
            df_features = pd.DataFrame(X)
            
            # Prepare text data for TF-IDF
            descriptions = []
            for match in TransactionMatch.query.filter_by(
                user_id=user_id,
                accountant_category=TransactionMatch.accountant_category.isnot(None)
            ).join(BankTransaction).all():
                descriptions.append(str(match.bank_transaction.description or ''))
            
            # Create TF-IDF features
            self.vectorizer = TfidfVectorizer(
                max_features=150,  # Increased for better text analysis
                stop_words='english',
                ngram_range=(1, 3),  # Include trigrams for better pattern recognition
                min_df=2  # Ignore terms that appear in less than 2 documents
            )
            tfidf_features = self.vectorizer.fit_transform(descriptions).toarray()
            
            # Combine numerical and text features
            tfidf_df = pd.DataFrame(tfidf_features, columns=[f'tfidf_{i}' for i in range(tfidf_features.shape[1])])
            combined_features = pd.concat([df_features.reset_index(drop=True), tfidf_df.reset_index(drop=True)], axis=1)
            
            # Fill NaN values
            combined_features = combined_features.fillna(0)
            
            # Train the model with enhanced parameters
            self.model = RandomForestClassifier(
                n_estimators=200,  # Increased for better performance
                max_depth=15,      # Increased for more complex patterns
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                class_weight='balanced',
                n_jobs=-1  # Use all available cores
            )
            
            # Split data for validation
            X_train, X_test, y_train, y_test = train_test_split(
                combined_features, y, test_size=0.2, random_state=42, stratify=y
            )
            
            self.model.fit(X_train, y_train)
            
            # Evaluate model with comprehensive metrics
            y_pred = self.model.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted')
            
            # Update model version
            if incremental:
                version_parts = self.model_version.split('.')
                self.model_version = f"{version_parts[0]}.{int(version_parts[1]) + 1}"
            else:
                self.model_version = "1.0"
            
            self.is_trained = True
            training_duration = time.time() - start_time
            
            # Save training history to database
            self.save_training_history(
                user_id=user_id,
                training_samples=len(X),
                tax_return_years=tax_return_years,
                matched_transactions_count=len(X),
                accuracy=accuracy,
                precision=precision,
                recall=recall,
                f1_score=f1,
                features_count=combined_features.shape[1],
                training_duration_seconds=training_duration
            )
            
            return True, f"Model v{self.model_version} trained successfully!\nAccuracy: {accuracy:.2%}\nPrecision: {precision:.2%}\nRecall: {recall:.2%}\nF1-Score: {f1:.2%}\nTraining time: {training_duration:.1f}s"
            
        except Exception as e:
            # Save failed training attempt
            self.save_training_history(
                user_id=user_id,
                training_samples=0,
                tax_return_years="",
                matched_transactions_count=0,
                status='failed',
                error_message=str(e)
            )
            return False, f"Training failed: {str(e)}"
    
    def get_tax_return_years(self, user_id):
        """Get years of tax returns used for training"""
        tax_returns = TaxReturn.query.filter_by(user_id=user_id).all()
        years = [str(tr.year) for tr in tax_returns if tr.year]
        return ','.join(sorted(years))
    
    def save_training_history(self, user_id, training_samples, tax_return_years, matched_transactions_count, 
                            accuracy=None, precision=None, recall=None, f1_score=None, 
                            features_count=None, training_duration_seconds=None, 
                            status='completed', error_message=None):
        """Save training history to database"""
        try:
            history = ModelTrainingHistory(
                user_id=user_id,
                model_version=self.model_version,
                training_samples=training_samples,
                tax_return_years=tax_return_years,
                matched_transactions_count=matched_transactions_count,
                accuracy=accuracy,
                precision=precision,
                recall=recall,
                f1_score=f1_score,
                features_count=features_count,
                training_duration_seconds=training_duration_seconds,
                status=status,
                error_message=error_message
            )
            db.session.add(history)
            db.session.commit()
        except Exception as e:
            print(f"Error saving training history: {e}")
            db.session.rollback()
    
    def predict_category(self, transaction):
        """Predict category for a single transaction"""
        if not self.is_trained or not self.model:
            return None, 0.0
        
        try:
            # Extract features
            features = self.extract_features(transaction)
            df_features = pd.DataFrame([features])
            
            # Get TF-IDF features for description
            description = str(transaction.description or '')
            tfidf_features = self.vectorizer.transform([description]).toarray()
            tfidf_df = pd.DataFrame(tfidf_features, columns=[f'tfidf_{i}' for i in range(tfidf_features.shape[1])])
            
            # Combine features
            combined_features = pd.concat([df_features.reset_index(drop=True), tfidf_df.reset_index(drop=True)], axis=1)
            combined_features = combined_features.fillna(0)
            
            # Make prediction
            prediction = self.model.predict(combined_features)[0]
            confidence = max(self.model.predict_proba(combined_features)[0])
            
            return prediction, confidence
            
        except Exception as e:
            print(f"Prediction error: {e}")
            return None, 0.0

# Global predictor instance
predictor = TransactionCategoryPredictor()

@app.route('/api/train-category-model', methods=['POST'])
@jwt_required()
def train_category_model():
    """Train the ML model on matched transaction data"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json() or {}
        incremental = data.get('incremental', False)
        
        success, message = predictor.train_model(current_user_id, incremental=incremental)
        
        if success:
            return jsonify({
                'message': message,
                'model_version': predictor.model_version,
                'is_trained': predictor.is_trained,
                'incremental': incremental
            })
        else:
            return jsonify({'error': message}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/training-history', methods=['GET'])
@jwt_required()
def get_training_history():
    """Get training history for the user"""
    try:
        current_user_id = get_jwt_identity()
        
        history = ModelTrainingHistory.query.filter_by(
            user_id=current_user_id
        ).order_by(ModelTrainingHistory.training_date.desc()).all()
        
        return jsonify({
            'training_history': [h.to_dict() for h in history]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/model-performance', methods=['GET'])
@jwt_required()
def get_model_performance():
    """Get current model performance metrics"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get latest successful training
        latest_training = ModelTrainingHistory.query.filter_by(
            user_id=current_user_id,
            status='completed'
        ).order_by(ModelTrainingHistory.training_date.desc()).first()
        
        if not latest_training:
            return jsonify({
                'model_version': None,
                'training_date': None,
                'performance': {
                    'accuracy': None,
                    'precision': None,
                    'recall': None,
                    'f1_score': None
                },
                'training_data': {
                    'samples': 0,
                    'tax_return_years': '',
                    'features_count': 0,
                    'training_duration': 0
                },
                'predictions': {
                    'total': 0,
                    'validated': 0,
                    'pending': 0,
                    'validation_rate': 0
                }
            })
        
        # Get prediction statistics
        total_predictions = TransactionCategoryPrediction.query.filter_by(
            user_id=current_user_id
        ).count()
        
        validated_predictions = TransactionCategoryPrediction.query.filter_by(
            user_id=current_user_id,
            validation_status='validated'
        ).count()
        
        pending_predictions = TransactionCategoryPrediction.query.filter_by(
            user_id=current_user_id,
            validation_status='pending'
        ).count()
        
        return jsonify({
            'model_version': latest_training.model_version,
            'training_date': latest_training.training_date.isoformat(),
            'performance': {
                'accuracy': latest_training.accuracy,
                'precision': latest_training.precision,
                'recall': latest_training.recall,
                'f1_score': latest_training.f1_score
            },
            'training_data': {
                'samples': latest_training.training_samples,
                'tax_return_years': latest_training.tax_return_years,
                'features_count': latest_training.features_count,
                'training_duration': latest_training.training_duration_seconds
            },
            'predictions': {
                'total': total_predictions,
                'validated': validated_predictions,
                'pending': pending_predictions,
                'validation_rate': validated_predictions / total_predictions if total_predictions > 0 else 0
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict-all-transactions', methods=['POST'])
@jwt_required()
def predict_all_transactions():
    """Apply predictions to all historical bank transactions"""
    try:
        current_user_id = get_jwt_identity()
        
        if not predictor.is_trained:
            return jsonify({'error': 'Model not trained. Please train the model first.'}), 400
        
        # Get all bank transactions for the user
        # Note: BusinessAccount model may not have user_id field yet
        try:
            bank_transactions = BankTransaction.query.join(BusinessAccount).filter(
                BusinessAccount.user_id == current_user_id
            ).all()
        except Exception as e:
            # Fallback: get all bank transactions if user_id field doesn't exist
            bank_transactions = BankTransaction.query.join(BusinessAccount).all()
        
        predictions_created = 0
        predictions_updated = 0
        
        for transaction in bank_transactions:
            # Check if prediction already exists
            existing_prediction = TransactionCategoryPrediction.query.filter_by(
                bank_transaction_id=transaction.id,
                user_id=current_user_id
            ).first()
            
            # Get prediction
            predicted_category, confidence = predictor.predict_category(transaction)
            
            if predicted_category:
                if existing_prediction:
                    # Update existing prediction
                    existing_prediction.predicted_category = predicted_category
                    existing_prediction.prediction_confidence = confidence
                    existing_prediction.prediction_model_version = predictor.model_version
                    predictions_updated += 1
                else:
                    # Create new prediction
                    prediction = TransactionCategoryPrediction(
                        bank_transaction_id=transaction.id,
                        user_id=current_user_id,
                        predicted_category=predicted_category,
                        prediction_confidence=confidence,
                        prediction_model_version=predictor.model_version,
                        validation_status='pending'
                    )
                    db.session.add(prediction)
                    predictions_created += 1
        
        db.session.commit()
        
        return jsonify({
            'message': f'Predictions applied successfully!',
            'predictions_created': predictions_created,
            'predictions_updated': predictions_updated,
            'total_transactions': len(bank_transactions)
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/transaction-predictions', methods=['GET'])
@jwt_required()
def get_transaction_predictions():
    """Get all transaction predictions for validation"""
    try:
        current_user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        status = request.args.get('status', 'all')  # all, pending, validated, rejected
        
        query = TransactionCategoryPrediction.query.filter_by(user_id=current_user_id)
        
        if status != 'all':
            query = query.filter_by(validation_status=status)
        
        predictions = query.join(BankTransaction).order_by(
            TransactionCategoryPrediction.prediction_confidence.desc()
        ).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        predictions_data = []
        for pred in predictions.items:
            predictions_data.append({
                'prediction': pred.to_dict(),
                'bank_transaction': pred.bank_transaction.to_dict()
            })
        
        return jsonify({
            'predictions': predictions_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': predictions.total,
                'pages': predictions.pages,
                'has_next': predictions.has_next,
                'has_prev': predictions.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transaction-predictions/<int:prediction_id>/validate', methods=['PUT'])
@jwt_required()
def validate_prediction(prediction_id):
    """Validate or update a transaction prediction"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        prediction = TransactionCategoryPrediction.query.filter_by(
            id=prediction_id,
            user_id=current_user_id
        ).first()
        
        if not prediction:
            return jsonify({'error': 'Prediction not found'}), 404
        
        # Update validation data
        prediction.validated_category = data.get('validated_category')
        prediction.validation_status = data.get('validation_status', 'validated')
        prediction.validation_notes = data.get('validation_notes', '')
        
        # Update bank transaction category if validated
        if prediction.validation_status == 'validated' and prediction.validated_category:
            prediction.bank_transaction.category = prediction.validated_category
        
        db.session.commit()
        
        return jsonify({
            'message': 'Prediction validated successfully',
            'prediction': prediction.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/transaction-predictions/bulk-validate', methods=['POST'])
@jwt_required()
def bulk_validate_predictions():
    """Bulk validate multiple predictions"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        validations = data.get('validations', [])
        validated_count = 0
        
        for validation in validations:
            prediction_id = validation.get('prediction_id')
            validated_category = validation.get('validated_category')
            validation_status = validation.get('validation_status', 'validated')
            validation_notes = validation.get('validation_notes', '')
            
            prediction = TransactionCategoryPrediction.query.filter_by(
                id=prediction_id,
                user_id=current_user_id
            ).first()
            
            if prediction:
                prediction.validated_category = validated_category
                prediction.validation_status = validation_status
                prediction.validation_notes = validation_notes
                
                # Update bank transaction category if validated
                if validation_status == 'validated' and validated_category:
                    prediction.bank_transaction.category = validated_category
                
                validated_count += 1
        
        db.session.commit()
        
        return jsonify({
            'message': f'Bulk validation completed successfully',
            'validated_count': validated_count
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=int(os.environ.get('PORT', 5002)))
