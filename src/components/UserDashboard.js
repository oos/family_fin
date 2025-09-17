import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FinancialOverview from './FinancialOverview';

const UserDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loans, setLoans] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loanBalances, setLoanBalances] = useState([]);
  const [accountBalances, setAccountBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBalanceForm, setShowBalanceForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemType, setItemType] = useState(null); // 'account' or 'loan'
  const [balanceForm, setBalanceForm] = useState({
    balance: '',
    date_entered: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, loansRes, accountsRes, loanBalancesRes, accountBalancesRes] = await Promise.all([
        axios.get('/user-dashboard'),
        axios.get('/loans'),
        axios.get('/business-accounts'),
        axios.get('/user-loan-balances'),
        axios.get('/user-account-balances')
      ]);
      
      if (dashboardRes.data.success) {
        setDashboardData(dashboardRes.data.dashboard);
      } else {
        setError(dashboardRes.data.message);
      }
      
      setLoans(loansRes.data.success ? loansRes.data.loans : []);
      setAccounts(accountsRes.data.success ? accountsRes.data.accounts : []);
      setLoanBalances(loanBalancesRes.data.success ? loanBalancesRes.data.balances : []);
      setAccountBalances(accountBalancesRes.data.success ? accountBalancesRes.data.balances : []);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };


  const formatCurrency = (amount, currency = 'EUR') => {
    // Handle null, undefined, or non-numeric values
    if (amount === null || amount === undefined || amount === '' || isNaN(Number(amount))) {
      return '€0.00';
    }
    
    const numericAmount = Number(amount);
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currency
    }).format(numericAmount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  // Helper functions for financial calculations
  const getCurrentLoanBalance = (loanId) => {
    const balance = loanBalances.find(b => b.loan_id === loanId);
    return balance ? balance.balance : 0;
  };

  const getCurrentAccountBalance = (accountId) => {
    const balance = accountBalances.find(b => b.account_id === accountId);
    return balance ? balance.balance : 0;
  };

  const getTotalLoanBalance = () => {
    return loans.reduce((total, loan) => total + getCurrentLoanBalance(loan.id), 0);
  };

  const getTotalAccountBalance = () => {
    return accounts.reduce((total, account) => total + getCurrentAccountBalance(account.id), 0);
  };

  const getNetPosition = () => {
    return getTotalAccountBalance() - getTotalLoanBalance();
  };

  const handleAddAccountBalance = (account) => {
    setSelectedItem(account);
    setItemType('account');
    setBalanceForm({
      balance: '',
      date_entered: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowBalanceForm(true);
  };

  const handleAddLoanBalance = (loan) => {
    setSelectedItem(loan);
    setItemType('loan');
    setBalanceForm({
      balance: '',
      date_entered: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowBalanceForm(true);
  };

  const handleBalanceSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = {
        ...balanceForm,
        [itemType === 'account' ? 'account_id' : 'loan_id']: selectedItem.id
      };

      const response = await axios.post('/account-balances', formData);
      
      if (response.data.success) {
        fetchDashboardData(); // Refresh data
        setShowBalanceForm(false);
        setSelectedItem(null);
        setItemType(null);
        setBalanceForm({
          balance: '',
          date_entered: new Date().toISOString().split('T')[0],
          notes: ''
        });
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Failed to save account balance');
      console.error('Error saving balance:', err);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="container">
        <div className="alert alert-warning" role="alert">
          No dashboard data available
        </div>
      </div>
    );
  }

  const { user, visible_sections, data } = dashboardData;

  return (
    <div className="container">
      <h1>Welcome, {user.username}!</h1>
      
      {/* Financial Position Overview */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3>Current Financial Position</h3>
        <div className="row">
          {/* Loans Section */}
          <FinancialOverview
            type="loans"
            items={loans}
            balances={loanBalances}
            title="Loans & Debt"
            icon="fa-credit-card"
            colorClass="text-danger"
            borderClass="border-danger"
          />

          {/* Bank Accounts Section */}
          <FinancialOverview
            type="accounts"
            items={accounts}
            balances={accountBalances}
            title="Bank Accounts & Cash"
            icon="fa-university"
            colorClass="text-success"
            borderClass="border-success"
          />
        </div>

        {/* Net Position Summary */}
        <div className="row mt-4">
          <div className="col-12">
            <div className="card" style={{ backgroundColor: '#f8f9fa', border: '2px solid #dee2e6' }}>
              <div className="card-body text-center">
                <h4 className="mb-3">Net Financial Position</h4>
                <div className="row">
                  <div className="col-md-4">
                    <h6 className="text-muted">Total Cash</h6>
                    <h4 className="text-success">{formatCurrency(getTotalAccountBalance())}</h4>
                  </div>
                  <div className="col-md-4">
                    <h6 className="text-muted">Total Debt</h6>
                    <h4 className="text-danger">{formatCurrency(getTotalLoanBalance())}</h4>
                  </div>
                  <div className="col-md-4">
                    <h6 className="text-muted">Net Position</h6>
                    <h3 className={getNetPosition() >= 0 ? 'text-success' : 'text-danger'}>
                      {formatCurrency(getNetPosition())}
                    </h3>
                    <small className="text-muted">
                      {getNetPosition() >= 0 ? 'Positive (Cash > Debt)' : 'Negative (Debt > Cash)'}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Form Modal */}
      {showBalanceForm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg" style={{ borderRadius: '12px', border: 'none' }}>
              <div className="modal-header bg-primary text-white" style={{ borderRadius: '12px 12px 0 0' }}>
                <div className="d-flex align-items-center">
                  <i className="fas fa-plus-circle me-2"></i>
                  <h5 className="modal-title mb-0">
                    Add Balance for {selectedItem ? 
                      (itemType === 'account' ? 
                        `${selectedItem.bank_name} - ${selectedItem.account_name}` : 
                        `${selectedItem.lender} - ${selectedItem.property_name}`) : 
                      'Unknown Item'}
                  </h5>
                </div>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowBalanceForm(false);
                    setSelectedItem(null);
                    setItemType(null);
                    setBalanceForm({
                      balance: '',
                      date_entered: new Date().toISOString().split('T')[0],
                      notes: ''
                    });
                  }}
                ></button>
              </div>
              <form onSubmit={handleBalanceSubmit}>
                <div className="modal-body p-4">
                  <div className="row">
                    <div className="col-md-6 mb-4">
                      <label className="form-label fw-semibold text-dark">
                        <i className="fas fa-euro-sign me-2 text-success"></i>
                        Balance Amount
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light">
                          <i className="fas fa-euro-sign text-muted"></i>
                        </span>
                        <input 
                          type="number" 
                          step="0.01"
                          className="form-control form-control-lg"
                          placeholder="0.00"
                          value={balanceForm.balance}
                          onChange={(e) => setBalanceForm({...balanceForm, balance: e.target.value})}
                          required
                          style={{ borderLeft: 'none' }}
                        />
                      </div>
                    </div>

                    <div className="col-md-6 mb-4">
                      <label className="form-label fw-semibold text-dark">
                        <i className="fas fa-calendar-alt me-2 text-info"></i>
                        Date
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light">
                          <i className="fas fa-calendar text-muted"></i>
                        </span>
                        <input 
                          type="date" 
                          className="form-control form-control-lg"
                          value={balanceForm.date_entered}
                          onChange={(e) => setBalanceForm({...balanceForm, date_entered: e.target.value})}
                          required
                          style={{ borderLeft: 'none' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold text-dark">
                      <i className="fas fa-comment-alt me-2 text-warning"></i>
                      Comments
                    </label>
                    <textarea 
                      className="form-control"
                      rows="4"
                      placeholder="Add any additional notes or comments about this balance entry..."
                      value={balanceForm.notes}
                      onChange={(e) => setBalanceForm({...balanceForm, notes: e.target.value})}
                      style={{ resize: 'vertical', minHeight: '100px' }}
                    />
                  </div>

                  {/* Summary Card */}
                  <div className="card bg-light border-0 mb-3">
                    <div className="card-body py-3">
                      <div className="row text-center">
                        <div className="col-4">
                          <div className="text-muted small">Item Type</div>
                          <div className="fw-semibold text-capitalize">
                            {itemType === 'account' ? 'Bank Account' : 'Loan'}
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="text-muted small">Institution</div>
                          <div className="fw-semibold">
                            {selectedItem ? (itemType === 'account' ? selectedItem.bank_name : selectedItem.lender) : 'N/A'}
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="text-muted small">Reference</div>
                          <div className="fw-semibold">
                            {selectedItem ? (itemType === 'account' ? selectedItem.account_name : selectedItem.property_name) : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light border-0 p-4" style={{ borderRadius: '0 0 12px 12px' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary btn-lg px-4"
                    onClick={() => {
                      setShowBalanceForm(false);
                      setSelectedItem(null);
                      setItemType(null);
                    }}
                  >
                    <i className="fas fa-times me-2"></i>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-lg px-4">
                    <i className="fas fa-save me-2"></i>
                    Add Balance
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserDashboard;
