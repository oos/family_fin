import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

function BusinessAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [configuringAccount, setConfiguringAccount] = useState(null);
  const [formData, setFormData] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
    company_name: '',
    is_active: true
  });
  const [apiFormData, setApiFormData] = useState({
    bank_api_url: 'https://b2b.revolut.com/api/1.0',
    client_id: '',
    client_secret: '',
    access_token: '',
    refresh_token: ''
  });
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/business-accounts');
      setAccounts(response.data);
    } catch (err) {
      setError('Failed to load business accounts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await axios.put(`/business-accounts/${editingAccount.id}`, formData);
      } else {
        await axios.post('/business-accounts', formData);
      }
      setShowModal(false);
      setEditingAccount(null);
      setFormData({
        account_name: '',
        account_number: '',
        bank_name: '',
        company_name: '',
        is_active: true
      });
      fetchAccounts();
    } catch (err) {
      setError('Failed to save business account');
      console.error(err);
    }
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      account_name: account.account_name,
      account_number: account.account_number,
      bank_name: account.bank_name,
      company_name: account.company_name,
      is_active: account.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        await axios.delete(`/business-accounts/${id}`);
        fetchAccounts();
      } catch (err) {
        setError('Failed to delete business account');
        console.error(err);
      }
    }
  };

  const handleAddNew = () => {
    setEditingAccount(null);
    setFormData({
      account_name: '',
      account_number: '',
      bank_name: '',
      company_name: '',
      is_active: true
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAccount(null);
    setFormData({
      account_name: '',
      account_number: '',
      bank_name: '',
      company_name: '',
      is_active: true
    });
  };

  const refreshAccountTransactions = async (accountId) => {
    try {
      setRefreshing(true);
      const response = await axios.post(`/business-accounts/${accountId}/refresh-transactions`);
      if (response.data.success) {
        // Refresh the accounts list to show updated data
        await fetchAccounts();
      }
    } catch (err) {
      setError('Failed to refresh account transactions');
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const refreshAllAccounts = async () => {
    try {
      setRefreshing(true);
      const response = await axios.post('/business-accounts/refresh-all');
      if (response.data.success) {
        // Refresh the accounts list to show updated data
        await fetchAccounts();
      }
    } catch (err) {
      setError('Failed to refresh all accounts');
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleConfigureApi = (account) => {
    setConfiguringAccount(account);
    setApiFormData({
      bank_api_url: account.api_credentials?.bank_api_url || '',
      client_id: account.api_credentials?.client_id || '',
      client_secret: account.api_credentials?.client_secret || '',
      access_token: account.api_credentials?.access_token || '',
      refresh_token: account.api_credentials?.refresh_token || ''
    });
    setShowApiModal(true);
  };

  const handleApiSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/business-accounts/${configuringAccount.id}/configure-api`, apiFormData);
      setShowApiModal(false);
      setConfiguringAccount(null);
      setApiFormData({
        bank_api_url: '',
        client_id: '',
        client_secret: '',
        access_token: '',
        refresh_token: ''
      });
      fetchAccounts();
    } catch (err) {
      setError('Failed to configure API credentials');
      console.error(err);
    }
  };

  const handleCloseApiModal = () => {
    setShowApiModal(false);
    setConfiguringAccount(null);
    setApiFormData({
      bank_api_url: '',
      client_id: '',
      client_secret: '',
      access_token: '',
      refresh_token: ''
    });
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

  const handleCsvImport = async (accountId) => {
    if (!csvFile) {
      alert('Please select a CSV file first');
      return;
    }

    setImportingCsv(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await axios.post(`/api/business-accounts/${accountId}/import-csv`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setImportResult({
          success: true,
          message: response.data.message,
          importedCount: response.data.imported_count,
          errors: response.data.errors || [],
          totalErrors: response.data.total_errors || 0
        });
        fetchAccounts(); // Refresh accounts to show updated balance
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

  if (loading) {
    return <div className="loading">Loading business accounts...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Business Accounts</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-outline" 
            onClick={refreshAllAccounts}
            disabled={refreshing}
            style={{ 
              opacity: refreshing ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            {refreshing && (
              <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid #f3f3f3', borderTop: '2px solid #007bff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            )}
            🔄 Refresh All Accounts
          </button>
          <button className="btn btn-primary" onClick={handleAddNew}>
            Add New Account
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card">
        <table className="table business-accounts-table">
          <thead>
            <tr>
              <th>Account Name</th>
              <th>Account Number</th>
              <th>Bank</th>
              <th>Company</th>
              <th>Balance</th>
              <th>API Status</th>
              <th>Last Refreshed</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(account => (
              <tr key={account.id}>
                <td><div className="account-name">{account.account_name}</div></td>
                <td>{account.account_number}</td>
                <td>{account.bank_name}</td>
                <td><div className="company-name">{account.company_name}</div></td>
                <td>€{account.balance?.toFixed(2) || '0.00'}</td>
                <td>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px',
                    backgroundColor: account.api_configured ? '#d4edda' : '#fff3cd',
                    color: account.api_configured ? '#155724' : '#856404'
                  }}>
                    {account.api_configured ? 'Configured' : 'Not Configured'}
                  </span>
                </td>
                <td>
                  {account.last_refreshed ? 
                    new Date(account.last_refreshed).toLocaleString() : 
                    'Never'
                  }
                </td>
                <td>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px',
                    backgroundColor: account.is_active ? '#d4edda' : '#f8d7da',
                    color: account.is_active ? '#155724' : '#721c24'
                  }}>
                    {account.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn btn-outline" 
                      onClick={() => handleConfigureApi(account)}
                      title="Configure bank API credentials"
                    >
                      ⚙️ API
                    </button>
                    <button 
                      className="btn btn-outline" 
                      onClick={() => refreshAccountTransactions(account.id)}
                      disabled={refreshing || !account.api_configured}
                      style={{ 
                        opacity: (refreshing || !account.api_configured) ? 0.6 : 1
                      }}
                      title={account.api_configured ? "Refresh transactions from bank API" : "Configure API first"}
                    >
                      🔄 Refresh
                    </button>
                    <button 
                      className="btn btn-info" 
                      onClick={() => {
                        setConfiguringAccount(account);
                        setShowCsvModal(true);
                      }}
                      title="Import transactions from CSV file"
                    >
                      📄 Import CSV
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => handleEdit(account)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-danger" 
                      onClick={() => handleDelete(account.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Account Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingAccount ? 'Edit Account' : 'Add New Account'}</h2>
              <button className="close" onClick={handleCloseModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="account_name">Account Name</label>
                <input
                  type="text"
                  id="account_name"
                  value={formData.account_name}
                  onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="account_number">Account Number</label>
                <input
                  type="text"
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="bank_name">Bank Name</label>
                <input
                  type="text"
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="company_name">Company Name</label>
                <input
                  type="text"
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  />
                  Active
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingAccount ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* API Configuration Modal */}
      {showApiModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Configure Bank API - {configuringAccount?.account_name}</h2>
              <button className="close" onClick={handleCloseApiModal}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleApiSubmit}>
                <div className="form-group">
                  <label htmlFor="bank_api_url">Bank API URL</label>
                <input
                  type="url"
                  id="bank_api_url"
                  value={apiFormData.bank_api_url}
                  onChange={(e) => setApiFormData({...apiFormData, bank_api_url: e.target.value})}
                  placeholder="https://b2b.revolut.com/api/1.0"
                  required
                />
                </div>
                
                <div className="form-group">
                  <label htmlFor="client_id">Client ID</label>
                  <input
                    type="text"
                    id="client_id"
                    value={apiFormData.client_id}
                    onChange={(e) => setApiFormData({...apiFormData, client_id: e.target.value})}
                    placeholder="Your bank API client ID"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="client_secret">Client Secret</label>
                  <input
                    type="password"
                    id="client_secret"
                    value={apiFormData.client_secret}
                    onChange={(e) => setApiFormData({...apiFormData, client_secret: e.target.value})}
                    placeholder="Your bank API client secret"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="access_token">Access Token</label>
                  <input
                    type="password"
                    id="access_token"
                    value={apiFormData.access_token}
                    onChange={(e) => setApiFormData({...apiFormData, access_token: e.target.value})}
                    placeholder="OAuth access token"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="refresh_token">Refresh Token</label>
                  <input
                    type="password"
                    id="refresh_token"
                    value={apiFormData.refresh_token}
                    onChange={(e) => setApiFormData({...apiFormData, refresh_token: e.target.value})}
                    placeholder="OAuth refresh token"
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleCloseApiModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save API Configuration
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Import CSV Transactions - {configuringAccount?.account_name}</h2>
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
                  onClick={() => handleCsvImport(configuringAccount.id)}
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
}

export default BusinessAccounts;