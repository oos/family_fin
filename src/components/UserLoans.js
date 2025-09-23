import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import FinancialOverview from './FinancialOverview';
import IndividualItemHistory from './IndividualItemHistory';

const UserLoans = () => {
  const [searchParams] = useSearchParams();
  const [loans, setLoans] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddBalance, setShowAddBalance] = useState(false);
  const [showEditBalance, setShowEditBalance] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
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
      await Promise.all([fetchLoans(), fetchBalances()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Handle URL parameter to set active tab
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && loans.length > 0) {
      const tabIndex = loans.findIndex(loan => 
        loan.loan_name === decodeURIComponent(tabParam)
      );
      if (tabIndex !== -1) {
        setActiveTab(tabIndex);
      }
    }
  }, [searchParams, loans]);


  const fetchLoans = async () => {
    try {
      console.log('Fetching loans...');
      const response = await axios.get('/api/loans');
      console.log('Loans response:', response.data);
      if (response.data.success) {
        setLoans(response.data.loans);
        console.log('Loans set:', response.data.loans.length);
      } else {
        console.error('API returned success: false');
        setError('API returned success: false');
      }
    } catch (err) {
      console.error('Error fetching loans:', err);
      setError('Failed to fetch loans');
    }
  };

  const fetchBalances = async () => {
    try {
      const response = await axios.get('/api/user-loan-balances');
      if (response.data.success) {
        setBalances(response.data.balances);
      }
    } catch (err) {
      console.error('Error fetching balances:', err);
    }
  };

  const handleAddBalance = (loan) => {
    setSelectedLoan(loan);
    setBalanceForm({
      balance: '',
      date_entered: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowAddBalance(true);
  };


  const handleOpenModal = () => {
    // Pre-select the current tab's loan
    const currentLoan = loans[activeTab];
    setSelectedLoan(currentLoan);
    setBalanceForm({
      balance: '',
      date_entered: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowAddBalance(true);
  };

  const getCurrentLoan = () => {
    return loans[activeTab] || null;
  };

  const handleEditBalance = (balance) => {
    setSelectedLoan({ id: balance.loan_id, loan_name: balance.loan_name });
    setBalanceForm({
      balance: balance.balance.toString(),
      date_entered: balance.date_entered,
      notes: balance.notes || ''
    });
    setShowAddBalance(true);
  };

  const handleEditLoan = (loan) => {
    // TODO: Implement edit loan functionality
    console.log('Edit loan:', loan);
    alert('Edit loan functionality will be implemented');
  };

  const handleDeleteLoan = (loan) => {
    if (window.confirm(`Are you sure you want to delete the loan "${loan.loan_name}"?`)) {
      // TODO: Implement delete loan functionality
      console.log('Delete loan:', loan);
      alert('Delete loan functionality will be implemented');
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
    if (window.confirm(`Are you sure you want to delete this balance entry for ${balance.loan_name || 'this loan'}?`)) {
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
      const response = await axios.post('/user-loan-balances', {
        loan_id: selectedLoan.id,
        balance: parseFloat(balanceForm.balance),
        date_entered: balanceForm.date_entered,
        notes: balanceForm.notes
      });

      if (response.data.success) {
        setShowAddBalance(false);
        setSelectedLoan(null);
        setBalanceForm({ balance: '', date_entered: '', notes: '' });
        fetchBalances(); // Refresh balances
      }
    } catch (err) {
      console.error('Error adding balance:', err);
      setError('Failed to add balance');
    }
  };

  const getCurrentBalance = (loanId) => {
    const balance = balances.find(b => b.loan_id === loanId);
    return balance ? balance.balance : null;
  };

  const getLastUpdated = (loanId) => {
    const balance = balances.find(b => b.loan_id === loanId);
    return balance ? balance.date_entered : null;
  };

  const getBalancesForLoan = (loanId) => {
    const loanBalances = balances.filter(b => b.loan_id === loanId).sort((a, b) => new Date(b.date_entered) - new Date(a.date_entered));
    
    // Return empty array if no balances
    if (loanBalances.length === 0) {
      return [];
    }
    
    // Find the best balance first
    const bestBalance = loanBalances.reduce((best, current) => 
      current.balance > best.balance ? current : best
    );
    
    // Add comparison data to each balance entry
    return loanBalances.map((balance, index) => {
      const previousBalance = index < loanBalances.length - 1 ? loanBalances[index + 1] : null;
      
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
            <h2>💳 Loans</h2>
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


          {loans.length > 0 ? (
            <div className="card">
              {/* Tab Navigation */}
              <ul className="nav nav-tabs" id="loanTabs" role="tablist">
                {loans.map((loan, index) => (
                  <li key={loan.id} className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeTab === index ? 'active' : ''}`}
                      onClick={() => setActiveTab(index)}
                      type="button"
                    >
                      {loan.loan_name}
                    </button>
                  </li>
                ))}
              </ul>

              {/* Tab Content */}
              <div className="tab-content">
                {loans.map((loan, index) => (
                  <div
                    key={loan.id}
                    className={`tab-pane fade ${activeTab === index ? 'show active' : ''}`}
                    role="tabpanel"
                  >
                    <div className="card-body">
                      {/* Loan Details - All in One Row */}
                      <div className="mb-4">
                        <h5 className="text-primary mb-3">{loan.loan_name}</h5>
                        <div className="row align-items-center">
                          <div className="col-md-2">
                            <small className="text-muted"><strong>Type:</strong></small><br />
                            <span>{loan.loan_type}</span>
                          </div>
                          <div className="col-md-2">
                            <small className="text-muted"><strong>Principal:</strong></small><br />
                            <span>{formatCurrency(loan.principal_amount)}</span>
                          </div>
                          <div className="col-md-2">
                            <small className="text-muted"><strong>Interest Rate:</strong></small><br />
                            <span>{loan.interest_rate ? `${loan.interest_rate}%` : 'N/A'}</span>
                          </div>
                          <div className="col-md-2">
                            <small className="text-muted"><strong>Term:</strong></small><br />
                            <span>{loan.term_years ? `${loan.term_years} years` : 'N/A'}</span>
                          </div>
                          <div className="col-md-2">
                            <small className="text-muted"><strong>Monthly Payment:</strong></small><br />
                            <span>{formatCurrency(loan.monthly_payment)}</span>
                          </div>
                          <div className="col-md-2">
                            <small className="text-muted"><strong>Current Balance:</strong> <span className="text-danger fw-bold">
                              {getCurrentBalance(loan.id) ? formatCurrency(getCurrentBalance(loan.id)) : 'Not set'}
                            </span></small>
                          </div>
                        </div>
                      </div>

                      {/* Balance History - Using IndividualItemHistory Component */}
        <IndividualItemHistory
          type="loans"
          item={loan}
          balances={balances}
          colorClass="text-danger"
          onEditBalance={handleEditBalanceEntry}
          onDeleteBalance={handleDeleteBalanceEntry}
        />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {loans.length === 0 && (
            <div className="text-center py-5">
              <div className="text-muted mb-3" style={{ fontSize: '3rem' }}>💳</div>
              <h4 className="text-muted">No loans found</h4>
              <p className="text-muted">Contact an administrator to add loans to your account.</p>
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
                <h5 className="modal-title">Add Loan Balance</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowAddBalance(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmitBalance}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="loanSelect" className="form-label">Select Loan *</label>
                    <select
                      className="form-select"
                      id="loanSelect"
                      value={selectedLoan?.id || ''}
                      onChange={(e) => {
                        const loan = loans.find(ln => ln.id === parseInt(e.target.value));
                        setSelectedLoan(loan);
                      }}
                      required
                    >
                      <option value="">Choose a loan...</option>
                      {loans.map((loan) => (
                        <option key={loan.id} value={loan.id}>
                          {loan.loan_name} ({loan.lender})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedLoan && (
                    <div className="alert alert-info">
                      <strong>Loan:</strong> {selectedLoan.loan_name}<br />
                      <strong>Lender:</strong> {selectedLoan.lender}
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
                  <button type="submit" className="btn btn-primary">
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
                    <strong>Loan:</strong> {editingBalance.loan_name || 'N/A'}<br />
                    <strong>Lender:</strong> {editingBalance.lender || 'N/A'}
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
                  <button type="submit" className="btn btn-primary">
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

export default UserLoans;
