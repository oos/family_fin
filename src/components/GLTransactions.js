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
    year: '',
    transactionType: '' // New: PJ vs AJ filtering
  });

  // Available filter options
  const [filterOptions, setFilterOptions] = useState({
    sources: [],
    categoryHeadings: [],
    years: [],
    transactionTypes: []
  });

  // Account grouping state
  const [groupByAccount, setGroupByAccount] = useState(false);
  const [groupedTransactions, setGroupedTransactions] = useState({});

  useEffect(() => {
    fetchTransactions();
    fetchFilterOptions();
  }, [currentPage, rowsPerPage, sortField, sortDirection, filters]);

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
      year: '',
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
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

  // Update grouped transactions when transactions change
  useEffect(() => {
    if (groupByAccount && transactions.length > 0) {
      setGroupedTransactions(groupTransactionsByAccount(transactions));
    }
  }, [transactions, groupByAccount]);

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

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionModal(true);
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
                  className={`btn me-2 ${groupByAccount ? 'btn-success' : 'btn-outline-success'}`}
                  onClick={() => setGroupByAccount(!groupByAccount)}
                >
                  <i className={`fas ${groupByAccount ? 'fa-layer-group' : 'fa-list'}`}></i> 
                  {groupByAccount ? 'Grouped by Account' : 'Group by Account'}
                </button>
                <button
                  className="btn btn-outline-primary me-2"
                  onClick={() => setShowFiltersModal(true)}
                >
                  <i className="fas fa-filter"></i> Filters
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
                <div className="col-md-2">
                  <select
                    className="form-select"
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  >
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                    <option value={200}>200 per page</option>
                    <option value={500}>500 per page</option>
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

              {/* Transaction Summary */}
              {transactions.length > 0 && (
                <div className="row mb-3">
                  <div className="col-12">
                    <div className="card bg-light">
                      <div className="card-body py-2">
                        <div className="row text-center">
                          <div className="col-md-3">
                            <small className="text-muted">Total Transactions</small>
                            <div className="fw-bold">{totalTransactions}</div>
                          </div>
                          <div className="col-md-3">
                            <small className="text-muted">Bank Transactions (PJ)</small>
                            <div className="fw-bold text-success">
                              {transactions.filter(t => t.source === 'PJ').length}
                            </div>
                          </div>
                          <div className="col-md-3">
                            <small className="text-muted">Adjustments (AJ)</small>
                            <div className="fw-bold text-warning">
                              {transactions.filter(t => t.source === 'AJ').length}
                            </div>
                          </div>
                          <div className="col-md-3">
                            <small className="text-muted">Other Types</small>
                            <div className="fw-bold text-secondary">
                              {transactions.filter(t => t.source !== 'PJ' && t.source !== 'AJ').length}
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
                                            transaction.source === 'AJ' ? 'bg-warning' :
                                            transaction.source === 'PJ' ? 'bg-success' :
                                            'bg-secondary'
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
                                          <span className="badge bg-secondary">
                                            {transaction.tax_return_year || 'N/A'}
                                          </span>
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
                        <th>Year</th>
                        <th>File</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="9" className="text-center">
                            <div className="spinner-border" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                          </td>
                        </tr>
                      ) : transactions.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="text-center text-muted">
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
                                  transaction.source === 'AJ' ? 'bg-warning' :
                                  transaction.source === 'PJ' ? 'bg-success' :
                                  'bg-secondary'
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
                          <td>{selectedTransaction.name}</td>
                        </tr>
                        <tr>
                          <td><strong>Reference:</strong></td>
                          <td>{selectedTransaction.reference || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Source:</strong></td>
                          <td>{selectedTransaction.source || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Category:</strong></td>
                          <td>{selectedTransaction.category_heading || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Annotation:</strong></td>
                          <td>{selectedTransaction.annotation || 'N/A'}</td>
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
                          <td className="text-danger">
                            {selectedTransaction.debit > 0 ? formatCurrency(selectedTransaction.debit) : 'N/A'}
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Credit:</strong></td>
                          <td className="text-success">
                            {selectedTransaction.credit > 0 ? formatCurrency(selectedTransaction.credit) : 'N/A'}
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Balance:</strong></td>
                          <td>{formatCurrency(selectedTransaction.balance)}</td>
                        </tr>
                        <tr>
                          <td><strong>Tax Year:</strong></td>
                          <td>{selectedTransaction.tax_return_year || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>File:</strong></td>
                          <td>{selectedTransaction.tax_return_filename || 'N/A'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
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
