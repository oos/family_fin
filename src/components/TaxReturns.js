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
      const response = await axios.get('/api/tax-returns', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTaxReturns(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load tax returns');
      console.error('Error fetching tax returns:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
    } else {
      setError('Please select a valid CSV file');
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
      const response = await axios.post('/api/tax-returns/upload', formData, {
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
      await axios.delete(`/api/tax-returns/${id}`, {
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
            📁 Upload Tax Return CSV
          </button>
          <p className="text-muted mt-2">
            Upload your accountant's tax return CSV file to categorize transactions
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
                    <div className="d-flex gap-2">
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
                <label className="form-label">CSV File:</label>
                <input
                  type="file"
                  accept=".csv"
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
                  <li>Transaction Date</li>
                  <li>Description</li>
                  <li>Amount</li>
                  <li>Tax Category</li>
                  <li>Deductible Amount (if applicable)</li>
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
                {uploading ? '⏳ Uploading...' : '📁 Upload File'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxReturns;
