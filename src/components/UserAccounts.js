import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FinancialOverview from './FinancialOverview';

const UserAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddBalance, setShowAddBalance] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showOverview, setShowOverview] = useState(false);
  const [balanceForm, setBalanceForm] = useState({
    balance: '',
    date_entered: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAccounts(), fetchBalances()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const fetchAccounts = async () => {
    try {
      console.log('Fetching accounts...');
      const response = await axios.get('/business-accounts');
      console.log('Accounts response:', response.data);
      if (response.data.success) {
        setAccounts(response.data.accounts);
        console.log('Accounts set:', response.data.accounts.length);
      } else {
        console.error('API returned success: false');
        setError('API returned success: false');
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to fetch bank accounts');
    }
  };

  const fetchBalances = async () => {
    try {
      const response = await axios.get('/user-account-balances');
      if (response.data.success) {
        setBalances(response.data.balances);
      }
    } catch (err) {
      console.error('Error fetching balances:', err);
    }
  };

  const handleAddBalance = (account) => {
    setSelectedAccount(account);
    setBalanceForm({
      balance: '',
      date_entered: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowAddBalance(true);
  };

  const handleEditBalance = (balance) => {
    setSelectedAccount({ id: balance.account_id, account_name: balance.account_name });
    setBalanceForm({
      balance: balance.balance.toString(),
      date_entered: balance.date_entered,
      notes: balance.notes || ''
    });
    setShowAddBalance(true);
  };

  const handleSubmitBalance = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/user-account-balances', {
        account_id: selectedAccount.id,
        balance: parseFloat(balanceForm.balance),
        date_entered: balanceForm.date_entered,
        notes: balanceForm.notes
      });

      if (response.data.success) {
        setShowAddBalance(false);
        setSelectedAccount(null);
        setBalanceForm({ balance: '', date_entered: '', notes: '' });
        fetchBalances(); // Refresh balances
      }
    } catch (err) {
      console.error('Error adding balance:', err);
      setError('Failed to add balance');
    }
  };

  const getCurrentBalance = (accountId) => {
    const balance = balances.find(b => b.account_id === accountId);
    return balance ? balance.balance : null;
  };

  const getLastUpdated = (accountId) => {
    const balance = balances.find(b => b.account_id === accountId);
    return balance ? balance.date_entered : null;
  };

  const getBalancesForAccount = (accountId) => {
    const accountBalances = balances.filter(b => b.account_id === accountId).sort((a, b) => new Date(b.date_entered) - new Date(a.date_entered));
    
    // Return empty array if no balances
    if (accountBalances.length === 0) {
      return [];
    }
    
    // Find the best balance first
    const bestBalance = accountBalances.reduce((best, current) => 
      current.balance > best.balance ? current : best
    );
    
    // Add comparison data to each balance entry
    return accountBalances.map((balance, index) => {
      const previousBalance = index < accountBalances.length - 1 ? accountBalances[index + 1] : null;
      
      return {
        ...balance,
        betterThanLast: previousBalance ? balance.balance - previousBalance.balance : null,
        betterThanBest: balance.balance - bestBalance.balance,
        isBestEver: balance.id === bestBalance.id
      };
    });
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return 'Not set';
    }
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatComparison = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '-';
    }
    const formatted = new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      signDisplay: 'always'
    }).format(amount);
    
    return {
      value: formatted,
      isPositive: amount > 0,
      isNegative: amount < 0,
      isZero: amount === 0
    };
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2><i className="fas fa-university me-2"></i>My Bank Accounts</h2>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-secondary"
                onClick={() => setShowOverview(!showOverview)}
              >
                <i className={`fas ${showOverview ? 'fa-eye-slash' : 'fa-eye'} me-2`}></i>
                {showOverview ? 'Hide' : 'Show'} Overview
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => setShowAddBalance(true)}
              >
                <i className="fas fa-plus me-2"></i>Add Balance
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {/* Bank Accounts Overview Panel */}
          {accounts.length > 0 && showOverview && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0"><i className="fas fa-chart-pie me-2"></i>Bank Accounts Overview</h5>
              </div>
              <div className="card-body">
                <FinancialOverview
                  type="accounts"
                  items={accounts}
                  balances={balances}
                  title=""
                  icon=""
                  colorClass="text-success"
                  borderClass="border-success"
                />
              </div>
            </div>
          )}

          {accounts.length > 0 ? (
            <div className="card">
              {/* Tab Navigation */}
              <ul className="nav nav-tabs" id="accountTabs" role="tablist">
                {accounts.map((account, index) => (
                  <li key={account.id} className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeTab === index ? 'active' : ''}`}
                      onClick={() => setActiveTab(index)}
                      type="button"
                    >
                      {account.account_name}
                    </button>
                  </li>
                ))}
              </ul>

              {/* Tab Content */}
              <div className="tab-content">
                {accounts.map((account, index) => (
                  <div
                    key={account.id}
                    className={`tab-pane fade ${activeTab === index ? 'show active' : ''}`}
                    role="tabpanel"
                  >
                    <div className="card-body">
                      {/* Account Details */}
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <h5 className="text-primary">{account.account_name}</h5>
                          <p className="text-muted mb-1"><strong>Bank:</strong> {account.bank_name}</p>
                          <p className="text-muted mb-1"><strong>Account Number:</strong> {account.account_number}</p>
                          <p className="text-muted mb-1"><strong>Currency:</strong> {account.currency || 'EUR'}</p>
                          <p className="text-muted mb-0"><strong>Type:</strong> {account.account_type || 'N/A'}</p>
                        </div>
                        <div className="col-md-6">
                          <div className="text-end">
                            <button 
                              className="btn btn-primary"
                              onClick={() => handleAddBalance(account)}
                            >
                              <i className="fas fa-plus me-2"></i>Add Balance Entry
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Balance History Table */}
                      <h6 className="mb-3">Balance History</h6>
                      {getBalancesForAccount(account.id).length > 0 ? (
                        <div className="table-responsive">
                          <table className="table table-striped table-hover">
                            <thead className="table-dark">
                              <tr>
                                <th>Date</th>
                                <th>Balance</th>
                                <th>Better/Worse than Last Entry</th>
                                <th>Better/Worse than Best Ever</th>
                                <th>Notes</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getBalancesForAccount(account.id).map((balance) => {
                                const lastComparison = formatComparison(balance.betterThanLast);
                                const bestComparison = formatComparison(balance.betterThanBest);
                                
                                return (
                                  <tr key={balance.id} className={balance.isBestEver ? 'table-warning' : ''}>
                                    <td>
                                      {new Date(balance.date_entered).toLocaleDateString()}
                                      {balance.isBestEver && (
                                        <span className="ms-2 text-warning" title="Best Ever!">
                                          <i className="fas fa-flag"></i>
                                        </span>
                                      )}
                                    </td>
                                    <td className="fw-bold text-success">{formatCurrency(balance.balance)}</td>
                                    <td>
                                      {balance.betterThanLast !== null ? (
                                        <span className={`fw-bold ${
                                          lastComparison.isPositive ? 'text-success' : 
                                          lastComparison.isNegative ? 'text-danger' : 
                                          'text-muted'
                                        }`}>
                                          {lastComparison.value}
                                        </span>
                                      ) : (
                                        <span className="text-muted">-</span>
                                      )}
                                    </td>
                                    <td>
                                      <span className={`fw-bold ${
                                        bestComparison.isPositive ? 'text-success' : 
                                        bestComparison.isNegative ? 'text-danger' : 
                                        'text-warning'
                                      }`}>
                                        {bestComparison.value}
                                      </span>
                                    </td>
                                    <td>{balance.notes || '-'}</td>
                                    <td>
                                      <button 
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={() => handleEditBalance(balance)}
                                      >
                                        <i className="fas fa-edit"></i>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <i className="fas fa-chart-line fa-2x text-muted mb-2"></i>
                          <p className="text-muted">No balance entries yet. Click "Add Balance Entry" to get started.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {accounts.length === 0 && (
            <div className="text-center py-5">
              <i className="fas fa-university fa-3x text-muted mb-3"></i>
              <h4 className="text-muted">No bank accounts found</h4>
              <p className="text-muted">Contact an administrator to add bank accounts to your account.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Balance Modal */}
      {showAddBalance && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {selectedAccount ? `Update Balance - ${selectedAccount.account_name}` : 'Add Account Balance'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowAddBalance(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmitBalance}>
                <div className="modal-body">
                  {selectedAccount && (
                    <div className="alert alert-info">
                      <strong>Account:</strong> {selectedAccount.account_name}<br />
                      <strong>Bank:</strong> {selectedAccount.bank_name}<br />
                      <strong>Account Number:</strong> {selectedAccount.account_number}
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <label htmlFor="balance" className="form-label">Current Balance *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      id="balance"
                      value={balanceForm.balance}
                      onChange={(e) => setBalanceForm({...balanceForm, balance: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="date_entered" className="form-label">Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      id="date_entered"
                      value={balanceForm.date_entered}
                      onChange={(e) => setBalanceForm({...balanceForm, date_entered: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="notes" className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      id="notes"
                      rows="3"
                      value={balanceForm.notes}
                      onChange={(e) => setBalanceForm({...balanceForm, notes: e.target.value})}
                      placeholder="Optional notes about this balance update..."
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowAddBalance(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success">
                    Save Balance
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

export default UserAccounts;
