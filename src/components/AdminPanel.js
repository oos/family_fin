import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [dashboardSettings, setDashboardSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPasswords, setShowPasswords] = useState({});
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resettingUser, setResettingUser] = useState(null);

  const availableSections = [
    { key: 'properties', label: 'Properties' },
    { key: 'loans', label: 'Loans' },
    { key: 'account_balances', label: 'Account Balances' },
    { key: 'bank_accounts', label: 'Bank Accounts' },
    { key: 'income', label: 'Income' },
    { key: 'pension', label: 'Pension' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'transactions', label: 'Transactions' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/users');
      if (response.data.success) {
        setUsers(response.data.users);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardSettings = async (userId) => {
    try {
      const response = await axios.get(`/dashboard-settings/${userId}`);
      if (response.data.success) {
        setDashboardSettings(response.data.settings);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Failed to fetch dashboard settings');
      console.error('Error fetching dashboard settings:', err);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    if (user.role === 'user') {
      fetchDashboardSettings(user.id);
    }
  };

  const handleSettingChange = (section, isVisible) => {
    setDashboardSettings(prev => 
      prev.map(setting => 
        setting.section === section 
          ? { ...setting, is_visible: isVisible }
          : setting
      )
    );
  };

  const handleSaveSettings = async () => {
    try {
      const settings = availableSections.map(section => ({
        section: section.key,
        is_visible: dashboardSettings.find(s => s.section === section.key)?.is_visible ?? true
      }));

      const response = await axios.put(`/dashboard-settings/${selectedUser.id}`, {
        settings
      });

      if (response.data.success) {
        alert('Dashboard settings saved successfully!');
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Failed to save dashboard settings');
      console.error('Error saving dashboard settings:', err);
    }
  };

  const togglePasswordVisibility = (userId) => {
    setShowPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleResetPassword = (user) => {
    setResettingUser(user);
    setResetPassword('');
    setShowResetModal(true);
  };

  const confirmPasswordReset = async () => {
    try {
      const response = await axios.post(`/users/${resettingUser.id}/reset-password`, {
        password: resetPassword
      });

      if (response.data.success) {
        alert('Password reset successfully!');
        setShowResetModal(false);
        setResetPassword('');
        setResettingUser(null);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Failed to reset password');
      console.error('Error resetting password:', err);
    }
  };

  const cancelPasswordReset = () => {
    setShowResetModal(false);
    setResetPassword('');
    setResettingUser(null);
  };

  if (loading) {
    return (
      <div className="container">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Admin Panel</h1>
      
      <div className="row">
        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              <h5>Users</h5>
            </div>
            <div className="card-body">
              <div className="list-group">
                {users.map(user => (
                  <div key={user.id} className={`list-group-item ${selectedUser?.id === user.id ? 'active' : ''}`}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div onClick={() => handleUserSelect(user)} style={{ cursor: 'pointer', flex: 1 }}>
                        <strong>{user.email}</strong>
                        <br />
                        <small className="text-muted">
                          Role: <span className={`badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}`}>
                            {user.role.toUpperCase()}
                          </span>
                        </small>
                        <br />
                        <small className="text-muted">
                          Password: {showPasswords[user.id] ? '••••••••' : '••••••••'}
                        </small>
                      </div>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => togglePasswordVisibility(user.id)}
                          title={showPasswords[user.id] ? 'Hide password' : 'Show password'}
                        >
                          {showPasswords[user.id] ? '👁️' : '👁️‍🗨️'}
                        </button>
                        <button
                          className="btn btn-outline-warning"
                          onClick={() => handleResetPassword(user)}
                          title="Reset password"
                        >
                          🔑
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          {selectedUser ? (
            <div className="card">
              <div className="card-header">
                <h5>Dashboard Settings for {selectedUser.email}</h5>
              </div>
              <div className="card-body">
                {selectedUser.role === 'admin' ? (
                  <div className="alert alert-info">
                    <strong>Admin users</strong> have access to all features and sections.
                  </div>
                ) : (
                  <div>
                    <p>Control which sections {selectedUser.email} can see on their dashboard:</p>
                    
                    <div className="row">
                      {availableSections.map(section => {
                        const setting = dashboardSettings.find(s => s.section === section.key);
                        const isVisible = setting ? setting.is_visible : true;
                        
                        return (
                          <div key={section.key} className="col-md-6 mb-3">
                            <div className="form-check form-switch">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`${section.key}-${selectedUser.id}`}
                                checked={isVisible}
                                onChange={(e) => handleSettingChange(section.key, e.target.checked)}
                              />
                              <label className="form-check-label" htmlFor={`${section.key}-${selectedUser.id}`}>
                                {section.label}
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4">
                      <button 
                        className="btn btn-primary"
                        onClick={handleSaveSettings}
                      >
                        Save Settings
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body text-center">
                <p className="text-muted">Select a user to manage their dashboard settings</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reset Password for {resettingUser?.email}</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={cancelPasswordReset}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">New Password</label>
                  <input 
                    type="password" 
                    className="form-control"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Confirm Password</label>
                  <input 
                    type="password" 
                    className="form-control"
                    placeholder="Confirm new password"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={cancelPasswordReset}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-warning"
                  onClick={confirmPasswordReset}
                  disabled={!resetPassword}
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
