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
  
  // App settings state
  const [appSettings, setAppSettings] = useState([]);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  
  // Granular access control state
  const [availableLoans, setAvailableLoans] = useState([]);
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [userLoanAccess, setUserLoanAccess] = useState([]);
  const [userAccountAccess, setUserAccountAccess] = useState([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('permissions');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);

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

  // Function to extract name from email
  const getNameFromEmail = (email) => {
    const nameMap = {
      'omarosullivan@gmail.com': 'Omar',
      'sean.osullivan@gmail.com': 'Sean',
      'dwayneosullivan@gmail.com': 'Dwayne',
      'heidiosullivan@gmail.com': 'Heidi',
      'lenamosulivan@gmail.com': 'Lena',
      'seanosullivan@gmail.com': 'Sean O',
      'test@example.com': 'Test'
    };
    return nameMap[email] || email.split('@')[0].split('.')[0].charAt(0).toUpperCase() + email.split('@')[0].split('.')[0].slice(1);
  };

  // Function to check if user has access to loans based on dashboard settings
  const hasLoanAccess = (userId) => {
    const user = users.find(u => u.id === userId);
    if (user?.role === 'admin') return true;
    
    const setting = dashboardSettings.find(s => s.section === 'loans' && s.user_id === userId);
    return setting ? setting.is_visible : false;
  };

  // Function to check if user has access to bank accounts based on dashboard settings
  const hasAccountAccess = (userId) => {
    const user = users.find(u => u.id === userId);
    if (user?.role === 'admin') return true;
    
    const setting = dashboardSettings.find(s => s.section === 'bank_accounts' && s.user_id === userId);
    return setting ? setting.is_visible : false;
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Load dashboard settings for all users when users are loaded
  useEffect(() => {
    if (users.length > 0) {
      loadAllDashboardSettings();
    }
  }, [users]);

  // Load data when switching tabs
  useEffect(() => {
    if (activeTab === 'loans' && availableLoans.length === 0) {
      fetchLoansData();
    } else if (activeTab === 'accounts' && availableAccounts.length === 0) {
      fetchAccountsData();
    }
  }, [activeTab]);

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

  const loadAllDashboardSettings = async () => {
    try {
      const settingsPromises = users.map(user => 
        axios.get(`/dashboard-settings/${user.id}`)
      );
      const responses = await Promise.all(settingsPromises);
      
      const allSettings = [];
      responses.forEach((response, index) => {
        if (response.data.success) {
          const userSettings = response.data.settings.map(setting => ({
            ...setting,
            user_id: users[index].id
          }));
          allSettings.push(...userSettings);
        }
      });
      
      setDashboardSettings(allSettings);
    } catch (err) {
      console.error('Error loading dashboard settings:', err);
    }
  };

  const handleUserSelect = async (user) => {
    setSelectedUser(user);
    if (user.role === 'user') {
      await fetchDashboardSettings(user.id);
      await fetchUserAccess(user.id);
    }
  };

  const handleSettingChangeForUser = (section, userId, isVisible) => {
    setDashboardSettings(prev => {
      const existingSetting = prev.find(s => s.section === section && s.user_id === userId);
      
      if (existingSetting) {
        // Update existing setting
        return prev.map(setting => 
          setting.section === section && setting.user_id === userId
            ? { ...setting, is_visible: isVisible }
            : setting
        );
      } else {
        // Add new setting
        return [...prev, {
          section,
          user_id: userId,
          is_visible: isVisible
        }];
      }
    });
    setHasUnsavedChanges(true);
  };

  const handleTabChange = (newTab) => {
    if (hasUnsavedChanges && newTab !== activeTab) {
      setPendingTab(newTab);
      setShowSaveConfirm(true);
    } else {
      setActiveTab(newTab);
    }
  };

  const confirmTabChange = () => {
    setActiveTab(pendingTab);
    setShowSaveConfirm(false);
    setPendingTab(null);
  };

  const cancelTabChange = () => {
    setShowSaveConfirm(false);
    setPendingTab(null);
  };

  const handleSaveAllSettings = async () => {
    try {
      setLoading(true);
      
      // Group settings by user
      const settingsByUser = {};
      dashboardSettings.forEach(setting => {
        if (!settingsByUser[setting.user_id]) {
          settingsByUser[setting.user_id] = [];
        }
        settingsByUser[setting.user_id].push(setting);
      });
      
      // Save settings for each user
      const savePromises = Object.entries(settingsByUser).map(([userId, settings]) => {
        const settingsData = settings.map(s => ({
          section: s.section,
          is_visible: s.is_visible
        }));
        
        return axios.put(`/dashboard-settings/${userId}`, { settings: settingsData });
      });
      
      await Promise.all(savePromises);
      setHasUnsavedChanges(false);
      alert('All settings saved successfully!');
    } catch (err) {
      console.error('Error saving all settings:', err);
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const saveAllChanges = async () => {
    try {
      setLoading(true);
      
      // Save dashboard settings
      const settingsByUser = {};
      dashboardSettings.forEach(setting => {
        if (!settingsByUser[setting.user_id]) {
          settingsByUser[setting.user_id] = [];
        }
        settingsByUser[setting.user_id].push(setting);
      });
      
      const settingsPromises = Object.entries(settingsByUser).map(([userId, settings]) => {
        const settingsData = settings.map(s => ({
          section: s.section,
          is_visible: s.is_visible
        }));
        return axios.put(`/dashboard-settings/${userId}`, { settings: settingsData });
      });

      // Save loan access
      const loanAccessByUser = {};
      userLoanAccess.forEach(access => {
        if (!loanAccessByUser[access.user_id]) {
          loanAccessByUser[access.user_id] = [];
        }
        loanAccessByUser[access.user_id].push(access.id);
      });
      
      const loanPromises = Object.entries(loanAccessByUser).map(([userId, loanIds]) => {
        return axios.post(`/user-access/loans/${userId}`, { loan_ids: loanIds });
      });

      // Save account access
      const accountAccessByUser = {};
      userAccountAccess.forEach(access => {
        if (!accountAccessByUser[access.user_id]) {
          accountAccessByUser[access.user_id] = [];
        }
        accountAccessByUser[access.user_id].push(access.id);
      });
      
      const accountPromises = Object.entries(accountAccessByUser).map(([userId, accountIds]) => {
        return axios.post(`/user-access/accounts/${userId}`, { account_ids: accountIds });
      });

      // Execute all saves
      await Promise.all([...settingsPromises, ...loanPromises, ...accountPromises]);
      
      setHasUnsavedChanges(false);
      alert('All changes saved successfully!');
    } catch (err) {
      console.error('Error saving all changes:', err);
      alert('Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoansData = async () => {
    try {
      setLoadingAccess(true);
      const response = await axios.get('/loans');
      if (response.data.success) {
        setAvailableLoans(response.data.loans);
        // Load existing access for all users
        await loadAllLoanAccess();
      }
    } catch (err) {
      console.error('Error fetching loans:', err);
    } finally {
      setLoadingAccess(false);
    }
  };

  const fetchAccountsData = async () => {
    try {
      setLoadingAccess(true);
      const response = await axios.get('/business-accounts');
      if (response.data.success) {
        setAvailableAccounts(response.data.accounts);
        // Load existing access for all users
        await loadAllAccountAccess();
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoadingAccess(false);
    }
  };

  const loadAllLoanAccess = async () => {
    try {
      const userAccessPromises = users.map(user => 
        axios.get(`/user-access/loans/${user.id}`)
      );
      const responses = await Promise.all(userAccessPromises);
      
      const allAccess = [];
      responses.forEach((response, index) => {
        if (response.data.success) {
          const userAccess = response.data.loans
            .filter(loan => loan.has_access)
            .map(loan => ({ ...loan, user_id: users[index].id }));
          allAccess.push(...userAccess);
        }
      });
      
      setUserLoanAccess(allAccess);
    } catch (err) {
      console.error('Error loading loan access:', err);
    }
  };

  const loadAllAccountAccess = async () => {
    try {
      const userAccessPromises = users.map(user => 
        axios.get(`/user-access/accounts/${user.id}`)
      );
      const responses = await Promise.all(userAccessPromises);
      
      const allAccess = [];
      responses.forEach((response, index) => {
        if (response.data.success) {
          const userAccess = response.data.accounts
            .filter(account => account.has_access)
            .map(account => ({ ...account, user_id: users[index].id }));
          allAccess.push(...userAccess);
        }
      });
      
      setUserAccountAccess(allAccess);
    } catch (err) {
      console.error('Error loading account access:', err);
    }
  };

  const fetchUserAccess = async (userId) => {
    try {
      setLoadingAccess(true);
      const [loansResponse, accountsResponse] = await Promise.all([
        axios.get(`/user-access/loans/${userId}`),
        axios.get(`/user-access/accounts/${userId}`)
      ]);
      
      if (loansResponse.data.success) {
        setAvailableLoans(loansResponse.data.loans);
        setUserLoanAccess(loansResponse.data.loans.filter(loan => loan.has_access));
      }
      
      if (accountsResponse.data.success) {
        setAvailableAccounts(accountsResponse.data.accounts);
        setUserAccountAccess(accountsResponse.data.accounts.filter(account => account.has_access));
      }
    } catch (err) {
      console.error('Error fetching user access:', err);
    } finally {
      setLoadingAccess(false);
    }
  };

  const handleLoanAccessChange = (loanId, hasAccess) => {
    if (hasAccess) {
      const loan = availableLoans.find(l => l.id === loanId);
      if (loan) {
        setUserLoanAccess([...userLoanAccess, loan]);
      }
    } else {
      setUserLoanAccess(userLoanAccess.filter(l => l.id !== loanId));
    }
  };

  const handleAccountAccessChange = (accountId, hasAccess) => {
    if (hasAccess) {
      const account = availableAccounts.find(a => a.id === accountId);
      if (account) {
        setUserAccountAccess([...userAccountAccess, account]);
      }
    } else {
      setUserAccountAccess(userAccountAccess.filter(a => a.id !== accountId));
    }
  };

  const saveUserAccess = async () => {
    if (!selectedUser) return;
    
    try {
      setLoadingAccess(true);
      const loanIds = userLoanAccess.map(loan => loan.id);
      const accountIds = userAccountAccess.map(account => account.id);
      
      await Promise.all([
        axios.post(`/user-access/loans/${selectedUser.id}`, { loan_ids: loanIds }),
        axios.post(`/user-access/accounts/${selectedUser.id}`, { account_ids: accountIds })
      ]);
      
      alert('User access permissions saved successfully!');
    } catch (err) {
      console.error('Error saving user access:', err);
      alert('Failed to save user access permissions');
    } finally {
      setLoadingAccess(false);
    }
  };

  const handleLoanAccessChangeForUser = (loanId, userId, hasAccess) => {
    if (hasAccess) {
      const loan = availableLoans.find(l => l.id === loanId);
      if (loan) {
        setUserLoanAccess(prev => [...prev, { ...loan, user_id: userId }]);
      }
    } else {
      setUserLoanAccess(prev => prev.filter(l => !(l.id === loanId && l.user_id === userId)));
    }
    setHasUnsavedChanges(true);
  };

  const handleAccountAccessChangeForUser = (accountId, userId, hasAccess) => {
    if (hasAccess) {
      const account = availableAccounts.find(a => a.id === accountId);
      if (account) {
        setUserAccountAccess(prev => [...prev, { ...account, user_id: userId }]);
      }
    } else {
      setUserAccountAccess(prev => prev.filter(a => !(a.id === accountId && a.user_id === userId)));
    }
    setHasUnsavedChanges(true);
  };

  const saveAllLoanAccess = async () => {
    try {
      setLoadingAccess(true);
      
      // Group loan access by user
      const accessByUser = {};
      userLoanAccess.forEach(access => {
        if (!accessByUser[access.user_id]) {
          accessByUser[access.user_id] = [];
        }
        accessByUser[access.user_id].push(access.id);
      });
      
      // Save access for each user
      const savePromises = Object.entries(accessByUser).map(([userId, loanIds]) => {
        return axios.post(`/user-access/loans/${userId}`, { loan_ids: loanIds });
      });
      
      await Promise.all(savePromises);
      alert('Loans access permissions saved successfully!');
    } catch (err) {
      console.error('Error saving loans access:', err);
      alert('Failed to save loans access permissions');
    } finally {
      setLoadingAccess(false);
    }
  };

  const saveAllAccountAccess = async () => {
    try {
      setLoadingAccess(true);
      
      // Group account access by user
      const accessByUser = {};
      userAccountAccess.forEach(access => {
        if (!accessByUser[access.user_id]) {
          accessByUser[access.user_id] = [];
        }
        accessByUser[access.user_id].push(access.id);
      });
      
      // Save access for each user
      const savePromises = Object.entries(accessByUser).map(([userId, accountIds]) => {
        return axios.post(`/user-access/accounts/${userId}`, { account_ids: accountIds });
      });
      
      await Promise.all(savePromises);
      alert('Bank accounts access permissions saved successfully!');
    } catch (err) {
      console.error('Error saving accounts access:', err);
      alert('Failed to save accounts access permissions');
    } finally {
      setLoadingAccess(false);
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

  const fetchAppSettings = async () => {
    try {
      setSettingsLoading(true);
      const response = await axios.get('/app-settings');
      if (response.data.success) {
        setAppSettings(response.data.settings);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Failed to fetch app settings');
      console.error('Error fetching app settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleAppSettingChange = (settingKey, value) => {
    setAppSettings(prev => 
      prev.map(setting => 
        setting.setting_key === settingKey 
          ? { ...setting, setting_value: value }
          : setting
      )
    );
  };

  const handleSaveAppSettings = async () => {
    try {
      setSettingsLoading(true);
      const response = await axios.put('/app-settings', {
        settings: appSettings
      });

      if (response.data.success) {
        alert('App settings saved successfully! Please restart the servers for changes to take effect.');
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Failed to save app settings');
      console.error('Error saving app settings:', err);
    } finally {
      setSettingsLoading(false);
    }
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Admin Panel</h1>
        <div className="btn-group">
          <button
            className={`btn ${showAppSettings ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => {
              setShowAppSettings(!showAppSettings);
              if (!showAppSettings) {
                fetchAppSettings();
              }
            }}
          >
            <i className="fas fa-cog me-2"></i>
            App Settings
          </button>
        </div>
      </div>
      
      {/* Tabs Navigation */}
      <ul className="nav nav-tabs mb-3" id="adminTabs" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'permissions' ? 'active' : ''}`}
            onClick={() => handleTabChange('permissions')}
            type="button"
          >
            <i className="fas fa-users me-2"></i>
            User Permissions
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'loans' ? 'active' : ''}`}
            onClick={() => handleTabChange('loans')}
            type="button"
          >
            <i className="fas fa-credit-card me-2"></i>
            Loans Access
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'accounts' ? 'active' : ''}`}
            onClick={() => handleTabChange('accounts')}
            type="button"
          >
            <i className="fas fa-university me-2"></i>
            Bank Accounts Access
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      <div className="tab-content">
        {/* User Permissions Tab */}
        {activeTab === 'permissions' && (
          <div className="card">
            <div className="card-header">
              <h5>User Permissions Matrix</h5>
              <p className="text-muted mb-0">Toggle features for each user. Admin users have access to all features.</p>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th style={{ minWidth: '120px' }}>Feature</th>
                      {users.map(user => (
                        <th key={user.id} className="text-center" style={{ minWidth: '120px' }}>
                          <div className="d-flex flex-column align-items-center">
                            <div className="fw-bold">{getNameFromEmail(user.email)}</div>
                            <div className="small">
                              <span className={`badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}`}>
                                {user.role.toUpperCase()}
                              </span>
                            </div>
                            <div className="btn-group btn-group-sm mt-1">
                              <button
                                className="btn btn-outline-light btn-sm"
                                onClick={() => togglePasswordVisibility(user.id)}
                                title={showPasswords[user.id] ? 'Hide password' : 'Show password'}
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                              <button
                                className="btn btn-outline-warning btn-sm"
                                onClick={() => handleResetPassword(user)}
                                title="Reset password"
                              >
                                <i className="fas fa-key"></i>
                              </button>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {availableSections.map(section => (
                      <tr key={section.key}>
                        <td className="fw-bold">{section.label}</td>
                        {users.map(user => {
                          const setting = dashboardSettings.find(s => s.section === section.key && s.user_id === user.id);
                          const isVisible = user.role === 'admin' ? true : (setting ? setting.is_visible : false);
                          
                          return (
                            <td key={user.id} className="text-center">
                              {user.role === 'admin' ? (
                                <span className="badge bg-success">Always On</span>
                              ) : (
                                <div className="form-check form-switch d-inline-block">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`${section.key}-${user.id}`}
                                    checked={isVisible}
                                    onChange={(e) => handleSettingChangeForUser(section.key, user.id, e.target.checked)}
                                  />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
            </div>
          </div>
        )}

        {/* Loans Access Tab */}
        {activeTab === 'loans' && (
          <div className="card">
            <div className="card-header">
              <h5>Loans Access Control</h5>
              <p className="text-muted mb-0">Select which loans each user can access.</p>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th style={{ minWidth: '200px' }}>Loan</th>
                      {users.map(user => (
                        <th key={user.id} className="text-center" style={{ minWidth: '120px' }}>
                          <div className="fw-bold">{getNameFromEmail(user.email)}</div>
                          <div className="small">
                            <span className={`badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}`}>
                              {user.role.toUpperCase()}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {availableLoans.map(loan => (
                      <tr key={loan.id}>
                        <td>
                          <div>
                            <strong>{loan.loan_name}</strong>
                            <br />
                            <small className="text-muted">
                              {loan.lender} - €{loan.current_balance?.toLocaleString() || '0'}
                            </small>
                          </div>
                        </td>
                        {users.map(user => {
                          const hasAccess = user.role === 'admin' || userLoanAccess.some(l => l.id === loan.id && l.user_id === user.id);
                          const userHasLoanAccess = hasLoanAccess(user.id);
                          
                          return (
                            <td key={user.id} className="text-center">
                              {user.role === 'admin' ? (
                                <span className="badge bg-success">All Access</span>
                              ) : (
                                <div className={`form-check form-switch d-inline-block ${!userHasLoanAccess ? 'opacity-50' : ''}`}>
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`loan-${loan.id}-${user.id}`}
                                    checked={hasAccess}
                                    disabled={!userHasLoanAccess}
                                    onChange={(e) => handleLoanAccessChangeForUser(loan.id, user.id, e.target.checked)}
                                  />
                                  {!userHasLoanAccess && (
                                    <small className="text-muted d-block">Loans disabled</small>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
            </div>
          </div>
        )}

        {/* Bank Accounts Access Tab */}
        {activeTab === 'accounts' && (
          <div className="card">
            <div className="card-header">
              <h5>Bank Accounts Access Control</h5>
              <p className="text-muted mb-0">Select which bank accounts each user can access.</p>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th style={{ minWidth: '200px' }}>Bank Account</th>
                      {users.map(user => (
                        <th key={user.id} className="text-center" style={{ minWidth: '120px' }}>
                          <div className="fw-bold">{getNameFromEmail(user.email)}</div>
                          <div className="small">
                            <span className={`badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}`}>
                              {user.role.toUpperCase()}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {availableAccounts.map(account => (
                      <tr key={account.id}>
                        <td>
                          <div>
                            <strong>{account.account_name}</strong>
                            <br />
                            <small className="text-muted">
                              {account.bank_name} - {account.account_number}
                            </small>
                          </div>
                        </td>
                        {users.map(user => {
                          const hasAccess = user.role === 'admin' || userAccountAccess.some(a => a.id === account.id && a.user_id === user.id);
                          const userHasAccountAccess = hasAccountAccess(user.id);
                          
                          return (
                            <td key={user.id} className="text-center">
                              {user.role === 'admin' ? (
                                <span className="badge bg-success">All Access</span>
                              ) : (
                                <div className={`form-check form-switch d-inline-block ${!userHasAccountAccess ? 'opacity-50' : ''}`}>
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`account-${account.id}-${user.id}`}
                                    checked={hasAccess}
                                    disabled={!userHasAccountAccess}
                                    onChange={(e) => handleAccountAccessChangeForUser(account.id, user.id, e.target.checked)}
                                  />
                                  {!userHasAccountAccess && (
                                    <small className="text-muted d-block">Bank Accounts disabled</small>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
            </div>
          </div>
        )}
      </div>

      {/* Unified Save Button */}
      {hasUnsavedChanges && (
        <div className="fixed-bottom bg-light border-top p-3">
          <div className="container">
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-warning">
                <i className="fas fa-exclamation-triangle me-2"></i>
                You have unsaved changes
              </div>
              <button 
                className="btn btn-primary btn-lg"
                onClick={saveAllChanges}
                disabled={loading}
              >
                <i className="fas fa-save me-2"></i>
                {loading ? 'Saving...' : 'Save All Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Confirmation Modal */}
      {showSaveConfirm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Unsaved Changes</h5>
              </div>
              <div className="modal-body">
                <p>You have unsaved changes. Do you want to save them before switching tabs, or you will lose your data?</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={cancelTabChange}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-warning"
                  onClick={confirmTabChange}
                >
                  Discard Changes
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={async () => {
                    await saveAllChanges();
                    confirmTabChange();
                  }}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save & Continue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* App Settings Panel */}
      {showAppSettings && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="fas fa-cog me-2"></i>
                  Application Settings
                </h5>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setShowAppSettings(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="card-body">
                {settingsLoading ? (
                  <div className="text-center">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="alert alert-info">
                      <i className="fas fa-info-circle me-2"></i>
                      <strong>Port Configuration:</strong> Configure the ports for the frontend and backend applications. 
                      Changes will take effect after restarting both servers.
                    </div>
                    
                    <div className="row">
                      {appSettings.map(setting => (
                        <div key={setting.setting_key} className="col-md-6 mb-3">
                          <div className="card">
                            <div className="card-body">
                              <h6 className="card-title">
                                {setting.setting_key === 'frontend_port' ? 'Frontend Port' : 'Backend Port'}
                                <span className="badge bg-secondary ms-2">
                                  {setting.setting_key === 'frontend_port' ? 'React App' : 'Flask API'}
                                </span>
                              </h6>
                              <p className="card-text text-muted small">
                                {setting.description}
                              </p>
                              <div className="input-group">
                                <span className="input-group-text">
                                  <i className={`fas ${setting.setting_key === 'frontend_port' ? 'fa-globe' : 'fa-server'}`}></i>
                                </span>
                                <input
                                  type="number"
                                  className="form-control"
                                  value={setting.setting_value}
                                  onChange={(e) => handleAppSettingChange(setting.setting_key, e.target.value)}
                                  min="1000"
                                  max="65535"
                                  placeholder={`Enter ${setting.setting_key === 'frontend_port' ? 'frontend' : 'backend'} port`}
                                />
                                <span className="input-group-text">Port</span>
                              </div>
                              <small className="text-muted">
                                Current URL: {setting.setting_key === 'frontend_port' ? 
                                  `http://localhost:${setting.setting_value}` : 
                                  `http://localhost:${setting.setting_value}/api`
                                }
                              </small>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      <div className="alert alert-warning">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        <strong>Important:</strong> After changing ports, you must:
                        <ol className="mb-0 mt-2">
                          <li>Stop both the frontend and backend servers</li>
                          <li>Update the frontend's axios baseURL if needed</li>
                          <li>Restart both servers with the new ports</li>
                        </ol>
                      </div>
                      
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-primary"
                          onClick={handleSaveAppSettings}
                          disabled={settingsLoading}
                        >
                          <i className="fas fa-save me-2"></i>
                          Save Settings
                        </button>
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => setShowAppSettings(false)}
                        >
                          <i className="fas fa-times me-2"></i>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
