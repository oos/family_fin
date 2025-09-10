import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBalanceForm, setShowBalanceForm] = useState(false);
  const [editingBalance, setEditingBalance] = useState(null);

  const [balanceForm, setBalanceForm] = useState({
    account_id: '',
    loan_id: '',
    balance: '',
    currency: 'EUR',
    notes: '',
    date_entered: new Date().toISOString().split('T')[0]
  });

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/user-dashboard');
      if (response.data.success) {
        setDashboardData(response.data.dashboard);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBalanceSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingBalance ? `/account-balances/${editingBalance.id}` : '/account-balances';
      const method = editingBalance ? 'PUT' : 'POST';
      
      const response = await axios({
        method,
        url,
        data: balanceForm
      });

      if (response.data.success) {
        setShowBalanceForm(false);
        setEditingBalance(null);
        setSelectedLoan(null);
        setSelectedAccount(null);
        setBalanceForm({
          account_id: '',
          loan_id: '',
          balance: '',
          currency: 'EUR',
          notes: '',
          date_entered: new Date().toISOString().split('T')[0]
        });
        fetchDashboardData(); // Refresh data
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Failed to save account balance');
      console.error('Error saving account balance:', err);
    }
  };

  const handleEditBalance = (balance) => {
    setEditingBalance(balance);
    setBalanceForm({
      account_id: balance.account_id || '',
      loan_id: balance.loan_id || '',
      balance: balance.balance,
      currency: balance.currency,
      notes: balance.notes || '',
      date_entered: balance.date_entered
    });
    setShowBalanceForm(true);
  };

  const handleDeleteBalance = async (balanceId) => {
    if (window.confirm('Are you sure you want to delete this balance entry?')) {
      try {
        const response = await axios.delete(`/account-balances/${balanceId}`);
        if (response.data.success) {
          fetchDashboardData(); // Refresh data
        } else {
          setError(response.data.message);
        }
      } catch (err) {
        setError('Failed to delete account balance');
        console.error('Error deleting account balance:', err);
      }
    }
  };

  const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getLatestLoanBalance = (loanId) => {
    if (!data.account_balances) return null;
    const loanBalances = data.account_balances
      .filter(balance => balance.loan_id === loanId)
      .sort((a, b) => new Date(b.date_entered) - new Date(a.date_entered));
    return loanBalances[0] || null;
  };

  const getLatestAccountBalance = (accountId) => {
    if (!data.account_balances) return null;
    const accountBalances = data.account_balances
      .filter(balance => balance.account_id === accountId)
      .sort((a, b) => new Date(b.date_entered) - new Date(a.date_entered));
    return accountBalances[0] || null;
  };

  const handleAddLoanBalance = (loan) => {
    setSelectedLoan(loan);
    setSelectedAccount(null);
    setBalanceForm({
      account_id: '',
      loan_id: loan.id,
      balance: '',
      currency: 'EUR',
      notes: '',
      date_entered: new Date().toISOString().split('T')[0]
    });
    setShowBalanceForm(true);
  };

  const handleAddAccountBalance = (account) => {
    setSelectedAccount(account);
    setSelectedLoan(null);
    setBalanceForm({
      account_id: account.id,
      loan_id: '',
      balance: '',
      currency: 'EUR',
      notes: '',
      date_entered: new Date().toISOString().split('T')[0]
    });
    setShowBalanceForm(true);
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
      
      <div className="row">
        {/* Loans Section */}
        {visible_sections.loans && data.loans && (
          <div className="col-md-6 mb-4">
            <div className="card">
              <div className="card-header">
                <h5>Loans</h5>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Bank</th>
                        <th>Date of Latest Entry</th>
                        <th>Balance of Latest Entry</th>
                        <th>Comment</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.loans.map(loan => {
                        const latestBalance = getLatestLoanBalance(loan.id);
                        return (
                          <tr key={loan.id}>
                            <td>{loan.lender}</td>
                            <td>
                              {latestBalance ? formatDate(latestBalance.date_entered) : 'No entries'}
                            </td>
                            <td>
                              {latestBalance ? formatCurrency(latestBalance.balance, latestBalance.currency) : 'N/A'}
                            </td>
                            <td>
                              {latestBalance ? (latestBalance.notes || 'No comment') : 'N/A'}
                            </td>
                            <td>
                              <button 
                                className="btn btn-sm btn-primary"
                                onClick={() => handleAddLoanBalance(loan)}
                              >
                                Add Balance
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bank Accounts Section */}
        {visible_sections.bank_accounts && data.bank_accounts && (
          <div className="col-md-6 mb-4">
            <div className="card">
              <div className="card-header">
                <h5>Bank Accounts</h5>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Bank</th>
                        <th>Account Number</th>
                        <th>Date of Latest Entry</th>
                        <th>Balance of Latest Entry</th>
                        <th>Comment</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.bank_accounts.map(account => {
                        const latestBalance = getLatestAccountBalance(account.id);
                        return (
                          <tr key={account.id}>
                            <td>{account.bank_name}</td>
                            <td>{account.account_number}</td>
                            <td>
                              {latestBalance ? formatDate(latestBalance.date_entered) : 'No entries'}
                            </td>
                            <td>
                              {latestBalance ? formatCurrency(latestBalance.balance, latestBalance.currency) : 'N/A'}
                            </td>
                            <td>
                              {latestBalance ? (latestBalance.notes || 'No comment') : 'N/A'}
                            </td>
                            <td>
                              <button 
                                className="btn btn-sm btn-primary"
                                onClick={() => handleAddAccountBalance(account)}
                              >
                                Add Balance
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Balances Section */}
        {visible_sections.account_balances && (
          <div className="col-md-6 mb-4">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5>Account Balances</h5>
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => setShowBalanceForm(true)}
                >
                  Add Balance
                </button>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Account/Loan</th>
                        <th>Balance</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.account_balances && data.account_balances.map(balance => (
                        <tr key={balance.id}>
                          <td>
                            {balance.account_name || balance.loan_name || 'Unknown'}
                          </td>
                          <td>{formatCurrency(balance.balance, balance.currency)}</td>
                          <td>{formatDate(balance.date_entered)}</td>
                          <td>
                            <button 
                              className="btn btn-sm btn-outline-primary me-1"
                              onClick={() => handleEditBalance(balance)}
                            >
                              Edit
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteBalance(balance.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Balance Form Modal */}
      {showBalanceForm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingBalance ? 'Edit Account Balance' : 
                   selectedLoan ? `Add Balance for ${selectedLoan.bank} - ${selectedLoan.property_name}` :
                   selectedAccount ? `Add Balance for ${selectedAccount.bank_name} - ${selectedAccount.name}` :
                   'Add Account Balance'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => {
                    setShowBalanceForm(false);
                    setEditingBalance(null);
                    setSelectedLoan(null);
                    setSelectedAccount(null);
                    setBalanceForm({
                      account_id: '',
                      loan_id: '',
                      balance: '',
                      currency: 'EUR',
                      notes: '',
                      date_entered: new Date().toISOString().split('T')[0]
                    });
                  }}
                ></button>
              </div>
              <form onSubmit={handleBalanceSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Account</label>
                    <select 
                      className="form-select"
                      value={balanceForm.account_id}
                      onChange={(e) => setBalanceForm({...balanceForm, account_id: e.target.value, loan_id: ''})}
                    >
                      <option value="">Select Account</option>
                      {data.bank_accounts && data.bank_accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.account_name} ({account.account_number}) - {account.bank_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Loan</label>
                    <select 
                      className="form-select"
                      value={balanceForm.loan_id}
                      onChange={(e) => setBalanceForm({...balanceForm, loan_id: e.target.value, account_id: ''})}
                    >
                      <option value="">Select Loan</option>
                      {data.loans && data.loans.map(loan => (
                        <option key={loan.id} value={loan.id}>
                          {loan.lender} - {loan.property_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Balance</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="form-control"
                      value={balanceForm.balance}
                      onChange={(e) => setBalanceForm({...balanceForm, balance: e.target.value})}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Currency</label>
                    <select 
                      className="form-select"
                      value={balanceForm.currency}
                      onChange={(e) => setBalanceForm({...balanceForm, currency: e.target.value})}
                    >
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Date</label>
                    <input 
                      type="date" 
                      className="form-control"
                      value={balanceForm.date_entered}
                      onChange={(e) => setBalanceForm({...balanceForm, date_entered: e.target.value})}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea 
                      className="form-control"
                      rows="3"
                      value={balanceForm.notes}
                      onChange={(e) => setBalanceForm({...balanceForm, notes: e.target.value})}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowBalanceForm(false);
                      setEditingBalance(null);
                      setSelectedLoan(null);
                      setSelectedAccount(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingBalance ? 'Update' : 'Add'} Balance
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
