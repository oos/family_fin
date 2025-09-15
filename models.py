from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='user')  # admin, user
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Family(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    code = db.Column(db.String(10), nullable=False, unique=True)
    description = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    members = db.relationship('Person', backref='family', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Person(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    relationship = db.Column(db.String(100), nullable=False)
    is_director = db.Column(db.Boolean, default=False)
    is_deceased = db.Column(db.Boolean, default=False)
    family_id = db.Column(db.Integer, db.ForeignKey('family.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    income_records = db.relationship('Income', backref='person', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'relationship': self.relationship,
            'is_director': self.is_director,
            'is_deceased': self.is_deceased,
            'family_id': self.family_id,
            'family': self.family.to_dict() if self.family else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Property(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    address = db.Column(db.String(500), nullable=False)
    nickname = db.Column(db.String(50), nullable=False)
    valuation = db.Column(db.Float, nullable=False)
    rental_income_yearly = db.Column(db.Float, default=0)
    lender = db.Column(db.String(100), default='')
    omar_ownership = db.Column(db.Float, default=0)
    heidi_ownership = db.Column(db.Float, default=0)
    dwayne_ownership = db.Column(db.Float, default=0)
    sean_ownership = db.Column(db.Float, default=0)
    lena_ownership = db.Column(db.Float, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self, loans=None):
        # Calculate mortgage balance from loans if provided
        mortgage_balance = 0
        if loans:
            property_loans = [loan for loan in loans if loan.get('property_id') == self.id and loan.get('is_active', True)]
            mortgage_balance = sum(loan.get('current_balance', 0) for loan in property_loans)
        
        equity = self.valuation - mortgage_balance
        return {
            'id': self.id,
            'address': self.address,
            'nickname': self.nickname,
            'valuation': self.valuation,
            'mortgage_balance': mortgage_balance,
            'equity': equity,
            'rental_income_yearly': self.rental_income_yearly,
            'rental_income_monthly': self.rental_income_yearly / 12,
            'lender': self.lender,
            'omar_ownership': self.omar_ownership,
            'heidi_ownership': self.heidi_ownership,
            'dwayne_ownership': self.dwayne_ownership,
            'sean_ownership': self.sean_ownership,
            'lena_ownership': self.lena_ownership,
            'total_ownership': self.omar_ownership + self.heidi_ownership + self.dwayne_ownership + self.sean_ownership + self.lena_ownership,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class BusinessAccount(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # Temporarily commented out until migration is applied
    account_name = db.Column(db.String(200), nullable=False)
    account_number = db.Column(db.String(50), nullable=False)
    bank_name = db.Column(db.String(100), nullable=False)
    company_name = db.Column(db.String(200), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    balance = db.Column(db.Float, default=0.0)
    api_credentials = db.Column(db.JSON, nullable=True)  # Store bank API credentials
    last_refreshed = db.Column(db.DateTime, nullable=True)
    # File storage fields for CSV imports
    last_imported_file_name = db.Column(db.String(255), nullable=True)
    last_imported_file_content = db.Column(db.LargeBinary, nullable=True)
    last_imported_file_size = db.Column(db.Integer, nullable=True)
    last_imported_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    # user = db.relationship('User', backref='business_accounts', lazy=True)  # Temporarily commented out until migration is applied
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': getattr(self, 'user_id', None),  # Handle missing user_id field gracefully
            'account_name': self.account_name,
            'account_number': self.account_number,
            'bank_name': self.bank_name,
            'company_name': self.company_name,
            'is_active': self.is_active,
            'balance': self.balance,
            'api_configured': self.api_credentials is not None,
            'last_refreshed': self.last_refreshed.isoformat() if self.last_refreshed else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Income(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    person_id = db.Column(db.Integer, db.ForeignKey('person.id'), nullable=False)
    income_type = db.Column(db.String(50), nullable=False)  # 'external_source', 'rrltd', 'omhe_props'
    income_category = db.Column(db.String(50), nullable=False, default='non_rental')  # 'rental' or 'non_rental'
    amount_yearly = db.Column(db.Float, nullable=False)
    amount_monthly = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'person_id': self.person_id,
            'person_name': self.person.name if self.person else None,
            'family': self.person.family.to_dict() if self.person and self.person.family else None,
            'income_type': self.income_type,
            'income_category': self.income_category,
            'amount_yearly': self.amount_yearly,
            'amount_monthly': self.amount_monthly,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Loan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id'), nullable=True)
    loan_name = db.Column(db.String(200), nullable=False)
    lender = db.Column(db.String(100), nullable=False)
    loan_type = db.Column(db.String(50), nullable=False)  # 'mortgage', 'personal', 'business', 'interest_only', etc.
    principal_amount = db.Column(db.Float, nullable=False)
    interest_rate = db.Column(db.Float, nullable=False)  # Annual percentage rate
    term_years = db.Column(db.Integer, nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    monthly_payment = db.Column(db.Float, nullable=False)
    current_balance = db.Column(db.Float, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    # Over-payment fields
    regular_overpayment = db.Column(db.Float, default=0)  # Regular monthly over-payment amount
    overpayment_start_month = db.Column(db.Integer, default=1)  # Month to start over-payments
    overpayment_end_month = db.Column(db.Integer, nullable=True)  # Month to end over-payments (null = indefinite)
    max_extra_payment = db.Column(db.Float, default=0)  # Maximum extra payment before ERC kicks in
    # Note: ERC is now handled by separate LoanERC model for multiple entries
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    property = db.relationship('Property', backref='loans')
    
    def calculate_monthly_payment(self):
        """Calculate monthly payment using standard mortgage formula or interest-only"""
        if self.loan_type == 'interest_only':
            # Interest-only loans: only pay interest each month
            monthly_rate = self.interest_rate / 100 / 12
            return self.principal_amount * monthly_rate
        
        if self.interest_rate == 0:
            return self.principal_amount / (self.term_years * 12)
        
        monthly_rate = self.interest_rate / 100 / 12
        num_payments = self.term_years * 12
        
        return self.principal_amount * (monthly_rate * (1 + monthly_rate) ** num_payments) / \
               ((1 + monthly_rate) ** num_payments - 1)
    
    def get_payment_schedule(self, months=12):
        """Get payment schedule for specified number of months with over-payments and ERC"""
        schedule = []
        balance = self.current_balance
        monthly_payment = self.monthly_payment
        monthly_rate = self.interest_rate / 100 / 12
        total_payments = 0
        total_interest = 0
        total_principal = 0
        
        for month in range(1, months + 1):
            if balance <= 0:
                break
            
            # Calculate payment due date for this month
            payment_due_date = self.start_date + timedelta(days=30 * (month - 1))
            
            interest_payment = balance * monthly_rate
            base_principal_payment = min(monthly_payment - interest_payment, balance)
            
            # Calculate over-payment for this month
            overpayment = 0
            if (self.regular_overpayment and self.regular_overpayment > 0 and 
                month >= (self.overpayment_start_month or 1) and 
                (self.overpayment_end_month is None or month <= self.overpayment_end_month)):
                overpayment = min(self.regular_overpayment, balance - base_principal_payment)
            
            # Calculate ERC if applicable using multiple ERC entries
            erc = 0
            if self.erc_entries:
                current_date = self.start_date + timedelta(days=30 * (month - 1))  # Approximate current date
                for erc_entry in self.erc_entries:
                    if (erc_entry.start_date <= current_date <= erc_entry.end_date):
                        erc = balance * (erc_entry.erc_rate / 100)
                        break
            
            total_principal_payment = base_principal_payment + overpayment
            total_payment = monthly_payment + overpayment + erc
            
            balance = max(0, balance - total_principal_payment)
            
            total_payments += total_payment
            total_interest += interest_payment
            total_principal += total_principal_payment
            
            schedule.append({
                'month': month,
                'payment_due_date': payment_due_date.isoformat(),
                'payment': total_payment,
                'base_payment': monthly_payment,
                'overpayment': overpayment,
                'erc': erc,
                'interest': interest_payment,
                'principal': total_principal_payment,
                'base_principal': base_principal_payment,
                'balance': balance
            })
        
        return {
            'schedule': schedule,
            'summary': {
                'total_payments': total_payments,
                'total_interest': total_interest,
                'total_principal': total_principal,
                'total_overpayments': sum(p['overpayment'] for p in schedule),
                'total_erc': sum(p['erc'] for p in schedule)
            }
        }
    
    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'property_name': self.property.nickname if self.property else None,
            'loan_name': self.loan_name,
            'lender': self.lender,
            'loan_type': self.loan_type,
            'principal_amount': self.principal_amount,
            'interest_rate': self.interest_rate,
            'term_years': self.term_years,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'monthly_payment': self.monthly_payment,
            'current_balance': self.current_balance,
            'is_active': self.is_active,
            'regular_overpayment': self.regular_overpayment,
            'overpayment_start_month': self.overpayment_start_month,
            'overpayment_end_month': self.overpayment_end_month,
            'max_extra_payment': self.max_extra_payment,
            'erc_entries': [erc.to_dict() for erc in self.erc_entries] if self.erc_entries else [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Pension(db.Model):
    __tablename__ = 'pension'
    
    id = db.Column(db.Integer, primary_key=True)
    person_id = db.Column(db.Integer, db.ForeignKey('person.id'), nullable=False)
    pension_type = db.Column(db.String(50), nullable=False)  # personal, occupational, company
    contribution_amount = db.Column(db.Numeric(12, 2), nullable=False)
    contribution_frequency = db.Column(db.String(20), nullable=False)  # annual, monthly, quarterly
    tax_year = db.Column(db.Integer, nullable=False)
    is_company_contribution = db.Column(db.Boolean, default=False)
    company_name = db.Column(db.String(100))
    pension_provider = db.Column(db.String(100))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    person = db.relationship('Person', backref='pensions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'person_id': self.person_id,
            'person_name': self.person.name if self.person else None,
            'pension_type': self.pension_type,
            'contribution_amount': float(self.contribution_amount),
            'contribution_frequency': self.contribution_frequency,
            'tax_year': self.tax_year,
            'is_company_contribution': self.is_company_contribution,
            'company_name': self.company_name,
            'pension_provider': self.pension_provider,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class PensionAccount(db.Model):
    __tablename__ = 'pension_account'
    
    id = db.Column(db.Integer, primary_key=True)
    person_id = db.Column(db.Integer, db.ForeignKey('person.id'), nullable=False)
    account_name = db.Column(db.String(100), nullable=False)  # e.g., "Omar's PRSA"
    account_type = db.Column(db.String(50), nullable=False)  # PRSA, AVC, Occupational, etc.
    provider = db.Column(db.String(100), nullable=False)  # e.g., "Zurich Life", "Irish Life"
    account_number = db.Column(db.String(50))
    current_balance = db.Column(db.Numeric(12, 2), default=0)
    is_active = db.Column(db.Boolean, default=True)
    opened_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    person = db.relationship('Person', backref='pension_accounts')
    
    def to_dict(self):
        return {
            'id': self.id,
            'person_id': self.person_id,
            'person_name': self.person.name if self.person else None,
            'account_name': self.account_name,
            'account_type': self.account_type,
            'provider': self.provider,
            'account_number': self.account_number,
            'current_balance': float(self.current_balance) if self.current_balance else 0,
            'is_active': self.is_active,
            'opened_date': self.opened_date.isoformat() if self.opened_date else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class LoanERC(db.Model):
    __tablename__ = 'loan_erc'
    
    id = db.Column(db.Integer, primary_key=True)
    loan_id = db.Column(db.Integer, db.ForeignKey('loan.id'), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    erc_rate = db.Column(db.Numeric(5, 2), nullable=False)  # e.g., 5.00 for 5%
    description = db.Column(db.String(100))  # e.g., "Year 1", "Year 2", etc.
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    loan = db.relationship('Loan', backref='erc_entries')
    
    def to_dict(self):
        return {
            'id': self.id,
            'loan_id': self.loan_id,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'erc_rate': float(self.erc_rate),
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class LoanPayment(db.Model):
    __tablename__ = 'loan_payment'
    
    id = db.Column(db.Integer, primary_key=True)
    loan_id = db.Column(db.Integer, db.ForeignKey('loan.id'), nullable=False)
    month = db.Column(db.Integer, nullable=False)  # Payment month (1, 2, 3, etc.)
    actual_payment = db.Column(db.Numeric(12, 2), nullable=True)  # Actual amount paid
    lump_sum_payment = db.Column(db.Numeric(12, 2), default=0)  # Additional lump sum payment
    payment_date = db.Column(db.Date, nullable=True)  # When payment was actually made
    notes = db.Column(db.Text)  # Additional notes about the payment
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    loan = db.relationship('Loan', backref='payment_records')
    
    def to_dict(self):
        return {
            'id': self.id,
            'loan_id': self.loan_id,
            'month': self.month,
            'actual_payment': float(self.actual_payment) if self.actual_payment else None,
            'lump_sum_payment': float(self.lump_sum_payment) if self.lump_sum_payment else 0,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class BankTransaction(db.Model):
    __tablename__ = 'bank_transaction'
    
    id = db.Column(db.Integer, primary_key=True)
    business_account_id = db.Column(db.Integer, db.ForeignKey('business_account.id'), nullable=False)
    
    # Core transaction fields
    transaction_date = db.Column(db.Date, nullable=False)
    description = db.Column(db.String(500), nullable=False)
    amount = db.Column(db.Float, nullable=False)  # Positive for credits, negative for debits
    balance = db.Column(db.Float, nullable=True)
    reference = db.Column(db.String(100), nullable=True)
    transaction_type = db.Column(db.String(50), nullable=True)  # e.g., 'transfer', 'payment', 'fee'
    category = db.Column(db.String(100), nullable=True)  # e.g., 'rental_income', 'business_expense'
    
    # Revolut specific fields - ALL columns from export
    date_started_utc = db.Column(db.DateTime, nullable=True)
    date_completed_utc = db.Column(db.DateTime, nullable=True)
    date_started_dublin = db.Column(db.DateTime, nullable=True)
    date_completed_dublin = db.Column(db.DateTime, nullable=True)
    transaction_id = db.Column(db.String(100), nullable=True)  # ID column
    state = db.Column(db.String(50), nullable=True)  # COMPLETED, PENDING, etc.
    payer = db.Column(db.String(200), nullable=True)
    card_number = db.Column(db.String(50), nullable=True)
    card_label = db.Column(db.String(100), nullable=True)
    card_state = db.Column(db.String(50), nullable=True)
    orig_currency = db.Column(db.String(10), nullable=True)
    orig_amount = db.Column(db.Float, nullable=True)
    payment_currency = db.Column(db.String(10), nullable=True)
    total_amount = db.Column(db.Float, nullable=True)
    exchange_rate = db.Column(db.Float, nullable=True)
    fee = db.Column(db.Float, nullable=True)
    fee_currency = db.Column(db.String(10), nullable=True)
    account = db.Column(db.String(100), nullable=True)
    beneficiary_account_number = db.Column(db.String(50), nullable=True)
    beneficiary_sort_code = db.Column(db.String(50), nullable=True)
    beneficiary_iban = db.Column(db.String(50), nullable=True)
    beneficiary_bic = db.Column(db.String(50), nullable=True)
    mcc = db.Column(db.String(20), nullable=True)  # Merchant Category Code
    related_transaction_id = db.Column(db.String(100), nullable=True)
    spend_program = db.Column(db.String(200), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    business_account = db.relationship('BusinessAccount', backref='transactions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'business_account_id': self.business_account_id,
            'transaction_date': self.transaction_date.isoformat(),
            'description': self.description,
            'amount': self.amount,
            'balance': self.balance,
            'reference': self.reference,
            'transaction_type': self.transaction_type,
            'category': self.category,
            
            # Revolut specific fields
            'date_started_utc': self.date_started_utc.isoformat() if self.date_started_utc else None,
            'date_completed_utc': self.date_completed_utc.isoformat() if self.date_completed_utc else None,
            'date_started_dublin': self.date_started_dublin.isoformat() if self.date_started_dublin else None,
            'date_completed_dublin': self.date_completed_dublin.isoformat() if self.date_completed_dublin else None,
            'transaction_id': self.transaction_id,
            'state': self.state,
            'payer': self.payer,
            'card_number': self.card_number,
            'card_label': self.card_label,
            'card_state': self.card_state,
            'orig_currency': self.orig_currency,
            'orig_amount': self.orig_amount,
            'payment_currency': self.payment_currency,
            'total_amount': self.total_amount,
            'exchange_rate': self.exchange_rate,
            'fee': self.fee,
            'fee_currency': self.fee_currency,
            'account': self.account,
            'beneficiary_account_number': self.beneficiary_account_number,
            'beneficiary_sort_code': self.beneficiary_sort_code,
            'beneficiary_iban': self.beneficiary_iban,
            'beneficiary_bic': self.beneficiary_bic,
            'mcc': self.mcc,
            'related_transaction_id': self.related_transaction_id,
            'spend_program': self.spend_program,
            
            'created_at': self.created_at.isoformat()
        }

class AirbnbBooking(db.Model):
    """Model for Airbnb bookings from iCal feeds"""
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id'), nullable=True)
    listing_id = db.Column(db.String(50), nullable=False)  # e.g., "22496407"
    booking_uid = db.Column(db.String(200), unique=True, nullable=False)  # Unique ID from iCal
    reservation_url = db.Column(db.String(500), nullable=True)
    phone_last_4 = db.Column(db.String(4), nullable=True)
    
    # Booking details
    check_in_date = db.Column(db.Date, nullable=False)
    check_out_date = db.Column(db.Date, nullable=False)
    nights = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='reserved')  # reserved, confirmed, cancelled
    
    # Additional iCal data
    summary = db.Column(db.String(200), nullable=True)  # "Reserved", "Blocked", etc.
    description = db.Column(db.Text, nullable=True)  # Full description from iCal
    dtstamp = db.Column(db.DateTime, nullable=True)  # When the event was created/modified
    confirmation_code = db.Column(db.String(50), nullable=True)  # Extracted from reservation URL
    
    # Guest information (if available)
    guest_name = db.Column(db.String(100), nullable=True)
    guest_phone = db.Column(db.String(20), nullable=True)
    guest_email = db.Column(db.String(100), nullable=True)
    number_of_guests = db.Column(db.Integer, nullable=True)
    
    # Financial details (if available)
    estimated_income = db.Column(db.Float, nullable=True)
    currency = db.Column(db.String(3), default='EUR')
    nightly_rate = db.Column(db.Float, nullable=True)
    cleaning_fee = db.Column(db.Float, nullable=True)
    service_fee = db.Column(db.Float, nullable=True)
    total_amount = db.Column(db.Float, nullable=True)
    
    # Additional metadata
    booking_source = db.Column(db.String(50), default='airbnb')  # airbnb, vrbo, manual
    cancellation_policy = db.Column(db.String(50), nullable=True)
    special_requests = db.Column(db.Text, nullable=True)
    
    # Additional iCal fields
    location = db.Column(db.String(200), nullable=True)
    organizer = db.Column(db.String(200), nullable=True)
    attendee = db.Column(db.String(200), nullable=True)
    created = db.Column(db.DateTime, nullable=True)
    last_modified = db.Column(db.DateTime, nullable=True)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_synced = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'listing_id': self.listing_id,
            'booking_uid': self.booking_uid,
            'reservation_url': self.reservation_url,
            'phone_last_4': self.phone_last_4,
            'check_in_date': self.check_in_date.isoformat() if self.check_in_date else None,
            'check_out_date': self.check_out_date.isoformat() if self.check_out_date else None,
            'nights': self.nights,
            'status': self.status,
            'estimated_income': self.estimated_income,
            'currency': self.currency,
            
            # Additional iCal data
            'summary': self.summary,
            'description': self.description,
            'dtstamp': self.dtstamp.isoformat() if self.dtstamp else None,
            'confirmation_code': self.confirmation_code,
            
            # Guest information
            'guest_name': self.guest_name,
            'guest_phone': self.guest_phone,
            'guest_email': self.guest_email,
            'number_of_guests': self.number_of_guests,
            
            # Financial details
            'nightly_rate': self.nightly_rate,
            'cleaning_fee': self.cleaning_fee,
            'service_fee': self.service_fee,
            'total_amount': self.total_amount,
            
            # Additional metadata
            'booking_source': self.booking_source,
            'cancellation_policy': self.cancellation_policy,
            'special_requests': self.special_requests,
            
            # Additional iCal fields
            'location': self.location,
            'organizer': self.organizer,
            'attendee': self.attendee,
            'created': self.created.isoformat() if self.created else None,
            'last_modified': self.last_modified.isoformat() if self.last_modified else None,
            
            # Metadata
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_synced': self.last_synced.isoformat() if self.last_synced else None
        }

class DashboardSettings(db.Model):
    """Model for controlling what data users can see on their dashboard"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    section = db.Column(db.String(50), nullable=False)  # properties, loans, income, etc.
    is_visible = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'section': self.section,
            'is_visible': self.is_visible,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class AppSettings(db.Model):
    """Model for storing application-wide settings"""
    id = db.Column(db.Integer, primary_key=True)
    setting_key = db.Column(db.String(100), unique=True, nullable=False)
    setting_value = db.Column(db.String(500), nullable=False)
    description = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'setting_key': self.setting_key,
            'setting_value': self.setting_value,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class AccountBalance(db.Model):
    """Model for users to enter and track account balances"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey('business_account.id'), nullable=True)
    loan_id = db.Column(db.Integer, db.ForeignKey('loan.id'), nullable=True)
    balance = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(3), default='EUR')
    notes = db.Column(db.Text, nullable=True)
    date_entered = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='account_balances', lazy=True)
    account = db.relationship('BusinessAccount', backref='balances', lazy=True)
    loan = db.relationship('Loan', backref='balances', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'account_id': self.account_id,
            'loan_id': self.loan_id,
            'balance': self.balance,
            'currency': self.currency,
            'notes': self.notes,
            'date_entered': self.date_entered.isoformat() if self.date_entered else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'account_name': self.account.name if self.account else None,
            'loan_name': f"{self.loan.bank} - {self.loan.property_name}" if self.loan else None
        }

class TaxReturn(db.Model):
    """Model for storing accountant tax return CSV files"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    year = db.Column(db.String(4), nullable=False)  # Tax year (e.g., "2024")
    filename = db.Column(db.String(255), nullable=False)
    file_content = db.Column(db.LargeBinary, nullable=False)  # Store the actual CSV file content
    file_size = db.Column(db.Integer, nullable=False)  # File size in bytes
    transaction_count = db.Column(db.Integer, nullable=True)  # Number of transactions in the CSV
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='tax_returns', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'year': self.year,
            'filename': self.filename,
            'file_size': self.file_size,
            'transaction_count': self.transaction_count,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class TaxReturnTransaction(db.Model):
    """Model for storing individual transactions from accountant tax return CSV files"""
    id = db.Column(db.Integer, primary_key=True)
    tax_return_id = db.Column(db.Integer, db.ForeignKey('tax_return.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Transaction data from CSV
    name = db.Column(db.String(500), nullable=False)  # Transaction description/name
    date = db.Column(db.Date, nullable=True)  # Transaction date
    number = db.Column(db.String(50), nullable=True)  # Transaction number
    reference = db.Column(db.String(100), nullable=True)  # Reference code
    source = db.Column(db.String(50), nullable=True)  # Source system (AJ, PJ, etc.)
    annotation = db.Column(db.Text, nullable=True)  # Additional notes
    debit = db.Column(db.Float, default=0.0)  # Debit amount
    credit = db.Column(db.Float, default=0.0)  # Credit amount
    balance = db.Column(db.Float, default=0.0)  # Running balance
    category_heading = db.Column(db.String(200), nullable=True)  # Category heading from GL (e.g., "207C00 Hosting Fee's")
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tax_return = db.relationship('TaxReturn', backref=db.backref('transactions', cascade='all, delete-orphan'))
    user = db.relationship('User', backref='tax_return_transactions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'tax_return_id': self.tax_return_id,
            'user_id': self.user_id,
            'name': self.name,
            'date': self.date.isoformat() if self.date else None,
            'number': self.number,
            'reference': self.reference,
            'source': self.source,
            'annotation': self.annotation,
            'debit': self.debit,
            'credit': self.credit,
            'balance': self.balance,
            'category_heading': self.category_heading,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class TransactionMatch(db.Model):
    """Model for storing matches between tax return transactions and bank transactions"""
    id = db.Column(db.Integer, primary_key=True)
    tax_return_transaction_id = db.Column(db.Integer, db.ForeignKey('tax_return_transaction.id'), nullable=False)
    bank_transaction_id = db.Column(db.Integer, db.ForeignKey('bank_transaction.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Matching confidence and method
    confidence_score = db.Column(db.Float, default=1.0)  # 0.0 to 1.0
    match_method = db.Column(db.String(50), nullable=False)  # 'manual', 'auto_amount', 'auto_description', 'auto_date'
    
    # Learning data
    accountant_category = db.Column(db.String(200), nullable=True)  # Category from accountant
    learned_pattern = db.Column(db.Text, nullable=True)  # JSON string of learned patterns
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tax_return_transaction = db.relationship('TaxReturnTransaction', backref='matches')
    bank_transaction = db.relationship('BankTransaction', backref='matches')
    user = db.relationship('User', backref='transaction_matches')
    
    def to_dict(self):
        return {
            'id': self.id,
            'tax_return_transaction_id': self.tax_return_transaction_id,
            'bank_transaction_id': self.bank_transaction_id,
            'user_id': self.user_id,
            'confidence_score': self.confidence_score,
            'match_method': self.match_method,
            'accountant_category': self.accountant_category,
            'learned_pattern': self.learned_pattern,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class TransactionLearningPattern(db.Model):
    """Model for storing learned patterns for automatic categorization"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Pattern data
    pattern_type = db.Column(db.String(50), nullable=False)  # 'description', 'amount', 'date', 'reference'
    pattern_value = db.Column(db.String(500), nullable=False)  # The actual pattern (regex, amount range, etc.)
    category = db.Column(db.String(200), nullable=False)  # The category this pattern maps to
    confidence = db.Column(db.Float, default=0.5)  # How confident we are in this pattern
    
    # Usage tracking
    times_used = db.Column(db.Integer, default=0)
    success_rate = db.Column(db.Float, default=0.0)  # How often this pattern was correct
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='learning_patterns')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'pattern_type': self.pattern_type,
            'pattern_value': self.pattern_value,
            'category': self.category,
            'confidence': self.confidence,
            'times_used': self.times_used,
            'success_rate': self.success_rate,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class TransactionCategoryPrediction(db.Model):
    """Model for storing predicted and validated categories for bank transactions"""
    id = db.Column(db.Integer, primary_key=True)
    bank_transaction_id = db.Column(db.Integer, db.ForeignKey('bank_transaction.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Prediction data
    predicted_category = db.Column(db.String(200), nullable=True)  # ML model prediction
    prediction_confidence = db.Column(db.Float, default=0.0)  # 0.0 to 1.0
    prediction_model_version = db.Column(db.String(50), nullable=True)  # Track model version
    prediction_features = db.Column(db.Text, nullable=True)  # JSON of features used
    
    # Validation data
    validated_category = db.Column(db.String(200), nullable=True)  # Manually confirmed category
    validation_status = db.Column(db.String(20), default='pending')  # pending, validated, rejected
    validation_notes = db.Column(db.Text, nullable=True)  # User notes about validation
    
    # Learning data
    is_training_data = db.Column(db.Boolean, default=False)  # Used for training
    training_source = db.Column(db.String(100), nullable=True)  # Which tax return provided this training data
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    bank_transaction = db.relationship('BankTransaction', backref='category_predictions')
    user = db.relationship('User', backref='category_predictions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'bank_transaction_id': self.bank_transaction_id,
            'user_id': self.user_id,
            'predicted_category': self.predicted_category,
            'prediction_confidence': self.prediction_confidence,
            'prediction_model_version': self.prediction_model_version,
            'prediction_features': self.prediction_features,
            'validated_category': self.validated_category,
            'validation_status': self.validation_status,
            'validation_notes': self.validation_notes,
            'is_training_data': self.is_training_data,
            'training_source': self.training_source,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ModelTrainingHistory(db.Model):
    """Model for tracking ML model training history and performance"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    model_version = db.Column(db.String(50), nullable=False)
    training_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Training data info
    training_samples = db.Column(db.Integer, nullable=False)
    tax_return_years = db.Column(db.String(200), nullable=True)  # Comma-separated years
    matched_transactions_count = db.Column(db.Integer, nullable=False)
    
    # Model performance metrics
    accuracy = db.Column(db.Float, nullable=True)
    precision = db.Column(db.Float, nullable=True)
    recall = db.Column(db.Float, nullable=True)
    f1_score = db.Column(db.Float, nullable=True)
    
    # Training parameters
    algorithm = db.Column(db.String(50), default='RandomForest')
    features_count = db.Column(db.Integer, nullable=True)
    training_duration_seconds = db.Column(db.Float, nullable=True)
    
    # Status
    status = db.Column(db.String(20), default='completed')  # training, completed, failed
    error_message = db.Column(db.Text, nullable=True)
    
    # Relationships
    user = db.relationship('User', backref='model_training_history')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'model_version': self.model_version,
            'training_date': self.training_date.isoformat() if self.training_date else None,
            'training_samples': self.training_samples,
            'tax_return_years': self.tax_return_years,
            'matched_transactions_count': self.matched_transactions_count,
            'accuracy': self.accuracy,
            'precision': self.precision,
            'recall': self.recall,
            'f1_score': self.f1_score,
            'algorithm': self.algorithm,
            'features_count': self.features_count,
            'training_duration_seconds': self.training_duration_seconds,
            'status': self.status,
            'error_message': self.error_message
        }

class TransactionCategory(db.Model):
    """Comprehensive list of transaction categories extracted from accountant's documents"""
    __tablename__ = 'transaction_category'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(120), nullable=False)  # User email
    
    # Category information
    category_name = db.Column(db.String(100), nullable=False)
    category_type = db.Column(db.String(50), nullable=False)  # 'income', 'expense', 'asset', 'liability'
    
    # Matching patterns (comma-separated keywords)
    description_keywords = db.Column(db.Text, nullable=True)  # Keywords found in descriptions
    payer_keywords = db.Column(db.Text, nullable=True)  # Keywords found in payer names
    reference_keywords = db.Column(db.Text, nullable=True)  # Keywords found in references
    
    # Statistical data
    usage_count = db.Column(db.Integer, default=0)  # How many times this category was used
    total_amount = db.Column(db.Float, default=0.0)  # Total amount for this category
    average_amount = db.Column(db.Float, default=0.0)  # Average amount for this category
    
    # Source information
    source_years = db.Column(db.String(100), nullable=True)  # Comma-separated years where this category was found
    created_from_tax_return_id = db.Column(db.Integer, nullable=True)  # First tax return where this was found
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_used_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships - removed due to foreign key constraint issues
    # user = db.relationship('User', backref='transaction_categories')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'category_name': self.category_name,
            'category_type': self.category_type,
            'description_keywords': self.description_keywords,
            'payer_keywords': self.payer_keywords,
            'reference_keywords': self.reference_keywords,
            'usage_count': self.usage_count,
            'total_amount': self.total_amount,
            'average_amount': self.average_amount,
            'source_years': self.source_years,
            'created_from_tax_return_id': self.created_from_tax_return_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None
        }
    
    def get_all_keywords(self):
        """Get all keywords as a list"""
        keywords = []
        if self.description_keywords:
            keywords.extend([kw.strip() for kw in self.description_keywords.split(',') if kw.strip()])
        if self.payer_keywords:
            keywords.extend([kw.strip() for kw in self.payer_keywords.split(',') if kw.strip()])
        if self.reference_keywords:
            keywords.extend([kw.strip() for kw in self.reference_keywords.split(',') if kw.strip()])
        return list(set(keywords))  # Remove duplicates
    
    def calculate_similarity_score(self, bank_transaction):
        """Calculate similarity score between this category and a bank transaction"""
        score = 0.0
        matches = 0
        
        # Check description keywords
        if self.description_keywords and bank_transaction.get('description'):
            desc_lower = bank_transaction['description'].lower()
            for keyword in self.description_keywords.split(','):
                keyword = keyword.strip().lower()
                if keyword in desc_lower:
                    score += 1.0
                    matches += 1
        
        # Check payer keywords
        if self.payer_keywords and bank_transaction.get('payer'):
            payer_lower = bank_transaction['payer'].lower()
            for keyword in self.payer_keywords.split(','):
                keyword = keyword.strip().lower()
                if keyword in payer_lower:
                    score += 1.0
                    matches += 1
        
        # Check reference keywords
        if self.reference_keywords and bank_transaction.get('reference'):
            ref_lower = bank_transaction['reference'].lower()
            for keyword in self.reference_keywords.split(','):
                keyword = keyword.strip().lower()
                if keyword in ref_lower:
                    score += 0.5  # Lower weight for reference matches
                    matches += 1
        
        # Normalize score by number of available fields
        available_fields = sum([
            1 if bank_transaction.get('description') else 0,
            1 if bank_transaction.get('payer') else 0,
            1 if bank_transaction.get('reference') else 0
        ])
        
        if available_fields > 0:
            score = score / available_fields
        
        return score, matches
