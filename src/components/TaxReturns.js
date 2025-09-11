import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TaxReturns = () => {
  const [taxReturns, setTaxReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [filteredReturns, setFilteredReturns] = useState([]);
  const [showDataModal, setShowDataModal] = useState(false);
  const [selectedReturnData, setSelectedReturnData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [showSavedDataModal, setShowSavedDataModal] = useState(false);
  const [savedTransactions, setSavedTransactions] = useState(null);
  const [savedDataLoading, setSavedDataLoading] = useState(false);

  useEffect(() => {
    fetchTaxReturns();
  }, []);

  useEffect(() => {
    // Filter returns by selected year
    const filtered = taxReturns.filter(returnItem => 
      returnItem.year === selectedYear
    );
    setFilteredReturns(filtered);
  }, [taxReturns, selectedYear]);

  const fetchTaxReturns = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Please log in to access tax returns');
        return;
      }
      
      const response = await axios.get('/tax-returns', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTaxReturns(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching tax returns:', err);
      
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
        // Optionally redirect to login
        // window.location.href = '/login';
      } else if (err.response?.status === 403) {
        setError('Access denied. You do not have permission to view tax returns.');
      } else {
        setError(`Failed to load tax returns: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'text/csv' || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.toLowerCase().endsWith('.xlsx'))) {
      setSelectedFile(file);
    } else {
      setError('Please select a valid CSV or Excel (.xlsx) file');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('year', selectedYear);

      const token = localStorage.getItem('token');
      const response = await axios.post('/tax-returns/upload', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Refresh the list
      await fetchTaxReturns();
      setShowUploadModal(false);
      setSelectedFile(null);
      
      // Show success message
      alert('Tax return uploaded successfully!');
    } catch (err) {
      setError(`Upload failed: ${err.response?.data?.message || err.message}`);
      console.error('Error uploading tax return:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tax return?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/tax-returns/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh the list
      await fetchTaxReturns();
      alert('Tax return deleted successfully!');
    } catch (err) {
      setError(`Delete failed: ${err.response?.data?.message || err.message}`);
      console.error('Error deleting tax return:', err);
    }
  };

  const handleViewData = async (id) => {
    setDataLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/tax-returns/${id}/data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSelectedReturnData(response.data);
      setShowDataModal(true);
    } catch (err) {
      setError(`Failed to load data: ${err.response?.data?.message || err.message}`);
      console.error('Error fetching tax return data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleViewSavedData = async (id) => {
    setSavedDataLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/tax-returns/${id}/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSavedTransactions(response.data);
      setShowSavedDataModal(true);
    } catch (err) {
      setError(`Failed to load saved data: ${err.response?.data?.message || err.message}`);
      console.error('Error fetching saved transactions:', err);
    } finally {
      setSavedDataLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IE');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 2020; year--) {
      years.push(year.toString());
    }
    return years;
  };

  return (
    <div className="container">
      <style jsx>{`
        .upload-area {
          border: 2px dashed #dee2e6;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          transition: border-color 0.3s ease;
          cursor: pointer;
        }
        .upload-area:hover {
          border-color: #007bff;
        }
        .upload-area.dragover {
          border-color: #007bff;
          background-color: #f8f9fa;
        }
        .file-info {
          background-color: #f8f9fa;
          border-radius: 4px;
          padding: 0.5rem;
          margin-top: 1rem;
        }
        .tax-return-card {
          transition: transform 0.2s ease;
        }
        .tax-return-card:hover {
          transform: translateY(-2px);
        }
      `}</style>

      <h1>Tax Returns</h1>
      
      {/* Year Filter */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h3>Tax Returns for {selectedYear}</h3>
            </div>
            <div className="col-md-6 text-end">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="form-select d-inline-block"
                style={{ width: 'auto' }}
              >
                {getYearOptions().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Button */}
      <div className="card mb-4">
        <div className="card-body text-center">
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn btn-primary btn-lg"
          >
            📁 Upload Tax Return (CSV/Excel)
          </button>
          <p className="text-muted mt-2">
            Upload your accountant's tax return file (CSV or Excel) to categorize transactions
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Tax Returns List */}
      {loading ? (
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="row">
          {filteredReturns.length === 0 ? (
            <div className="col-12">
              <div className="card">
                <div className="card-body text-center">
                  <h4>No Tax Returns Found</h4>
                  <p className="text-muted">
                    Upload your first tax return CSV file to get started.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            filteredReturns.map(taxReturn => (
              <div key={taxReturn.id} className="col-md-6 col-lg-4 mb-3">
                <div className="card tax-return-card h-100">
                  <div className="card-body">
                    <h5 className="card-title">
                      Tax Return {taxReturn.year}
                    </h5>
                    <p className="card-text">
                      <strong>File:</strong> {taxReturn.filename}<br/>
                      <strong>Uploaded:</strong> {formatDate(taxReturn.uploaded_at)}<br/>
                      <strong>Size:</strong> {formatFileSize(taxReturn.file_size)}<br/>
                      <strong>Transactions:</strong> {taxReturn.transaction_count || 'N/A'}
                    </p>
                    <div className="d-flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleViewSavedData(taxReturn.id)}
                        className="btn btn-outline-success btn-sm"
                        disabled={savedDataLoading}
                      >
                        {savedDataLoading ? '⏳ Loading...' : '💾 View Saved Data'}
                      </button>
                      <button
                        onClick={() => window.location.href = '/transaction-matching'}
                        className="btn btn-outline-warning btn-sm"
                      >
                        🔗 Match Transactions
                      </button>
                      <button
                        onClick={() => handleViewData(taxReturn.id)}
                        className="btn btn-outline-info btn-sm"
                        disabled={dataLoading}
                      >
                        {dataLoading ? '⏳ Loading...' : '👁️ View Raw Data'}
                      </button>
                      <button
                        onClick={() => window.open(`/api/tax-returns/${taxReturn.id}/download`, '_blank')}
                        className="btn btn-outline-primary btn-sm"
                      >
                        📥 Download
                      </button>
                      <button
                        onClick={() => handleDelete(taxReturn.id)}
                        className="btn btn-outline-danger btn-sm"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload Tax Return CSV</h2>
              <button 
                className="close" 
                onClick={() => setShowUploadModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Tax Year:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="form-select"
                >
                  {getYearOptions().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-3">
                <label className="form-label">File (CSV or Excel):</label>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileSelect}
                  className="form-control"
                />
                {selectedFile && (
                  <div className="file-info">
                    <strong>Selected:</strong> {selectedFile.name}<br/>
                    <strong>Size:</strong> {formatFileSize(selectedFile.size)}<br/>
                    <strong>Type:</strong> {selectedFile.type}
                  </div>
                )}
              </div>

              <div className="alert alert-info">
                <strong>Note:</strong> The CSV file should contain columns for:
                <ul className="mb-0 mt-2">
                  <li>Name - Transaction description</li>
                  <li>Date - Transaction date (DD/MM/YYYY)</li>
                  <li>Number - Transaction number</li>
                  <li>Reference - Reference code</li>
                  <li>Source - Source system</li>
                  <li>Annotation - Additional notes</li>
                  <li>Debit - Debit amount</li>
                  <li>Credit - Credit amount</li>
                  <li>Balance - Running balance</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowUploadModal(false)}
                className="btn btn-secondary"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                className="btn btn-primary"
                disabled={!selectedFile || uploading}
              >
                {uploading ? '⏳ Uploading...' : '📁 Upload File (CSV/Excel)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Viewing Modal */}
      {showDataModal && selectedReturnData && (
        <div className="modal-overlay" onClick={() => setShowDataModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '95%', width: '95%' }}>
            <div className="modal-header">
              <h2>Tax Return Data</h2>
              <button 
                className="close" 
                onClick={() => setShowDataModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="mb-3">
                <strong>Total Rows:</strong> {selectedReturnData.total_rows} | 
                <strong> Columns:</strong> {selectedReturnData.columns.join(', ')}
              </div>
              
              <div className="table-responsive">
                <table className="table table-striped table-sm">
                  <thead className="table-dark">
                    <tr>
                      {selectedReturnData.columns.map((column, index) => (
                        <th key={index}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReturnData.data.map((row, index) => (
                      <tr key={index}>
                        {selectedReturnData.columns.map((column, colIndex) => (
                          <td key={colIndex}>
                            {column === 'Date' && row[column] ? 
                              new Date(row[column]).toLocaleDateString('en-IE') :
                              column === 'Debit' || column === 'Credit' || column === 'Balance' ?
                              (row[column] ? parseFloat(row[column]).toLocaleString('en-IE', { 
                                style: 'currency', 
                                currency: 'EUR',
                                minimumFractionDigits: 2 
                              }) : '') :
                              row[column] || ''
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowDataModal(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Data Modal */}
      {showSavedDataModal && savedTransactions && (
        <div className="modal-overlay" onClick={() => setShowSavedDataModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '95%', width: '95%' }}>
            <div className="modal-header">
              <h2>Saved Tax Return Data (from Database)</h2>
              <button 
                className="close" 
                onClick={() => setShowSavedDataModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="mb-3">
                <strong>Tax Return:</strong> {savedTransactions.tax_return.filename} ({savedTransactions.tax_return.year}) | 
                <strong> Total Transactions:</strong> {savedTransactions.total_count} | 
                <strong> Uploaded:</strong> {formatDate(savedTransactions.tax_return.uploaded_at)}
              </div>
              
              <div className="table-responsive">
                <table className="table table-striped table-sm">
                  <thead className="table-dark">
                    <tr>
                      <th>Name</th>
                      <th>Date</th>
                      <th>Number</th>
                      <th>Reference</th>
                      <th>Source</th>
                      <th>Annotation</th>
                      <th>Debit</th>
                      <th>Credit</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedTransactions.transactions.map((transaction, index) => (
                      <tr key={transaction.id}>
                        <td>{transaction.name}</td>
                        <td>{transaction.date ? formatDate(transaction.date) : ''}</td>
                        <td>{transaction.number || ''}</td>
                        <td>{transaction.reference || ''}</td>
                        <td>{transaction.source || ''}</td>
                        <td>{transaction.annotation || ''}</td>
                        <td className="text-danger">
                          {transaction.debit > 0 ? 
                            parseFloat(transaction.debit).toLocaleString('en-IE', { 
                              style: 'currency', 
                              currency: 'EUR',
                              minimumFractionDigits: 2 
                            }) : ''
                          }
                        </td>
                        <td className="text-success">
                          {transaction.credit > 0 ? 
                            parseFloat(transaction.credit).toLocaleString('en-IE', { 
                              style: 'currency', 
                              currency: 'EUR',
                              minimumFractionDigits: 2 
                            }) : ''
                          }
                        </td>
                        <td className="text-info">
                          {transaction.balance ? 
                            parseFloat(transaction.balance).toLocaleString('en-IE', { 
                              style: 'currency', 
                              currency: 'EUR',
                              minimumFractionDigits: 2 
                            }) : ''
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowSavedDataModal(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxReturns;
