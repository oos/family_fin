# Family Finance Application

A comprehensive financial management system built with Flask (Python) backend and React frontend, designed for family financial tracking, tax management, and business analytics.

## 🚀 Features

### 💰 Financial Management
- **Multi-Account Banking**: Track multiple bank accounts with real-time balances
- **Transaction Management**: Import, categorize, and analyze bank transactions
- **Loan Management**: Track loans, payments, and calculate amortization
- **Property Management**: Manage rental properties and Airbnb bookings
- **Income Tracking**: Monitor various income sources and categories
- **Expense Analysis**: Detailed expense categorization and trending

### 📊 Advanced Analytics
- **Financial Analytics Dashboard**: Comprehensive financial insights and trends
- **Tax Return Analytics**: Analyze tax return data with year-over-year comparisons
- **Transaction Predictions**: ML-powered transaction categorization
- **Profitability Analysis**: Track income vs expenses with profit margins
- **Category Analysis**: Detailed spending patterns and trends

### 📄 Document Management
- **Tax Return Upload**: Support for CSV, XLSX, and PDF tax return files
- **File Viewer**: Browse and manage all uploaded documents
- **PDF Processing**: Advanced PDF parsing for financial documents
- **Year-based Organization**: Organize documents by tax year

### 🔐 Security & Authentication
- **JWT Authentication**: Secure user authentication and session management
- **Role-based Access**: Admin and user role management
- **Data Encryption**: Secure handling of financial data

### 💾 Backup & Recovery
- **Automated Backups**: Daily automated backups of database and files
- **Disaster Recovery**: Complete restore system for data recovery
- **Backup Monitoring**: Real-time backup status and health monitoring
- **30-day Retention**: Configurable backup retention policy

## 🛠️ Technology Stack

### Backend
- **Flask**: Python web framework
- **SQLAlchemy**: ORM for database operations
- **SQLite**: Database for development (easily upgradeable to PostgreSQL)
- **JWT**: Authentication and authorization
- **Pandas**: Data processing and analysis
- **PDF Processing**: pdfplumber and PyPDF2 for document parsing

### Frontend
- **React**: Modern JavaScript framework
- **Bootstrap**: Responsive UI components
- **Axios**: HTTP client for API communication
- **Chart.js**: Data visualization

### DevOps & Tools
- **Alembic**: Database migrations
- **Cron**: Automated backup scheduling
- **Git**: Version control
- **Docker**: Containerization ready

## 📁 Project Structure

```
family_fin/
├── app.py                          # Main Flask application
├── models.py                       # Database models
├── requirements.txt                # Python dependencies
├── seed_data.py                    # Initial data seeding
├── migrations/                     # Database migrations
├── instance/                       # Database and instance files
│   └── family_finance.db          # SQLite database
├── src/                           # React frontend
│   ├── components/                # React components
│   │   ├── Dashboard.js           # Main dashboard
│   │   ├── Transactions.js        # Transaction management
│   │   ├── TaxReturns.js          # Tax return management
│   │   ├── LoanCalculator.js      # Loan calculations
│   │   └── ...                    # Other components
│   ├── utils/                     # Utility functions
│   └── index.js                   # React entry point
├── backups/                       # Backup system
│   ├── database/                  # Database backups
│   ├── files/                     # File backups
│   ├── logs/                      # Backup logs
│   ├── scripts/                   # Backup/restore scripts
│   └── README.md                  # Backup documentation
├── build/                         # React production build
├── public/                        # Static files
└── README.md                      # This file
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 16+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/oos/family_fin.git
   cd family_fin
   ```

2. **Setup Python environment**
   ```bash
   python3 -m venv venv311
   source venv311/bin/activate  # On Windows: venv311\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Initialize database**
   ```bash
   python seed_data.py
   ```

4. **Setup React frontend**
   ```bash
   npm install
   npm run build
   ```

5. **Start the application**
   ```bash
   # Terminal 1: Start Flask backend
   source venv311/bin/activate
   python app.py
   
   # Terminal 2: Start React frontend (development)
   npm start
   ```

### Default Login
- **Email**: omarosullivan@gmail.com
- **Password**: Gestalt,69

## 📊 Financial Analytics

### Tax Return Analytics
The application provides comprehensive analytics for tax return data:

- **Yearly Performance**: Income, expenses, profit margins by year
- **Trend Analysis**: Income, expense, and profit trends over time
- **Category Analysis**: Detailed breakdown of income and expense categories
- **Profitability Insights**: Automated analysis and recommendations

### Transaction Analytics
- **Spending Patterns**: Analyze spending by category and time period
- **Income Tracking**: Monitor various income sources
- **Budget Analysis**: Compare actual vs expected spending
- **Financial Health**: Overall financial status and recommendations

## 💾 Backup System

### Automated Backups
The application includes a comprehensive backup system:

```bash
# Manual backup
python3 backups/scripts/backup_system.py

# Check backup status
python3 backups/scripts/backup_status.py

