import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Transactions = () => {
  const [businessAccounts, setBusinessAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [sortField, setSortField] = useState('transaction_date');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  
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

  // Auto-select account 488 when accounts are loaded
  useEffect(() => {
    if (businessAccounts.length > 0) {
      console.log('Available accounts:', businessAccounts.map(acc => ({ id: acc.id, name: acc.account_name })));
      
      // Check if there's a stored account from previous session
      const storedAccount = localStorage.getItem('selectedAccount');
      if (storedAccount) {
        const account = businessAccounts.find(acc => acc.id.toString() === storedAccount);
        if (account) {
          console.log('Restoring stored account:', account.id);
          setSelectedAccount(storedAccount);
          return;
        }
      }
      
      // Fallback to account 488 or first account
      const account488 = businessAccounts.find(acc => acc.id === 488);
      console.log('Looking for account 488, found:', account488);
      if (account488) {
        console.log('Auto-selecting account 488');
        setSelectedAccount('488');
      } else {
        // If 488 doesn't exist, select the first account
        console.log('Account 488 not found, selecting first account:', businessAccounts[0].id);
        setSelectedAccount(businessAccounts[0].id.toString());
      }
    }
  }, [businessAccounts]);

  useEffect(() => {
    if (selectedAccount) {
      fetchTransactions();
    }
  }, [selectedAccount]);

  const fetchBusinessAccounts = async () => {
    setAccountsLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching business accounts with token:', token ? 'present' : 'missing');
      
      if (!token) {
        setError('No authentication token found. Please log in again.');
        return;
      }
      
      const response = await axios.get('/business-accounts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Business accounts response:', response.data);
      setBusinessAccounts(response.data);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error fetching business accounts:', err);
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        setError(`Failed to load business accounts: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setAccountsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!selectedAccount) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/business-accounts/${selectedAccount}/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Handle the response structure - it might be an object with transactions array or directly an array
      const transactionsData = response.data.transactions || response.data;
      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
    } catch (err) {
      setError('Failed to load transactions');
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountChange = (e) => {
    const accountId = e.target.value;
    setSelectedAccount(accountId);
    // Store the selected account in localStorage
    if (accountId) {
      localStorage.setItem('selectedAccount', accountId);
    } else {
      localStorage.removeItem('selectedAccount');
    }
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

  const openFiltersModal = () => {
    setShowFiltersModal(true);
  };

  const closeFiltersModal = () => {
    setShowFiltersModal(false);
  };

  const applyFilters = () => {
    closeFiltersModal();
  };

  const openTransactionModal = (transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionModal(true);
  };

  const closeTransactionModal = () => {
    setShowTransactionModal(false);
    setSelectedTransaction(null);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return '↕️';
    }
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const filteredTransactions = (Array.isArray(transactions) ? transactions : [])
    .filter(transaction => {
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
      transaction.transaction_type === filters.category;

      return matchesSearch && matchesDateFrom && matchesDateTo && 
             matchesAmountMin && matchesAmountMax && matchesType && matchesCategory;
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle different data types
      if (sortField === 'transaction_date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (sortField === 'amount' || sortField === 'balance') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else {
        // String comparison
        aValue = (aValue || '').toString().toLowerCase();
        bValue = (bValue || '').toString().toLowerCase();
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

  // Pagination calculations
  const totalFilteredTransactions = filteredTransactions.length;
  const totalPages = Math.ceil(totalFilteredTransactions / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

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
    // Get all unique transaction types from the data
    const transactionTypes = [...new Set(transactions.map(t => t.transaction_type).filter(Boolean))];
    
    // Add some common transaction types that might not be in current data
    const commonTypes = [
      'CARD_PAYMENT',
      'TRANSFER', 
      'DEPOSIT',
      'WITHDRAWAL',
      'FEE',
      'REFUND',
      'CASHBACK',
      'INTEREST',
      'DIVIDEND',
      'SALARY',
      'PENSION',
      'RENTAL_INCOME',
      'BUSINESS_INCOME',
      'INVESTMENT',
      'LOAN_PAYMENT',
      'MORTGAGE_PAYMENT',
      'INSURANCE',
      'UTILITIES',
      'SUBSCRIPTION',
      'PURCHASE',
      'PAYMENT',
      'RECEIPT'
    ];
    
    // Combine and deduplicate
    const allTypes = [...new Set([...transactionTypes, ...commonTypes])];
    return allTypes.sort();
  };

  const selectedAccountData = businessAccounts.find(acc => acc.id.toString() === selectedAccount);

  return (
    <div className="container">
      <style jsx>{`
        .sortable-header {
          transition: background-color 0.2s ease;
        }
        .sortable-header:hover {
          background-color: #f8f9fa;
        }
        .sort-icon {
          margin-left: 5px;
          font-size: 0.8em;
        }
        
        .warning-badge {
          font-size: 0.7rem;
          padding: 2px 6px;
          margin: 1px;
          border-radius: 3px;
          white-space: nowrap;
        }
        
        .warning-badge.bg-danger {
          background-color: #dc3545 !important;
          color: white;
        }
        
        .warning-badge.bg-warning {
          background-color: #ffc107 !important;
          color: #212529;
        }
        
        .warning-badge.bg-dark {
          background-color: #343a40 !important;
          color: white;
        }
        
        .warning-badge.bg-secondary {
          background-color: #6c757d !important;
          color: white;
        }
      `}</style>
      <h1>Bank Transactions</h1>
      
      {/* Account Selection */}
      <div className="card mb-4">
        <h3>Select Bank Account</h3>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="form-group">
          <label>Bank Account:</label>
          {accountsLoading ? (
            <div className="text-center">Loading bank accounts...</div>
          ) : (
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
          )}
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

      {/* Filters Button */}
      {selectedAccount && (
        <div className="card mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <h3>Transactions</h3>
            <div>
              <button 
                onClick={openFiltersModal}
                className="btn btn-primary me-2"
              >
                🔍 Filters
              </button>
              <button 
                onClick={clearFilters}
                className="btn btn-secondary"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      {selectedAccount && (
        <div className="card">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4>
              Transactions{selectedAccountData && ` - ${selectedAccountData.account_name} (${selectedAccountData.account_number})`}
            </h4>
          </div>
          
          {/* Transaction Count Display */}
          {!loading && !error && (
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="d-flex align-items-center gap-3">
                <div className="text-muted small">
                  Rows per page:
                </div>
                <select 
                  value={rowsPerPage} 
                  onChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="form-select form-select-sm"
                  style={{ width: '80px' }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
              <div className="d-flex align-items-center gap-3">
                <div className="text-muted small">
                  Showing {startIndex + 1}-{Math.min(endIndex, totalFilteredTransactions)} of {totalFilteredTransactions} transactions
                </div>
                <div className="text-muted small">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
            </div>
          )}
          
          {loading && <div className="text-center">Loading transactions...</div>}
          {error && <div className="alert alert-danger">{error}</div>}
          
          {!loading && !error && (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort('transaction_date')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort by date"
                    >
                      Date <span className="sort-icon">{getSortIcon('transaction_date')}</span>
                    </th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort('description')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort by description"
                    >
                      Description <span className="sort-icon">{getSortIcon('description')}</span>
                    </th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort('payer')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort by payer"
                    >
                      Payer <span className="sort-icon">{getSortIcon('payer')}</span>
                    </th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort('amount')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort by amount"
                    >
                      Amount <span className="sort-icon">{getSortIcon('amount')}</span>
                    </th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort('balance')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort by balance"
                    >
                      Balance <span className="sort-icon">{getSortIcon('balance')}</span>
                    </th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort('transaction_type')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort by transaction type"
                    >
                      Type <span className="sort-icon">{getSortIcon('transaction_type')}</span>
                    </th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort('reference')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort by reference"
                    >
                      Reference <span className="sort-icon">{getSortIcon('reference')}</span>
                    </th>
                    <th>Warnings</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center">
                        {(Array.isArray(transactions) ? transactions.length : 0) === 0 ? 'No transactions found' : 'No transactions match the current filters'}
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map(transaction => (
                      <tr key={transaction.id}>
                        <td>{formatDate(transaction.transaction_date)}</td>
                        <td>{transaction.description}</td>
                        <td>{transaction.payer || '-'}</td>
                        <td className={transaction.amount >= 0 ? 'text-success' : 'text-danger'}>
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td>{transaction.balance ? formatCurrency(transaction.balance) : '-'}</td>
                        <td>{transaction.transaction_type || '-'}</td>
                        <td>{transaction.reference || '-'}</td>
                        <td>
                          {transaction.warnings && transaction.warnings.length > 0 ? (
                            <div className="d-flex flex-wrap gap-1">
                              {transaction.warnings.map((warning, index) => (
                                <span 
                                  key={index}
                                  className={`warning-badge ${
                                    warning === 'Duplicate ID' || warning === 'Duplicate Pattern' ? 'bg-danger' :
                                    warning === 'Large Amount' || warning === 'Test Transaction' ? 'bg-warning' :
                                    warning === 'Gambling' || warning === 'Crypto' ? 'bg-dark' :
                                    'bg-secondary'
                                  }`}
                                  title={warning}
                                >
                                  {warning}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <button 
                            onClick={() => openTransactionModal(transaction)}
                            className="btn btn-sm btn-outline-primary"
                            title="View full transaction details"
                          >
                            See More
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Filters Modal */}
      {showFiltersModal && (
        <div className="modal-overlay" onClick={closeFiltersModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Filter Transactions</h2>
              <button className="close" onClick={closeFiltersModal}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6">
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
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Transaction Type:</label>
                    <select
                      name="type"
                      value={filters.type}
                      onChange={handleFilterChange}
                      className="form-control"
                    >
                      <option value="">All Types</option>
                      {getTransactionTypeOptions().map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-6">
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
                <div className="col-md-6">
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
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Min Amount (€):</label>
                    <input
                      type="number"
                      name="amountMin"
                      value={filters.amountMin}
                      onChange={handleFilterChange}
                      placeholder="0"
                      className="form-control"
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Max Amount (€):</label>
                    <input
                      type="number"
                      name="amountMax"
                      value={filters.amountMax}
                      onChange={handleFilterChange}
                      placeholder="No limit"
                      className="form-control"
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Transaction Type (Category):</label>
                    <select
                      name="category"
                      value={filters.category}
                      onChange={handleFilterChange}
                      className="form-control"
                    >
                      <option value="">All Transaction Types</option>
                      {getCategoryOptions().map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Active Filters:</label>
                    <div className="form-control" style={{ minHeight: '38px', padding: '6px 12px' }}>
                      {Object.entries(filters).filter(([key, value]) => value).length > 0 ? (
                        <div className="d-flex flex-wrap gap-1">
                          {Object.entries(filters).map(([key, value]) => 
                            value && (
                              <span key={key} className="badge bg-primary me-1">
                                {key}: {value}
                              </span>
                            )
                          )}
                        </div>
                      ) : (
                        <span className="text-muted">No filters applied</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-3">
                <button 
                  onClick={clearFilters}
                  className="btn btn-secondary"
                >
                  Clear All
                </button>
                <button 
                  onClick={applyFilters}
                  className="btn btn-primary"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {showTransactionModal && selectedTransaction && (
        <div className="modal-overlay" onClick={closeTransactionModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h2>Transaction Details</h2>
              <button className="close" onClick={closeTransactionModal}>&times;</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="row">
                <div className="col-md-6">
                  <h5>Basic Information</h5>
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <td><strong>Transaction ID:</strong></td>
                        <td>{selectedTransaction.transaction_id || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Date:</strong></td>
                        <td>{formatDate(selectedTransaction.transaction_date)}</td>
                      </tr>
                      <tr>
                        <td><strong>Description:</strong></td>
                        <td>{selectedTransaction.description}</td>
                      </tr>
                      <tr>
                        <td><strong>Amount:</strong></td>
                        <td className={selectedTransaction.amount >= 0 ? 'text-success' : 'text-danger'}>
                          {formatCurrency(selectedTransaction.amount)}
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Balance:</strong></td>
                        <td>{selectedTransaction.balance ? formatCurrency(selectedTransaction.balance) : 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Type:</strong></td>
                        <td>{selectedTransaction.transaction_type || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>State:</strong></td>
                        <td>{selectedTransaction.state || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Category:</strong></td>
                        <td>{selectedTransaction.category || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Reference:</strong></td>
                        <td>{selectedTransaction.reference || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="col-md-6">
                  <h5>Payer & Card Information</h5>
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <td><strong>Payer:</strong></td>
                        <td>{selectedTransaction.payer || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Card Number:</strong></td>
                        <td>{selectedTransaction.card_number || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Card Label:</strong></td>
                        <td>{selectedTransaction.card_label || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Card State:</strong></td>
                        <td>{selectedTransaction.card_state || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>

                  <h5>Currency & Amounts</h5>
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <td><strong>Original Currency:</strong></td>
                        <td>{selectedTransaction.orig_currency || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Original Amount:</strong></td>
                        <td>{selectedTransaction.orig_amount ? formatCurrency(selectedTransaction.orig_amount) : 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Payment Currency:</strong></td>
                        <td>{selectedTransaction.payment_currency || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Total Amount:</strong></td>
                        <td>{selectedTransaction.total_amount ? formatCurrency(selectedTransaction.total_amount) : 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Exchange Rate:</strong></td>
                        <td>{selectedTransaction.exchange_rate || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Fee:</strong></td>
                        <td>{selectedTransaction.fee ? formatCurrency(selectedTransaction.fee) : 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Fee Currency:</strong></td>
                        <td>{selectedTransaction.fee_currency || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="row mt-3">
                <div className="col-md-6">
                  <h5>Account Information</h5>
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <td><strong>Account:</strong></td>
                        <td>{selectedTransaction.account || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>MCC:</strong></td>
                        <td>{selectedTransaction.mcc || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Related Transaction ID:</strong></td>
                        <td>{selectedTransaction.related_transaction_id || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Spend Program:</strong></td>
                        <td>{selectedTransaction.spend_program || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="col-md-6">
                  <h5>Beneficiary Information</h5>
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <td><strong>Account Number:</strong></td>
                        <td>{selectedTransaction.beneficiary_account_number || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Sort Code:</strong></td>
                        <td>{selectedTransaction.beneficiary_sort_code || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>IBAN:</strong></td>
                        <td>{selectedTransaction.beneficiary_iban || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>BIC:</strong></td>
                        <td>{selectedTransaction.beneficiary_bic || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="row mt-3">
                <div className="col-12">
                  <h5>Timestamps</h5>
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <td><strong>Date Started (UTC):</strong></td>
                        <td>{selectedTransaction.date_started_utc ? new Date(selectedTransaction.date_started_utc).toLocaleString() : 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Date Completed (UTC):</strong></td>
                        <td>{selectedTransaction.date_completed_utc ? new Date(selectedTransaction.date_completed_utc).toLocaleString() : 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Date Started (Dublin):</strong></td>
                        <td>{selectedTransaction.date_started_dublin ? new Date(selectedTransaction.date_started_dublin).toLocaleString() : 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Date Completed (Dublin):</strong></td>
                        <td>{selectedTransaction.date_completed_dublin ? new Date(selectedTransaction.date_completed_dublin).toLocaleString() : 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Created At:</strong></td>
                        <td>{selectedTransaction.created_at ? new Date(selectedTransaction.created_at).toLocaleString() : 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="d-flex justify-content-end mt-3">
                <button 
                  onClick={closeTransactionModal}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
