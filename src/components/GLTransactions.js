import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Distinct Color Scheme for Transaction Types (NO RED/GREEN to avoid confusion with Debit/Credit):
// PJ (Payment Journal): bg-primary (blue)
// AJ (Adjustment Journal): bg-info (light blue)
// AP (Accounts Payable): bg-secondary (gray)
// SE (Sales Entry): bg-warning text-dark (yellow)
// CD (Cash Deposit): bg-dark (black)
// PL (Profit & Loss): bg-light text-dark (light gray)
// Unknown: bg-warning text-dark (yellow)
// Opening: bg-info (light blue)
// Change: bg-warning text-dark (yellow)
// Closing: bg-dark (black)

const GLTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showBankTransactionModal, setShowBankTransactionModal] = useState(false);
  const [selectedBankTransaction, setSelectedBankTransaction] = useState(null);
  const [bankTransactions, setBankTransactions] = useState([]);
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

  // Match statistics
  const [matchStats, setMatchStats] = useState({
    totalPJ: 0,
    matchedPJ: 0,
    matchRate: 0
  });

  // Account grouping state
  const [groupByAccount, setGroupByAccount] = useState(true);
  const [groupedTransactions, setGroupedTransactions] = useState({});
  const [expandedAccounts, setExpandedAccounts] = useState({});
  
  // UI state for toggling panels
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);

  // Helper function to check if all accounts are expanded
  const areAllAccountsExpanded = () => {
    return Object.keys(groupedTransactions).every(accountKey => expandedAccounts[accountKey]);
  };

  useEffect(() => {
    fetchTransactions();
    fetchFilterOptions();
    fetchSummaryCounts();
    fetchBankTransactions();
  }, [currentPage, rowsPerPage, sortField, sortDirection, filters]);

  // Calculate match statistics when transactions or bank transactions change
  useEffect(() => {
    if (transactions.length > 0) {
      const stats = calculateMatchStats(transactions);
      setMatchStats(stats);
      console.log('Match Statistics:', stats);
    }
  }, [transactions, bankTransactions]);

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

      const response = await axios.get(`/api/gl-transactions?${params}`, {
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
      const response = await axios.get('/api/gl-transactions/filter-options', {
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

  // Fetch bank transactions for matching
  const fetchBankTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('/api/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBankTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Error fetching bank transactions:', error);
    }
  };

  // Find matching bank transaction for a GL transaction
  const findMatchingBankTransaction = (glTransaction) => {
    if (glTransaction.source !== 'PJ') return null;
    
    // Match by amount and date
    const glAmount = Math.abs(glTransaction.debit || glTransaction.credit || 0);
    const glDate = glTransaction.date;
    
    return bankTransactions.find(bankTx => {
      const bankAmount = Math.abs(bankTx.amount || 0);
      const bankDate = bankTx.transaction_date || bankTx.date;
      
      // Match by amount (within 0.01 tolerance) and date
      return Math.abs(glAmount - bankAmount) < 0.01 && 
             glDate === bankDate;
    });
  };

  // Calculate match statistics
  const calculateMatchStats = (glTransactions) => {
    const pjTransactions = glTransactions.filter(tx => tx.source === 'PJ');
    const matchedPJ = pjTransactions.filter(tx => findMatchingBankTransaction(tx)).length;
    
    return {
      totalPJ: pjTransactions.length,
      matchedPJ: matchedPJ,
      matchRate: pjTransactions.length > 0 ? (matchedPJ / pjTransactions.length) * 100 : 0
    };
  };

  // Handle bank transaction click
  const handleBankTransactionClick = (bankTransaction) => {
    setSelectedBankTransaction(bankTransaction);
    setShowBankTransactionModal(true);
  };

  // Navigate to transactions page with specific transaction
  const viewInContext = (bankTransaction) => {
    // Store the transaction ID in sessionStorage for the transactions page to find
    sessionStorage.setItem('highlightTransactionId', bankTransaction.id);
    // Navigate to transactions page
    window.location.href = '/transactions';
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

      const response = await axios.get(`/api/gl-transactions/summary-counts?${params.toString()}`, {
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

  // Get transaction type breakdown for an account (excluding summary rows)
  const getTransactionTypeBreakdown = (transactions) => {
    const breakdown = {
      PJ: 0,
      AJ: 0,
      AP: 0,
      SE: 0,
      CD: 0,
      PL: 0,
      Unknown: 0
    };

    // Filter out summary rows (Opening, Change, Closing) and invalid transactions
    const actualTransactions = transactions.filter(transaction => 
      transaction.reference !== 'Opening' && 
      transaction.reference !== 'Change' && 
      transaction.reference !== 'Closing' &&
      transaction.source !== 'N/A' &&
      transaction.source !== null &&
      transaction.source !== undefined
      // Allow empty strings to be counted as Unknown
    );

    actualTransactions.forEach(transaction => {
      const source = transaction.source;
      // Handle empty strings, null, undefined as Unknown
      if (!source || source === '') {
        breakdown.Unknown++;
      } else if (breakdown.hasOwnProperty(source)) {
        breakdown[source]++;
      } else {
        breakdown.Unknown++;
      }
    });

    return breakdown;
  };

  // Group transactions by account and calculate totals
  const groupTransactionsByAccount = (transactions) => {
    const grouped = {};
    
    // Define mapping of GL accounts to related transaction patterns
    const accountMappings = {
      '172C00 Airbnb': [
        '683B00 Revolut - Airbnb',
        'Money added from AIRBNB PAYMENTS',
        'Revolut.*Airbnb',
        'reverse opening debtor - airbnb'
      ],
      '207C00 Hosting Fee\'s': [
        'hosting',
        'Hosting'
      ],
      '210C00 Contancy Services': [
        'consultancy',
        'Consultancy',
        'To Niall Crotty',
        'To Dwayne O\'Sullivan',
        'To YOURCITYCOHOST LIMITED'
      ],
      '243C00 Rent': [
        'being rent chg for year',
        'rent',
        'Rent'
      ],
      '300C01 Directors Salaries': [
        'salary',
        'Salary',
        'Wages',
        'Directors current Account'
      ]
    };
    
    // First, group all transactions by their actual names
    const allGrouped = {};
    transactions.forEach(transaction => {
      const accountKey = transaction.name || 'Uncategorized';
      
      if (!allGrouped[accountKey]) {
        allGrouped[accountKey] = {
          accountName: accountKey,
          transactions: [],
          openingBalance: 0,
          closingBalance: 0,
          totalDebits: 0,
          totalCredits: 0,
          netChange: 0
        };
      }
      
      allGrouped[accountKey].transactions.push(transaction);
      
      // Calculate totals - EXCLUDE summary rows (Opening, Change, Closing)
      const isSummaryRow = transaction.reference === 'Opening' || 
                          transaction.reference === 'Change' || 
                          transaction.reference === 'Closing';
      
      if (!isSummaryRow) {
        const debit = parseFloat(transaction.debit) || 0;
        const credit = parseFloat(transaction.credit) || 0;
        
        allGrouped[accountKey].totalDebits += debit;
        allGrouped[accountKey].totalCredits += credit;
        allGrouped[accountKey].netChange += (debit - credit);
      }
    });
    
    // Now create GL accounts and map related transactions
    Object.keys(accountMappings).forEach(glAccount => {
      const patterns = accountMappings[glAccount];
      grouped[glAccount] = {
        accountName: glAccount,
        transactions: [],
        openingBalance: 0,
        closingBalance: 0,
        totalDebits: 0,
        totalCredits: 0,
        netChange: 0
      };
      
      // Find and add matching transactions
      Object.keys(allGrouped).forEach(accountKey => {
        const isMatch = patterns.some(pattern => {
          if (pattern.includes('.*')) {
            // Regex pattern
            const regex = new RegExp(pattern, 'i');
            return regex.test(accountKey);
          } else {
            // Simple string match
            return accountKey.toLowerCase().includes(pattern.toLowerCase());
          }
        });
        
        if (isMatch) {
          const account = allGrouped[accountKey];
          grouped[glAccount].transactions.push(...account.transactions);
          grouped[glAccount].totalDebits += account.totalDebits;
          grouped[glAccount].totalCredits += account.totalCredits;
          grouped[glAccount].netChange += account.netChange;
        }
      });
      
      // Add the original GL account transaction if it exists
      if (allGrouped[glAccount]) {
        grouped[glAccount].transactions.push(...allGrouped[glAccount].transactions);
        grouped[glAccount].totalDebits += allGrouped[glAccount].totalDebits;
        grouped[glAccount].totalCredits += allGrouped[glAccount].totalCredits;
        grouped[glAccount].netChange += allGrouped[glAccount].netChange;
      }
    });
    
    // Add any remaining accounts that don't match GL structure
    Object.keys(allGrouped).forEach(accountKey => {
      const isGLAccount = Object.keys(accountMappings).includes(accountKey);
      if (!isGLAccount) {
        grouped[accountKey] = allGrouped[accountKey];
      }
    });
    
    // Calculate opening and closing balances
    Object.keys(grouped).forEach(accountKey => {
      const account = grouped[accountKey];
      
      // Sort transactions by date to maintain proper order
      account.transactions.sort((a, b) => {
        const dateA = new Date(a.date || '1900-01-01');
        const dateB = new Date(b.date || '1900-01-01');
        return dateA - dateB;
      });
      
      // Recalculate totals excluding summary rows to ensure accuracy
      account.totalDebits = 0;
      account.totalCredits = 0;
      account.netChange = 0;
      
      account.transactions.forEach(transaction => {
        const isSummaryRow = transaction.reference === 'Opening' || 
                            transaction.reference === 'Change' || 
                            transaction.reference === 'Closing';
        
        if (!isSummaryRow) {
          const debit = parseFloat(transaction.debit) || 0;
          const credit = parseFloat(transaction.credit) || 0;
          
          account.totalDebits += debit;
          account.totalCredits += credit;
          account.netChange += (debit - credit);
        }
      });
      
      // For now, we'll set opening to 0 and closing to net change
      // In a real GL, opening would come from previous year's closing
      account.openingBalance = 0;
      account.closingBalance = account.netChange;
    });
    
    // Extract account codes and sort by them
    const accountCodes = {};
    const accountsWithoutCodes = {};
    
    Object.keys(grouped).forEach(accountKey => {
      const account = grouped[accountKey];
      if (account) {
        // Extract account code (e.g., '172C00' from '172C00 Airbnb')
        const match = accountKey.match(/^(\d+[A-Z]\d+)\s+(.*)/);
        if (match) {
          const code = match[1];
          accountCodes[code] = accountKey;
        } else {
          // Handle accounts without codes - store separately
          accountsWithoutCodes[accountKey] = accountKey;
        }
      }
    });
    
    // Sort account codes first, then add accounts without codes
    const sortedCodes = Object.keys(accountCodes).sort();
    const sortedAccountsWithoutCodes = Object.keys(accountsWithoutCodes).sort();
    
    const filteredGrouped = {};
    
    // Add accounts with codes first (in sorted order)
    sortedCodes.forEach(code => {
      const accountKey = accountCodes[code];
      filteredGrouped[accountKey] = grouped[accountKey];
    });
    
    // Add accounts without codes at the end (in alphabetical order)
    sortedAccountsWithoutCodes.forEach(accountKey => {
      filteredGrouped[accountKey] = grouped[accountKey];
    });
    
    return filteredGrouped;
  };

  // Fetch all transactions for grouping (separate from paginated view)
  const fetchAllTransactionsForGrouping = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`/api/gl-transactions?per_page=10000&year=${filters.year}&sort_field=id&sort_direction=asc`, {
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
    <>
      <div className="container-fluid mt-4">
      <style>{`
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
                        <div className="d-flex align-items-center justify-content-between flex-wrap">
                          <div>
                            <small className="text-muted">Total Transactions</small>
                            <div className="fw-bold">{summaryCounts.total}</div>
                          </div>
                          <div className="d-flex justify-content-between flex-wrap" style={{ flex: '1', maxWidth: '70%', gap: '8px' }}>
                            <div className="text-center">
                              <small className="badge bg-primary text-white px-2 py-1 fw-bold" style={{ fontSize: '0.75rem', borderRadius: '12px' }}>PJ</small>
                              <div className="fw-bold text-primary mt-1" style={{ fontSize: '0.8rem' }}>
                                {summaryCounts.pj}
                              </div>
                            </div>
                            <div className="text-center">
                              <small className="badge bg-info text-white px-2 py-1 fw-bold" style={{ fontSize: '0.75rem', borderRadius: '12px' }}>AJ</small>
                              <div className="fw-bold text-info mt-1" style={{ fontSize: '0.8rem' }}>
                                {summaryCounts.aj}
                              </div>
                            </div>
                            <div className="text-center">
                              <small className="badge bg-secondary text-white px-2 py-1 fw-bold" style={{ fontSize: '0.75rem', borderRadius: '12px' }}>AP</small>
                              <div className="fw-bold text-secondary mt-1" style={{ fontSize: '0.8rem' }}>
                                {summaryCounts.ap || 0}
                              </div>
                            </div>
                            <div className="text-center">
                              <small className="badge bg-warning text-dark px-2 py-1 fw-bold" style={{ fontSize: '0.75rem', borderRadius: '12px' }}>SE</small>
                              <div className="fw-bold text-warning mt-1" style={{ fontSize: '0.8rem' }}>
                                {summaryCounts.se || 0}
                              </div>
                            </div>
                            <div className="text-center">
                              <small className="badge bg-dark text-white px-2 py-1 fw-bold" style={{ fontSize: '0.75rem', borderRadius: '12px' }}>CD</small>
                              <div className="fw-bold text-dark mt-1" style={{ fontSize: '0.8rem' }}>
                                {summaryCounts.cd || 0}
                              </div>
                            </div>
                            <div className="text-center">
                              <small className="badge bg-light text-dark px-2 py-1 fw-bold" style={{ fontSize: '0.75rem', borderRadius: '12px' }}>PL</small>
                              <div className="fw-bold text-dark mt-1" style={{ fontSize: '0.8rem' }}>
                                {summaryCounts.pl || 0}
                              </div>
                            </div>
                            <div className="text-center">
                              <small className="badge bg-warning text-dark px-2 py-1 fw-bold" style={{ fontSize: '0.75rem', borderRadius: '12px' }}>Unknown</small>
                              <div className="fw-bold text-warning mt-1" style={{ fontSize: '0.8rem' }}>
                                {summaryCounts.other || 0}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Detailed Legend */}
                        {/* Match Statistics */}
                        <div className="row mt-3">
                          <div className="col-12">
                            <div className="border-top pt-2">
                              <small className="text-muted fw-bold">PJ Transaction Matching:</small>
                              <div className="row mt-2">
                                <div className="col-md-4">
                                  <div className="text-center">
                                    <div className="h5 fw-bold text-primary">{matchStats.totalPJ}</div>
                                    <small className="text-muted">Total PJ Transactions</small>
                                  </div>
                                </div>
                                <div className="col-md-4">
                                  <div className="text-center">
                                    <div className="h5 fw-bold text-success">{matchStats.matchedPJ}</div>
                                    <small className="text-muted">Successfully Matched</small>
                                  </div>
                                </div>
                                <div className="col-md-4">
                                  <div className="text-center">
                                    <div className="h5 fw-bold text-info">{matchStats.matchRate.toFixed(1)}%</div>
                                    <small className="text-muted">Match Rate</small>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="row mt-3">
                          <div className="col-12">
                            <div className="border-top pt-2">
                              <small className="text-muted fw-bold">Transaction Type Legend:</small>
                              <div className="row mt-2">
                                <div className="col-md-4 mb-2">
                                  <span className="badge bg-primary me-1">PJ</span>
                                  <small className="text-muted">Payment Journal (Bank Transactions)</small>
                                </div>
                                <div className="col-md-4 mb-2">
                                  <span className="badge bg-info me-1">AJ</span>
                                  <small className="text-muted">Adjustment Journal (Non-cash)</small>
                                </div>
                                <div className="col-md-4 mb-2">
                                  <span className="badge bg-secondary me-1">AP</span>
                                  <small className="text-muted">Accounts Payable</small>
                                </div>
                                <div className="col-md-4 mb-2">
                                  <span className="badge bg-warning text-dark me-1">SE</span>
                                  <small className="text-muted">Sales Entry (Revenue)</small>
                                </div>
                                <div className="col-md-4 mb-2">
                                  <span className="badge bg-dark me-1">CD</span>
                                  <small className="text-muted">Cash Deposit</small>
                                </div>
                                <div className="col-md-4 mb-2">
                                  <span className="badge bg-light text-dark me-1">PL</span>
                                  <small className="text-muted">Profit & Loss</small>
                                </div>
                                <div className="col-md-4 mb-2">
                                  <span className="badge bg-warning text-dark me-1">Unknown</span>
                                  <small className="text-muted">Uncategorized transactions</small>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* GL Summary Panel */}
              <div className="row mb-3">
                <div className="col-12">
                  <div className="card shadow">
                    <div 
                      className="card-header d-flex justify-content-between align-items-center py-2" 
                      style={{ 
                        backgroundColor: '#1e3a8a', 
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                      onClick={() => setShowSummaryPanel(!showSummaryPanel)}
                    >
                      <h6 className="mb-0 text-white fw-bold">
                        <i className="fas fa-calculator me-2"></i>
                        General Ledger Summary
                      </h6>
                      <i className={`fas fa-chevron-${showSummaryPanel ? 'up' : 'down'} text-white`}></i>
                    </div>
                    {showSummaryPanel && (
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
                        <div className="row mt-3">
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
                        <div className="row mt-2">
                          <div className="col-12 text-center">
                            <small className="text-muted">
                              Summary based on {Object.keys(groupedTransactions).length} account{Object.keys(groupedTransactions).length !== 1 ? 's' : ''} 
                              {filters.year && ` for ${filters.year}`}
                            </small>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

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
                    {groupByAccount && (
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                          const allExpanded = {};
                          const allCollapsed = {};
                          const isAllExpanded = areAllAccountsExpanded();
                          
                          if (isAllExpanded) {
                            // Collapse all
                            setExpandedAccounts(allCollapsed);
                          } else {
                            // Expand all
                            Object.keys(groupedTransactions).forEach(accountKey => {
                              allExpanded[accountKey] = true;
                            });
                            setExpandedAccounts(allExpanded);
                          }
                        }}
                        title={areAllAccountsExpanded() ? 
                          "Collapse all accounts" : "Expand all accounts"}
                      >
                        <i className={`fas ${areAllAccountsExpanded() ? 
                          'fa-compress-arrows-alt' : 'fa-expand-arrows-alt'}`}></i> 
                        {areAllAccountsExpanded() ? 
                          'Collapse All' : 'Expand All'}
                      </button>
                    )}
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <div className="d-flex align-items-center gap-2">
                        <i className="fas fa-search text-muted"></i>
                        <div className="position-relative" style={{ width: '200px' }}>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Search transactions..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            style={{ paddingRight: '30px' }}
                          />
                          {filters.search && (
                            <button
                              type="button"
                              className="btn btn-sm position-absolute"
                              style={{
                                right: '5px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                padding: '2px 6px',
                                border: 'none',
                                background: 'transparent',
                                color: '#6c757d',
                                fontSize: '12px'
                              }}
                              onClick={() => handleFilterChange('search', '')}
                              title="Clear search"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          )}
                        </div>
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
                      // Calculate actual transaction count (excluding summary rows and invalid transactions)
                      const actualTransactions = account.transactions.filter(transaction => 
                        transaction.reference !== 'Opening' && 
                        transaction.reference !== 'Change' && 
                        transaction.reference !== 'Closing' &&
                        transaction.source !== 'N/A' &&
                        transaction.source !== null &&
                        transaction.source !== undefined
                        // Allow empty strings to be counted as Unknown
                      );
                      const transactionCount = actualTransactions.length;
                      
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
                    const badgeClass = type === 'PJ' ? 'bg-primary text-white' :
                                     type === 'AJ' ? 'bg-info text-white' :
                                     type === 'AP' ? 'bg-secondary text-white' :
                                     type === 'SE' ? 'bg-warning text-dark' :
                                     type === 'CD' ? 'bg-dark text-white' :
                                     type === 'PL' ? 'bg-light text-dark' :
                                     type === 'Unknown' ? 'bg-warning text-dark' :
                                     'bg-light text-dark';
                    
                    const displayName = type === 'Unknown' ? 'Unknown' : type;
                    const tooltip = type === 'AP' ? 'AP - Accounts Payable: Money owed to suppliers/vendors' :
                                   type === 'SE' ? 'SE - Sales Entry: Revenue from sales transactions' :
                                   type === 'CD' ? 'CD - Cash Deposit: Money deposited into accounts' :
                                   type === 'PL' ? 'PL - Profit & Loss: Income statement adjustments' :
                                   type === 'Unknown' ? 'Unknown: Transactions that don\'t fit standard categories' :
                                   `${type}: ${count} transaction${count !== 1 ? 's' : ''}`;
                    
                    badges.push(
                      <span
                        key={type}
                        className={`badge ${badgeClass} px-2 py-1 fw-bold`}
                        style={{ fontSize: '0.7rem', borderRadius: '12px' }}
                        title={tooltip}
                      >
                        {displayName}: {count}
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
                                    <thead style={{ backgroundColor: '#212529' }}>
                                      <tr>
                                        <th style={{ 
                                          color: '#ffffff !important', 
                                          backgroundColor: '#212529 !important',
                                          fontWeight: 'bold',
                                          padding: '12px 8px',
                                          fontSize: '14px',
                                          textAlign: 'center'
                                        }}>ID</th>
                                        <th style={{ 
                                          color: '#ffffff !important', 
                                          backgroundColor: '#212529 !important',
                                          fontWeight: 'bold',
                                          padding: '12px 8px',
                                          fontSize: '14px',
                                          textAlign: 'center'
                                        }}>Date</th>
                                        <th style={{ 
                                          color: '#ffffff !important', 
                                          backgroundColor: '#212529 !important',
                                          fontWeight: 'bold',
                                          padding: '12px 8px',
                                          fontSize: '14px',
                                          textAlign: 'center'
                                        }}>Description</th>
                                        <th style={{ 
                                          color: '#ffffff !important', 
                                          backgroundColor: '#212529 !important',
                                          fontWeight: 'bold',
                                          padding: '12px 8px',
                                          fontSize: '14px',
                                          textAlign: 'center'
                                        }}>Reference</th>
                                        <th style={{ 
                                          color: '#ffffff !important', 
                                          backgroundColor: '#212529 !important',
                                          fontWeight: 'bold',
                                          padding: '12px 8px',
                                          fontSize: '14px',
                                          textAlign: 'center'
                                        }}>Type</th>
                                        <th style={{ 
                                          color: '#ffffff !important', 
                                          backgroundColor: '#212529 !important',
                                          fontWeight: 'bold',
                                          padding: '12px 8px',
                                          fontSize: '14px',
                                          textAlign: 'center'
                                        }}>Amount</th>
                                        <th style={{ 
                                          color: '#ffffff !important', 
                                          backgroundColor: '#212529 !important',
                                          fontWeight: 'bold',
                                          padding: '12px 8px',
                                          fontSize: '14px',
                                          textAlign: 'center'
                                        }}>D/C</th>
                                        <th style={{ 
                                          color: '#ffffff !important', 
                                          backgroundColor: '#212529 !important',
                                          fontWeight: 'bold',
                                          padding: '12px 8px',
                                          fontSize: '14px',
                                          textAlign: 'center'
                                        }}>Year</th>
                                        <th style={{ 
                                          color: '#ffffff !important', 
                                          backgroundColor: '#212529 !important',
                                          fontWeight: 'bold',
                                          padding: '12px 8px',
                                          fontSize: '14px',
                                          whiteSpace: 'normal',
                                          wordWrap: 'break-word',
                                          maxWidth: '150px',
                                          textAlign: 'center'
                                        }} title="Bank Transaction ID">Bank Transaction ID</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {/* Opening Row */}
                                      <tr style={{ backgroundColor: '#e9ecef' }}>
                                        <td style={{ backgroundColor: '#e9ecef' }}><code className="text-muted small">-</code></td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>N/A</td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <div className="fw-bold">{account.accountName}</div>
                                        </td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <code className="small text-dark">Opening</code>
                                        </td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <span className="badge bg-info text-white px-3 py-2 fw-bold" style={{ borderRadius: '15px', fontSize: '0.75rem' }}>
                                            Opening
                                          </span>
                                        </td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <span className="fw-bold text-muted">
                                            {formatCurrency(account.openingBalance)}
                                          </span>
                                        </td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <span className="badge bg-info text-white px-3 py-2 fw-bold" style={{ borderRadius: '15px', fontSize: '0.75rem' }}>
                                            Opening
                                          </span>
                                        </td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <span className="badge bg-primary text-white px-3 py-2 fw-bold" style={{ borderRadius: '15px', fontSize: '0.75rem' }}>
                                            {filters.year || 'N/A'}
                                          </span>
                                        </td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <span className="text-muted small">-</span>
                                        </td>
                                      </tr>
                                      
                                      {account.transactions
                                        .filter(transaction => 
                                          transaction.reference !== 'Opening' && 
                                          transaction.reference !== 'Change' && 
                                          transaction.reference !== 'Closing' &&
                                          transaction.source !== 'N/A' &&
                                          transaction.source !== null &&
                                          transaction.source !== undefined
                                        )
                                        .map((transaction, index) => {
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
                                                transaction.source === 'AJ' ? 'bg-info text-white' :
                                                transaction.source === 'PJ' ? 'bg-primary text-white' :
                                                transaction.source === 'AP' ? 'bg-secondary text-white' :
                                                transaction.source === 'SE' ? 'bg-warning text-dark' :
                                                transaction.source === 'CD' ? 'bg-dark text-white' :
                                                transaction.source === 'PL' ? 'bg-light text-dark' :
                                                'bg-warning text-dark'
                                              }`} style={{ borderRadius: '15px', fontSize: '0.75rem' }}>
                                                {transaction.source === 'AJ' ? 'AJ' :
                                                 transaction.source === 'PJ' ? 'PJ' :
                                                 transaction.source === 'AP' ? 'AP' :
                                                 transaction.source === 'SE' ? 'SE' :
                                                 transaction.source === 'CD' ? 'CD' :
                                                 transaction.source === 'PL' ? 'PL' :
                                                 transaction.source || 'Unknown'}
                                              </span>
                                            </td>
                                            <td>
                                              <span className={`fw-bold ${
                                                type === 'debit' ? 'text-danger' : 
                                                type === 'credit' ? 'text-success' : 
                                                'text-muted'
                                              }`}>
                                                {type === 'none' ? '' : (type === 'debit' ? '-' : '+')}{formatCurrency(amount)}
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
                                            <td>
                                              {(() => {
                                                const matchingBankTx = findMatchingBankTransaction(transaction);
                                                if (matchingBankTx) {
                                                  return (
                                                    <button
                                                      className="btn btn-link btn-sm p-0 text-primary"
                                                      onClick={() => handleBankTransactionClick(matchingBankTx)}
                                                      style={{ textDecoration: 'underline', fontSize: '0.8rem' }}
                                                    >
                                                      {matchingBankTx.id}
                                                    </button>
                                                  );
                                                }
                                                return <span className="text-muted small">-</span>;
                                              })()}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                      
                                      {/* Change Row */}
                                      <tr style={{ backgroundColor: '#e9ecef' }}>
                                        <td style={{ backgroundColor: '#e9ecef' }}><code className="text-muted small">-</code></td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>N/A</td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <div className="fw-bold">Change</div>
                                        </td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <code className="small text-dark">Change</code>
                                        </td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <span className="badge bg-warning text-dark px-3 py-2 fw-bold" style={{ borderRadius: '15px', fontSize: '0.75rem' }}>
                                            Change
                                          </span>
                                        </td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <span className={`fw-bold ${
                                            account.netChange >= 0 ? 'text-success' : 'text-danger'
                                          }`}>
                                            {account.netChange >= 0 ? '+' : ''}{formatCurrency(account.netChange)}
                                          </span>
                                        </td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <span className="badge bg-warning text-dark px-3 py-2 fw-bold" style={{ borderRadius: '15px', fontSize: '0.75rem' }}>
                                            Change
                                          </span>
                                        </td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <span className="badge bg-primary text-white px-3 py-2 fw-bold" style={{ borderRadius: '15px', fontSize: '0.75rem' }}>
                                            {filters.year || 'N/A'}
                                          </span>
                                        </td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <span className="text-muted small">-</span>
                                        </td>
                                      </tr>
                                      
                                      {/* Closing Row */}
                                      <tr style={{ backgroundColor: '#e9ecef' }}>
                                        <td style={{ backgroundColor: '#e9ecef' }}><code className="text-muted small">-</code></td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>N/A</td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <div className="fw-bold">Close</div>
                                        </td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <code className="small text-dark">Close</code>
                                        </td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <span className="badge bg-dark text-white px-3 py-2 fw-bold" style={{ borderRadius: '15px', fontSize: '0.75rem' }}>
                                            Closing
                                          </span>
                                        </td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <span className="fw-bold text-muted">
                                            {formatCurrency(account.closingBalance)}
                                          </span>
                                        </td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <span className="badge bg-dark text-white px-3 py-2 fw-bold" style={{ borderRadius: '15px', fontSize: '0.75rem' }}>
                                            Closing
                                          </span>
                                        </td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <span className="badge bg-primary text-white px-3 py-2 fw-bold" style={{ borderRadius: '15px', fontSize: '0.75rem' }}>
                                            {filters.year || 'N/A'}
                                          </span>
                                        </td>
                                        <td style={{ backgroundColor: '#e9ecef' }}>
                                          <span className="text-muted small">-</span>
                                        </td>
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
                        <th style={{ textAlign: 'center' }}>ID</th>
                        <th 
                          className="cursor-pointer"
                          onClick={() => handleSort('date')}
                          style={{ textAlign: 'center' }}
                        >
                          Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="cursor-pointer"
                          onClick={() => handleSort('name')}
                          style={{ textAlign: 'center' }}
                        >
                          Description {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th style={{ textAlign: 'center' }}>Reference</th>
                        <th style={{ textAlign: 'center' }}>Type</th>
                        <th style={{ textAlign: 'center' }}>Account</th>
                        <th 
                          className="cursor-pointer"
                          onClick={() => handleSort('amount')}
                          style={{ textAlign: 'center' }}
                        >
                          Amount {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th style={{ textAlign: 'center' }}>D/C</th>
                        <th style={{ textAlign: 'center' }}>Year</th>
                        <th style={{ whiteSpace: 'normal', wordWrap: 'break-word', maxWidth: '150px', textAlign: 'center' }} title="Bank Transaction ID">Bank Transaction ID</th>
                        <th style={{ textAlign: 'center' }}>File</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="11" className="text-center">
                            <div className="spinner-border" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                          </td>
                        </tr>
                      ) : transactions.length === 0 ? (
                        <tr>
                          <td colSpan="11" className="text-center text-muted">
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
                                  transaction.source === 'AJ' ? 'bg-info text-white' :
                                  transaction.source === 'PJ' ? 'bg-primary text-white' :
                                  transaction.source === 'AP' ? 'bg-secondary text-white' :
                                  transaction.source === 'SE' ? 'bg-warning text-dark' :
                                  transaction.source === 'CD' ? 'bg-dark text-white' :
                                  transaction.source === 'PL' ? 'bg-light text-dark' :
                                  'bg-warning text-dark'
                                }`} title={
                                  transaction.source === 'AJ' ? 'Adjustment Journal' :
                                  transaction.source === 'PJ' ? 'Payment Journal' :
                                  'Unknown Type'
                                }>
                                  {transaction.source === 'AJ' ? 'AJ' :
                                   transaction.source === 'PJ' ? 'PJ' :
                                   transaction.source === 'AP' ? 'AP' :
                                   transaction.source === 'SE' ? 'SE' :
                                   transaction.source === 'CD' ? 'CD' :
                                   transaction.source === 'PL' ? 'PL' :
                                   transaction.source || 'Unknown'}
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
                                  {type === 'none' ? '' : (type === 'debit' ? '-' : '+')}{formatCurrency(amount)}
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
                                {(() => {
                                  const matchingBankTx = findMatchingBankTransaction(transaction);
                                  if (matchingBankTx) {
                                    return (
                                      <button
                                        className="btn btn-link btn-sm p-0 text-primary"
                                        onClick={() => handleBankTransactionClick(matchingBankTx)}
                                        style={{ textDecoration: 'underline', fontSize: '0.8rem' }}
                                      >
                                        {matchingBankTx.id}
                                      </button>
                                    );
                                  }
                                  return <span className="text-muted small">-</span>;
                                })()}
                              </td>
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

      {/* Bank Transaction Modal */}
      {showBankTransactionModal && selectedBankTransaction && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-university me-2"></i>
                  Bank Transaction Details
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowBankTransactionModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="table-responsive">
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <td className="text-muted fw-bold">Transaction ID:</td>
                        <td><code>{selectedBankTransaction.id}</code></td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-bold">Date:</td>
                        <td>{selectedBankTransaction.transaction_date || selectedBankTransaction.date || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-bold">Description:</td>
                        <td>{selectedBankTransaction.description || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-bold">Amount:</td>
                        <td>
                          <span className={`fw-bold ${
                            selectedBankTransaction.amount < 0 ? 'text-danger' : 'text-success'
                          }`}>
                            {selectedBankTransaction.amount ? 
                              new Intl.NumberFormat('en-EU', {
                                style: 'currency',
                                currency: 'EUR'
                              }).format(selectedBankTransaction.amount) : 'N/A'
                            }
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-bold">Balance:</td>
                        <td>
                          {selectedBankTransaction.balance ? 
                            new Intl.NumberFormat('en-EU', {
                              style: 'currency',
                              currency: 'EUR'
                            }).format(selectedBankTransaction.balance) : 'N/A'
                          }
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-bold">Type:</td>
                        <td>
                          <span className={`badge ${
                            selectedBankTransaction.amount < 0 ? 'bg-danger' : 'bg-success'
                          } text-white`}>
                            {selectedBankTransaction.amount < 0 ? 'DEBIT' : 'CREDIT'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-bold">Reference:</td>
                        <td>{selectedBankTransaction.reference || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-bold">Category:</td>
                        <td>{selectedBankTransaction.category || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => viewInContext(selectedBankTransaction)}
                >
                  <i className="fas fa-external-link-alt me-2"></i>
                  View in Context
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowBankTransactionModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default GLTransactions;
