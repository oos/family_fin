import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

function BusinessAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/business-accounts');
      setAccounts(response.data);
    } catch (err) {
      setError('Failed to load bank accounts');
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
        await axios.post('/api/business-accounts', formData);
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
      setError('Failed to save bank account');
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
        setError('Failed to delete bank account');
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


  if (loading) {
    return <div className="loading">Loading bank accounts...</div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>Bank Accounts</h1>
        <div className="d-flex gap-2">
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

    </div>
  );
}

export default BusinessAccounts;