import React, { useState, useEffect, useMemo } from 'react';
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
  const [refreshing, setRefreshing] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showOverview, setShowOverview] = useState(true);
  
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

  useEffect(() => {
    fetchBusinessAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchTransactions();
    }
  }, [selectedAccount]);

  const fetchBusinessAccounts = async () => {
    setAccountsLoading(true);
    try {
      const response = await axios.get('/business-accounts');
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
      const response = await axios.get(`/business-accounts/${selectedAccount}/transactions`);
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
      category: '',
      year: ''
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

  const summary = useMemo(() => {
    if (!filteredTransactions || filteredTransactions.length === 0) {
      return {
        totalTransactions: 0,
        totalInflow: 0,
        totalOutflow: 0,
        netAmount: 0,
        averageAmount: 0,
        transactionTypes: {}
      };
    }

    const calculatedSummary = filteredTransactions.reduce((acc, transaction) => {
      acc.totalTransactions++;
      const amount = getTransactionAmount(transaction);
      acc.totalInflow += amount > 0 ? amount : 0;
      acc.totalOutflow += amount < 0 ? Math.abs(amount) : 0;
      acc.netAmount += amount;
      
      const type = transaction.transaction_type || 'Unknown';
      acc.transactionTypes[type] = (acc.transactionTypes[type] || 0) + 1;
      
      return acc;
    }, {
      totalTransactions: 0,
      totalInflow: 0,
      totalOutflow: 0,
      netAmount: 0,
      averageAmount: 0,
      transactionTypes: {}
    });

    calculatedSummary.averageAmount = calculatedSummary.totalTransactions > 0 ? calculatedSummary.netAmount / calculatedSummary.totalTransactions : 0;
    
    return calculatedSummary;
  }, [filteredTransactions]);

  const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getTransactionCurrency = (transaction) => {
    // Priority: payment_currency > orig_currency > account default
    return transaction.payment_currency || 
           transaction.orig_currency || 
           (selectedAccountData?.currency || 'EUR');
  };

  const getTransactionAmount = (transaction) => {
    // Use total_amount if available, otherwise amount
    return transaction.total_amount !== null && transaction.total_amount !== undefined 
      ? transaction.total_amount 
      : transaction.amount;
  };

  const groupTransactionsByCurrency = (transactions) => {
    return transactions.reduce((groups, transaction) => {
      const currency = getTransactionCurrency(transaction);
      const amount = getTransactionAmount(transaction);
      
      if (!groups[currency]) {
        groups[currency] = {
          transactions: [],
          totalInflow: 0,
          totalOutflow: 0,
          netAmount: 0,
          count: 0
        };
      }
      
      groups[currency].transactions.push(transaction);
      groups[currency].count++;
      
      if (amount > 0) {
        groups[currency].totalInflow += amount;
      } else {
        groups[currency].totalOutflow += Math.abs(amount);
      }
      
      groups[currency].netAmount = groups[currency].totalInflow - groups[currency].totalOutflow;
      
      return groups;
    }, {});
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
    // Get all unique years from transaction dates
    const years = [...new Set(transactions.map(t => {
      const date = new Date(t.transaction_date);
      return date.getFullYear();
    }).filter(year => !isNaN(year)))];
    
    // Add current year and a few years before/after for convenience
    const currentYear = new Date().getFullYear();
    const yearRange = [];
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      yearRange.push(i);
    }
    
    // Combine and deduplicate, then sort descending
    const allYears = [...new Set([...years, ...yearRange])];
    return allYears.sort((a, b) => b - a);
  };

  // Helper functions for analytics dashboard
  const generateMonthlyTrendChart = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) {
      return <div className="text-center text-muted">No data available</div>;
    }

    // Group transactions by month
    const monthlyData = filteredTransactions.reduce((acc, transaction) => {
      const date = new Date(transaction.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = { count: 0, inflow: 0, outflow: 0 };
      }
      
      acc[monthKey].count++;
      if (transaction.amount > 0) {
        acc[monthKey].inflow += transaction.amount;
      } else {
        acc[monthKey].outflow += Math.abs(transaction.amount);
      }
      
      return acc;
    }, {});

    const sortedMonths = Object.keys(monthlyData).sort();
    const maxCount = Math.max(...Object.values(monthlyData).map(d => d.count));

    return (
      <div className="monthly-trend-chart">
        <div className="row">
          {sortedMonths.slice(-6).map(monthKey => {
            const data = monthlyData[monthKey];
            const height = (data.count / maxCount) * 100;
            const monthName = new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            
            return (
              <div key={monthKey} className="col-12 mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div className="small fw-bold">{monthName}</div>
                  <div className="small text-muted">{data.count} txns</div>
                </div>
                <div className="d-flex align-items-end" style={{ height: '40px' }}>
                  <div className="me-1" style={{ width: '30%' }}>
                    <div 
                      className="bg-success rounded-top" 
                      style={{ 
                        height: `${(data.inflow / Math.max(data.inflow + data.outflow, 1)) * height}px`,
                        minHeight: '2px'
                      }}
                      title={`Inflow: ${formatCurrency(data.inflow)}`}
                    ></div>
                  </div>
                  <div style={{ width: '30%' }}>
                    <div 
                      className="bg-danger rounded-top" 
                      style={{ 
                        height: `${(data.outflow / Math.max(data.inflow + data.outflow, 1)) * height}px`,
                        minHeight: '2px'
                      }}
                      title={`Outflow: ${formatCurrency(data.outflow)}`}
                    ></div>
                  </div>
                  <div className="ms-1" style={{ width: '30%' }}>
                    <div 
                      className="bg-primary rounded-top" 
                      style={{ 
                        height: `${height}px`,
                        minHeight: '2px'
                      }}
                      title={`Count: ${data.count}`}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getTopTransactions = () => {
    return [...filteredTransactions]
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 10);
  };

  const getLargestTransaction = () => {
    if (filteredTransactions.length === 0) return 0;
    return Math.max(...filteredTransactions.map(t => Math.abs(t.amount)));
  };

  const getSmallestTransaction = () => {
    if (filteredTransactions.length === 0) return 0;
    return Math.min(...filteredTransactions.map(t => Math.abs(t.amount)));
  };

  const generateInsights = () => {
    const insights = [];
    
    // Net position insight
    if (summary.netAmount > 0) {
      insights.push(`Your account has a positive net position of ${formatCurrency(summary.netAmount)}, indicating healthy cash flow.`);
    } else if (summary.netAmount < 0) {
      insights.push(`Your account shows a negative net position of ${formatCurrency(Math.abs(summary.netAmount))}, suggesting more money going out than coming in.`);
    }

    // Transaction frequency insight - calculate actual date range
    if (filteredTransactions.length > 0) {
      const dates = filteredTransactions.map(t => new Date(t.transaction_date));
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      const daysDiff = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
      const avgPerDay = summary.totalTransactions / daysDiff;
      
      if (avgPerDay > 5) {
        insights.push(`High transaction frequency with ${avgPerDay.toFixed(1)} transactions per day on average over ${daysDiff} days.`);
      } else if (avgPerDay < 1) {
        insights.push(`Low transaction frequency with ${avgPerDay.toFixed(1)} transactions per day on average over ${daysDiff} days.`);
      } else {
        insights.push(`Moderate transaction frequency with ${avgPerDay.toFixed(1)} transactions per day on average over ${daysDiff} days.`);
      }
    }

    // Largest transaction insight
    const largest = getLargestTransaction();
    if (largest > 10000) {
      insights.push(`Your largest transaction was ${formatCurrency(largest)}, indicating significant financial activity.`);
    }

    // Transaction type diversity
    const typeCount = Object.keys(summary.transactionTypes).length;
    if (typeCount > 5) {
      insights.push(`Diverse transaction types (${typeCount} different types) show varied financial activity.`);
    }

    // Cash flow ratio insight
    const inflowRatio = summary.totalInflow / (summary.totalInflow + summary.totalOutflow);
    if (inflowRatio > 0.6) {
      insights.push(`Strong inflow ratio of ${(inflowRatio * 100).toFixed(1)}% indicates healthy income generation.`);
    } else if (inflowRatio < 0.4) {
      insights.push(`Low inflow ratio of ${(inflowRatio * 100).toFixed(1)}% suggests high spending relative to income.`);
    }

    // Average transaction insight
    if (summary.averageAmount > 1000) {
      insights.push(`High average transaction value of ${formatCurrency(summary.averageAmount)} indicates significant financial movements.`);
    } else if (summary.averageAmount < 100) {
      insights.push(`Low average transaction value of ${formatCurrency(summary.averageAmount)} suggests frequent small transactions.`);
    }

    return insights.slice(0, 6); // Return max 6 insights
  };

  const refreshAccountTransactions = async () => {
    if (!selectedAccount) return;
    
    try {
      setRefreshing(true);
      const response = await axios.post(`/business-accounts/${selectedAccount}/refresh-transactions`);
      
      if (response.data.success) {
        // Refresh the transactions and accounts
        await fetchTransactions();
        await fetchBusinessAccounts();
      }
    } catch (err) {
      setError('Failed to refresh account transactions');
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
    } else {
      alert('Please select a valid CSV file');
      setCsvFile(null);
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile || !selectedAccount) {
      alert('Please select a CSV file and account first');
      return;
    }

    setImportingCsv(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      console.log('Attempting CSV import for account:', selectedAccount);
      console.log('File:', csvFile);
      console.log('FormData entries:', Array.from(formData.entries()));
      
      // Check if token exists
      const token = localStorage.getItem('token');
      console.log('Token from localStorage:', token ? 'present' : 'missing');
      
      const response = await axios.post(`/business-accounts/${selectedAccount}/import-csv`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setImportResult({
          success: true,
          message: response.data.message,
          importedCount: response.data.imported_count,
          errors: response.data.errors || [],
          totalErrors: response.data.total_errors || 0
        });
        // Refresh transactions and accounts to show updated data
        await fetchTransactions();
        await fetchBusinessAccounts();
      } else {
        setImportResult({
          success: false,
          message: response.data.message
        });
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
      setImportResult({
        success: false,
        message: 'Error importing CSV: ' + (error.response?.data?.message || error.message)
      });
    } finally {
      setImportingCsv(false);
    }
  };

  const closeCsvModal = () => {
    setShowCsvModal(false);
    setCsvFile(null);
    setImportResult(null);
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
            <div className="col-lg-3 col-md-6 col-sm-6 mb-2">
              <strong>Current Balance:</strong> {formatCurrency(selectedAccountData.balance || 0)}
            </div>
            <div className="col-lg-3 col-md-6 col-sm-6 mb-2">
              <strong>Account Number:</strong> {selectedAccountData.account_number}
            </div>
            <div className="col-lg-3 col-md-6 col-sm-6 mb-2">
              <strong>Bank:</strong> {selectedAccountData.bank_name}
            </div>
            <div className="col-lg-3 col-md-6 col-sm-6 mb-2">
              <strong>Last Refreshed:</strong> {selectedAccountData.last_refreshed ? 
                new Date(selectedAccountData.last_refreshed).toLocaleString() : 'Never'}
            </div>
          </div>
        )}

        {selectedAccountData && (
          <div className="row mt-3">
            <div className="col-12">
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  className="btn btn-outline" 
                  onClick={refreshAccountTransactions}
                  disabled={refreshing || !selectedAccountData.api_configured}
                  style={{ 
                    opacity: (refreshing || !selectedAccountData.api_configured) ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title={selectedAccountData.api_configured ? "Refresh transactions from bank API" : "Configure API first"}
                >
                  {refreshing && (
                    <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid #f3f3f3', borderTop: '2px solid #007bff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  )}
                  🔄 Refresh Transactions
                </button>
                <button 
                  className="btn btn-info" 
                  onClick={() => setShowCsvModal(true)}
                  title="Import transactions from CSV file"
                >
                  📄 Import CSV
                </button>
                {!selectedAccountData.api_configured && (
                  <span style={{ color: '#856404', fontSize: '14px' }}>
                    ⚠️ API not configured - only CSV import available
                  </span>
                )}
              </div>
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
              Transaction List
              {filteredTransactions.length !== (Array.isArray(transactions) ? transactions.length : 0) && 
                ` (${filteredTransactions.length} of ${Array.isArray(transactions) ? transactions.length : 0})`
              }
            </h4>
          </div>
          
          {loading && <div className="text-center">Loading transactions...</div>}
          {error && <div className="alert alert-danger">{error}</div>}
          
          {/* Comprehensive Transaction Analytics Dashboard */}
          {!loading && !error && filteredTransactions.length > 0 && (
            <div className="card mb-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">📊 Transaction Analytics Dashboard</h5>
                <button 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setShowOverview(!showOverview)}
                  title={showOverview ? "Hide overview" : "Show overview"}
                >
                  {showOverview ? '👁️‍🗨️ Hide' : '👁️ Show'} Overview
                </button>
              </div>
              {showOverview && (
                <div className="card-body p-0">
                  <div className="transaction-analytics-dashboard p-4">
                    {/* Key Metrics Overview */}
                    <div className="card mb-4 transaction-summary">
                      <div className="card-header">
                        <h5 className="mb-0">📊 Financial Overview</h5>
                      </div>
                      <div className="card-body">
                        {/* Overall Summary */}
                        <div className="row mb-4">
                    <div className="col-lg-3 col-md-6 col-sm-6 mb-3">
                      <div className="text-center">
                        <div className="h3 text-primary mb-1">{summary.totalTransactions}</div>
                        <div className="text-muted small">Total Transactions</div>
                        <div className="progress mt-2" style={{ height: '4px' }}>
                          <div className="progress-bar bg-primary" style={{ width: '100%' }}></div>
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-3 col-md-6 col-sm-6 mb-3">
                      <div className="text-center">
                        <div className="h3 text-success mb-1">{formatCurrency(summary.totalInflow)}</div>
                        <div className="text-muted small">Total Inflow</div>
                        <div className="progress mt-2" style={{ height: '4px' }}>
                          <div className="progress-bar bg-success" style={{ width: '100%' }}></div>
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-3 col-md-6 col-sm-6 mb-3">
                      <div className="text-center">
                        <div className="h3 text-danger mb-1">{formatCurrency(summary.totalOutflow)}</div>
                        <div className="text-muted small">Total Outflow</div>
                        <div className="progress mt-2" style={{ height: '4px' }}>
                          <div className="progress-bar bg-danger" style={{ width: '100%' }}></div>
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-3 col-md-6 col-sm-6 mb-3">
                      <div className="text-center">
                        <div className={`h3 mb-1 ${summary.netAmount >= 0 ? 'text-success' : 'text-danger'}`}>
                          {formatCurrency(summary.netAmount)}
                        </div>
                        <div className="text-muted small">Net Position</div>
                        <div className="progress mt-2" style={{ height: '4px' }}>
                          <div className={`progress-bar ${summary.netAmount >= 0 ? 'bg-success' : 'bg-danger'}`} 
                               style={{ width: '100%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mixed Currency Warning */}
                  {(() => {
                    const currencyGroups = groupTransactionsByCurrency(filteredTransactions);
                    const currencies = Object.keys(currencyGroups);
                    
                    if (currencies.length > 1) {
                      return (
                        <div className="alert alert-warning mb-4">
                          <i className="fas fa-exclamation-triangle me-2"></i>
                          <strong>Mixed Currencies Detected:</strong> The totals above combine different currencies ({currencies.join(', ')}). 
                          For accurate analysis, see the currency breakdown below.
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Currency Breakdown */}
                  {(() => {
                    const currencyGroups = groupTransactionsByCurrency(filteredTransactions);
                    const currencies = Object.keys(currencyGroups);
                    
                    if (currencies.length > 1) {
                      return (
                        <div className="currency-breakdown">
                          <h6 className="text-muted mb-3">💱 Multi-Currency Breakdown</h6>
                          <div className="row">
                            {currencies.map(currency => {
                              const group = currencyGroups[currency];
                              return (
                                <div key={currency} className="col-lg-4 col-md-6 mb-3">
                                  <div className="card border">
                                    <div className="card-body p-3">
                                      <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h6 className="mb-0">{currency}</h6>
                                        <span className="badge bg-primary">{group.count} txns</span>
                                      </div>
                                      <div className="row text-center">
                                        <div className="col-6">
                                          <div className="small text-success fw-bold">
                                            {formatCurrency(group.totalInflow, currency)}
                                          </div>
                                          <div className="small text-muted">Inflow</div>
                                        </div>
                                        <div className="col-6">
                                          <div className="small text-danger fw-bold">
                                            {formatCurrency(group.totalOutflow, currency)}
                                          </div>
                                          <div className="small text-muted">Outflow</div>
                                        </div>
                                      </div>
                                      <hr className="my-2" />
                                      <div className="text-center">
                                        <div className={`fw-bold ${group.netAmount >= 0 ? 'text-success' : 'text-danger'}`}>
                                          {formatCurrency(group.netAmount, currency)}
                                        </div>
                                        <div className="small text-muted">Net Position</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Detailed Analytics Row */}
              <div className="row mb-4">
                {/* Transaction Types Chart */}
                <div className="col-lg-6 mb-4">
                  <div className="card h-100">
                    <div className="card-header">
                      <h6 className="mb-0">📈 Transaction Types Distribution</h6>
                    </div>
                    <div className="card-body">
                      {Object.keys(summary.transactionTypes).length > 0 ? (
                        <div className="transaction-types-chart">
                          {Object.entries(summary.transactionTypes)
                            .sort(([,a], [,b]) => b - a)
                            .map(([type, count], index) => {
                              const percentage = (count / summary.totalTransactions * 100).toFixed(1);
                              const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6c757d', '#17a2b8', '#6f42c1', '#fd7e14'];
                              const color = colors[index % colors.length];
                              
                              return (
                                <div key={type} className="mb-3">
                                  <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span className="small fw-bold">{type.replace('_', ' ')}</span>
                                    <span className="small text-muted">{count} ({percentage}%)</span>
                                  </div>
                                  <div className="progress" style={{ height: '8px' }}>
                                    <div 
                                      className="progress-bar" 
                                      style={{ 
                                        width: `${percentage}%`, 
                                        backgroundColor: color 
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })
                          }
                        </div>
                      ) : (
                        <div className="text-center text-muted">No transaction types data</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Monthly Trend Chart */}
                <div className="col-lg-6 mb-4">
                  <div className="card h-100">
                    <div className="card-header">
                      <h6 className="mb-0">📅 Monthly Transaction Trend</h6>
                    </div>
                    <div className="card-body">
                      {generateMonthlyTrendChart()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Insights Row */}
              <div className="row mb-4">
                {/* Cash Flow Analysis */}
                <div className="col-lg-4 mb-4">
                  <div className="card h-100">
                    <div className="card-header">
                      <h6 className="mb-0">💰 Cash Flow Analysis</h6>
                    </div>
                    <div className="card-body">
                      <div className="cash-flow-metrics">
                        <div className="d-flex justify-content-between mb-2">
                          <span className="small">Inflow Ratio:</span>
                          <span className="small fw-bold text-success">
                            {summary.totalInflow > 0 ? ((summary.totalInflow / (summary.totalInflow + summary.totalOutflow)) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="small">Outflow Ratio:</span>
                          <span className="small fw-bold text-danger">
                            {summary.totalOutflow > 0 ? ((summary.totalOutflow / (summary.totalInflow + summary.totalOutflow)) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="small">Average Inflow:</span>
                          <span className="small fw-bold text-success">
                            {formatCurrency(summary.totalInflow / Math.max(summary.totalTransactions, 1))}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="small">Average Outflow:</span>
                          <span className="small fw-bold text-danger">
                            {formatCurrency(summary.totalOutflow / Math.max(summary.totalTransactions, 1))}
                          </span>
                        </div>
                        <hr />
                        <div className="d-flex justify-content-between">
                          <span className="small fw-bold">Net Position:</span>
                          <span className={`small fw-bold ${summary.netAmount >= 0 ? 'text-success' : 'text-danger'}`}>
                            {formatCurrency(summary.netAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Transactions */}
                <div className="col-lg-4 mb-4">
                  <div className="card h-100">
                    <div className="card-header">
                      <h6 className="mb-0">🏆 Top Transactions</h6>
                    </div>
                    <div className="card-body">
                      <div className="top-transactions">
                        {getTopTransactions().slice(0, 5).map((transaction, index) => (
                          <div key={index} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
                            <div className="flex-grow-1">
                              <div className="small fw-bold text-truncate" style={{ maxWidth: '150px' }}>
                                {transaction.description}
                              </div>
                              <div className="small text-muted">
                                {new Date(transaction.transaction_date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className={`small fw-bold ${transaction.amount >= 0 ? 'text-success' : 'text-danger'}`}>
                              {formatCurrency(transaction.amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spending Patterns */}
                <div className="col-lg-4 mb-4">
                  <div className="card h-100">
                    <div className="card-header">
                      <h6 className="mb-0">📊 Spending Patterns</h6>
                    </div>
                    <div className="card-body">
                      <div className="spending-patterns">
                        <div className="mb-3">
                          <div className="small text-muted mb-1">Transaction Frequency</div>
                          <div className="h5 text-primary">{summary.totalTransactions}</div>
                          <div className="small text-muted">transactions total</div>
                        </div>
                        <div className="mb-3">
                          <div className="small text-muted mb-1">Average Transaction</div>
                          <div className="h5 text-info">{formatCurrency(summary.averageAmount)}</div>
                          <div className="small text-muted">per transaction</div>
                        </div>
                        <div className="mb-3">
                          <div className="small text-muted mb-1">Largest Transaction</div>
                          <div className="h5 text-warning">{formatCurrency(getLargestTransaction())}</div>
                          <div className="small text-muted">single transaction</div>
                        </div>
                        <div className="mb-3">
                          <div className="small text-muted mb-1">Transaction Range</div>
                          <div className="h6 text-secondary">
                            {formatCurrency(getSmallestTransaction())} - {formatCurrency(getLargestTransaction())}
                          </div>
                          <div className="small text-muted">min to max</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Insights */}
              <div className="card mb-4">
                <div className="card-header">
                  <h6 className="mb-0">💡 Key Insights</h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <ul className="list-unstyled">
                        {generateInsights().slice(0, 3).map((insight, index) => (
                          <li key={index} className="mb-2">
                            <i className="fas fa-lightbulb text-warning me-2"></i>
                            <span className="small">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="col-md-6">
                      <ul className="list-unstyled">
                        {generateInsights().slice(3, 6).map((insight, index) => (
                          <li key={index} className="mb-2">
                            <i className="fas fa-chart-line text-info me-2"></i>
                            <span className="small">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
          
          {!loading && !error && (
            <div className="table-responsive" style={{ borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <table className="table">
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
                      className="sortable-header text-end"
                      onClick={() => handleSort('amount')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort by amount"
                    >
                      Amount <span className="sort-icon">{getSortIcon('amount')}</span>
                    </th>
                    <th 
                      className="text-center"
                      title="Transaction currency"
                    >
                      Currency
                    </th>
                    <th 
                      className="sortable-header text-end"
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
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center">
                        {(Array.isArray(transactions) ? transactions.length : 0) === 0 ? 'No transactions found' : 'No transactions match the current filters'}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map(transaction => (
                      <tr key={transaction.id}>
                        <td>{formatDate(transaction.transaction_date)}</td>
                        <td>{transaction.description}</td>
                        <td>{transaction.payer || '-'}</td>
                        <td className={`text-end ${transaction.amount >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontWeight: '600' }}>
                          {formatCurrency(getTransactionAmount(transaction), getTransactionCurrency(transaction))}
                        </td>
                        <td className="text-center">
                          <span className="badge bg-secondary">{getTransactionCurrency(transaction)}</span>
                        </td>
                        <td className="text-end" style={{ fontWeight: '500' }}>
                          {transaction.balance ? formatCurrency(transaction.balance, getTransactionCurrency(transaction)) : '-'}
                        </td>
                        <td>
                          <span className={`badge ${
                            transaction.transaction_type === 'TRANSFER' ? 'bg-primary' :
                            transaction.transaction_type === 'CARD_PAYMENT' ? 'bg-info' :
                            transaction.transaction_type === 'TOPUP' ? 'bg-success' :
                            transaction.transaction_type === 'CASHBACK' ? 'bg-warning' :
                            'bg-secondary'
                          }`} style={{ fontSize: '11px', fontWeight: '500' }}>
                            {transaction.transaction_type || '-'}
                          </span>
                        </td>
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
                    <label>Year:</label>
                    <select
                      name="year"
                      value={filters.year}
                      onChange={handleFilterChange}
                      className="form-control"
                    >
                      <option value="">All Years</option>
                      {getYearOptions().map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
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

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Import CSV Transactions - {selectedAccountData?.account_name}</h2>
              <button className="close" onClick={closeCsvModal}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '20px' }}>
                <h4>CSV File Requirements:</h4>
                <ul style={{ fontSize: '14px', color: '#666', margin: '10px 0' }}>
                  <li>File must be in CSV format (.csv)</li>
                  <li>Required columns: Date, Description, Amount</li>
                  <li>Optional columns: Balance, Reference, Type</li>
                  <li>Date formats supported: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY</li>
                  <li>Amount: Positive for credits, negative for debits</li>
                </ul>
              </div>

              <div className="form-group">
                <label htmlFor="csv_file">Select CSV File</label>
                <input
                  type="file"
                  id="csv_file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                {csvFile && (
                  <div style={{ marginTop: '8px', color: '#28a745', fontSize: '14px' }}>
                    ✓ Selected: {csvFile.name}
                  </div>
                )}
              </div>

              {importResult && (
                <div style={{ 
                  marginTop: '20px', 
                  padding: '15px', 
                  borderRadius: '4px',
                  backgroundColor: importResult.success ? '#d4edda' : '#f8d7da',
                  border: `1px solid ${importResult.success ? '#c3e6cb' : '#f5c6cb'}`,
                  color: importResult.success ? '#155724' : '#721c24'
                }}>
                  <h4>{importResult.success ? '✅ Import Successful' : '❌ Import Failed'}</h4>
                  <p>{importResult.message}</p>
                  
                  {importResult.success && importResult.importedCount > 0 && (
                    <p><strong>Imported {importResult.importedCount} transactions</strong></p>
                  )}
                  
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div>
                      <p><strong>Errors ({importResult.totalErrors}):</strong></p>
                      <ul style={{ fontSize: '12px', margin: '5px 0' }}>
                        {importResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={closeCsvModal}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleCsvImport}
                  disabled={!csvFile || importingCsv}
                  style={{ opacity: (!csvFile || importingCsv) ? 0.6 : 1 }}
                >
                  {importingCsv ? '⏳ Importing...' : '📄 Import CSV'}
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
