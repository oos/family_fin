import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

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

  useEffect(() => {
    fetchTaxReturns();
  }, []);

  const fetchTaxReturns = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/tax-returns', {
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
      const response = await axios.get(`/api/tax-returns/${taxReturnId}/match-transactions`, {
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
      const response = await axios.get(`/api/tax-returns/${taxReturnId}/auto-matches`, {
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
      const response = await axios.post('/api/transaction-matches', {
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
      const response = await axios.put(`/api/transaction-matches/${matchId}/category`, {
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
    return new Date(dateString).toLocaleDateString('en-IE');
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-success';
    if (confidence >= 0.6) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className="container mt-4">
      <h1>Transaction Matching</h1>
      <p className="text-muted">Match tax return transactions with bank transactions to learn categorization patterns.</p>

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

      {/* Potential Matches */}
      {selectedTaxReturn && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <div>
              <h5>Potential Matches for {selectedTaxReturn.filename}</h5>
              <small className="text-muted">
                {potentialMatches.length} unmatched transactions found
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
              <div className="accordion" id="matchesAccordion">
                {potentialMatches.map((match, index) => (
                  <div key={index} className="accordion-item">
                    <h2 className="accordion-header" id={`heading${index}`}>
                      <button
                        className="accordion-button collapsed"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target={`#collapse${index}`}
                        aria-expanded="false"
                        aria-controls={`collapse${index}`}
                      >
                        <div className="d-flex justify-content-between w-100 me-3">
                          <div>
                            <strong>{match.tax_transaction.name}</strong>
                            <br/>
                            <small className="text-muted">
                              Amount: {formatCurrency(match.tax_transaction.debit || -match.tax_transaction.credit)} | 
                              Date: {match.tax_transaction.date ? formatDate(match.tax_transaction.date) : 'N/A'}
                            </small>
                          </div>
                          <div className="text-end">
                            <span className="badge bg-secondary">
                              {match.potential_matches.length} potential matches
                            </span>
                          </div>
                        </div>
                      </button>
                    </h2>
                    <div
                      id={`collapse${index}`}
                      className="accordion-collapse collapse"
                      aria-labelledby={`heading${index}`}
                      data-bs-parent="#matchesAccordion"
                    >
                      <div className="accordion-body">
                        {match.potential_matches.length === 0 ? (
                          <div className="alert alert-warning">
                            No potential matches found. You may need to manually match this transaction.
                          </div>
                        ) : (
                          <div className="row">
                            {match.potential_matches.map((potentialMatch, pmIndex) => (
                              <div key={pmIndex} className="col-md-6 mb-3">
                                <div className="card">
                                  <div className="card-header d-flex justify-content-between align-items-center">
                                    <h6 className="mb-0">Bank Transaction</h6>
                                    <span className={`badge ${getConfidenceColor(potentialMatch.confidence)}`}>
                                      {Math.round(potentialMatch.confidence * 100)}% match
                                    </span>
                                  </div>
                                  <div className="card-body">
                                    <p className="card-text">
                                      <strong>Description:</strong> {potentialMatch.bank_transaction.description}<br/>
                                      <strong>Amount:</strong> {formatCurrency(potentialMatch.bank_transaction.amount)}<br/>
                                      <strong>Date:</strong> {formatDate(potentialMatch.bank_transaction.transaction_date)}<br/>
                                      <strong>Reference:</strong> {potentialMatch.bank_transaction.reference || 'N/A'}
                                    </p>
                                    
                                    <div className="mb-3">
                                      <label htmlFor={`category${index}${pmIndex}`} className="form-label">
                                        Accountant Category:
                                      </label>
                                      <input
                                        type="text"
                                        className="form-control"
                                        id={`category${index}${pmIndex}`}
                                        placeholder="Enter category (e.g., Business Expense, Rental Income)"
                                      />
                                    </div>
                                    
                                    <div className="d-flex gap-2">
                                      <button
                                        className="btn btn-success btn-sm"
                                        onClick={() => {
                                          const category = document.getElementById(`category${index}${pmIndex}`).value;
                                          if (!category.trim()) {
                                            alert('Please enter a category');
                                            return;
                                          }
                                          handleCreateMatch(
                                            match.tax_transaction.id,
                                            potentialMatch.bank_transaction.id,
                                            potentialMatch.confidence,
                                            category.trim()
                                          );
                                        }}
                                        disabled={matching}
                                      >
                                        {matching ? '⏳ Matching...' : '✅ Create Match'}
                                      </button>
                                      <button
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() => {
                                          // Skip this transaction
                                          console.log('Skipped transaction:', match.tax_transaction.id);
                                        }}
                                      >
                                        Skip
                                      </button>
                                    </div>
                                    
                                    <div className="mt-2">
                                      <small className="text-muted">
                                        Similarity: Amount {Math.round(potentialMatch.amount_similarity * 100)}% | 
                                        Date {Math.round(potentialMatch.date_similarity * 100)}% | 
                                        Description {Math.round(potentialMatch.description_similarity * 100)}%
                                      </small>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionMatching;
