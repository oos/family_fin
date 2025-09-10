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
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///family_finance.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-string')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# Import models and db
from models import db, User, Person, Property, Income, Loan, Family, BusinessAccount, Pension, LoanERC, LoanPayment, BankTransaction

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
    username = data.get('username')
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
        
        # Expected CSV columns (flexible mapping) - Enhanced for Revolut and other banks
        expected_columns = {
            'date': ['date', 'transaction_date', 'Date', 'Transaction Date', 'Transaction date', 'Date completed', 'Completed date', 'Date completed (Europe/Dublin)', 'Date completed (UTC)'],
            'description': ['description', 'Description', 'Transaction Description', 'Narrative', 'Transaction details', 'Details', 'Payee', 'Merchant'],
            'amount': ['amount', 'Amount', 'Transaction Amount', 'Value', 'Paid out', 'Paid in', 'Money out', 'Money in', 'Out', 'In', 'Total amount'],
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
        
        # Find column mappings
        headers = csv_reader.fieldnames
        column_mapping = {}
        
        for field, possible_names in expected_columns.items():
            for header in headers:
                if header.lower() in [name.lower() for name in possible_names]:
                    column_mapping[field] = header
                    break
        
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
                
                # Parse amount - handle Revolut's separate "Paid out" and "Paid in" columns
                amount = 0.0
                if 'amount' in column_mapping:
                    # Standard amount column
                    amount_str = row[column_mapping['amount']].strip().replace(',', '')
                    try:
                        amount = float(amount_str) if amount_str else 0.0
                    except ValueError:
                        errors.append(f"Row {row_num}: Invalid amount format: {amount_str}")
                        continue
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
                
                # Create transaction record with ALL Revolut data
                transaction = BankTransaction(
                    business_account_id=account_id,
                    transaction_date=transaction_date,
                    description=description,
                    amount=amount,
                    balance=balance,
                    reference=reference,
                    transaction_type=transaction_type,
                    
                    # Revolut specific fields - capture ALL data
                    date_started_utc=_parse_datetime(row.get('Date started (UTC)')),
                    date_completed_utc=_parse_datetime(row.get('Date completed (UTC)')),
                    date_started_dublin=_parse_datetime(row.get('Date started (Europe/Dublin)')),
                    date_completed_dublin=_parse_datetime(row.get('Date completed (Europe/Dublin)')),
                    transaction_id=row.get('ID', '').strip() if row.get('ID') else None,
                    state=row.get('State', '').strip() if row.get('State') else None,
                    payer=row.get('Payer', '').strip() if row.get('Payer') else None,
                    card_number=row.get('Card number', '').strip() if row.get('Card number') else None,
                    card_label=row.get('Card label', '').strip() if row.get('Card label') else None,
                    card_state=row.get('Card state', '').strip() if row.get('Card state') else None,
                    orig_currency=row.get('Orig currency', '').strip() if row.get('Orig currency') else None,
                    orig_amount=_safe_float(row.get('Orig amount')),
                    payment_currency=row.get('Payment currency', '').strip() if row.get('Payment currency') else None,
                    total_amount=_safe_float(row.get('Total amount')),
                    exchange_rate=_safe_float(row.get('Exchange rate')),
                    fee=_safe_float(row.get('Fee')),
                    fee_currency=row.get('Fee currency', '').strip() if row.get('Fee currency') else None,
                    account=row.get('Account', '').strip() if row.get('Account') else None,
                    beneficiary_account_number=row.get('Beneficiary account number', '').strip() if row.get('Beneficiary account number') else None,
                    beneficiary_sort_code=row.get('Beneficiary sort code or routing number', '').strip() if row.get('Beneficiary sort code or routing number') else None,
                    beneficiary_iban=row.get('Beneficiary IBAN', '').strip() if row.get('Beneficiary IBAN') else None,
                    beneficiary_bic=row.get('Beneficiary BIC', '').strip() if row.get('Beneficiary BIC') else None,
                    mcc=row.get('MCC', '').strip() if row.get('MCC') else None,
                    related_transaction_id=row.get('Related transaction id', '').strip() if row.get('Related transaction id') else None,
                    spend_program=row.get('Spend program', '').strip() if row.get('Spend program') else None
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
        
        return jsonify({
            'success': True,
            'account': account.to_dict(),
            'transactions': [transaction.to_dict() for transaction in transactions],
            'count': len(transactions)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch transactions: {str(e)}'
        }), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5001)
