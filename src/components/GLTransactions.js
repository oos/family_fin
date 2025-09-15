import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GLTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    source: '',
    categoryHeading: '',
    year: '2024', // Default to 2024
    transactionType: '' // New: PJ vs AJ filtering
  });

  // Available filter options
  const [filterOptions, setFilterOptions] = useState({
    sources: [],
    categoryHeadings: [],
    years: [],
    transactionTypes: []
  });
  const [summaryCounts, setSummaryCounts] = useState({
    total: 0,
    pj: 0,
    aj: 0,
    ap: 0,
    se: 0,
    cd: 0,
    pl: 0,
    other: 0
  });

  // Account grouping state
  const [groupByAccount, setGroupByAccount] = useState(false);
  const [groupedTransactions, setGroupedTransactions] = useState({});
  
  // UI state for toggling panels
  const [showFilters, setShowFilters] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(true);

  useEffect(() => {
    fetchTransactions();
    fetchFilterOptions();
    fetchSummaryCounts();
  }, [currentPage, rowsPerPage, sortField, sortDirection, filters]);

  // Separate useEffect for summary counts to avoid unnecessary refetches
  useEffect(() => {
    fetchSummaryCounts();
  }, [filters.year]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please log in again.');
        return;
      }

      const params = new URLSearchParams({
        page: currentPage,
        per_page: rowsPerPage,
        sort_field: sortField,
        sort_direction: sortDirection,
        ...filters
      });

      const response = await axios.get(`/gl-transactions?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTransactions(response.data.transactions);
      setTotalPages(response.data.pagination.pages);
      setTotalTransactions(response.data.pagination.total);
      setError(null);
    } catch (err) {
      console.error('Error fetching GL transactions:', err);
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError('Failed to fetch GL transactions. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Fetch filter options from dedicated endpoint
      const response = await axios.get('/gl-transactions/filter-options', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data;
      setFilterOptions({
        sources: data.sources || [],
        categoryHeadings: data.category_headings || [],
        years: data.years || [],
        transactionTypes: data.transaction_types || []
      });
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  // Fetch summary counts for all transactions
  const fetchSummaryCounts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Build query parameters including year filter
      const params = new URLSearchParams();
      if (filters.year) {
        params.append('year', filters.year);
      }

      const response = await axios.get(`/gl-transactions/summary-counts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const counts = response.data;
      
      setSummaryCounts({
        total: counts.total,
        pj: counts.pj,
        aj: counts.aj,
        ap: counts.ap,
        se: counts.se,
        cd: counts.cd,
        pl: counts.pl,
        other: counts.other
      });
    } catch (error) {
      console.error('Error fetching summary counts:', error);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: '',
      source: '',
      categoryHeading: '',
      year: '2024', // Reset to 2024 instead of empty
      transactionType: ''
    });
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Group transactions by account and calculate totals
  const groupTransactionsByAccount = (transactions) => {
    const grouped = {};
    
    transactions.forEach(transaction => {
      const accountKey = transaction.category_heading || 'Uncategorized';
      
      if (!grouped[accountKey]) {
        grouped[accountKey] = {
          accountName: accountKey,
          transactions: [],
          openingBalance: 0,
          closingBalance: 0,
          totalDebits: 0,
          totalCredits: 0,
          netChange: 0
        };
      }
      
      grouped[accountKey].transactions.push(transaction);
      
      // Calculate totals
      const debit = parseFloat(transaction.debit) || 0;
      const credit = parseFloat(transaction.credit) || 0;
      
      grouped[accountKey].totalDebits += debit;
      grouped[accountKey].totalCredits += credit;
      grouped[accountKey].netChange += (debit - credit);
    });
    
    // Calculate opening and closing balances
    Object.keys(grouped).forEach(accountKey => {
      const account = grouped[accountKey];
      // For now, we'll set opening to 0 and closing to net change
      // In a real GL, opening would come from previous year's closing
      account.openingBalance = 0;
      account.closingBalance = account.netChange;
    });
    
    return grouped;
  };

  // Fetch all transactions for grouping (separate from paginated view)
  const fetchAllTransactionsForGrouping = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('/gl-transactions?per_page=10000', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data.transactions;
    } catch (error) {
      console.error('Error fetching all transactions for grouping:', error);
      return [];
    }
  };

  // Update grouped transactions when groupByAccount changes
  useEffect(() => {
    if (groupByAccount) {
      fetchAllTransactionsForGrouping().then(allTransactions => {
        setGroupedTransactions(groupTransactionsByAccount(allTransactions));
      });
    } else {
      setGroupedTransactions({});
    }
  }, [groupByAccount]);

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionModal(true);
  };

  const getTransactionAmount = (transaction) => {
    if (transaction.debit > 0) {
      return { amount: transaction.debit, type: 'debit' };
    } else if (transaction.credit > 0) {
      return { amount: transaction.credit, type: 'credit' };
    }
    return { amount: 0, type: 'none' };
  };

  const generateUID = (transaction, index) => {
    // Create a unique ID based on transaction ID, tax return year, and index
    const year = transaction.tax_return_year || '0000';
    const transactionId = transaction.id || 0;
    const paddedId = String(transactionId).padStart(6, '0');
    const paddedIndex = String(index + 1).padStart(3, '0');
    return `${year}-${paddedId}-${paddedIndex}`;
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-primary'}`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="d-flex justify-content-between align-items-center">
        <div>
          Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, totalTransactions)} of {totalTransactions} transactions
        </div>
        <div className="btn-group">
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            First
          </button>
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          {pages}
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </button>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      <style jsx>{`
        .cursor-pointer {
          cursor: pointer;
        }
        .account-group .card {
          border: 1px solid #dee2e6;
          box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
        }
        .account-group .card-header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        .grouped-view .table th {
          border-top: none;
          font-weight: 600;
        }
        .grouped-view .table td {
          vertical-align: middle;
        }
      `}</style>
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h4 className="mb-0">General Ledger Transactions</h4>
              <div>
                <button
                  className={`btn me-2 ${groupByAccount ? 'btn-dark' : 'btn-outline-dark'}`}
                  onClick={() => setGroupByAccount(!groupByAccount)}
                >
                  <i className={`fas ${groupByAccount ? 'fa-layer-group' : 'fa-list'}`}></i> 
                  {groupByAccount ? 'Grouped by Account' : 'Group by Account'}
                </button>
                <button
                  className={`btn me-2 ${showFilters ? 'btn-secondary' : 'btn-outline-secondary'}`}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <i className="fas fa-filter"></i> Filters
                </button>
                <button
                  className={`btn me-2 ${showAnalytics ? 'btn-warning' : 'btn-outline-warning'}`}
                  onClick={() => setShowAnalytics(!showAnalytics)}
                >
                  <i className="fas fa-chart-bar"></i> Analytics
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={fetchTransactions}
                  disabled={loading}
                >
                  <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i> Refresh
                </button>
              </div>
            </div>

            <div className="card-body">
              {/* Quick Filters */}
              {showFilters && (
                <div className="row mb-3">
                <div className="col-md-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search transactions..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <select
                    className="form-select"
                    value={filters.source}
                    onChange={(e) => handleFilterChange('source', e.target.value)}
                  >
                    <option value="">All Sources</option>
                    {filterOptions.sources.map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <select
                    className="form-select"
                    value={filters.transactionType}
                    onChange={(e) => handleFilterChange('transactionType', e.target.value)}
                  >
                    <option value="">All Types</option>
                    {filterOptions.transactionTypes.map(type => (
                      <option key={type} value={type}>
                        {type} {type === 'PJ' ? '(Bank Transactions)' : type === 'AJ' ? '(Adjustments)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <select
                    className="form-select"
                    value={filters.categoryHeading}
                    onChange={(e) => handleFilterChange('categoryHeading', e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {filterOptions.categoryHeadings.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <select
                    className="form-select"
                    value={filters.year}
                    onChange={(e) => handleFilterChange('year', e.target.value)}
                  >
                    <option value="">All Years</option>
                    {filterOptions.years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-1">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={clearFilters}
                    title="Clear all filters"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
              )}

              {/* Transaction Summary */}
              {showAnalytics && transactions.length > 0 && (
                <div className="row mb-3">
                  <div className="col-12">
                    <div className="card bg-light">
                      <div className="card-body py-2">
                        <div className="row text-center">
                          <div className="col-md-3">
                            <small className="text-muted">Total Transactions</small>
                            <div className="fw-bold">{summaryCounts.total}</div>
                          </div>
                          <div className="col-md-3">
                            <small className="text-muted">Bank Transactions (PJ)</small>
                            <div className="fw-bold text-primary">
                              {summaryCounts.pj}
                            </div>
                          </div>
                          <div className="col-md-3">
                            <small className="text-muted">Adjustments (AJ)</small>
                            <div className="fw-bold text-info">
                              {summaryCounts.aj}
                            </div>
                          </div>
                          <div className="col-md-3">
                            <small className="text-muted">Other Types</small>
                            <div className="fw-bold text-secondary">
                              {summaryCounts.other}
                            </div>
                          </div>
                        </div>
                        
                        {/* Other Types Breakdown */}
                        {summaryCounts.other > 0 && (
                          <div className="row mt-2">
                            <div className="col-12">
                              <small className="text-muted">Breakdown of {summaryCounts.other} Other Types:</small>
                              <div className="mt-1">
                                {(() => {
                                  const apCount = summaryCounts.ap || 0;
                                  const seCount = summaryCounts.se || 0;
                                  const cdCount = summaryCounts.cd || 0;
                                  const plCount = summaryCounts.pl || 0;
                                  const remainingOther = summaryCounts.other - apCount - seCount - cdCount - plCount;
                                  
                                  return (
                                    <>
                                      <span className="badge bg-success me-1" title="AP - Accounts Payable: Money owed to suppliers/vendors">
                                        AP: {apCount}
                                      </span>
                                      <span className="badge bg-primary me-1" title="SE - Sales Entry: Revenue from sales transactions">
                                        SE: {seCount}
                                      </span>
                                      <span className="badge bg-info me-1" title="CD - Cash Deposit: Money deposited into accounts">
                                        CD: {cdCount}
                                      </span>
                                      <span className="badge bg-secondary me-1" title="PL - Profit & Loss: Income statement adjustments">
                                        PL: {plCount}
                                      </span>
                                      {remainingOther > 0 && (
                                        <span className="badge bg-warning text-dark me-1" title="Other: Transactions with unknown or empty source types">
                                          Unknown: {remainingOther}
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                              <div className="mt-1">
                                <small className="text-muted">
                                  <strong>Legend:</strong> AP=Accounts Payable, SE=Sales Entry, CD=Cash Deposit, PL=Profit & Loss
                                </small>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pagination Info */}
              <div className="row mb-2">
                <div className="col-12 d-flex justify-content-between align-items-center">
                  <div></div>
                  <div className="d-flex align-items-center gap-3">
                    <small className="text-muted">
                      {rowsPerPage >= 10000 ? 
                        `Showing all ${summaryCounts.total} transactions` : 
                        `Showing ${transactions.length} of ${summaryCounts.total} transactions on this page`
                      }
                    </small>
                    <div className="d-flex align-items-center gap-2">
                      <label htmlFor="rowsPerPage" className="form-label mb-0 small">Rows:</label>
                      <select
                        id="rowsPerPage"
                        className="form-select form-select-sm"
                        style={{width: 'auto'}}
                        value={rowsPerPage >= 10000 ? 'all' : rowsPerPage}
                        onChange={(e) => setRowsPerPage(e.target.value === 'all' ? 10000 : Number(e.target.value))}
                      >
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                        <option value={500}>500</option>
                        <option value="all">All</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions Table or Grouped View */}
              {groupByAccount ? (
                <div className="grouped-view">
                  {Object.keys(groupedTransactions).length === 0 ? (
                    <div className="text-center text-muted py-4">
                      No transactions found
                    </div>
                  ) : (
                    Object.entries(groupedTransactions).map(([accountKey, account]) => (
                      <div key={accountKey} className="account-group mb-4">
                        <div className="card">
                          <div className="card-header bg-primary text-white">
                            <div className="row align-items-center">
                              <div className="col-md-6">
                                <h5 className="mb-0">
                                  <i className="fas fa-folder me-2"></i>
                                  {account.accountName}
                                </h5>
                              </div>
                              <div className="col-md-6 text-end">
                                <div className="row text-center">
                                  <div className="col-4">
                                    <small>Opening</small>
                                    <div className="fw-bold">{formatCurrency(account.openingBalance)}</div>
                                  </div>
                                  <div className="col-4">
                                    <small>Change</small>
                                    <div className={`fw-bold ${account.netChange >= 0 ? 'text-success' : 'text-danger'}`}>
                                      {account.netChange >= 0 ? '+' : ''}{formatCurrency(account.netChange)}
                                    </div>
                                  </div>
                                  <div className="col-4">
                                    <small>Closing</small>
                                    <div className="fw-bold">{formatCurrency(account.closingBalance)}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="card-body p-0">
                            <div className="table-responsive">
                              <table className="table table-sm table-hover mb-0">
                                <thead className="table-light">
                                  <tr>
                                    <th>ID</th>
                                    <th>Date</th>
                                    <th>Description</th>
                                    <th>Reference</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>D/C</th>
                                    <th>Year</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {account.transactions.map((transaction, index) => {
                                    const { amount, type } = getTransactionAmount(transaction);
                                    const uid = generateUID(transaction, index);
                                    return (
                                      <tr 
                                        key={transaction.id} 
                                        className="cursor-pointer"
                                        onClick={() => handleTransactionClick(transaction)}
                                      >
                                        <td><code className="text-muted small">{uid}</code></td>
                                        <td>{formatDate(transaction.date)}</td>
                                        <td>
                                          <div className="fw-bold">{transaction.name}</div>
                                          {transaction.annotation && (
                                            <small className="text-muted">{transaction.annotation}</small>
                                          )}
                                        </td>
                                        <td>
                                          <code className="small">{transaction.reference || 'N/A'}</code>
                                        </td>
                                        <td>
                                          <span className={`badge ${
                                            transaction.source === 'AJ' ? 'bg-info' :
                                            transaction.source === 'PJ' ? 'bg-primary' :
                                            'bg-light text-dark'
                                          }`}>
                                            {transaction.source === 'AJ' ? 'AJ (Adjustment)' :
                                             transaction.source === 'PJ' ? 'PJ (Bank)' :
                                             transaction.source || 'N/A'}
                                          </span>
                                        </td>
                                        <td>
                                          <span className={`fw-bold ${
                                            type === 'debit' ? 'text-danger' : 
                                            type === 'credit' ? 'text-success' : 
                                            'text-muted'
                                          }`}>
                                            {type === 'debit' ? '-' : '+'}{formatCurrency(amount)}
                                          </span>
                                        </td>
                                        <td>
                                          <span className={`badge ${
                                            type === 'debit' ? 'bg-danger' : 
                                            type === 'credit' ? 'bg-success' : 
                                            'bg-secondary'
                                          }`}>
                                            {type === 'debit' ? 'Debit' : type === 'credit' ? 'Credit' : 'N/A'}
                                          </span>
                                        </td>
                                        <td>
                                          <span className="badge bg-secondary">
                                            {transaction.tax_return_year || 'N/A'}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {/* Total Row */}
                                  <tr className="table-dark fw-bold">
                                    <td colSpan="2">TOTAL</td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                    <td className="text-end">
                                      <span className={`${
                                        account.netChange >= 0 ? 'text-success' : 'text-danger'
                                      }`}>
                                        {account.netChange >= 0 ? '+' : ''}{formatCurrency(account.netChange)}
                                      </span>
                                    </td>
                                    <td>
                                      <span className="badge bg-light text-dark">
                                        {account.totalDebits > account.totalCredits ? 'Debit' : 'Credit'}
                                      </span>
                                    </td>
                                    <td></td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-dark">
                      <tr>
                        <th>ID</th>
                        <th 
                          className="cursor-pointer"
                          onClick={() => handleSort('date')}
                        >
                          Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="cursor-pointer"
                          onClick={() => handleSort('name')}
                        >
                          Description {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>Reference</th>
                        <th>Type</th>
                        <th>Account</th>
                        <th 
                          className="cursor-pointer"
                          onClick={() => handleSort('amount')}
                        >
                          Amount {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>D/C</th>
                        <th>Year</th>
                        <th>File</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="10" className="text-center">
                            <div className="spinner-border" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                          </td>
                        </tr>
                      ) : transactions.length === 0 ? (
                        <tr>
                          <td colSpan="10" className="text-center text-muted">
                            No transactions found
                          </td>
                        </tr>
                      ) : (
                        transactions.map((transaction, index) => {
                          const { amount, type } = getTransactionAmount(transaction);
                          const uid = generateUID(transaction, index);
                          return (
                            <tr 
                              key={`${transaction.id}-${index}`}
                              className="cursor-pointer"
                              onClick={() => handleTransactionClick(transaction)}
                            >
                              <td>
                                <code className="text-muted small">{uid}</code>
                              </td>
                              <td>{formatDate(transaction.date)}</td>
                              <td>
                                <div className="fw-bold">{transaction.name}</div>
                                {transaction.annotation && (
                                  <small className="text-muted">{transaction.annotation}</small>
                                )}
                              </td>
                              <td>{transaction.reference || 'N/A'}</td>
                              <td>
                                <span className={`badge ${
                                  transaction.source === 'AJ' ? 'bg-info' :
                                  transaction.source === 'PJ' ? 'bg-primary' :
                                  'bg-light text-dark'
                                }`} title={
                                  transaction.source === 'AJ' ? 'Adjustment Journal (Non-cash)' :
                                  transaction.source === 'PJ' ? 'Payment Journal (Bank Transaction)' :
                                  'Unknown Type'
                                }>
                                  {transaction.source === 'AJ' ? 'AJ (Adjustment)' :
                                   transaction.source === 'PJ' ? 'PJ (Bank)' :
                                   transaction.source || 'N/A'}
                                </span>
                              </td>
                              <td>
                                {transaction.category_heading ? (
                                  <span className="badge bg-info">
                                    {transaction.category_heading}
                                  </span>
                                ) : (
                                  <span className="text-muted">N/A</span>
                                )}
                              </td>
                              <td>
                                <span className={`fw-bold ${
                                  type === 'debit' ? 'text-danger' : 
                                  type === 'credit' ? 'text-success' : 
                                  'text-muted'
                                }`}>
                                  {type === 'debit' ? '-' : '+'}{formatCurrency(amount)}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${
                                  type === 'debit' ? 'bg-danger' : 
                                  type === 'credit' ? 'bg-success' : 
                                  'bg-secondary'
                                }`}>
                                  {type === 'debit' ? 'Debit' : type === 'credit' ? 'Credit' : 'N/A'}
                                </span>
                              </td>
                              <td>{transaction.tax_return_year || 'N/A'}</td>
                              <td>
                                <small className="text-muted">
                                  {transaction.tax_return_filename ? 
                                    transaction.tax_return_filename.substring(0, 20) + '...' : 
                                    'N/A'
                                  }
                                </small>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-3">
                  {renderPagination()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {showTransactionModal && selectedTransaction && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Transaction Details</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowTransactionModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {selectedTransaction ? (
                  <div className="row">
                    <div className="col-md-6">
                      <h6>Transaction Information</h6>
                      <table className="table table-sm">
                        <tbody>
                          <tr>
                            <td><strong>ID:</strong></td>
                            <td><code>{generateUID(selectedTransaction, 0)}</code></td>
                          </tr>
                          <tr>
                            <td><strong>Date:</strong></td>
                            <td>{formatDate(selectedTransaction.date)}</td>
                          </tr>
                          <tr>
                            <td><strong>Description:</strong></td>
                            <td>{selectedTransaction.name || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td><strong>Reference:</strong></td>
                            <td><code>{selectedTransaction.reference || 'N/A'}</code></td>
                          </tr>
                          <tr>
                            <td><strong>Source:</strong></td>
                            <td>
                              <span className={`badge ${
                                selectedTransaction.source === 'AJ' ? 'bg-warning' :
                                selectedTransaction.source === 'PJ' ? 'bg-success' :
                                'bg-secondary'
                              }`}>
                                {selectedTransaction.source || 'N/A'}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Category:</strong></td>
                            <td>
                              <span className="badge bg-info">
                                {selectedTransaction.category_heading || 'N/A'}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Annotation:</strong></td>
                            <td>{selectedTransaction.annotation || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td><strong>User ID:</strong></td>
                            <td><code>{selectedTransaction.user_id || 'N/A'}</code></td>
                          </tr>
                          <tr>
                            <td><strong>Tax Return ID:</strong></td>
                            <td><code>{selectedTransaction.tax_return_id || 'N/A'}</code></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="col-md-6">
                      <h6>Financial Information</h6>
                      <table className="table table-sm">
                        <tbody>
                          <tr>
                            <td><strong>Debit:</strong></td>
                            <td className="text-danger fw-bold">
                              {selectedTransaction.debit > 0 ? formatCurrency(selectedTransaction.debit) : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Credit:</strong></td>
                            <td className="text-success fw-bold">
                              {selectedTransaction.credit > 0 ? formatCurrency(selectedTransaction.credit) : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Net Amount:</strong></td>
                            <td className="fw-bold">
                              {(() => {
                                const debit = parseFloat(selectedTransaction.debit) || 0;
                                const credit = parseFloat(selectedTransaction.credit) || 0;
                                const net = debit - credit;
                                return (
                                  <span className={net >= 0 ? 'text-danger' : 'text-success'}>
                                    {net >= 0 ? '-' : '+'}{formatCurrency(Math.abs(net))}
                                  </span>
                                );
                              })()}
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Tax Year:</strong></td>
                            <td>
                              <span className="badge bg-secondary">
                                {selectedTransaction.tax_return_year || 'N/A'}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td><strong>File:</strong></td>
                            <td>
                              <small className="text-muted">
                                {selectedTransaction.tax_return_filename || 'N/A'}
                              </small>
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Created:</strong></td>
                            <td>{selectedTransaction.created_at ? formatDate(selectedTransaction.created_at) : 'N/A'}</td>
                          </tr>
                          <tr>
                            <td><strong>Updated:</strong></td>
                            <td>{selectedTransaction.updated_at ? formatDate(selectedTransaction.updated_at) : 'N/A'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted">
                    <p>No transaction data available</p>
                    <small>Debug: selectedTransaction = {JSON.stringify(selectedTransaction)}</small>
                  </div>
                )}
                
           {/* Complete Transaction Details */}
           {selectedTransaction && (
             <div className="mt-4">
               <h6>Complete Transaction Details</h6>
               <div className="row">
                 <div className="col-md-6">
                   <h6 className="text-muted">System Information</h6>
                   <table className="table table-sm table-borderless">
                     <tbody>
                       <tr>
                         <td className="text-muted">Database ID:</td>
                         <td><code>{selectedTransaction.id || 'N/A'}</code></td>
                       </tr>
                       <tr>
                         <td className="text-muted">Balance:</td>
                         <td className="fw-bold">{formatCurrency(selectedTransaction.balance || 0)}</td>
                       </tr>
                       <tr>
                         <td className="text-muted">Created:</td>
                         <td>{selectedTransaction.created_at ? formatDate(selectedTransaction.created_at) : 'N/A'}</td>
                       </tr>
                       <tr>
                         <td className="text-muted">Updated:</td>
                         <td>{selectedTransaction.updated_at ? formatDate(selectedTransaction.updated_at) : 'N/A'}</td>
                       </tr>
                     </tbody>
                   </table>
                 </div>
                 <div className="col-md-6">
                   <h6 className="text-muted">Additional Details</h6>
                   <table className="table table-sm table-borderless">
                     <tbody>
                       <tr>
                         <td className="text-muted">Annotation:</td>
                         <td>{selectedTransaction.annotation || <span className="text-muted">None</span>}</td>
                       </tr>
                       <tr>
                         <td className="text-muted">Category Code:</td>
                         <td>
                           <span className="badge bg-info">
                             {selectedTransaction.category_heading || 'N/A'}
                           </span>
                         </td>
                       </tr>
                       <tr>
                         <td className="text-muted">Transaction Type:</td>
                         <td>
                           <span className={`badge ${
                             selectedTransaction.source === 'AJ' ? 'bg-warning' :
                             selectedTransaction.source === 'PJ' ? 'bg-success' :
                             selectedTransaction.source === 'AP' ? 'bg-primary' :
                             selectedTransaction.source === 'SE' ? 'bg-info' :
                             selectedTransaction.source === 'CD' ? 'bg-secondary' :
                             selectedTransaction.source === 'PL' ? 'bg-dark' :
                             'bg-light text-dark'
                           }`}>
                             {selectedTransaction.source || 'N/A'}
                           </span>
                         </td>
                       </tr>
                       <tr>
                         <td className="text-muted">File Source:</td>
                         <td>
                           <small className="text-muted">
                             {selectedTransaction.tax_return_filename || 'N/A'}
                           </small>
                         </td>
                       </tr>
                     </tbody>
                   </table>
                 </div>
               </div>
               
               {/* Financial Summary */}
               <div className="mt-3">
                 <h6 className="text-muted">Financial Summary</h6>
                 <div className="row">
                   <div className="col-md-4">
                     <div className="card bg-light">
                       <div className="card-body text-center py-2">
                         <small className="text-muted">Debit Amount</small>
                         <div className="fw-bold text-danger">
                           {selectedTransaction.debit > 0 ? formatCurrency(selectedTransaction.debit) : 'N/A'}
                         </div>
                       </div>
                     </div>
                   </div>
                   <div className="col-md-4">
                     <div className="card bg-light">
                       <div className="card-body text-center py-2">
                         <small className="text-muted">Credit Amount</small>
                         <div className="fw-bold text-success">
                           {selectedTransaction.credit > 0 ? formatCurrency(selectedTransaction.credit) : 'N/A'}
                         </div>
                       </div>
                     </div>
                   </div>
                   <div className="col-md-4">
                     <div className="card bg-light">
                       <div className="card-body text-center py-2">
                         <small className="text-muted">Net Effect</small>
                         <div className="fw-bold">
                           {(() => {
                             const debit = parseFloat(selectedTransaction.debit) || 0;
                             const credit = parseFloat(selectedTransaction.credit) || 0;
                             const net = debit - credit;
                             return (
                               <span className={net >= 0 ? 'text-danger' : 'text-success'}>
                                 {net >= 0 ? '-' : '+'}{formatCurrency(Math.abs(net))}
                               </span>
                             );
                           })()}
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowTransactionModal(false)}
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

export default GLTransactions;
