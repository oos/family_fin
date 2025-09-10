# Family Finance Management System

A comprehensive web application for managing family business finances, properties, and income tracking.

## Features

- **People Management**: Track family members, their relationships, and roles
- **Property Management**: Manage rental properties with ownership details and financial information
- **Business Accounts**: Track business bank accounts for different companies
- **Income Tracking**: Monitor both family business and external income sources
- **Dashboard**: Financial overview with charts and summaries
- **Authentication**: Secure login system
- **CRUD Operations**: Full create, read, update, delete functionality for all entities

## Technology Stack

### Backend
- Flask (Python web framework)
- SQLAlchemy (ORM)
- Flask-JWT-Extended (Authentication)
- SQLite (Database)

### Frontend
- React 18
- React Router (Navigation)
- Axios (HTTP client)
- Recharts (Charts and visualizations)
- CSS3 (Styling)

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
```bash
cp env.example .env
# Edit .env with your preferred secret keys
```

3. Initialize the database and seed with sample data:
```bash
python seed_data.py
```

4. Start the Flask server:
```bash
python app.py
```

The backend will be available at `http://localhost:5000`

### Frontend Setup

1. Install Node.js dependencies:
```bash
npm install
```

2. Start the React development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

## Default Login Credentials

- Username: `admin`
- Password: `admin123`

## Data Structure

### People
- Name, relationship, director status, deceased status

### Properties
- Address, nickname, valuation, mortgage balance
- Rental income, lender information
- Ownership percentages for each family member

### Business Accounts
- Account name, number, bank, company
- Active/inactive status

### Income
- Person, income type (family business/outside business)
- Annual and monthly amounts

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### People
- `GET /api/people` - List all people
- `POST /api/people` - Create new person
- `PUT /api/people/{id}` - Update person
- `DELETE /api/people/{id}` - Delete person

### Properties
- `GET /api/properties` - List all properties
- `POST /api/properties` - Create new property
- `PUT /api/properties/{id}` - Update property
- `DELETE /api/properties/{id}` - Delete property

### Business Accounts
- `GET /api/business-accounts` - List all accounts
- `POST /api/business-accounts` - Create new account
- `PUT /api/business-accounts/{id}` - Update account
- `DELETE /api/business-accounts/{id}` - Delete account

### Income
- `GET /api/income` - List all income records
- `POST /api/income` - Create new income record
- `PUT /api/income/{id}` - Update income record
- `DELETE /api/income/{id}` - Delete income record

### Dashboard
- `GET /api/dashboard/summary` - Get financial summary

## Sample Data

The application comes pre-populated with your family's data:

- **People**: Omar, Heidi, Dwayne, Lena, Sean, Coral
- **Properties**: 7 properties with ownership details and financial information
- **Business Accounts**: Revolut accounts for both companies, AIB account
- **Income**: Family business and external income for each person

## Security Notes

- Change default credentials in production
- Use strong secret keys in environment variables
- Consider implementing proper user management
- Add HTTPS in production environment

## Future Enhancements

- Loan refinancing calculations
- Cash flow projections
- Property performance analytics
- Document management
- Multi-currency support
- Advanced reporting features
