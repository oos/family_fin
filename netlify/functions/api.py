import json
import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import sqlite3
import traceback

# Add the parent directory to the path so we can import our models
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from models import db, User, Person, Property, Income, Loan, Family, BusinessAccount, Pension, LoanERC, LoanPayment

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your-jwt-secret-key-here')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# Database configuration for production
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///family_finance.db')
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db.init_app(app)
jwt = JWTManager(app)
CORS(app)

# Import all the route handlers from the main app
def register_routes():
    @app.route('/api/auth/login', methods=['POST'])
    def login():
        try:
            data = request.get_json()
            username_or_email = data.get('username')
            password = data.get('password')
            
            if not username_or_email or not password:
                return jsonify({'error': 'Username and password required'}), 400
            
            # Find user by username or email
            user = User.query.filter(
                (User.username == username_or_email) | (User.email == username_or_email)
            ).first()
            
            if user and check_password_hash(user.password_hash, password):
                access_token = create_access_token(identity=user.id)
                return jsonify({
                    'access_token': access_token,
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email
                    }
                })
            else:
                return jsonify({'error': 'Invalid credentials'}), 401
                
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/people', methods=['GET'])
    @jwt_required()
    def get_people():
        try:
            people = Person.query.all()
            return jsonify([person.to_dict() for person in people])
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/properties', methods=['GET'])
    @jwt_required()
    def get_properties():
        try:
            properties = Property.query.all()
            return jsonify([property.to_dict() for property in properties])
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/income', methods=['GET'])
    @jwt_required()
    def get_income():
        try:
            income = Income.query.all()
            return jsonify([income.to_dict() for income in income])
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/loans', methods=['GET'])
    @jwt_required()
    def get_loans():
        try:
            loans = Loan.query.all()
            return jsonify([loan.to_dict() for loan in loans])
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/business-accounts', methods=['GET'])
    @jwt_required()
    def get_business_accounts():
        try:
            accounts = BusinessAccount.query.all()
            return jsonify([account.to_dict() for account in accounts])
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/pensions', methods=['GET'])
    @jwt_required()
    def get_pensions():
        try:
            pensions = Pension.query.all()
            return jsonify([pension.to_dict() for pension in pensions])
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # Add more routes as needed...

def handler(event, context):
    """Netlify function handler"""
    try:
        with app.app_context():
            # Initialize database
            db.create_all()
            
            # Register routes
            register_routes()
            
            # Handle the request
            if event['httpMethod'] == 'GET':
                response = app.test_client().get(
                    event['path'],
                    headers=event.get('headers', {}),
                    query_string=event.get('queryStringParameters', {})
                )
            elif event['httpMethod'] == 'POST':
                response = app.test_client().post(
                    event['path'],
                    headers=event.get('headers', {}),
                    data=json.dumps(event.get('body', {})),
                    content_type='application/json'
                )
            elif event['httpMethod'] == 'PUT':
                response = app.test_client().put(
                    event['path'],
                    headers=event.get('headers', {}),
                    data=json.dumps(event.get('body', {})),
                    content_type='application/json'
                )
            elif event['httpMethod'] == 'DELETE':
                response = app.test_client().delete(
                    event['path'],
                    headers=event.get('headers', {}),
                    query_string=event.get('queryStringParameters', {})
                )
            else:
                return {
                    'statusCode': 405,
                    'body': json.dumps({'error': 'Method not allowed'})
                }
            
            return {
                'statusCode': response.status_code,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': response.get_data(as_text=True)
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'details': str(e),
                'traceback': traceback.format_exc()
            })
        }
