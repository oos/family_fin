import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Transactions = () => {
  const [businessAccounts, setBusinessAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    type: '',
    category: ''
  });

  useEffect(() => {
    fetchBusinessAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchTransactions();
    }
  }, [selectedAccount]);

  const fetchBusinessAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching business accounts with token:', token ? 'present' : 'missing');
      const response = await axios.get('/api/business-accounts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Business accounts response:', response.data);
      setBusinessAccounts(response.data);
    } catch (err) {
      setError('Failed to load business accounts');
      console.error('Error fetching business accounts:', err);
    }
  };

  const fetchTransactions = async () => {
    if (!selectedAccount) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/business-accounts/${selectedAccount}/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(response.data);
    } catch (err) {
      setError('Failed to load transactions');
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountChange = (e) => {
    setSelectedAccount(e.target.value);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: '',
      type: '',
      category: ''
    });
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = !filters.search || 
      transaction.description.toLowerCase().includes(filters.search.toLowerCase()) ||
      (transaction.payer && transaction.payer.toLowerCase().includes(filters.search.toLowerCase())) ||
      (transaction.reference && transaction.reference.toLowerCase().includes(filters.search.toLowerCase()));

    const matchesDateFrom = !filters.dateFrom || 
      new Date(transaction.transaction_date) >= new Date(filters.dateFrom);

    const matchesDateTo = !filters.dateTo || 
      new Date(transaction.transaction_date) <= new Date(filters.dateTo);

    const matchesAmountMin = !filters.amountMin || 
      Math.abs(transaction.amount) >= parseFloat(filters.amountMin);

    const matchesAmountMax = !filters.amountMax || 
      Math.abs(transaction.amount) <= parseFloat(filters.amountMax);

    const matchesType = !filters.type || 
      transaction.transaction_type === filters.type;

    const matchesCategory = !filters.category || 
      transaction.category === filters.category;

    return matchesSearch && matchesDateFrom && matchesDateTo && 
           matchesAmountMin && matchesAmountMax && matchesType && matchesCategory;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IE');
  };

  const getTransactionTypeOptions = () => {
    const types = [...new Set(transactions.map(t => t.transaction_type).filter(Boolean))];
    return types;
  };

  const getCategoryOptions = () => {
    const categories = [...new Set(transactions.map(t => t.category).filter(Boolean))];
    return categories;
  };

  const selectedAccountData = businessAccounts.find(acc => acc.id.toString() === selectedAccount);

  return (
    <div className="container">
      <h1>Bank Transactions</h1>
      
      {/* Account Selection */}
      <div className="card mb-4">
        <h3>Select Bank Account</h3>
        <div className="form-group">
          <label>Bank Account:</label>
          <select 
            value={selectedAccount} 
            onChange={handleAccountChange}
            className="form-control"
          >
            <option value="">Select an account...</option>
            {businessAccounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.account_name} - {account.company_name} ({account.account_number})
              </option>
            ))}
          </select>
        </div>
        
        {selectedAccountData && (
          <div className="row mt-3">
            <div className="col-md-3">
              <strong>Current Balance:</strong> {formatCurrency(selectedAccountData.balance || 0)}
            </div>
            <div className="col-md-3">
              <strong>Account Number:</strong> {selectedAccountData.account_number}
            </div>
            <div className="col-md-3">
              <strong>Bank:</strong> {selectedAccountData.bank_name}
            </div>
            <div className="col-md-3">
              <strong>Last Refreshed:</strong> {selectedAccountData.last_refreshed ? 
                new Date(selectedAccountData.last_refreshed).toLocaleString() : 'Never'}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      {selectedAccount && (
        <div className="card mb-4">
          <h3>Filters</h3>
          <div className="row">
            <div className="col-md-3">
              <div className="form-group">
                <label>Search:</label>
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Description, payer, reference..."
                  className="form-control"
                />
              </div>
            </div>
            <div className="col-md-2">
              <div className="form-group">
                <label>Date From:</label>
                <input
                  type="date"
                  name="dateFrom"
                  value={filters.dateFrom}
                  onChange={handleFilterChange}
                  className="form-control"
                />
              </div>
            </div>
            <div className="col-md-2">
              <div className="form-group">
                <label>Date To:</label>
                <input
                  type="date"
                  name="dateTo"
                  value={filters.dateTo}
                  onChange={handleFilterChange}
                  className="form-control"
                />
              </div>
            </div>
            <div className="col-md-1">
              <div className="form-group">
                <label>Min Amount:</label>
                <input
                  type="number"
                  name="amountMin"
                  value={filters.amountMin}
                  onChange={handleFilterChange}
                  placeholder="€0"
                  className="form-control"
                />
              </div>
            </div>
            <div className="col-md-1">
              <div className="form-group">
                <label>Max Amount:</label>
                <input
                  type="number"
                  name="amountMax"
                  value={filters.amountMax}
                  onChange={handleFilterChange}
                  placeholder="€∞"
                  className="form-control"
                />
              </div>
            </div>
            <div className="col-md-1">
              <div className="form-group">
                <label>Type:</label>
                <select
                  name="type"
                  value={filters.type}
                  onChange={handleFilterChange}
                  className="form-control"
                >
                  <option value="">All</option>
                  {getTransactionTypeOptions().map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-1">
              <div className="form-group">
                <label>Category:</label>
                <select
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                  className="form-control"
                >
                  <option value="">All</option>
                  {getCategoryOptions().map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-1">
              <div className="form-group">
                <label>&nbsp;</label>
                <button 
                  onClick={clearFilters}
                  className="btn btn-secondary form-control"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      {selectedAccount && (
        <div className="card">
          <h3>
            Transactions 
            {filteredTransactions.length !== transactions.length && 
              ` (${filteredTransactions.length} of ${transactions.length})`
            }
          </h3>
          
          {loading && <div className="text-center">Loading transactions...</div>}
          {error && <div className="alert alert-danger">{error}</div>}
          
          {!loading && !error && (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Payer</th>
                    <th>Amount</th>
                    <th>Balance</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Reference</th>
                    <th>Transaction ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center">
                        {transactions.length === 0 ? 'No transactions found' : 'No transactions match the current filters'}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map(transaction => (
                      <tr key={transaction.id}>
                        <td>{formatDate(transaction.transaction_date)}</td>
                        <td>{transaction.description}</td>
                        <td>{transaction.payer || '-'}</td>
                        <td className={transaction.amount >= 0 ? 'text-success' : 'text-danger'}>
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td>{transaction.balance ? formatCurrency(transaction.balance) : '-'}</td>
                        <td>{transaction.transaction_type || '-'}</td>
                        <td>{transaction.category || '-'}</td>
                        <td>{transaction.reference || '-'}</td>
                        <td>{transaction.transaction_id || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Transactions;
