import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FileViewer = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortField, setSortField] = useState('uploaded_at');
  const [sortDirection, setSortDirection] = useState('desc');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/files', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setFiles(response.data.files);
      setError('');
    } catch (error) {
      console.error('Error fetching files:', error);
      setError('Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileTypeIcon = (type) => {
    switch (type) {
      case 'tax_return':
        return '📊';
      case 'bank_csv':
        return '🏦';
      default:
        return '📄';
    }
  };

  const getFileTypeBadge = (type) => {
    switch (type) {
      case 'tax_return':
        return <span className="badge bg-success">Tax Return</span>;
      case 'bank_csv':
        return <span className="badge bg-info">Bank CSV</span>;
      default:
        return <span className="badge bg-secondary">File</span>;
    }
  };

  const handleDownload = async (downloadUrl, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedFiles = files
    .filter(file => filterType === 'all' || file.type === filterType)
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'uploaded_at') {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      } else if (sortField === 'size') {
        aVal = aVal || 0;
        bVal = bVal || 0;
      } else {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>📁 File Viewer</h2>
            <button 
              className="btn btn-outline-primary"
              onClick={fetchFiles}
              disabled={loading}
            >
              🔄 Refresh
            </button>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {/* Summary Cards */}
          <div className="row mb-4">
            <div className="col-md-4">
              <div className="card">
                <div className="card-body text-center">
                  <h5 className="card-title">📄 Total Files</h5>
                  <h3 className="text-primary">{files.length}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card">
                <div className="card-body text-center">
                  <h5 className="card-title">📊 Tax Returns</h5>
                  <h3 className="text-success">{files.filter(f => f.type === 'tax_return').length}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card">
                <div className="card-body text-center">
                  <h5 className="card-title">🏦 Bank CSVs</h5>
                  <h3 className="text-info">{files.filter(f => f.type === 'bank_csv').length}</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <label htmlFor="filterType" className="form-label">Filter by Type:</label>
                  <select 
                    id="filterType"
                    className="form-select"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">All Files</option>
                    <option value="tax_return">Tax Returns</option>
                    <option value="bank_csv">Bank CSVs</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Showing:</label>
                  <p className="form-control-plaintext">
                    <strong>{filteredAndSortedFiles.length}</strong> of <strong>{files.length}</strong> files
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Files Table */}
          <div className="card">
            <div className="card-header">
              <h5>Files List</h5>
            </div>
            <div className="card-body">
              {filteredAndSortedFiles.length === 0 ? (
                <div className="text-center py-4">
                  <h5>No files found</h5>
                  <p className="text-muted">No files match your current filter criteria.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-dark">
                      <tr>
                        <th>Type</th>
                        <th 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('name')}
                        >
                          File Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('size')}
                        >
                          Size {sortField === 'size' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('uploaded_at')}
                        >
                          Uploaded {sortField === 'uploaded_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>Details</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedFiles.map((file) => (
                        <tr key={file.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <span className="me-2" style={{ fontSize: '1.2em' }}>
                                {getFileTypeIcon(file.type)}
                              </span>
                              {getFileTypeBadge(file.type)}
                            </div>
                          </td>
                          <td>
                            <strong>{file.name}</strong>
                          </td>
                          <td>{formatFileSize(file.size)}</td>
                          <td>{formatDate(file.uploaded_at)}</td>
                          <td>
                            {file.type === 'tax_return' && (
                              <div className="small">
                                <div><strong>Year:</strong> {file.year}</div>
                                <div><strong>Transactions:</strong> {file.transaction_count}</div>
                              </div>
                            )}
                            {file.type === 'bank_csv' && (
                              <div className="small">
                                <div><strong>Account:</strong> {file.account_name}</div>
                                <div><strong>Bank:</strong> {file.bank_name}</div>
                                <div><strong>Company:</strong> {file.company_name}</div>
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="btn-group" role="group">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleDownload(file.download_url, file.name)}
                                title="Download original file"
                              >
                                📥 Download
                              </button>
                              {file.type === 'tax_return' && file.view_data_url && (
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => window.open(`/tax-returns`, '_blank')}
                                  title="View in Tax Returns page"
                                >
                                  👁️ View
                                </button>
                              )}
                              {file.type === 'bank_csv' && file.view_transactions_url && (
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => window.open(`/transactions`, '_blank')}
                                  title="View transactions"
                                >
                                  💳 Transactions
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileViewer;
