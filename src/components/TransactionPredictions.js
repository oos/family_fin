import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TransactionPredictions = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [training, setTraining] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [modelStatus, setModelStatus] = useState({ is_trained: false, version: null });
  const [pagination, setPagination] = useState({});
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [modelPerformance, setModelPerformance] = useState(null);
  const [showTrainingHistory, setShowTrainingHistory] = useState(false);

  useEffect(() => {
    fetchPredictions();
    fetchTrainingHistory();
    fetchModelPerformance();
  }, [currentPage, selectedStatus]);

  const fetchPredictions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/transaction-predictions?page=${currentPage}&status=${selectedStatus}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPredictions(response.data.predictions);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError(`Failed to load predictions: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainingHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/training-history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrainingHistory(response.data.training_history);
    } catch (err) {
      console.error('Error fetching training history:', err);
    }
  };

  const fetchModelPerformance = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/model-performance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setModelPerformance(response.data);
      setModelStatus({
        is_trained: true,
        version: response.data.model_version
      });
    } catch (err) {
      console.error('Error fetching model performance:', err);
      setModelStatus({ is_trained: false, version: null });
    }
  };

  const trainModel = async (incremental = false) => {
    setTraining(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/train-category-model', { incremental }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(`🎉 ${response.data.message}`);
      setModelStatus({
        is_trained: response.data.is_trained,
        version: response.data.model_version
      });
      
      // Refresh data
      fetchTrainingHistory();
      fetchModelPerformance();
    } catch (err) {
      console.error('Error training model:', err);
      setError(`Training failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setTraining(false);
    }
  };

  const predictAllTransactions = async () => {
    setPredicting(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/predict-all-transactions', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(`🎯 ${response.data.message}\nCreated: ${response.data.predictions_created}\nUpdated: ${response.data.predictions_updated}\nTotal: ${response.data.total_transactions}`);
      fetchPredictions();
    } catch (err) {
      console.error('Error predicting transactions:', err);
      setError(`Prediction failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setPredicting(false);
    }
  };

  const validatePrediction = async (predictionId, validatedCategory, validationStatus = 'validated', notes = '') => {
    setValidating(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`/transaction-predictions/${predictionId}/validate`, {
        validated_category: validatedCategory,
        validation_status: validationStatus,
        validation_notes: notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setPredictions(prev => prev.map(p => 
        p.prediction.id === predictionId 
          ? { ...p, prediction: response.data.prediction }
          : p
      ));
    } catch (err) {
      console.error('Error validating prediction:', err);
      setError(`Validation failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setValidating(false);
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
    if (confidence >= 0.8) return 'text-success';
    if (confidence >= 0.6) return 'text-warning';
    return 'text-danger';
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': 'badge bg-warning',
      'validated': 'badge bg-success',
      'rejected': 'badge bg-danger'
    };
    return badges[status] || 'badge bg-secondary';
  };

  return (
    <div className="container mt-4">
      <h1>Transaction Category Predictions</h1>
      <p className="text-muted">Train ML model and validate predicted categories for all transactions.</p>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Model Training Section */}
      <div className="card mb-4">
        <div className="card-header">
          <h5>🤖 Machine Learning Model</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4">
              <h6>Model Status</h6>
              <p>
                <strong>Status:</strong> {modelStatus.is_trained ? '✅ Trained' : '❌ Not Trained'}<br/>
                <strong>Version:</strong> {modelStatus.version || 'N/A'}
              </p>
              {modelPerformance && (
                <div className="mt-2">
                  <small className="text-muted">
                    <strong>Tax Return Years:</strong> {modelPerformance.training_data?.tax_return_years || 'N/A'}<br/>
                    <strong>Training Samples:</strong> {modelPerformance.training_data?.samples || 0}<br/>
                    <strong>Features:</strong> {modelPerformance.training_data?.features_count || 0}
                  </small>
                </div>
              )}
            </div>
            <div className="col-md-4">
              {modelPerformance && (
                <div>
                  <h6>Performance Metrics</h6>
                  <div className="row text-center">
                    <div className="col-3">
                      <div className="text-success">
                        <strong>{(modelPerformance.performance?.accuracy * 100 || 0).toFixed(1)}%</strong><br/>
                        <small>Accuracy</small>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="text-info">
                        <strong>{(modelPerformance.performance?.precision * 100 || 0).toFixed(1)}%</strong><br/>
                        <small>Precision</small>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="text-warning">
                        <strong>{(modelPerformance.performance?.recall * 100 || 0).toFixed(1)}%</strong><br/>
                        <small>Recall</small>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="text-primary">
                        <strong>{(modelPerformance.performance?.f1_score * 100 || 0).toFixed(1)}%</strong><br/>
                        <small>F1-Score</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="col-md-4">
              <div className="d-flex flex-column gap-2">
                <button
                  onClick={() => trainModel(false)}
                  className="btn btn-primary"
                  disabled={training}
                >
                  {training ? '⏳ Training...' : '🎓 Train New Model'}
                </button>
                <button
                  onClick={() => trainModel(true)}
                  className="btn btn-outline-primary"
                  disabled={training || !modelStatus.is_trained}
                >
                  {training ? '⏳ Training...' : '🔄 Incremental Training'}
                </button>
                <button
                  onClick={predictAllTransactions}
                  className="btn btn-success"
                  disabled={predicting || !modelStatus.is_trained}
                >
                  {predicting ? '⏳ Predicting...' : '🎯 Predict All Transactions'}
                </button>
                <button
                  onClick={() => setShowTrainingHistory(!showTrainingHistory)}
                  className="btn btn-outline-info btn-sm"
                >
                  📊 {showTrainingHistory ? 'Hide' : 'Show'} Training History
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Training History */}
      {showTrainingHistory && (
        <div className="card mb-4">
          <div className="card-header">
            <h5>📊 Training History</h5>
          </div>
          <div className="card-body">
            {trainingHistory.length === 0 ? (
              <p className="text-muted">No training history found.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Version</th>
                      <th>Status</th>
                      <th>Samples</th>
                      <th>Years</th>
                      <th>Accuracy</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainingHistory.map((history) => (
                      <tr key={history.id}>
                        <td>{new Date(history.training_date).toLocaleDateString()}</td>
                        <td><span className="badge bg-info">{history.model_version}</span></td>
                        <td>
                          <span className={`badge ${history.status === 'completed' ? 'bg-success' : history.status === 'failed' ? 'bg-danger' : 'bg-warning'}`}>
                            {history.status}
                          </span>
                        </td>
                        <td>{history.training_samples}</td>
                        <td>{history.tax_return_years || 'N/A'}</td>
                        <td>{history.accuracy ? `${(history.accuracy * 100).toFixed(1)}%` : 'N/A'}</td>
                        <td>{history.training_duration_seconds ? `${history.training_duration_seconds.toFixed(1)}s` : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-header">
          <h5>Filter Predictions</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4">
              <label className="form-label">Status:</label>
              <select
                className="form-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="validated">Validated</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Page:</label>
              <select
                className="form-select"
                value={currentPage}
                onChange={(e) => setCurrentPage(parseInt(e.target.value))}
              >
                {Array.from({ length: pagination.pages || 1 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>Page {i + 1}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <button
                onClick={fetchPredictions}
                className="btn btn-outline-primary mt-4"
                disabled={loading}
              >
                {loading ? '⏳ Loading...' : '🔄 Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Predictions List */}
      <div className="card">
        <div className="card-header">
          <h5>Transaction Predictions</h5>
          <small className="text-muted">
            Showing {predictions.length} of {pagination.total || 0} predictions
          </small>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center">Loading predictions...</div>
          ) : predictions.length === 0 ? (
            <div className="alert alert-info">
              No predictions found. Train the model and predict all transactions first.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Predicted Category</th>
                    <th>Confidence</th>
                    <th>Status</th>
                    <th>Validated Category</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((item) => (
                    <tr key={item.prediction.id}>
                      <td>
                        <div>
                          <strong>{item.bank_transaction.description}</strong><br/>
                          <small className="text-muted">
                            {formatDate(item.bank_transaction.transaction_date)} | 
                            {formatCurrency(item.bank_transaction.amount)}
                          </small>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-info">
                          {item.prediction.predicted_category || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span className={getConfidenceColor(item.prediction.prediction_confidence)}>
                          {Math.round(item.prediction.prediction_confidence * 100)}%
                        </span>
                      </td>
                      <td>
                        <span className={getStatusBadge(item.prediction.validation_status)}>
                          {item.prediction.validation_status}
                        </span>
                      </td>
                      <td>
                        {item.prediction.validated_category ? (
                          <span className="badge bg-success">
                            {item.prediction.validated_category}
                          </span>
                        ) : (
                          <span className="text-muted">Not validated</span>
                        )}
                      </td>
                      <td>
                        {item.prediction.validation_status === 'pending' && (
                          <div className="d-flex gap-1">
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Enter category"
                              id={`category-${item.prediction.id}`}
                              style={{ width: '120px' }}
                            />
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => {
                                const category = document.getElementById(`category-${item.prediction.id}`).value;
                                if (category.trim()) {
                                  validatePrediction(item.prediction.id, category.trim());
                                }
                              }}
                              disabled={validating}
                            >
                              ✅
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => validatePrediction(item.prediction.id, null, 'rejected')}
                              disabled={validating}
                            >
                              ❌
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <nav aria-label="Predictions pagination">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${!pagination.has_prev ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={!pagination.has_prev}
                  >
                    Previous
                  </button>
                </li>
                <li className="page-item active">
                  <span className="page-link">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                </li>
                <li className={`page-item ${!pagination.has_next ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!pagination.has_next}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionPredictions;