# Restore from backup
python3 backups/scripts/restore_system.py
```

### Backup Features
- **Daily Automated Backups**: Runs at 2:00 AM daily
- **Database Backup**: Compressed SQLite database snapshots
- **File Backup**: All uploaded documents and configuration files
- **30-day Retention**: Automatic cleanup of old backups
- **Disaster Recovery**: Complete restore system

### Backup Health Monitoring
```bash
# Check backup health
python3 backups/scripts/backup_status.py
```

Status indicators:
- ✅ **Healthy**: Backup within 24 hours
- ⚠️ **Warning**: Backup 1-7 days old
- ❌ **Critical**: Backup older than 7 days

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the project root:

```env
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///instance/family_finance.db
JWT_SECRET_KEY=your-jwt-secret-key
```

### Database Configuration
The application uses SQLite by default but can be easily configured for PostgreSQL:

```python
# In app.py, change the database URL
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://user:pass@localhost/family_fin'
```

## 📱 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify JWT token

### Financial Data
- `GET /api/dashboard/summary` - Dashboard summary
- `GET /api/transactions` - Bank transactions
- `GET /api/income` - Income data
- `GET /api/properties` - Property information
- `GET /api/loans` - Loan information

### Tax Returns
- `GET /api/tax-returns` - List tax returns
- `POST /api/tax-returns/upload` - Upload tax return
- `GET /api/tax-returns/analytics` - Tax return analytics
- `DELETE /api/tax-returns/<id>` - Delete tax return

### Analytics
- `GET /api/tax-returns/analytics` - Financial analytics
- `GET /api/transaction-predictions` - ML predictions
- `POST /api/train-model` - Train ML model

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin/User)
- Secure password handling
- Session management

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

### Backup Security
- Encrypted backup files
- Secure file permissions
- Automated backup verification

## 🚀 Deployment

### Production Deployment

1. **Configure production settings**
   ```bash
   export FLASK_ENV=production
   export SECRET_KEY=your-production-secret-key
   ```

2. **Build React frontend**
   ```bash
   npm run build
   ```

3. **Setup production database**
   ```bash
   # For PostgreSQL
   createdb family_finance_prod
   export DATABASE_URL=postgresql://user:pass@localhost/family_finance_prod
   ```

4. **Run migrations**
   ```bash
   flask db upgrade
   ```

5. **Start with production server**
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

### Docker Deployment
```dockerfile
# Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

## 🧪 Testing

### Running Tests
```bash
# Python tests
python -m pytest tests/

# Frontend tests
npm test
```

### Test Coverage
```bash
# Python coverage
coverage run -m pytest
coverage report
coverage html
```

## 📈 Performance

### Database Optimization
- Indexed queries for fast lookups
- Efficient pagination
- Query optimization
- Connection pooling

### Frontend Optimization
- React component optimization
- Lazy loading
- Bundle optimization
- CDN ready

### Backup Performance
- Compressed backups (gzip)
- Incremental backup support
- Parallel processing
- Efficient storage

## 🔧 Maintenance

### Regular Tasks

#### Daily
- Monitor backup status
- Check application logs
- Verify system health

#### Weekly
- Review backup logs
- Check disk space
- Update dependencies

#### Monthly
- Test restore process
- Review backup retention
- Security updates
- Performance optimization

### Troubleshooting

#### Common Issues

**Backup Failures**
```bash
# Check disk space
df -h

# Check permissions
ls -la backups/

# Check logs
tail -f backups/logs/backup_*.log
```

**Database Issues**
```bash
# Check database integrity
sqlite3 instance/family_finance.db "PRAGMA integrity_check;"

# Backup and restore
python3 backups/scripts/backup_system.py
python3 backups/scripts/restore_system.py
```

**Application Issues**
```bash
# Check Flask logs
tail -f app.log

# Restart application
pkill -f "python app.py"
source venv311/bin/activate
python app.py
```

## 📚 Documentation

### API Documentation
- [API Endpoints](docs/api.md)
- [Authentication Guide](docs/auth.md)
- [Data Models](docs/models.md)

### User Guides
- [Getting Started](docs/getting-started.md)
- [Financial Analytics](docs/analytics.md)
- [Backup & Recovery](backups/README.md)

### Developer Guides
- [Development Setup](docs/development.md)
- [Deployment Guide](docs/deployment.md)
- [Contributing](docs/contributing.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- Check the [documentation](docs/)
- Review [troubleshooting guide](#troubleshooting)
- Check [GitHub issues](https://github.com/oos/family_fin/issues)

### Reporting Issues
- Use GitHub Issues for bug reports
- Include system information and logs
- Provide steps to reproduce

### Feature Requests
- Use GitHub Issues with "enhancement" label
- Describe the feature and use case
- Consider contributing the feature

## 🎯 Roadmap

### Upcoming Features
- [ ] Mobile app (React Native)
- [ ] Advanced reporting
- [ ] Multi-currency support
- [ ] Bank API integration
- [ ] Advanced ML predictions
- [ ] Cloud backup integration

### Performance Improvements
- [ ] Database optimization
- [ ] Caching layer
- [ ] CDN integration
- [ ] Progressive Web App

## 📊 System Requirements

### Minimum Requirements
- **CPU**: 1 core
- **RAM**: 2GB
- **Storage**: 10GB
- **OS**: Linux, macOS, Windows

### Recommended Requirements
- **CPU**: 2+ cores
- **RAM**: 4GB+
- **Storage**: 50GB+
- **OS**: Ubuntu 20.04+, macOS 10.15+, Windows 10+

## 🔄 Version History

### v1.2.0 (Current)
- ✅ Financial Analytics Dashboard
- ✅ Fixed income calculation
- ✅ PDF upload support
- ✅ Comprehensive backup system
- ✅ Tax return analytics

### v1.1.0
- ✅ Transaction management
- ✅ Loan calculator
- ✅ Property management
- ✅ Basic analytics

### v1.0.0
- ✅ Initial release
- ✅ User authentication
- ✅ Basic dashboard
- ✅ Database setup

---

**Family Finance Application** - Comprehensive financial management for families and businesses.

For more information, visit the [documentation](docs/) or contact support.