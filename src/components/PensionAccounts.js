import React, { useState, useEffect } from 'react';
import axios from 'axios';

function PensionAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({
    person_id: '',
    account_name: '',
    account_type: 'PRSA',
    provider: '',
    account_number: '',
    current_balance: '',
    is_active: true,
    opened_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [accountsRes, peopleRes] = await Promise.all([
        axios.get('/api/pension-accounts'),
        axios.get('/api/people')
      ]);
      setAccounts(accountsRes.data);
      setPeople(peopleRes.data);
    } catch (err) {
      setError('Failed to load pension accounts data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        current_balance: parseFloat(formData.current_balance) || 0,
        opened_date: formData.opened_date || null
      };

      if (editingAccount) {
        await axios.put(`/pension-accounts/${editingAccount.id}`, data);
        setAccounts(accounts.map(acc => acc.id === editingAccount.id ? { ...acc, ...data } : acc));
      } else {
        const response = await axios.post('/api/pension-accounts', data);
        setAccounts([...accounts, response.data]);
      }

      setShowModal(false);
      setEditingAccount(null);
      setFormData({
        person_id: '',
        account_name: '',
        account_type: 'PRSA',
        provider: '',
        account_number: '',
        current_balance: '',
        is_active: true,
        opened_date: '',
        notes: ''
      });
    } catch (err) {
      setError('Failed to save pension account');
      console.error(err);
    }
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      person_id: account.person_id,
      account_name: account.account_name,
      account_type: account.account_type,
      provider: account.provider,
      account_number: account.account_number || '',
      current_balance: account.current_balance.toString(),
      is_active: account.is_active,
      opened_date: account.opened_date || '',
      notes: account.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this pension account?')) {
      try {
        await axios.delete(`/pension-accounts/${id}`);
        setAccounts(accounts.filter(acc => acc.id !== id));
      } catch (err) {
        setError('Failed to delete pension account');
        console.error(err);
      }
    }
  };

  const handleAddNew = () => {
    setEditingAccount(null);
    setFormData({
      person_id: '',
      account_name: '',
      account_type: 'PRSA',
      provider: '',
      account_number: '',
      current_balance: '',
      is_active: true,
      opened_date: '',
      notes: ''
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAccount(null);
    setFormData({
      person_id: '',
      account_name: '',
      account_type: 'PRSA',
      provider: '',
      account_number: '',
      current_balance: '',
      is_active: true,
      opened_date: '',
      notes: ''
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (loading) {
    return <div className="loading">Loading pension accounts...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Pension Accounts</h1>
        <button className="btn btn-primary" onClick={handleAddNew}>
          Add New Account
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Account Name</th>
              <th>Person</th>
              <th>Type</th>
              <th>Provider</th>
              <th>Account Number</th>
              <th>Current Balance</th>
              <th>Opened Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => {
              const person = people.find(p => p.id === account.person_id);
              return (
                <tr key={account.id}>
                  <td style={{ fontWeight: '600' }} className="db-data">{account.account_name}</td>
                  <td className="db-data">{person ? person.name : 'Unknown'}</td>
                  <td>
                    <span style={{
                      backgroundColor: account.account_type === 'PRSA' ? '#e3f2fd' : '#f3e5f5',
                      color: account.account_type === 'PRSA' ? '#1976d2' : '#7b1fa2',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {account.account_type}
                    </span>
                  </td>
                  <td className="db-data">{account.provider}</td>
                  <td className="db-data">{account.account_number || '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }} className="db-data">{formatCurrency(account.current_balance)}</td>
                  <td>{account.opened_date || '-'}</td>
                  <td>
                    <span style={{
                      backgroundColor: account.is_active ? '#e8f5e8' : '#ffebee',
                      color: account.is_active ? '#2e7d32' : '#c62828',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {account.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => handleEdit(account)}
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-sm btn-danger" 
                        onClick={() => handleDelete(account.id)}
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingAccount ? 'Edit Pension Account' : 'Add New Pension Account'}</h2>
              <button className="close" onClick={handleCloseModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="person_id">Person</label>
                  <select
                    id="person_id"
                    value={formData.person_id}
                    onChange={(e) => setFormData({ ...formData, person_id: e.target.value })}
                    required
                  >
                    <option value="">Select a person</option>
                    {people.map(person => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="account_name">Account Name</label>
                  <input
                    type="text"
                    id="account_name"
                    value={formData.account_name}
                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="account_type">Account Type</label>
                  <select
                    id="account_type"
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                    required
                  >
                    <option value="PRSA">PRSA</option>
                    <option value="AVC">AVC</option>
                    <option value="Occupational">Occupational</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="provider">Provider</label>
                  <input
                    type="text"
                    id="provider"
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="account_number">Account Number</label>
                  <input
                    type="text"
                    id="account_number"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="current_balance">Current Balance (€)</label>
                  <input
                    type="number"
                    id="current_balance"
                    step="0.01"
                    value={formData.current_balance}
                    onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="opened_date">Opened Date</label>
                  <input
                    type="date"
                    id="opened_date"
                    value={formData.opened_date}
                    onChange={(e) => setFormData({ ...formData, opened_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    Is Active
                  </label>
                </div>
                <div className="form-group">
                  <label htmlFor="notes">Notes</label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="3"
                  />
                </div>
              </div>
              <div className="modal-footer">
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
    </div>
  );
}

export default PensionAccounts;
