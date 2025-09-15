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
  const [sortDirection, setSortDirection] = useState('asc');
  
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
  const [groupByAccount, setGroupByAccount] = useState(true);
  const [groupedTransactions, setGroupedTransactions] = useState({});
  const [expandedAccounts, setExpandedAccounts] = useState({});
  
  // UI state for toggling panels
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showBalance, setShowBalance] = useState(false);

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

  // Get active filters for display as chips
  const getActiveFilters = () => {
    const activeFilters = [];
    
    if (filters.year && filters.year !== '') {
      activeFilters.push({ key: 'year', label: `Year: ${filters.year}`, value: filters.year });
    }
    if (filters.source && filters.source !== '') {
      activeFilters.push({ key: 'source', label: `Source: ${filters.source}`, value: filters.source });
    }
    if (filters.transactionType && filters.transactionType !== '') {
      const typeLabel = filters.transactionType === 'PJ' ? 'PJ (Bank)' : 
                       filters.transactionType === 'AJ' ? 'AJ (Adjustment)' : 
                       filters.transactionType;
      activeFilters.push({ key: 'transactionType', label: `Type: ${typeLabel}`, value: filters.transactionType });
    }
    if (filters.categoryHeading && filters.categoryHeading !== '') {
      activeFilters.push({ key: 'categoryHeading', label: `Account: ${filters.categoryHeading}`, value: filters.categoryHeading });
    }
    if (filters.dateFrom && filters.dateFrom !== '') {
      activeFilters.push({ key: 'dateFrom', label: `From: ${filters.dateFrom}`, value: filters.dateFrom });
    }
    if (filters.dateTo && filters.dateTo !== '') {
      activeFilters.push({ key: 'dateTo', label: `To: ${filters.dateTo}`, value: filters.dateTo });
    }
    if (filters.amountMin && filters.amountMin !== '') {
      activeFilters.push({ key: 'amountMin', label: `Min: ${formatCurrency(filters.amountMin)}`, value: filters.amountMin });
    }
    if (filters.amountMax && filters.amountMax !== '') {
      activeFilters.push({ key: 'amountMax', label: `Max: ${formatCurrency(filters.amountMax)}`, value: filters.amountMax });
    }
    
    return activeFilters;
  };

  // Remove a specific filter
  const removeFilter = (filterKey) => {
    handleFilterChange(filterKey, '');
  };

  // Get transaction type breakdown for an account
  const getTransactionTypeBreakdown = (transactions) => {
    const breakdown = {
      PJ: 0,
      AJ: 0,
      AP: 0,
      SE: 0,
      CD: 0,
      PL: 0,
      Other: 0
    };

    transactions.forEach(transaction => {
      const source = transaction.source;
      if (breakdown.hasOwnProperty(source)) {
        breakdown[source]++;
      } else {
        breakdown.Other++;
      }
    });

    return breakdown;
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
    
    // Calculate opening and closing balances and sort transactions
    Object.keys(grouped).forEach(accountKey => {
      const account = grouped[accountKey];
      
      // Sort transactions by date in ascending order (oldest first) to match original document
      account.transactions.sort((a, b) => {
        const dateA = new Date(a.date || '1900-01-01');
        const dateB = new Date(b.date || '1900-01-01');
        return dateA - dateB;
      });
      
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

      const response = await axios.get(`/gl-transactions?per_page=10000&year=${filters.year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data.transactions;
    } catch (error) {
      console.error('Error fetching all transactions for grouping:', error);
      return [];
    }
  };

  // Update grouped transactions when groupByAccount or year filter changes
  useEffect(() => {
    if (groupByAccount) {
      fetchAllTransactionsForGrouping().then(allTransactions => {
        setGroupedTransactions(groupTransactionsByAccount(allTransactions));
      });
    } else {
      setGroupedTransactions({});
    }
  }, [groupByAccount, filters.year]);

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

  const toggleAccountExpansion = (accountKey) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountKey]: !prev[accountKey]
    }));
  };

  const calculateTransactionStats = (transactions) => {
    if (transactions.length === 0) return { max: 0, min: 0, avg: 0 };
    
    const amounts = transactions.map(t => {
      const amount = getTransactionAmount(t);
      return Math.abs(amount.amount);
    }).filter(amount => amount > 0);
    
    if (amounts.length === 0) return { max: 0, min: 0, avg: 0 };
    
    return {
      max: Math.max(...amounts),
      min: Math.min(...amounts),
      avg: amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length
    };
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
        .max-height-300 {
          max-height: 300px;
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
                  className={`btn me-2 ${showBalance ? 'btn-info' : 'btn-outline-info'}`}
                  onClick={() => setShowBalance(!showBalance)}
                >
                  <i className="fas fa-calculator"></i> Balance
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
                <div className="col-md-3">
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
                <div className="col-md-3">
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
                    title="Close"
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
                      <div className="card-header d-flex justify-content-between align-items-center py-2">
                        <h6 className="mb-0">Analytics</h6>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setShowAnalytics(false)}
                          title="Close Analytics"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
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
              <div className="row mb-1">
                <div className="col-12 d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-3">
                    <button
                      className={`btn btn-sm ${groupByAccount ? 'btn-dark' : 'btn-outline-dark'}`}
                      onClick={() => setGroupByAccount(!groupByAccount)}
                    >
                      <i className={`fas ${groupByAccount ? 'fa-layer-group' : 'fa-list'}`}></i> 
                      {groupByAccount ? 'Grouped by Account' : 'Group by Account'}
                    </button>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <div className="d-flex align-items-center gap-2">
                        <i className="fas fa-search text-muted"></i>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Search transactions..."
                          value={filters.search}
                          onChange={(e) => handleFilterChange('search', e.target.value)}
                          style={{ width: '200px' }}
                        />
                      </div>
                      {/* Filter Chips */}
                      {getActiveFilters().map((filter) => (
                        <span
                          key={filter.key}
                          className="badge bg-primary text-white d-flex align-items-center gap-1 px-3 py-2"
                          style={{ fontSize: '0.75rem', borderRadius: '15px' }}
                        >
                          {filter.label}
                          <button
                            type="button"
                            className="btn-close btn-close-white"
                            style={{ fontSize: '0.6rem', padding: '0' }}
                            onClick={() => removeFilter(filter.key)}
                            title={`Remove ${filter.label}`}
                          ></button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <small className="text-muted">
                      {rowsPerPage >= 10000 ? 
                        `Showing all ${summaryCounts.total} transactions` : 
                        `Showing ${transactions.length} of ${summaryCounts.total} transactions`
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

              {/* GL Summary Panel */}
              {showBalance && (
                <div className="row mb-3">
                  <div className="col-12">
                    <div className="card shadow">
                      <div className="card-header d-flex justify-content-between align-items-center py-2" style={{ backgroundColor: '#b3d9ff' }}>
                        <h6 className="mb-0 text-dark fw-bold">
                          <i className="fas fa-calculator me-2"></i>
                          General Ledger Summary
                        </h6>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setShowBalance(false)}
                          title="Close Balance Panel"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-4">
                            <div className="text-center">
                              <h6 className="text-muted mb-2">Total Opening Balance</h6>
                              <div className="h4 fw-bold text-primary">
                                {(() => {
                                  const totalOpening = Object.values(groupedTransactions).reduce((sum, account) => sum + account.openingBalance, 0);
                                  return formatCurrency(totalOpening);
                                })()}
                              </div>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="text-center">
                              <h6 className="text-muted mb-2">Total Change</h6>
                              <div className="h4 fw-bold">
                                {(() => {
                                  const totalChange = Object.values(groupedTransactions).reduce((sum, account) => sum + account.netChange, 0);
                                  return (
                                    <span className={totalChange >= 0 ? 'text-success' : 'text-danger'}>
                                      {totalChange >= 0 ? '+' : ''}{formatCurrency(totalChange)}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="text-center">
                              <h6 className="text-muted mb-2">Total Closing Balance</h6>
                              <div className="h4 fw-bold text-primary">
                                {(() => {
                                  const totalClosing = Object.values(groupedTransactions).reduce((sum, account) => sum + account.closingBalance, 0);
                                  return formatCurrency(totalClosing);
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                        <hr className="my-3" />
                        <div className="row">
                          <div className="col-md-6">
                            <h6 className="text-muted mb-3 text-center">Account Credits</h6>
                            <div>
                              {Object.entries(groupedTransactions)
                                .filter(([_, account]) => account.totalCredits > 0)
                                .sort(([_, a], [__, b]) => b.totalCredits - a.totalCredits)
                                .map(([accountName, account]) => (
                                  <div key={accountName} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                                    <span className="me-2 flex-grow-1" style={{ minWidth: '0' }}>
                                      {accountName}
                                    </span>
                                    <span className="text-success fw-bold flex-shrink-0">
                                      {formatCurrency(account.totalCredits)}
                                    </span>
                                  </div>
                                ))}
                              {Object.values(groupedTransactions).filter(account => account.totalCredits > 0).length === 0 && (
                                <div className="text-center text-muted py-3">No credits</div>
                              )}
                            </div>
                          </div>
                          <div className="col-md-6">
                            <h6 className="text-muted mb-3 text-center">Account Debits</h6>
                            <div>
                              {Object.entries(groupedTransactions)
                                .filter(([_, account]) => account.totalDebits > 0)
                                .sort(([_, a], [__, b]) => b.totalDebits - a.totalDebits)
                                .map(([accountName, account]) => (
                                  <div key={accountName} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                                    <span className="me-2 flex-grow-1" style={{ minWidth: '0' }}>
                                      {accountName}
                                    </span>
                                    <span className="text-danger fw-bold flex-shrink-0">
                                      {formatCurrency(account.totalDebits)}
                                    </span>
                                  </div>
                                ))}
                              {Object.values(groupedTransactions).filter(account => account.totalDebits > 0).length === 0 && (
                                <div className="text-center text-muted py-3">No debits</div>
                              )}
                            </div>
                          </div>
                        </div>
                        <hr className="my-3" />
                        <div className="row">
                          <div className="col-md-6">
                            <div className="text-center">
                              <h6 className="text-muted mb-2">Total Credits</h6>
                              <div className="h5 fw-bold text-success">
                                {(() => {
                                  const totalCredits = Object.values(groupedTransactions).reduce((sum, account) => sum + account.totalCredits, 0);
                                  return formatCurrency(totalCredits);
                                })()}
                              </div>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="text-center">
                              <h6 className="text-muted mb-2">Total Debits</h6>
                              <div className="h5 fw-bold text-danger">
                                {(() => {
                                  const totalDebits = Object.values(groupedTransactions).reduce((sum, account) => sum + account.totalDebits, 0);
                                  return formatCurrency(totalDebits);
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="row mt-3">
                          <div className="col-12">
                            <div className="text-center">
                              <small className="text-muted">
                                Summary based on {Object.keys(groupedTransactions).length} account{Object.keys(groupedTransactions).length !== 1 ? 's' : ''} 
                                {filters.year && ` for ${filters.year}`}
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transactions Table or Grouped View */}
              {groupByAccount ? (
                <div className="grouped-view">
                  {Object.keys(groupedTransactions).length === 0 ? (
                    <div className="text-center text-muted py-3">
                      No transactions found
                    </div>
                  ) : (
                    Object.entries(groupedTransactions).map(([accountKey, account]) => {
                      const isExpanded = expandedAccounts[accountKey];
                      const stats = calculateTransactionStats(account.transactions);
                      const transactionCount = account.transactions.length;
                      
                      return (
                        <div key={accountKey} className="account-group mb-3">
                          <div className="card shadow-lg" style={{ borderRadius: '12px', border: 'none' }}>
        <div
          className="card-header py-3 px-4 d-flex justify-content-between align-items-center"
          onClick={() => toggleAccountExpansion(accountKey)}
          style={{ 
            cursor: 'pointer',
            background: '#b3d9ff',
            border: 'none',
            borderRadius: '8px 8px 0 0'
          }}
        >
          <div className="d-flex align-items-center">
            <i className={`fas ${isExpanded ? 'fa-folder-open' : 'fa-folder'} me-3 text-primary`} style={{ fontSize: '1.1rem' }}></i>
            <h6 className="mb-0 text-dark fw-bold" style={{ fontSize: '1.1rem' }}>{account.accountName}</h6>
            <div className="d-flex align-items-center gap-1 ms-3 flex-wrap">
              {(() => {
                const breakdown = getTransactionTypeBreakdown(account.transactions);
                const badges = [];
                
                // Add badges for each transaction type that has transactions
                Object.entries(breakdown).forEach(([type, count]) => {
                  if (count > 0) {
                    const badgeClass = type === 'PJ' ? 'bg-success' :
                                     type === 'AJ' ? 'bg-warning text-dark' :
                                     type === 'AP' ? 'bg-info' :
                                     type === 'SE' ? 'bg-primary' :
                                     type === 'CD' ? 'bg-secondary' :
                                     type === 'PL' ? 'bg-dark' :
                                     'bg-light text-dark';
                    
                    badges.push(
                      <span
                        key={type}
                        className={`badge ${badgeClass} px-2 py-1 fw-bold`}
                        style={{ fontSize: '0.7rem', borderRadius: '12px' }}
                        title={`${type}: ${count} transaction${count !== 1 ? 's' : ''}`}
                      >
                        {type}: {count}
                      </span>
                    );
                  }
                });
                
                return badges;
              })()}
            </div>
            <div className="d-flex align-items-center gap-3 small ms-4">
              <span className="text-muted fw-medium">Max: <span className="text-dark fw-bold">{formatCurrency(stats.max)}</span></span>
              <span className="text-muted fw-medium">Avg: <span className="text-dark fw-bold">{formatCurrency(stats.avg)}</span></span>
              <span className="text-muted fw-medium">Min: <span className="text-dark fw-bold">{formatCurrency(stats.min)}</span></span>
            </div>
          </div>
                              <div className="d-flex align-items-center">
                                <div className="text-end small me-4">
                                  <div className="text-muted fw-medium mb-1">Opening: <span className="text-dark fw-bold">{formatCurrency(account.openingBalance)}</span></div>
                                  <div className="text-muted fw-medium mb-1">Change: <span className={`fw-bold ${account.netChange >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '1rem' }}>
                                    {account.netChange >= 0 ? '+' : ''}{formatCurrency(account.netChange)}
                                  </span></div>
                                  <div className="text-muted fw-medium">Closing: <span className="text-dark fw-bold">{formatCurrency(account.closingBalance)}</span></div>
                                </div>
                                <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-primary`} style={{ fontSize: '1.2rem' }}></i>
                              </div>
                            </div>
                            
                            {/* Expandable Transaction Table */}
                            {isExpanded && (
                              <div className="card-body p-0" style={{ backgroundColor: '#f8f9fa' }}>
                                <div className="table-responsive">
                                  <table className="table table-sm table-hover mb-0" style={{ backgroundColor: 'white' }}>
                                    <thead style={{ backgroundColor: '#495057' }}>
                                      <tr>
                                        <th className="text-white fw-bold py-3">ID</th>
                                        <th className="text-white fw-bold py-3">Date</th>
                                        <th className="text-white fw-bold py-3">Description</th>
                                        <th className="text-white fw-bold py-3">Reference</th>
                                        <th className="text-white fw-bold py-3">Type</th>
                                        <th className="text-white fw-bold py-3">Amount</th>
                                        <th className="text-white fw-bold py-3">D/C</th>
                                        <th className="text-white fw-bold py-3">Year</th>
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
                                            style={{ 
                                              transition: 'all 0.2s ease',
                                              borderLeft: '4px solid transparent'
                                            }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.backgroundColor = '#f8f9fa';
                                              e.currentTarget.style.borderLeftColor = '#667eea';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.backgroundColor = 'white';
                                              e.currentTarget.style.borderLeftColor = 'transparent';
                                            }}
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
                                              <span className={`badge px-3 py-2 fw-bold ${
                                                transaction.source === 'AJ' ? 'bg-warning text-dark' :
                                                transaction.source === 'PJ' ? 'bg-success text-white' :
                                                'bg-secondary text-white'
                                              }`} style={{ borderRadius: '15px', fontSize: '0.75rem' }}>
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
                                              <span className={`badge px-3 py-2 fw-bold ${
                                                type === 'debit' ? 'bg-danger text-white' : 
                                                type === 'credit' ? 'bg-success text-white' : 
                                                'bg-secondary text-white'
                                              }`} style={{ borderRadius: '15px', fontSize: '0.75rem' }}>
                                                {type === 'debit' ? 'Debit' : type === 'credit' ? 'Credit' : 'N/A'}
                                              </span>
                                            </td>
                                            <td>
                                              <span className="badge bg-primary text-white px-3 py-2 fw-bold" style={{ borderRadius: '15px', fontSize: '0.75rem' }}>
                                                {transaction.tax_return_year || 'N/A'}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                      {/* Total Row */}
                                      <tr style={{ backgroundColor: '#343a40' }}>
                                        <td colSpan="2" className="text-white fw-bold py-3">TOTAL</td>
                                        <td className="py-3"></td>
                                        <td className="py-3"></td>
                                        <td className="py-3"></td>
                                        <td className="text-end py-3">
                                          <span className={`fw-bold ${
                                            account.netChange >= 0 ? 'text-success' : 'text-danger'
                                          }`} style={{ fontSize: '1.1rem' }}>
                                            {account.netChange >= 0 ? '+' : ''}{formatCurrency(account.netChange)}
                                          </span>
                                        </td>
                                        <td className="py-3">
                                          <span className="badge bg-white text-dark px-3 py-2 fw-bold" style={{ borderRadius: '15px', fontSize: '0.75rem' }}>
                                            {account.totalDebits > account.totalCredits ? 'Debit' : 'Credit'}
                                          </span>
                                        </td>
                                        <td className="py-3"></td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
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
