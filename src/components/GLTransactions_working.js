import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GLTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    source: '',
    categoryHeading: '',
    year: '2024',
    transactionType: ''
  });
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
  const [groupByAccount, setGroupByAccount] = useState(true);
  const [groupedTransactions, setGroupedTransactions] = useState({});
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSummaryPanel, setShowSummaryPanel] = useState(true);

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
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h4 className="mb-0">General Ledger Transactions</h4>
                <div>
                  <button
                    className="btn btn-secondary btn-sm me-2"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <i className="fas fa-filter"></i> Filters
                  </button>
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={() => setShowAnalytics(!showAnalytics)}
                  >
                    <i className="fas fa-chart-bar"></i> Analytics
                  </button>
                </div>
              </div>
              <div className="card-body">
                <p>Working version - ready to add complex content</p>
              </div>
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
                >
                </button>
              </div>
              <div className="modal-body">
                <p>Modal content here</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GLTransactions;
