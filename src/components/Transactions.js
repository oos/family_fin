import React, { useState, useEffect, useRef } from 'react';
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
  const [rowsPerPage, setRowsPerPage] = useState(100);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    type: '',
    category: '',
    year: ''
  });

  // CSV Import and Refresh states
  const [importing, setImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fileInputRef = useRef(null);

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
      const account488 = businessAccounts.find(acc => 
        acc.account_number && acc.account_number.includes('488')
      );
      console.log('Looking for account with 488 in account number, found:', account488);
      if (account488) {
        console.log('Auto-selecting account 488:', account488.id);
        setSelectedAccount(account488.id.toString());
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
      
      const response = await axios.get('/api/business-accounts', {
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
      const response = await axios.get(`/api/business-accounts/${selectedAccount}/transactions`, {
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

  // Handle page refresh while preserving selected account
  const handlePageRefresh = () => {
    // Store the current selected account in localStorage before refresh
    if (selectedAccount) {
      localStorage.setItem('selectedAccount', selectedAccount);
    }
    // Refresh the page
    window.location.reload();
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

  // Helper function to parse column-specific search terms
  const parseSearchTerm = (searchTerm) => {
    const columnMappings = {
      'description': 'description',
      'desc': 'description',
      'payer': 'payer',
      'reference': 'reference',
      'ref': 'reference',
      'amount': 'amount',
      'type': 'transaction_type',
      'date': 'transaction_date',
      'id': 'id'
    };

    const lowerSearch = searchTerm.toLowerCase();
    
    // Check if it's a column-specific search (format: "column: search_term")
    const columnMatch = lowerSearch.match(/^(\w+):\s*(.+)$/);
    if (columnMatch) {
      const [, columnName, searchValue] = columnMatch;
      const mappedColumn = columnMappings[columnName] || columnName;
      return { column: mappedColumn, value: searchValue.trim() };
    }
    
    // Default to searching all columns
    return { column: 'all', value: searchTerm };
  };

  const filteredTransactions = (Array.isArray(transactions) ? transactions : [])
    .filter(transaction => {
      let matchesSearch = true;
      
      if (filters.search) {
        const { column, value } = parseSearchTerm(filters.search);
        
        if (column === 'all') {
          // Search in all columns
          matchesSearch = 
            transaction.description.toLowerCase().includes(value.toLowerCase()) ||
            (transaction.payer && transaction.payer.toLowerCase().includes(value.toLowerCase())) ||
            (transaction.reference && transaction.reference.toLowerCase().includes(value.toLowerCase()));
        } else if (column === 'amount') {
          // Special handling for amount search
          const searchAmount = parseFloat(value.replace(/[€,\s]/g, ''));
          if (!isNaN(searchAmount)) {
            matchesSearch = Math.abs(transaction.amount - searchAmount) < 0.01;
          } else {
            matchesSearch = false;
          }
        } else if (column === 'id') {
          // Search by transaction ID
          matchesSearch = transaction.id.toString().includes(value);
        } else {
          // Search in specific column
          const fieldValue = transaction[column];
          matchesSearch = fieldValue && fieldValue.toString().toLowerCase().includes(value.toLowerCase());
        }
      }

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

      const matchesYear = !filters.year || 
        new Date(transaction.transaction_date).getFullYear().toString() === filters.year;

      return matchesSearch && matchesDateFrom && matchesDateTo && 
             matchesAmountMin && matchesAmountMax && matchesType && matchesCategory && matchesYear;
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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

  const getYearOptions = () => {
    const years = [...new Set(transactions.map(t => new Date(t.transaction_date).getFullYear()))];
    return years.sort((a, b) => b - a); // Most recent first
  };

  const getActiveFilters = () => {
    const activeFilters = [];
    if (filters.search) activeFilters.push({ key: 'search', label: `Search: "${filters.search}"` });
    if (filters.dateFrom) activeFilters.push({ key: 'dateFrom', label: `From: ${filters.dateFrom}` });
    if (filters.dateTo) activeFilters.push({ key: 'dateTo', label: `To: ${filters.dateTo}` });
    if (filters.amountMin) activeFilters.push({ key: 'amountMin', label: `Min: €${filters.amountMin}` });
    if (filters.amountMax) activeFilters.push({ key: 'amountMax', label: `Max: €${filters.amountMax}` });
    if (filters.type) activeFilters.push({ key: 'type', label: `Type: ${filters.type}` });
    if (filters.category) activeFilters.push({ key: 'category', label: `Category: ${filters.category}` });
    if (filters.year) activeFilters.push({ key: 'year', label: `Year: ${filters.year}` });
    return activeFilters;
  };

  const removeFilter = (filterKey) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: ''
    }));
  };

  // CSV Import functions
  const handleCsvImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/csv') {
      uploadCsvFile(file);
    } else {
      setError('Please select a valid CSV file');
    }
  };

  const uploadCsvFile = async (file) => {
    setImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/business-accounts/${selectedAccount}/import-csv`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Refresh transactions after successful upload
      await fetchTransactions();
      alert('CSV file uploaded successfully!');
    } catch (err) {
      setError(`Upload failed: ${err.response?.data?.message || err.message}`);
      console.error('Error uploading CSV:', err);
    } finally {
      setImporting(false);
    }
  };

  const handleRefreshTransactions = async () => {
    setRefreshing(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/business-accounts/${selectedAccount}/refresh-transactions`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh transactions after successful API call
      await fetchTransactions();
      alert('Transactions refreshed successfully!');
    } catch (err) {
      setError(`Refresh failed: ${err.response?.data?.message || err.message}`);
      console.error('Error refreshing transactions:', err);
    } finally {
      setRefreshing(false);
    }
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
        
        /* Compact table styling */
        .table th, .table td {
          padding: 0.3rem 0.5rem;
          vertical-align: middle;
          line-height: 1.2;
        }
        .table th {
          font-weight: 600;
          font-size: 0.8rem;
          background-color: #f8f9fa;
          border-bottom: 2px solid #dee2e6;
        }
        .table td {
          font-size: 0.85rem;
        }
        .badge {
          font-size: 0.7em;
          padding: 0.2em 0.4em;
        }
        .btn-sm {
          padding: 0.2rem 0.4rem;
          font-size: 0.8rem;
        }
        
        /* Transaction row hover effect */
        .transaction-row {
          transition: background-color 0.2s ease;
        }
        .transaction-row:hover {
          background-color: #f8f9fa !important;
        }
        .transaction-row:hover td {
          background-color: transparent !important;
        }
      `}</style>
      <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h1>Bank Transactions</h1>
              <div className="d-flex align-items-center gap-2">
                <label className="mb-0 text-muted">Account:</label>
                {accountsLoading ? (
                  <div className="text-muted small">Loading accounts...</div>
                ) : (
                  <select 
                    value={selectedAccount} 
                    onChange={handleAccountChange}
                    className="form-select"
                    style={{ width: 'auto', minWidth: '200px' }}
                  >
                    <option value="">Select an account...</option>
                    {businessAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.company_name} ({account.account_number})
                      </option>
                    ))}
                  </select>
                )}
                {selectedAccount && (
                  <>
                    <button 
                      onClick={handleCsvImport}
                      className="btn btn-success btn-sm"
                      disabled={importing || !selectedAccount}
                    >
                      {importing ? '⏳ Importing...' : '📁 Import CSV'}
                    </button>
                    <button 
                      onClick={handleRefreshTransactions}
                      className="btn btn-info btn-sm"
                      disabled={refreshing || !selectedAccount}
                    >
                      {refreshing ? '⏳ Refreshing...' : '🔄 Refresh API'}
                    </button>
                    <button 
                      onClick={handlePageRefresh}
                      className="btn btn-outline-secondary btn-sm"
                      title="Refresh page while keeping current account selected"
                    >
                      🔄 Refresh Page
                    </button>
                  </>
                )}
              </div>
            </div>
        
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}



      {/* Transactions Header with Filter Chips and Buttons */}
      {selectedAccount && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-3">
            <h4>
              {selectedAccountData && `${selectedAccountData.account_name} (${selectedAccountData.account_number})`}
            </h4>
            {/* Filter Chips - Left aligned */}
            {getActiveFilters().length > 0 && (
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small">Active filters:</span>
                {getActiveFilters().map(filter => (
                  <span key={filter.key} className="badge bg-primary d-flex align-items-center gap-1">
                    {filter.label}
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      style={{ fontSize: '0.7em' }}
                      onClick={() => removeFilter(filter.key)}
                      aria-label={`Remove ${filter.label} filter`}
                    ></button>
                  </span>
                ))}
                <button 
                  onClick={clearFilters}
                  className="btn btn-sm btn-outline-secondary"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
          {/* Filter Button and Text Search - Right aligned */}
          <div className="d-flex gap-2">
            <div className="input-group" style={{ width: '400px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search all fields or use 'column: term' (e.g., 'description: Dwayne')"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
              <button 
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                title="Clear search"
              >
                ✕
              </button>
            </div>
            <button 
              onClick={openFiltersModal}
              className="btn btn-primary"
            >
              🔍 Filters
            </button>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      {selectedAccount && (
        <div className="card">
          <div className="card-body">
          
          {/* Account Details and Pagination Controls */}
          {!loading && !error && (
            <div className="d-flex justify-content-between align-items-center mb-2">
              {/* Account Details - Left Side */}
              {selectedAccountData && (
                <div className="d-flex align-items-center gap-4">
                  <div className="text-muted small">
                    <strong>Latest Balance:</strong> {selectedAccountData.balance_source === 'no_transactions' ? 'Unavailable' : `${formatCurrency(selectedAccountData.balance || 0)} on ${selectedAccountData.balance_date ? new Date(selectedAccountData.balance_date).toLocaleDateString() : 'Unknown Date'}`}
                  </div>
                  <div className="text-muted small">
                    <strong>Account Number:</strong> {selectedAccountData.account_number}
                  </div>
                  <div className="text-muted small">
                    <strong>Bank:</strong> {selectedAccountData.bank_name}
                  </div>
                  <div className="text-muted small">
                    <strong>Last Refreshed:</strong> {selectedAccountData.last_refreshed ? 
                      new Date(selectedAccountData.last_refreshed).toLocaleString() : 'Never'}
                  </div>
                </div>
              )}
              
              {/* Pagination Controls - Right Side */}
              <div className="d-flex align-items-center gap-3">
                <div className="d-flex align-items-center gap-2">
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
            </div>
          )}
          
          {loading && <div className="text-center">Loading transactions...</div>}
          {error && <div className="alert alert-danger">{error}</div>}
          
          {!loading && !error && (
            <div className="table-responsive">
              <table className="table table-striped" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '5%' }}>ID</th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort('transaction_date')}
                      style={{ cursor: 'pointer', userSelect: 'none', width: '7%' }}
                      title="Click to sort by date"
                    >
                      Date <span className="sort-icon">{getSortIcon('transaction_date')}</span>
                    </th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort('description')}
                      style={{ cursor: 'pointer', userSelect: 'none', width: '25%' }}
                      title="Click to sort by description"
                    >
                      Description <span className="sort-icon">{getSortIcon('description')}</span>
                    </th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort('payer')}
                      style={{ cursor: 'pointer', userSelect: 'none', width: '10%' }}
                      title="Click to sort by payer"
                    >
                      Payer <span className="sort-icon">{getSortIcon('payer')}</span>
                    </th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort('amount')}
                      style={{ cursor: 'pointer', userSelect: 'none', width: '7%' }}
                      title="Click to sort by amount"
                    >
                      Amount <span className="sort-icon">{getSortIcon('amount')}</span>
                    </th>
                    <th style={{ width: '6%' }}>Debit/Credit</th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort('balance')}
                      style={{ cursor: 'pointer', userSelect: 'none', width: '7%' }}
                      title="Click to sort by balance"
                    >
                      Balance <span className="sort-icon">{getSortIcon('balance')}</span>
                    </th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort('transaction_type')}
                      style={{ cursor: 'pointer', userSelect: 'none', width: '8%' }}
                      title="Click to sort by transaction type"
                    >
                      Type <span className="sort-icon">{getSortIcon('transaction_type')}</span>
                    </th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort('reference')}
                      style={{ cursor: 'pointer', userSelect: 'none', width: '15%' }}
                      title="Click to sort by reference"
                    >
                      Reference <span className="sort-icon">{getSortIcon('reference')}</span>
                    </th>
                    <th style={{ width: '6%' }}>Warnings</th>
                    <th style={{ width: '6%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="text-center">
                        {(Array.isArray(transactions) ? transactions.length : 0) === 0 ? 'No transactions found' : 'No transactions match the current filters'}
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map(transaction => (
                      <tr 
                        key={transaction.id}
                        onClick={() => openTransactionModal(transaction)}
                        style={{ cursor: 'pointer' }}
                        className="transaction-row"
                      >
                        <td>{transaction.id}</td>
                        <td>{formatDate(transaction.transaction_date)}</td>
                        <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={transaction.description}>{transaction.description}</td>
                        <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={transaction.payer || '-'}>{transaction.payer || '-'}</td>
                        <td className={transaction.amount >= 0 ? 'text-success' : 'text-danger'}>
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td>
                          <span className={`badge ${transaction.amount >= 0 ? 'bg-success' : 'bg-danger'}`}>
                            {transaction.amount >= 0 ? 'Credit' : 'Debit'}
                          </span>
                        </td>
                        <td>{transaction.balance ? formatCurrency(transaction.balance) : '-'}</td>
                        <td>{transaction.transaction_type || '-'}</td>
                        <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={transaction.reference || '-'}>{transaction.reference || '-'}</td>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              openTransactionModal(transaction);
                            }}
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
                    <label>Year:</label>
                    <select
                      name="year"
                      value={filters.year}
                      onChange={handleFilterChange}
                      className="form-control"
                    >
                      <option value="">All Years</option>
                      {getYearOptions().map(year => (
                        <option key={year} value={year.toString()}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-12">
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
      
      {/* Hidden file input for CSV import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".csv"
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default Transactions;
