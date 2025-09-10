import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
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
                        <th>Amount</th>
                        <th>Interest Rate</th>
                        <th>Term</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.loans
                        .filter(loan => !['Pepper', 'AIB', 'B&G'].includes(loan.lender))
                        .map(loan => (
                        <tr key={loan.id}>
                          <td>{loan.lender}</td>
                          <td>{formatCurrency(loan.principal_amount)}</td>
                          <td>{loan.interest_rate}%</td>
                          <td>{loan.term_years} years</td>
                          <td>
                            <button 
                              className="btn btn-sm btn-primary"
                              onClick={() => handleAddLoanBalance(loan)}
                            >
                              Add Balance
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
                        <th>Account Name</th>
                        <th>Account Number</th>
                        <th>Currency</th>
                        <th>Type</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.bank_accounts.map(account => (
                        <tr key={account.id}>
                          <td>{account.bank_name}</td>
                          <td>{account.account_name}</td>
                          <td>{account.account_number}</td>
                          <td>{account.currency}</td>
                          <td>{account.account_type}</td>
                          <td>
                            <button 
                              className="btn btn-sm btn-primary"
                              onClick={() => handleAddAccountBalance(account)}
                            >
                              Add Balance
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
