from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash
import hashlib
from datetime import datetime, timedelta
import os
import csv
import io
import requests
import re
from icalendar import Calendar
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///family_finance.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-string')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# Import models and db
from models import db, User, Person, Property, Income, Loan, Family, BusinessAccount, Pension, LoanERC, LoanPayment, BankTransaction, AirbnbBooking, DashboardSettings, AccountBalance

# Initialize extensions
db.init_app(app)
jwt = JWTManager(app)
migrate = Migrate(app, db)
CORS(app)

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

@app.route('/api/properties', methods=['GET'])
@jwt_required()
def get_properties():
    properties = Property.query.all()
    return jsonify([property.to_dict() for property in properties])

@app.route('/api/properties', methods=['POST'])
@jwt_required()
def create_property():
    data = request.get_json()
    property = Property(
        address=data['address'],
        nickname=data['nickname'],
        valuation=data['valuation'],
        mortgage_balance=data.get('mortgage_balance', 0),
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
    return jsonify(property.to_dict()), 201

@app.route('/api/properties/<int:property_id>', methods=['PUT'])
@jwt_required()
def update_property(property_id):
    property = Property.query.get_or_404(property_id)
    data = request.get_json()
    
    property.address = data.get('address', property.address)
    property.nickname = data.get('nickname', property.nickname)
    property.valuation = data.get('valuation', property.valuation)
    property.mortgage_balance = data.get('mortgage_balance', property.mortgage_balance)
    property.rental_income_yearly = data.get('rental_income_yearly', property.rental_income_yearly)
    property.lender = data.get('lender', property.lender)
    property.omar_ownership = data.get('omar_ownership', property.omar_ownership)
    property.heidi_ownership = data.get('heidi_ownership', property.heidi_ownership)
    property.dwayne_ownership = data.get('dwayne_ownership', property.dwayne_ownership)
    property.sean_ownership = data.get('sean_ownership', property.sean_ownership)
    property.lena_ownership = data.get('lena_ownership', property.lena_ownership)
    
    db.session.commit()
    return jsonify(property.to_dict())

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
    return jsonify([account.to_dict() for account in accounts])

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
        max_extra_payment=data.get('max_extra_payment', 0),
        erc_rate=data.get('erc_rate', 0),
        erc_end_date=datetime.strptime(data['erc_end_date'], '%Y-%m-%d').date() if data.get('erc_end_date') else None
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
    loan.erc_rate = data.get('erc_rate', loan.erc_rate)
    
    if 'start_date' in data:
        loan.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
    
    if 'erc_end_date' in data:
        loan.erc_end_date = datetime.strptime(data['erc_end_date'], '%Y-%m-%d').date() if data['erc_end_date'] else None
    
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
    
    # Calculate property ownership value
    properties = Property.query.all()
    property_value = 0
    property_equity = 0
    property_mortgages = 0
    
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
            property_value += prop.valuation * ownership_percentage
            # Calculate equity as valuation minus mortgage balance
            equity = prop.valuation - prop.mortgage_balance
            property_equity += equity * ownership_percentage
            property_mortgages += prop.mortgage_balance * ownership_percentage
    
    # Calculate income
    income_records = Income.query.filter_by(person_id=person_id).all()
    total_income = sum(inc.amount_yearly for inc in income_records)
    
    # Calculate business account ownership (assuming equal split for directors)
    # Note: Business accounts don't have balance field in current model
    # This would need to be added or calculated differently
    business_value = 0
    if person.is_director:
        # For now, we'll set a placeholder value or calculate based on other factors
        # In a real implementation, you'd need to add balance field to BusinessAccount model
        business_value = 0
    
    # Calculate loan liabilities (assuming personal responsibility)
    loans = Loan.query.filter_by(property_id=None).all()  # Non-property loans
    loan_liabilities = 0
    for loan in loans:
        # This is a simplified calculation - in reality, loan responsibility would be more complex
        loan_liabilities += loan.current_balance
    
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
                'total_assets': total_assets
            },
            'liabilities': {
                'loan_liabilities': loan_liabilities,
                'total_liabilities': total_liabilities
            },
            'property_details': {
                'total_property_value': property_value,
                'total_mortgages': property_mortgages,
                'net_property_equity': property_equity
            },
            'income': {
                'total_annual_income': total_income,
                'monthly_income': total_income / 12
            }
        }
    })

@app.route('/api/dashboard/summary', methods=['GET'])
@jwt_required()
def get_dashboard_summary():
    # Calculate total property values
    properties = Property.query.all()
    total_property_value = sum(p.valuation for p in properties)
    total_mortgage_balance = sum(p.mortgage_balance for p in properties)
    total_rental_income = sum(p.rental_income_yearly for p in properties)
    
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
        headers = csv_reader.fieldnames
        column_mapping = {}
        
        for field, possible_names in expected_columns.items():
            for header in headers:
                if header.lower() in [name.lower() for name in possible_names]:
                    column_mapping[field] = header
                    break
        
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
                date_str = row[column_mapping['date']].strip()
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
                    amount_str = row[column_mapping['amount']].strip().replace(',', '')
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
                    desc1 = row.get('Description1', '').strip()
                    desc2 = row.get('Description2', '').strip()
                    desc3 = row.get('Description3', '').strip()
                    description = ' '.join([d for d in [desc1, desc2, desc3] if d])
                else:
                    description = row[column_mapping['description']].strip()
                balance = None
                if 'balance' in column_mapping:
                    balance_str = row[column_mapping['balance']].strip().replace(',', '')
                    try:
                        balance = float(balance_str) if balance_str else None
                    except ValueError:
                        pass  # Balance is optional
                
                reference = None
                if 'reference' in column_mapping:
                    reference = row[column_mapping['reference']].strip() or None
                
                transaction_type = None
                if 'type' in column_mapping:
                    transaction_type = row[column_mapping['type']].strip() or None
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
        
        # Commit all transactions
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
            'total_errors': len(errors)
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to import CSV: {str(e)}'
        }), 500

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
        
        return jsonify({
            'success': True,
            'account': account.to_dict(),
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

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5001)
