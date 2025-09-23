import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import FinancialOverview from './FinancialOverview';
import IndividualItemHistory from './IndividualItemHistory';

const UserAccounts = () => {
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddBalance, setShowAddBalance] = useState(false);
  const [showEditBalance, setShowEditBalance] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [editingBalance, setEditingBalance] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [balanceForm, setBalanceForm] = useState({
    balance: '',
    date_entered: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [editBalanceForm, setEditBalanceForm] = useState({
    balance: '',
    date_entered: '',
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

  // Handle URL parameter to set active tab
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && accounts.length > 0) {
      const tabIndex = accounts.findIndex(account => 
        account.account_name === decodeURIComponent(tabParam)
      );
      if (tabIndex !== -1) {
        setActiveTab(tabIndex);
      }
    }
  }, [searchParams, accounts]);


  const fetchAccounts = async () => {
    try {
      console.log('Fetching accounts...');
      const response = await axios.get('/api/business-accounts');
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
      const response = await axios.get('/api/user-account-balances');
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


  const handleOpenModal = () => {
    // Pre-select the current tab's account
    const currentAccount = accounts[activeTab];
    setSelectedAccount(currentAccount);
    setBalanceForm({
      balance: '',
      date_entered: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowAddBalance(true);
  };

  const getCurrentAccount = () => {
    return accounts[activeTab] || null;
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

  const handleEditAccount = (account) => {
    // TODO: Implement edit account functionality
    console.log('Edit account:', account);
    alert('Edit account functionality will be implemented');
  };

  const handleDeleteAccount = (account) => {
    if (window.confirm(`Are you sure you want to delete the account "${account.account_name}"?`)) {
      // TODO: Implement delete account functionality
      console.log('Delete account:', account);
      alert('Delete account functionality will be implemented');
    }
  };

  const handleEditBalanceEntry = (balance) => {
    setEditingBalance(balance);
    setEditBalanceForm({
      balance: balance.balance.toString(),
      date_entered: balance.date_entered,
      notes: balance.notes || ''
    });
    setShowEditBalance(true);
  };

  const handleEditBalanceSubmit = async (e) => {
    e.preventDefault();
    if (!editingBalance) return;

    try {
      const response = await axios.put(`/api/account-balances/${editingBalance.id}`, {
        balance: parseFloat(editBalanceForm.balance),
        date_entered: editBalanceForm.date_entered,
        notes: editBalanceForm.notes
      });

      if (response.data.success) {
        // Update the balances state
        setBalances(balances.map(balance => 
          balance.id === editingBalance.id 
            ? { ...balance, ...editBalanceForm, balance: parseFloat(editBalanceForm.balance) }
            : balance
        ));
        
        setShowEditBalance(false);
        setEditingBalance(null);
        setEditBalanceForm({ balance: '', date_entered: '', notes: '' });
        alert('Balance entry updated successfully!');
      } else {
        alert('Error updating balance entry: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error updating balance entry:', error);
      alert('Error updating balance entry. Please try again.');
    }
  };

  const handleDeleteBalanceEntry = async (balance) => {
    if (window.confirm(`Are you sure you want to delete this balance entry for ${balance.account_name || 'this account'}?`)) {
      try {
        const response = await axios.delete(`/api/account-balances/${balance.id}`);

        if (response.data.success) {
          // Remove the balance from the state
          setBalances(balances.filter(b => b.id !== balance.id));
          alert('Balance entry deleted successfully!');
        } else {
          alert('Error deleting balance entry: ' + response.data.message);
        }
      } catch (error) {
        console.error('Error deleting balance entry:', error);
        alert('Error deleting balance entry. Please try again.');
      }
    }
  };

  const handleSubmitBalance = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/user-account-balances', {
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
            <h2>🏦 My Bank Accounts</h2>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-primary"
                onClick={handleOpenModal}
              >
                ➕ Add Balance
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
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
                      {/* Account Details - All in One Row */}
                      <div className="mb-4">
                        <h5 className="text-primary mb-3">
                          {account.account_name} ({account.account_number ? account.account_number.slice(-3) : ''})
                        </h5>
                        <div className="row align-items-center">
                          <div className="col-md-2">
                            <small className="text-muted"><strong>Bank:</strong></small><br />
                            <span>{account.bank_name}</span>
                          </div>
                          <div className="col-md-2">
                            <small className="text-muted"><strong>Currency:</strong></small><br />
                            <span>{account.currency || 'EUR'}</span>
                          </div>
                          <div className="col-md-2">
                            <small className="text-muted"><strong>Type:</strong></small><br />
                            <span>{account.account_type || 'N/A'}</span>
                          </div>
                          <div className="col-md-2">
                            <small className="text-muted"><strong>Current Balance:</strong> <span className="text-success fw-bold">
                              {getCurrentBalance(account.id) ? formatCurrency(getCurrentBalance(account.id)) : 'Not set'}
                            </span></small>
                          </div>
                          <div className="col-md-2">
                            <small className="text-muted"><strong>Last Updated:</strong></small><br />
                            <span>
                              {getLastUpdated(account.id) ? new Date(getLastUpdated(account.id)).toLocaleDateString() : 'Never'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Balance History - Using IndividualItemHistory Component */}
        <IndividualItemHistory
          type="accounts"
          item={account}
          balances={balances}
          colorClass="text-success"
          onEditBalance={handleEditBalanceEntry}
          onDeleteBalance={handleDeleteBalanceEntry}
        />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {accounts.length === 0 && (
            <div className="text-center py-5">
              <div className="text-muted mb-3" style={{ fontSize: '3rem' }}>🏦</div>
              <h4 className="text-muted">No bank accounts found</h4>
              <p className="text-muted">Contact an administrator to add bank accounts to your account.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Balance Modal */}
      {showAddBalance && (
        <div className="modal show d-block" style={{ 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add Account Balance</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowAddBalance(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmitBalance}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="accountSelect" className="form-label">Select Account *</label>
                    <select
                      className="form-select"
                      id="accountSelect"
                      value={selectedAccount?.id || ''}
                      onChange={(e) => {
                        const account = accounts.find(acc => acc.id === parseInt(e.target.value));
                        setSelectedAccount(account);
                      }}
                      required
                    >
                      <option value="">Choose an account...</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.account_name} ({account.bank_name})
                        </option>
                      ))}
                    </select>
                  </div>

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

      {/* Edit Balance Modal */}
      {showEditBalance && editingBalance && (
        <div className="modal show d-block" style={{ 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Balance Entry</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowEditBalance(false)}
                ></button>
              </div>
              <form onSubmit={handleEditBalanceSubmit}>
                <div className="modal-body">
                  <div className="alert alert-info">
                    <strong>Account:</strong> {editingBalance.account_name || 'N/A'}<br />
                    <strong>Bank:</strong> {editingBalance.bank_name || 'N/A'}
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="editBalance" className="form-label">Current Balance *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      id="editBalance"
                      value={editBalanceForm.balance}
                      onChange={(e) => setEditBalanceForm({...editBalanceForm, balance: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="editDate" className="form-label">Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      id="editDate"
                      value={editBalanceForm.date_entered}
                      onChange={(e) => setEditBalanceForm({...editBalanceForm, date_entered: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="editNotes" className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      id="editNotes"
                      rows="3"
                      value={editBalanceForm.notes}
                      onChange={(e) => setEditBalanceForm({...editBalanceForm, notes: e.target.value})}
                      placeholder="Optional notes about this balance update..."
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowEditBalance(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success">
                    Update Balance
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
