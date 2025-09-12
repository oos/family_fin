import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';

const TransactionMatching = () => {
  const [taxReturns, setTaxReturns] = useState([]);
  const [selectedTaxReturn, setSelectedTaxReturn] = useState(null);
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [autoMatches, setAutoMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [matching, setMatching] = useState(false);
  const [updatingCategory, setUpdatingCategory] = useState(false);
  const [showAutoMatches, setShowAutoMatches] = useState(false);
  const [sortField, setSortField] = useState('matchPercentage');
  const [sortDirection, setSortDirection] = useState('desc');
  const [categoryInputs, setCategoryInputs] = useState({});
  const [skippedMatches, setSkippedMatches] = useState(new Set());
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [visibleRows, setVisibleRows] = useState(100); // Show only first 100 rows initially

  useEffect(() => {
    fetchTaxReturns();
  }, []);

  const fetchTaxReturns = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/tax-returns', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTaxReturns(response.data);
    } catch (err) {
      console.error('Error fetching tax returns:', err);
      setError(`Failed to load tax returns: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchPotentialMatches = async (taxReturnId) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/tax-returns/${taxReturnId}/match-transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPotentialMatches(response.data.potential_matches);
      
      // Show message if auto-matches were created
      if (response.data.auto_matched_count > 0) {
        alert(`🎉 Automatically matched ${response.data.auto_matched_count} high-confidence transactions!`);
        // Fetch auto-matches for category assignment
        fetchAutoMatches(taxReturnId);
      }
    } catch (err) {
      console.error('Error fetching potential matches:', err);
      setError(`Failed to load potential matches: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAutoMatches = async (taxReturnId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/tax-returns/${taxReturnId}/auto-matches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAutoMatches(response.data.auto_matches);
      setShowAutoMatches(true);
    } catch (err) {
      console.error('Error fetching auto matches:', err);
    }
  };

  const handleTaxReturnSelect = (taxReturn) => {
    setSelectedTaxReturn(taxReturn);
    fetchPotentialMatches(taxReturn.id);
    fetchAutoMatches(taxReturn.id);
  };

  const handleRefreshMatching = () => {
    if (selectedTaxReturn) {
      fetchPotentialMatches(selectedTaxReturn.id);
      fetchAutoMatches(selectedTaxReturn.id);
    }
  };

  const handleCreateMatch = async (taxTransactionId, bankTransactionId, confidence, category) => {
    setMatching(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/transaction-matches', {
        tax_return_transaction_id: taxTransactionId,
        bank_transaction_id: bankTransactionId,
        match_method: 'manual',
        confidence_score: confidence,
        accountant_category: category
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Match created successfully!');
      
      // Refresh potential matches
      if (selectedTaxReturn) {
        fetchPotentialMatches(selectedTaxReturn.id);
      }
    } catch (err) {
      console.error('Error creating match:', err);
      setError(`Failed to create match: ${err.response?.data?.message || err.message}`);
    } finally {
      setMatching(false);
    }
  };

  const handleUpdateCategory = async (matchId, category) => {
    setUpdatingCategory(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`/transaction-matches/${matchId}/category`, {
        category: category
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Category updated successfully!');
      
      // Remove from auto-matches list
      setAutoMatches(prev => prev.filter(match => match.match_id !== matchId));
      
      // Refresh auto-matches if there are more
      if (selectedTaxReturn && autoMatches.length > 1) {
        fetchAutoMatches(selectedTaxReturn.id);
      }
    } catch (err) {
      console.error('Error updating category:', err);
      setError(`Failed to update category: ${err.response?.data?.message || err.message}`);
    } finally {
      setUpdatingCategory(false);
    }
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount).toLocaleString('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'bg-success';
    if (confidence >= 0.6) return 'bg-warning';
    return 'bg-danger';
  };

  // Helper functions for table functionality
  const getTotalPotentialMatches = () => {
    return potentialMatches.reduce((total, match) => total + match.potential_matches.length, 0);
  };

  const getSortedMatches = useMemo(() => {
    // Create a comprehensive list of ALL tax transactions with their potential matches
    const allMatches = [];
    
    potentialMatches.forEach(match => {
      const taxTransaction = match.tax_transaction;
      
      if (match.potential_matches && match.potential_matches.length > 0) {
        // This tax transaction has potential matches - show each match as a row
        match.potential_matches.forEach(potentialMatch => {
          const key = `${taxTransaction.id}-${potentialMatch.bank_transaction.id}`;
          if (!skippedMatches.has(key)) {
            allMatches.push({
              taxId: taxTransaction.id,
              bankId: potentialMatch.bank_transaction.id,
              taxName: taxTransaction.name,
              taxAmount: taxTransaction.debit || -taxTransaction.credit,
              taxType: taxTransaction.debit > 0 ? 'Debit' : 'Credit',
              taxDate: taxTransaction.date,
              taxReference: taxTransaction.reference,
              taxSource: taxTransaction.source,
              bankDescription: potentialMatch.bank_transaction.description,
              bankAmount: potentialMatch.bank_transaction.amount,
              bankType: potentialMatch.bank_transaction.transaction_type,
              bankDate: potentialMatch.bank_transaction.transaction_date,
              bankReference: potentialMatch.bank_transaction.reference,
              bankAccount: potentialMatch.bank_transaction.account,
              bankMcc: potentialMatch.bank_transaction.mcc,
              confidence: potentialMatch.confidence,
              amountSimilarity: potentialMatch.amount_similarity,
              dateSimilarity: potentialMatch.date_similarity,
              descriptionSimilarity: potentialMatch.description_similarity,
              referenceSimilarity: potentialMatch.reference_similarity,
              category: categoryInputs[`${taxTransaction.id}-${potentialMatch.bank_transaction.id}`] || '',
              hasMatches: true
            });
          }
        });
      } else {
        // This tax transaction has NO potential matches - show it as a single row
        allMatches.push({
          taxId: taxTransaction.id,
          bankId: null,
          taxName: taxTransaction.name,
          taxAmount: taxTransaction.debit || -taxTransaction.credit,
          taxType: taxTransaction.debit > 0 ? 'Debit' : 'Credit',
          taxDate: taxTransaction.date,
          taxReference: taxTransaction.reference,
          taxSource: taxTransaction.source,
          bankDescription: 'No potential matches found',
          bankAmount: null,
          bankType: null,
          bankDate: null,
          bankReference: null,
          bankAccount: null,
          bankMcc: null,
          confidence: 0,
          amountSimilarity: 0,
          dateSimilarity: 0,
          descriptionSimilarity: 0,
          referenceSimilarity: 0,
          category: '',
          hasMatches: false
        });
      }
    });

    // Sort the matches
    return allMatches.sort((a, b) => {
      let aValue, bValue;
      
      if (sortField === 'category') {
        aValue = a.category.toLowerCase();
        bValue = b.category.toLowerCase();
      } else if (sortField === 'matchPercentage') {
        aValue = a.confidence;
        bValue = b.confidence;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [potentialMatches, skippedMatches, categoryInputs, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleCategoryChange = useCallback((taxId, bankId, value) => {
    const key = `${taxId}-${bankId}`;
    setCategoryInputs(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const handleSkipMatch = (taxId, bankId) => {
    const key = `${taxId}-${bankId}`;
    setSkippedMatches(prev => new Set([...prev, key]));
  };

  const toggleRowExpansion = useCallback((taxId, bankId) => {
    const key = `${taxId}-${bankId}`;
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  return (
    <div className="container mt-4">
      <style jsx>{`
        .hover-row:hover {
          background-color: #f8f9fa !important;
        }
        .hover-row:hover td {
          background-color: #f8f9fa !important;
        }
        .table-active {
          background-color: #e3f2fd !important;
        }
        .table-active td {
          background-color: #e3f2fd !important;
        }
      `}</style>
      <h1>Transaction Matching</h1>
      <p className="text-muted">Match tax return transactions with bank transactions to learn categorization patterns. <strong>Click anywhere on a row to view more details.</strong></p>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Tax Return Selection */}
      <div className="card mb-4">
        <div className="card-header">
          <h5>Select Tax Return</h5>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center">Loading tax returns...</div>
          ) : taxReturns.length === 0 ? (
            <div className="alert alert-info">No tax returns available. Upload a tax return first.</div>
          ) : (
            <div className="row">
              {taxReturns.map(taxReturn => (
                <div key={taxReturn.id} className="col-md-4 mb-3">
                  <div 
                    className={`card h-100 ${selectedTaxReturn?.id === taxReturn.id ? 'border-primary' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleTaxReturnSelect(taxReturn)}
                  >
                    <div className="card-body">
                      <h6 className="card-title">{taxReturn.filename}</h6>
                      <p className="card-text">
                        <small className="text-muted">
                          Year: {taxReturn.year}<br/>
                          Transactions: {taxReturn.transaction_count}<br/>
                          Uploaded: {formatDate(taxReturn.uploaded_at)}
                        </small>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Auto-Matched Transactions */}
      {selectedTaxReturn && showAutoMatches && autoMatches.length > 0 && (
        <div className="card mb-4">
          <div className="card-header bg-success text-white">
            <h5>🤖 Auto-Matched Transactions (Need Category Assignment)</h5>
            <small>
              {autoMatches.length} transactions were automatically matched with high confidence
            </small>
          </div>
          <div className="card-body">
            <div className="row">
              {autoMatches.map((match, index) => (
                <div key={match.match_id} className="col-md-6 mb-3">
                  <div className="card border-success">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">Auto-Match #{index + 1}</h6>
                      <span className="badge bg-success">
                        {Math.round(match.confidence_score * 100)}% confidence
                      </span>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-6">
                          <h6 className="text-primary">Tax Transaction</h6>
                          <p className="mb-1">
                            <strong>Name:</strong> {match.tax_transaction.name}<br/>
                            <strong>Amount:</strong> {formatCurrency(match.tax_transaction.debit || -match.tax_transaction.credit)}<br/>
                            <strong>Date:</strong> {match.tax_transaction.date ? formatDate(match.tax_transaction.date) : 'N/A'}
                          </p>
                        </div>
                        <div className="col-6">
                          <h6 className="text-info">Bank Transaction</h6>
                          <p className="mb-1">
                            <strong>Description:</strong> {match.bank_transaction.description}<br/>
                            <strong>Amount:</strong> {formatCurrency(match.bank_transaction.amount)}<br/>
                            <strong>Date:</strong> {formatDate(match.bank_transaction.transaction_date)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <label htmlFor={`autoCategory${index}`} className="form-label">
                          <strong>Assign Accountant Category:</strong>
                        </label>
                        <div className="input-group">
                          <input
                            type="text"
                            className="form-control"
                            id={`autoCategory${index}`}
                            placeholder="e.g., Business Expense, Rental Income, Office Supplies"
                          />
                          <button
                            className="btn btn-success"
                            onClick={() => {
                              const category = document.getElementById(`autoCategory${index}`).value;
                              if (!category.trim()) {
                                alert('Please enter a category');
                                return;
                              }
                              handleUpdateCategory(match.match_id, category.trim());
                            }}
                            disabled={updatingCategory}
                          >
                            {updatingCategory ? '⏳ Updating...' : '✅ Assign Category'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Potential Matches Table */}
      {selectedTaxReturn && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <div>
              <h5>Potential Matches for {selectedTaxReturn.filename}</h5>
              <small className="text-muted">
                {getSortedMatches().length} total rows ({getTotalPotentialMatches()} potential matches across {potentialMatches.length} transactions)
              </small>
            </div>
            <button
              onClick={handleRefreshMatching}
              className="btn btn-outline-primary btn-sm"
              disabled={loading}
            >
              {loading ? '⏳ Refreshing...' : '🔄 Refresh Matching'}
            </button>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-center">Loading potential matches...</div>
            ) : potentialMatches.length === 0 ? (
              <div className="alert alert-success">
                All transactions have been matched! 🎉
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-hover table-striped">
                    <thead className="table-dark">
                      <tr>
                        <th style={{ cursor: 'pointer' }} onClick={() => handleSort('category')}>
                          Category {sortField === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th style={{ cursor: 'pointer' }} onClick={() => handleSort('matchPercentage')}>
                          Match % {sortField === 'matchPercentage' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>Tax Transaction</th>
                        <th>Bank Transaction</th>
                        <th>Similarity Details</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                    {getSortedMatches().slice(0, visibleRows).map((row, index) => (
                      <React.Fragment key={`${row.taxId}-${row.bankId}`}>
                        <tr 
                          style={{ cursor: 'pointer' }}
                          onClick={() => toggleRowExpansion(row.taxId, row.bankId)}
                          className={`${expandedRows.has(`${row.taxId}-${row.bankId}`) ? 'table-active' : ''} hover-row`}
                          title="Click anywhere on the row to view more details"
                        >
                          <td onClick={(e) => e.stopPropagation()}>
                            {row.hasMatches ? (
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Enter category"
                                value={row.category || ''}
                                onChange={(e) => handleCategoryChange(row.taxId, row.bankId, e.target.value)}
                              />
                            ) : (
                              <small className="text-muted">N/A</small>
                            )}
                          </td>
                          <td>
                            {row.hasMatches ? (
                              <span className={`badge ${getConfidenceColor(row.confidence)}`}>
                                {Math.round(row.confidence * 100)}%
                              </span>
                            ) : (
                              <small className="text-muted">N/A</small>
                            )}
                          </td>
                        <td>
                          <div>
                            <strong>{row.taxName}</strong><br/>
                            <small className="text-muted">
                              {formatCurrency(row.taxAmount)} | {formatDate(row.taxDate)}<br/>
                              <span className={`badge ${row.taxType === 'Debit' ? 'bg-danger' : 'bg-success'} badge-sm`}>
                                {row.taxType}
                              </span>
                            </small>
                          </div>
                        </td>
                        <td>
                          <div>
                            <strong>{row.bankDescription}</strong><br/>
                            {row.hasMatches ? (
                              <>
                                <small className="text-muted">
                                  {formatCurrency(row.bankAmount)} | {formatDate(row.bankDate)}<br/>
                                  <span className={`badge ${row.bankAmount > 0 ? 'bg-success' : 'bg-danger'} badge-sm`}>
                                    {row.bankAmount > 0 ? 'Credit' : 'Debit'}
                            </span>
                                </small>
                                {row.bankReference && (
                                  <>
                                    <br/><small className="text-muted">Ref: {row.bankReference}</small>
                                  </>
                                )}
                              </>
                            ) : (
                              <small className="text-muted text-danger">
                                No potential matches found
                              </small>
                            )}
                          </div>
                        </td>
                          <td>
                            {row.hasMatches ? (
                              <small>
                                Amount: {Math.round(row.amountSimilarity * 100)}%<br/>
                                Date: {Math.round(row.dateSimilarity * 100)}%<br/>
                                Desc: {Math.round(row.descriptionSimilarity * 100)}%
                              </small>
                            ) : (
                              <small className="text-muted">N/A</small>
                            )}
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            {row.hasMatches ? (
                              <div className="d-flex gap-1">
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => handleCreateMatch(row.taxId, row.bankId, row.confidence, row.category)}
                                  disabled={matching || !row.category?.trim()}
                                  title={!row.category?.trim() ? 'Enter a category first' : 'Create match'}
                                >
                                  {matching ? '⏳' : '✅'}
                                </button>
                                <button
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={() => handleSkipMatch(row.taxId, row.bankId)}
                                  title="Skip this match"
                                >
                                  ⏭️
                      </button>
                                <button
                                  className="btn btn-outline-info btn-sm"
                                  onClick={() => toggleRowExpansion(row.taxId, row.bankId)}
                                  title="Show more details"
                                >
                                  {expandedRows.has(`${row.taxId}-${row.bankId}`) ? '📖' : '📄'}
                                </button>
                          </div>
                        ) : (
                              <small className="text-muted">No actions available</small>
                            )}
                          </td>
                        </tr>
                        {expandedRows.has(`${row.taxId}-${row.bankId}`) && row.hasMatches && (
                          <tr>
                            <td colSpan="6" className="bg-light p-2">
                              <div className="row g-2">
                                <div className="col-md-6">
                                  <div className="border rounded p-2 bg-white">
                                    <h6 className="text-success mb-2">📊 Tax Transaction</h6>
                                    <div className="small">
                                      <div><strong>ID:</strong> {row.taxId}</div>
                                      <div><strong>Name:</strong> {row.taxName}</div>
                                      <div><strong>Amount:</strong> {formatCurrency(row.taxAmount)} <span className={`badge ${row.taxType === 'Debit' ? 'bg-danger' : 'bg-success'} badge-sm`}>{row.taxType}</span></div>
                                      <div><strong>Date:</strong> {formatDate(row.taxDate)}</div>
                                      <div><strong>Ref:</strong> {row.taxReference || 'N/A'}</div>
                                    </div>
                                  </div>
                                </div>
                                <div className="col-md-6">
                                  <div className="border rounded p-2 bg-white">
                                    <h6 className="text-info mb-2">🏦 Bank Transaction</h6>
                                    <div className="small">
                                      <div><strong>ID:</strong> {row.bankId}</div>
                                      <div><strong>Description:</strong> {row.bankDescription}</div>
                                      <div><strong>Amount:</strong> {formatCurrency(row.bankAmount)} <span className={`badge ${row.bankAmount > 0 ? 'bg-success' : 'bg-danger'} badge-sm`}>{row.bankAmount > 0 ? 'Credit' : 'Debit'}</span></div>
                                      <div><strong>Date:</strong> {formatDate(row.bankDate)}</div>
                                      <div><strong>Account:</strong> {row.bankAccount || 'N/A'}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2">
                                <div className="d-flex gap-3 justify-content-center">
                                  <span className="badge bg-warning">Amount: {Math.round(row.amountSimilarity * 100)}%</span>
                                  <span className="badge bg-warning">Date: {Math.round(row.dateSimilarity * 100)}%</span>
                                  <span className="badge bg-warning">Desc: {Math.round(row.descriptionSimilarity * 100)}%</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                ))}
                  </tbody>
                </table>
              </div>
              
              {/* Show More Button */}
              {getSortedMatches().length > visibleRows && (
                <div className="text-center mt-3">
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => setVisibleRows(prev => Math.min(prev + 100, getSortedMatches().length))}
                  >
                    Show More ({visibleRows} of {getSortedMatches().length} rows)
                  </button>
                </div>
              )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionMatching;
