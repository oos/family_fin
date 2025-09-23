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
        axios.get('/api/user-dashboard'),
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
    <div className="container-fluid px-3">
      {/* Net Position Summary - Moved to top */}
      <div className="row mb-1 mt-4">
        <div className="col-12">
          <div className="card" style={{ backgroundColor: '#f8f9fa', border: '2px solid #dee2e6' }}>
            <div className="card-body py-1">
              <div className="row align-items-start">
                <div className="col-md-3">
                  <h4 className="mb-0">Net Financial Position</h4>
                </div>
                <div className="col-md-3">
                  <div className="text-center">
                    <div className="d-flex align-items-center justify-content-center mb-0">
                      <h6 className="text-muted mb-0 me-2">Total Cash:</h6>
                    </div>
                    <h4 className="text-success mb-0">{formatCurrency(getTotalAccountBalance())}</h4>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center">
                    <div className="d-flex align-items-center justify-content-center mb-0">
                      <h6 className="text-muted mb-0 me-2">Total Debt:</h6>
                    </div>
                    <h4 className="text-danger mb-0">{formatCurrency(getTotalLoanBalance())}</h4>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center">
                    <div className="d-flex align-items-center justify-content-center mb-0">
                      <h6 className="text-muted mb-0 me-2">Net Position:</h6>
                    </div>
                    <h3 className={getNetPosition() >= 0 ? 'text-success' : 'text-danger'} style={{ marginBottom: '0' }}>
                      {formatCurrency(getNetPosition())}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Position Overview */}
      <div className="card mb-1">
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
            showHistory={false}
            showViewButton={true}
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
            showHistory={false}
            showViewButton={true}
          />
        </div>
      </div>

      {/* Balance Form Modal */}
      {showBalanceForm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg" style={{ borderRadius: '12px', border: 'none' }}>
              <div className="modal-header bg-primary text-white" style={{ borderRadius: '12px 12px 0 0' }}>
                <div className="d-flex align-items-center">
                  ➕
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
                        💰
                        Balance Amount
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light">
                          💰
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
                        📅
                        Date
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light">
                          📅
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
                      💬
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
                    ✕
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-lg px-4">
                    💾
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
