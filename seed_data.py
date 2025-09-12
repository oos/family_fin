from app import app, db
from models import User, Person, Property, BusinessAccount, Income, Loan, Family
from datetime import date

def seed_data():
    with app.app_context():
        # Create tables
        db.create_all()
        
        # Clear existing data
        db.session.query(Income).delete()
        db.session.query(Loan).delete()
        db.session.query(Property).delete()
        db.session.query(BusinessAccount).delete()
        db.session.query(Person).delete()
        db.session.query(User).delete()
        
        # Create admin user
        admin_user = User(
            username='omarosullivan@gmail.com',
            email='omarosullivan@gmail.com',
            is_active=True
        )
        admin_user.set_password('Gestalt,69')
        db.session.add(admin_user)
        
        # Create families
        families_data = [
            {'name': 'Omar and Heidi', 'code': 'OmHe', 'description': 'Omar and Heidi family unit'},
            {'name': 'Dwayne and Lena', 'code': 'DwLe', 'description': 'Dwayne and Lena family unit'},
            {'name': 'Sean and Coral', 'code': 'SeCo', 'description': 'Sean and Coral family unit (Coral deceased)'}
        ]
        
        families = {}
        for family_data in families_data:
            family = Family(**family_data)
            db.session.add(family)
            db.session.flush()  # Get the ID
            families[family_data['code']] = family

        # Create people
        people_data = [
            {'name': 'Omar', 'relationship': 'Self', 'is_director': True, 'is_deceased': False, 'family_id': families['OmHe'].id},
            {'name': 'Heidi', 'relationship': 'Wife', 'is_director': True, 'is_deceased': False, 'family_id': families['OmHe'].id},
            {'name': 'Dwayne', 'relationship': 'Brother', 'is_director': False, 'is_deceased': False, 'family_id': families['DwLe'].id},
            {'name': 'Lena', 'relationship': "Dwayne's Wife", 'is_director': False, 'is_deceased': False, 'family_id': families['DwLe'].id},
            {'name': 'Sean', 'relationship': 'Father', 'is_director': False, 'is_deceased': False, 'family_id': families['SeCo'].id},
            {'name': 'Coral', 'relationship': 'Mother', 'is_director': False, 'is_deceased': True, 'family_id': families['SeCo'].id}
        ]
        
        people = {}
        for person_data in people_data:
            person = Person(**person_data)
            db.session.add(person)
            db.session.flush()  # Get the ID
            people[person_data['name']] = person
        
        # Create properties
        properties_data = [
            {
                'address': '51 Liberty Corner, Dublin 1.',
                'nickname': '51LC',
                'valuation': 450000,
                'mortgage_balance': 156774,
                'rental_income_yearly': 29040,
                'lender': 'Pepper',
                'omar_ownership': 50,
                'heidi_ownership': 50,
                'dwayne_ownership': 0,
                'sean_ownership': 0,
                'lena_ownership': 0
            },
            {
                'address': '19 Abberley, Killiney',
                'nickname': '19Abb',
                'valuation': 525000,
                'mortgage_balance': 312348,
                'rental_income_yearly': 32244,
                'lender': 'AIB',
                'omar_ownership': 50,
                'heidi_ownership': 50,
                'dwayne_ownership': 0,
                'sean_ownership': 0,
                'lena_ownership': 0
            },
            {
                'address': '28 Liberty Corner, Dublin 1.',
                'nickname': '28LC',
                'valuation': 450000,
                'mortgage_balance': 0,
                'rental_income_yearly': 75000,
                'lender': 'N/A',
                'omar_ownership': 25,
                'heidi_ownership': 0,
                'dwayne_ownership': 50,
                'sean_ownership': 25,
                'lena_ownership': 0
            },
            {
                'address': '2 Sallymount Avenue',
                'nickname': '2SA',
                'valuation': 1300000,
                'mortgage_balance': 400000,
                'rental_income_yearly': 200000,
                'lender': 'BOI',
                'omar_ownership': 100,
                'heidi_ownership': 0,
                'dwayne_ownership': 0,
                'sean_ownership': 0,
                'lena_ownership': 0
            },
            {
                'address': '87 Highfield Park',
                'nickname': '87HP',
                'valuation': 1150000,
                'mortgage_balance': 0,
                'rental_income_yearly': 125000,
                'lender': 'N/A',
                'omar_ownership': 47.5,
                'heidi_ownership': 0,
                'dwayne_ownership': 50,
                'sean_ownership': 3,
                'lena_ownership': 0
            },
            {
                'address': '3 Glendale, Delgany, Wicklow',
                'nickname': '3GD',
                'valuation': 1000000,
                'mortgage_balance': 350000,
                'rental_income_yearly': 0,
                'lender': 'B&G',
                'omar_ownership': 50,
                'heidi_ownership': 50,
                'dwayne_ownership': 0,
                'sean_ownership': 0,
                'lena_ownership': 0
            },
            {
                'address': '67 Raleigh Road, Bristol, UK',
                'nickname': '67RR',
                'valuation': 800000,
                'mortgage_balance': 550000,
                'rental_income_yearly': 150000,
                'lender': 'HTB',
                'omar_ownership': 50,
                'heidi_ownership': 50,
                'dwayne_ownership': 0,
                'sean_ownership': 0,
                'lena_ownership': 0
            }
        ]
        
        for property_data in properties_data:
            property = Property(**property_data)
            db.session.add(property)
        
        # Create business accounts
        accounts_data = [
            {
                'account_name': 'Revolut Business Account for RRLtd',
                'account_number': '***488',
                'bank_name': 'Revolut',
                'company_name': 'RRLtd',
                'is_active': True
            },
            {
                'account_name': 'Revolut Business Account for SECODWOM UK Ltd',
                'account_number': '***???',
                'bank_name': 'Revolut',
                'company_name': 'SECODWOM UK LTD',
                'is_active': True
            },
            {
                'account_name': 'AIB SeCo account',
                'account_number': '***084',
                'bank_name': 'AIB',
                'company_name': 'SeCo',
                'is_active': False
            }
        ]
        
        for account_data in accounts_data:
            account = BusinessAccount(**account_data)
            db.session.add(account)
        
        # Create income records
        income_data = [
            # External sources
            {'person_name': 'Omar', 'income_type': 'external_source', 'amount_yearly': 0, 'amount_monthly': 0},
            {'person_name': 'Heidi', 'income_type': 'external_source', 'amount_yearly': 30000, 'amount_monthly': 2500},
            {'person_name': 'Sean', 'income_type': 'external_source', 'amount_yearly': 18000, 'amount_monthly': 1500},
            {'person_name': 'Lena', 'income_type': 'external_source', 'amount_yearly': 36000, 'amount_monthly': 3000},
            {'person_name': 'Dwayne', 'income_type': 'external_source', 'amount_yearly': 0, 'amount_monthly': 0},
            
            # RRLtd (Reinvented Recruitment Ltd)
            {'person_name': 'Omar', 'income_type': 'rrltd', 'amount_yearly': 28800, 'amount_monthly': 2400},
            {'person_name': 'Heidi', 'income_type': 'rrltd', 'amount_yearly': 28800, 'amount_monthly': 2400},
            {'person_name': 'Dwayne', 'income_type': 'rrltd', 'amount_yearly': 28800, 'amount_monthly': 2400},
            {'person_name': 'Sean', 'income_type': 'rrltd', 'amount_yearly': 12000, 'amount_monthly': 1000},
            
            # OmHe Props (Property business) - Set to zero for now
            {'person_name': 'Omar', 'income_type': 'omhe_props', 'amount_yearly': 35000, 'amount_monthly': 2917},
            {'person_name': 'Heidi', 'income_type': 'omhe_props', 'amount_yearly': 0, 'amount_monthly': 0},
            {'person_name': 'Dwayne', 'income_type': 'omhe_props', 'amount_yearly': 0, 'amount_monthly': 0},
            {'person_name': 'Sean', 'income_type': 'omhe_props', 'amount_yearly': 0, 'amount_monthly': 0}
        ]
        
        for income_data_item in income_data:
            person = people[income_data_item['person_name']]
            income = Income(
                person_id=person.id,
                income_type=income_data_item['income_type'],
                amount_yearly=income_data_item['amount_yearly'],
                amount_monthly=income_data_item['amount_monthly']
            )
            db.session.add(income)
        
        # Create sample loans
        loans_data = [
            {
                'property_id': 1,  # 51LC
                'loan_name': '51LC Mortgage',
                'lender': 'Pepper',
                'loan_type': 'mortgage',
                'principal_amount': 200000,
                'interest_rate': 4.5,
                'term_years': 25,
                'start_date': date(2020, 1, 1),
                'current_balance': 156774
            },
            {
                'property_id': 2,  # 19Abb
                'loan_name': '19Abb Mortgage',
                'lender': 'AIB',
                'loan_type': 'mortgage',
                'principal_amount': 400000,
                'interest_rate': 3.8,
                'term_years': 30,
                'start_date': date(2019, 6, 1),
                'current_balance': 312348
            },
            {
                'property_id': 4,  # 2SA
                'loan_name': '2SA Mortgage',
                'lender': 'BOI',
                'loan_type': 'mortgage',
                'principal_amount': 500000,
                'interest_rate': 4.2,
                'term_years': 25,
                'start_date': date(2021, 3, 1),
                'current_balance': 400000
            },
            {
                'property_id': 6,  # 3GD
                'loan_name': '3GD Mortgage',
                'lender': 'B&G',
                'loan_type': 'mortgage',
                'principal_amount': 450000,
                'interest_rate': 3.9,
                'term_years': 30,
                'start_date': date(2022, 8, 1),
                'current_balance': 350000
            },
            {
                'property_id': 7,  # 67RR
                'loan_name': '67RR Mortgage',
                'lender': 'HTB',
                'loan_type': 'mortgage',
                'principal_amount': 600000,
                'interest_rate': 5.2,
                'term_years': 25,
                'start_date': date(2023, 1, 1),
                'current_balance': 550000
            },
            {
                'property_id': None,
                'loan_name': 'Business Credit Line',
                'lender': 'AIB',
                'loan_type': 'credit_line',
                'principal_amount': 100000,
                'interest_rate': 6.5,
                'term_years': 5,
                'start_date': date(2023, 6, 1),
                'current_balance': 75000
            }
        ]
        
        for loan_data in loans_data:
            # Calculate monthly payment
            temp_loan = Loan(
                principal_amount=loan_data['principal_amount'],
                interest_rate=loan_data['interest_rate'],
                term_years=loan_data['term_years']
            )
            monthly_payment = temp_loan.calculate_monthly_payment()
            
            loan = Loan(
                property_id=loan_data['property_id'],
                loan_name=loan_data['loan_name'],
                lender=loan_data['lender'],
                loan_type=loan_data['loan_type'],
                principal_amount=loan_data['principal_amount'],
                interest_rate=loan_data['interest_rate'],
                term_years=loan_data['term_years'],
                start_date=loan_data['start_date'],
                monthly_payment=monthly_payment,
                current_balance=loan_data['current_balance'],
                is_active=True
            )
            db.session.add(loan)

        # Commit all changes
        db.session.commit()
        print("Database seeded successfully!")

if __name__ == '__main__':
    seed_data()
