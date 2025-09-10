# Family Finance Management System

A comprehensive, role-based financial management application for family businesses with property management, loan tracking, and multi-platform booking integration.

## 🚀 Features

### 👥 User Management
- **Role-based Access Control**: Admin and User roles with different permissions
- **Secure Authentication**: JWT-based authentication with password management
- **User Dashboard**: Personalized dashboards based on admin settings
- **Password Management**: Admin can view and reset user passwords

### 🏠 Property Management
- **Property Portfolio**: Track multiple properties with values and equity
- **Rental Income**: Monitor rental income across all properties
- **Property Details**: Comprehensive property information management

### 💰 Financial Management
- **Loan Tracking**: Complete loan management with payment schedules
- **Interest Calculations**: Support for various loan types including interest-only
- **Early Repayment Charges**: Multiple ERC periods per loan
- **Over-payments**: Regular and lump-sum payment tracking
- **Bank Accounts**: Business account management with API integration

### 📊 Multi-Platform Bookings
- **Airbnb Integration**: Live iCal feed synchronization
- **VRBO Support**: Multi-platform booking management
- **Booking Details**: Comprehensive booking data extraction
- **Historical Data**: Manual entry for past bookings
- **Platform Detection**: Automatic platform identification

### 💳 Transaction Management
- **Bank Integration**: Revolut Business API support
- **CSV Import**: Flexible import for multiple bank formats
- **Transaction Filtering**: Advanced filtering and search
- **Warning System**: Automatic detection of suspicious transactions
- **Category Management**: Dynamic transaction categorization

### 📈 Income & Tax Management
- **Family Grouping**: Income tracking by family units
- **Irish Tax Calculations**: Complete Irish tax system implementation
- **Gross/Net Toggle**: Switch between gross and net income views
- **Tax Credits**: Married couple and individual tax credits
- **Pension Integration**: Company and personal pension calculations

### 🎛️ Admin Features
- **User Management**: Create, manage, and control user access
- **Dashboard Control**: Control what each user can see
- **Password Reset**: Secure password management for all users
- **System Monitoring**: Complete system oversight

## 🛠️ Technology Stack

### Backend
- **Flask**: Python web framework
- **SQLAlchemy**: ORM for database management
- **JWT**: Secure authentication
- **Alembic**: Database migrations
- **SQLite**: Database (production-ready for PostgreSQL)

### Frontend
- **React 18**: Modern React with hooks
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **Recharts**: Data visualization
- **Bootstrap**: Responsive UI framework

### External Integrations
- **Airbnb iCal**: Live booking synchronization
- **VRBO iCal**: Multi-platform booking support
- **Revolut Business API**: Bank transaction integration
- **CSV Import**: Flexible data import system

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/oos/family_fin.git
   cd family_fin
   ```

2. **Backend Setup**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   flask db upgrade
   python setup_users.py
   python app.py
   ```

3. **Frontend Setup**
   ```bash
   npm install
   npm start
   ```

4. **Access the Application**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:5001

### Default Login Credentials

**Admin Account:**
- Email: `omarosullivan@gmail.com`
- Password: `Gestalt,69`

**User Account:**
- Email: `seanosullivan@gmail.com`
- Password: `Secodwom01!`

## 📱 User Roles

### Admin (Omar)
- Full access to all features
- User management and password reset
- Dashboard settings control
- Complete system oversight
- All financial data access

### User (Sean)
- Personalized dashboard only
- Account balance management
- View only data allowed by admin
- Cannot access admin features
- Limited to assigned sections

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:
```env
JWT_SECRET_KEY=your-secret-key
FLASK_ENV=development
```

### Database
The application uses SQLite by default. For production, configure PostgreSQL:
```python
SQLALCHEMY_DATABASE_URI=postgresql://user:password@localhost/family_finance
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### User Management (Admin Only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `POST /api/users/{id}/reset-password` - Reset user password

### Dashboard Settings (Admin Only)
- `GET /api/dashboard-settings/{user_id}` - Get user dashboard settings
- `PUT /api/dashboard-settings/{user_id}` - Update dashboard settings

### User Dashboard
- `GET /api/user-dashboard` - Get personalized dashboard data
- `GET /api/account-balances` - Get user account balances
- `POST /api/account-balances` - Create account balance entry
- `PUT /api/account-balances/{id}` - Update account balance
- `DELETE /api/account-balances/{id}` - Delete account balance

### Bookings
- `GET /api/bookings` - Get all bookings
- `POST /api/bookings/sync` - Sync bookings from iCal
- `PUT /api/bookings/{id}` - Update booking
- `DELETE /api/bookings/{id}` - Delete booking

## 🏗️ Database Schema

### Core Tables
- `user` - User accounts with roles
- `property` - Property portfolio
- `loan` - Loan information
- `business_account` - Bank accounts
- `bank_transaction` - Transaction records
- `airbnb_booking` - Booking data
- `account_balance` - User balance entries
- `dashboard_settings` - User access control

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Password hashing with bcrypt
- CORS protection
- Input validation and sanitization
- SQL injection prevention

## 📈 Future Enhancements

- [ ] Mobile app (React Native)
- [ ] Advanced reporting and analytics
- [ ] Multi-currency support
- [ ] Automated tax filing integration
- [ ] Property valuation tracking
- [ ] Investment portfolio management
- [ ] Document management system
- [ ] Email notifications
- [ ] Advanced booking analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is private and proprietary. All rights reserved.

## 📞 Support

For support and questions, contact the development team.

---

**Built with ❤️ for family business management**