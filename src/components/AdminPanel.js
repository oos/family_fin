import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

// Force deployment - AdminPanel API endpoints fixed

const AdminPanel = () => {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [availableProperties, setAvailableProperties] = useState([]);
  const [availableIncomes, setAvailableIncomes] = useState([]);
  const [availablePensions, setAvailablePensions] = useState([]);
  const [userLoanAccess, setUserLoanAccess] = useState([]);
  const [userAccountAccess, setUserAccountAccess] = useState([]);
  const [userPropertyAccess, setUserPropertyAccess] = useState([]);
  const [userIncomeAccess, setUserIncomeAccess] = useState([]);
  const [userPensionAccess, setUserPensionAccess] = useState([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams.get('tab');
    return tabFromUrl || 'permissions';
  });
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

  // Function to sort users in desired order: Omar, Heidi, Sean, Dwayne, Lena
  const getSortedUsers = () => {
    const order = [
      'omarosullivan@gmail.com',    // Omar
      'heidiosullivan@gmail.com',   // Heidi
      'sean.osullivan@gmail.com',   // Sean (corrected email)
      'dwayneosullivan@gmail.com',  // Dwayne
      'lenamosulivan@gmail.com'     // Lena
    ];
    
    // Filter out test users and duplicates, only show real users
    const realUsers = users.filter((user, index, self) => 
      !user.email.includes('test@example.com') && // Exclude test users
      index === self.findIndex(u => u.email === user.email) // Remove duplicates
    );
    
    return realUsers.sort((a, b) => {
      const aIndex = order.indexOf(a.email);
      const bIndex = order.indexOf(b.email);
      
      // If both users are in the order array, sort by their position
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // If only one user is in the order array, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      // If neither user is in the order array, sort alphabetically
      return a.email.localeCompare(b.email);
    });
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

  const hasPropertyAccess = (userId) => {
    const user = users.find(u => u.id === userId);
    if (user?.role === 'admin') return true;
    
    const setting = dashboardSettings.find(s => s.section === 'properties' && s.user_id === userId);
    return setting ? setting.is_visible : false;
  };

  const hasIncomeAccess = (userId) => {
    const user = users.find(u => u.id === userId);
    if (user?.role === 'admin') return true;
    
    const setting = dashboardSettings.find(s => s.section === 'income' && s.user_id === userId);
    return setting ? setting.is_visible : false;
  };

  const hasPensionAccess = (userId) => {
    const user = users.find(u => u.id === userId);
    if (user?.role === 'admin') return true;
    
    const setting = dashboardSettings.find(s => s.section === 'pensions' && s.user_id === userId);
    return setting ? setting.is_visible : false;
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle URL parameter changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  // Load dashboard settings for all users when users are loaded
  useEffect(() => {
    if (users.length > 0) {
      loadAllDashboardSettings();
    }
  }, [users]);

  // Load all data upfront for better performance
  useEffect(() => {
    if (users.length > 0) {
      console.log('Loading all admin data in parallel...');
      Promise.all([
        fetchLoansData(),
        fetchAccountsData(),
        fetchPropertiesData(),
        fetchIncomeData(),
        fetchPensionsData()
      ]).then(() => {
        console.log('All admin data loaded successfully');
      }).catch(err => {
        console.error('Error loading admin data:', err);
      });
    }
  }, [users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users');
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
      const response = await axios.get(`/api/dashboard-settings/${userId}`);
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
      const settingsPromises = getSortedUsers().map(user => 
        axios.get(`/api/dashboard-settings/${user.id}`)
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
    console.log('Tab change requested:', newTab, 'Current tab:', activeTab);
    if (hasUnsavedChanges && newTab !== activeTab) {
      setPendingTab(newTab);
      setShowSaveConfirm(true);
    } else {
      setActiveTab(newTab);
      // Update URL with new tab
      setSearchParams({ tab: newTab });
    }
  };

  const confirmTabChange = () => {
    setActiveTab(pendingTab);
    setSearchParams({ tab: pendingTab });
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
        
        return axios.put(`/api/dashboard-settings/${userId}`, { settings: settingsData });
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
        return axios.put(`/api/dashboard-settings/${userId}`, { settings: settingsData });
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
        return axios.post(`/api/user-access/loans/${userId}`, { loan_ids: loanIds });
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
        return axios.post(`/api/user-access/accounts/${userId}`, { account_ids: accountIds });
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
      const response = await axios.get('/api/loans');
      if (response.data.success) {
        setAvailableLoans(response.data.loans);
        // Load existing access for all users
        await loadAllLoanAccess();
      }
    } catch (err) {
      console.error('Error fetching loans:', err);
    }
  };

  const fetchAccountsData = async () => {
    try {
      const response = await axios.get('/api/business-accounts');
      if (response.data.success) {
        setAvailableAccounts(response.data.accounts);
        // Load existing access for all users
        await loadAllAccountAccess();
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  const fetchPropertiesData = async () => {
    try {
      console.log('Fetching properties data...');
      const response = await axios.get('/api/properties');
      console.log('Properties response:', response.data);
      if (response.data.success) {
        setAvailableProperties(response.data.properties);
        console.log('Properties loaded:', response.data.properties.length);
        // Load existing access for all users
        await loadAllPropertyAccess();
      }
    } catch (err) {
      console.error('Error fetching properties:', err);
    }
  };

  const fetchIncomeData = async () => {
    try {
      console.log('Fetching income data...');
      const response = await axios.get('/api/income');
      console.log('Income response:', response.data);
      if (response.data.success) {
        setAvailableIncomes(response.data.incomes);
        console.log('Income loaded:', response.data.incomes.length);
        // Load existing access for all users
        await loadAllIncomeAccess();
      }
    } catch (err) {
      console.error('Error fetching income:', err);
    }
  };

  const fetchPensionsData = async () => {
    try {
      console.log('Fetching pensions data...');
      const response = await axios.get('/api/pension-accounts');
      console.log('Pensions response:', response.data);
      if (response.data.success) {
        setAvailablePensions(response.data.pensions);
        console.log('Pensions loaded:', response.data.pensions.length);
        // Load existing access for all users
        await loadAllPensionAccess();
      }
    } catch (err) {
      console.error('Error fetching pensions:', err);
    }
  };

  const loadAllLoanAccess = async () => {
    try {
      const userAccessPromises = getSortedUsers().map(user => 
        axios.get(`/api/user-access/loans/${user.id}`)
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
      const userAccessPromises = getSortedUsers().map(user => 
        axios.get(`/api/user-access/accounts/${user.id}`)
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

  const loadAllPropertyAccess = async () => {
    try {
      console.log('Loading property access for all users...');
      const userAccessPromises = getSortedUsers().map(user => 
        axios.get(`/api/user-access/properties/${user.id}`)
      );
      const responses = await Promise.all(userAccessPromises);
      console.log('Property access responses:', responses.map(r => r.data));
      
      const allAccess = [];
      responses.forEach((response, index) => {
        if (response.data.success) {
          const userAccess = response.data.properties
            .filter(property => property.has_access)
            .map(property => ({ ...property, user_id: users[index].id }));
          allAccess.push(...userAccess);
        }
      });
      
      setUserPropertyAccess(allAccess);
    } catch (err) {
      console.error('Error loading property access:', err);
    }
  };

  const loadAllIncomeAccess = async () => {
    try {
      console.log('Loading income access for all users...');
      const userAccessPromises = getSortedUsers().map(user => 
        axios.get(`/api/user-access/income/${user.id}`)
      );
      const responses = await Promise.all(userAccessPromises);
      console.log('Income access responses:', responses.map(r => r.data));
      
      const allAccess = [];
      responses.forEach((response, index) => {
        if (response.data.success) {
          const userAccess = response.data.incomes
            .filter(income => income.has_access)
            .map(income => ({ ...income, user_id: users[index].id }));
          allAccess.push(...userAccess);
        }
      });
      
      setUserIncomeAccess(allAccess);
    } catch (err) {
      console.error('Error loading income access:', err);
    }
  };

  const loadAllPensionAccess = async () => {
    try {
      console.log('Loading pension access for all users...');
      const userAccessPromises = getSortedUsers().map(user => 
        axios.get(`/api/user-access/pensions/${user.id}`)
      );
      const responses = await Promise.all(userAccessPromises);
      console.log('Pension access responses:', responses.map(r => r.data));
      
      const allAccess = [];
      responses.forEach((response, index) => {
        if (response.data.success) {
          const userAccess = response.data.pensions
            .filter(pension => pension.has_access)
            .map(pension => ({ ...pension, user_id: users[index].id }));
          allAccess.push(...userAccess);
        }
      });
      
      setUserPensionAccess(allAccess);
    } catch (err) {
      console.error('Error loading pension access:', err);
    }
  };

  const fetchUserAccess = async (userId) => {
    try {
      setLoadingAccess(true);
      const [loansResponse, accountsResponse] = await Promise.all([
        axios.get(`/api/user-access/loans/${userId}`),
        axios.get(`/api/user-access/accounts/${userId}`)
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
        axios.post(`/api/user-access/loans/${selectedUser.id}`, { loan_ids: loanIds }),
        axios.post(`/api/user-access/accounts/${selectedUser.id}`, { account_ids: accountIds })
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

  const handlePropertyAccessChange = (propertyId, hasAccess) => {
    if (hasAccess) {
      const property = availableProperties.find(p => p.id === propertyId);
      if (property) {
        setUserPropertyAccess([...userPropertyAccess, property]);
      }
    } else {
      setUserPropertyAccess(userPropertyAccess.filter(p => p.id !== propertyId));
    }
  };

  const handlePropertyAccessChangeForUser = (propertyId, userId, hasAccess) => {
    if (hasAccess) {
      const property = availableProperties.find(p => p.id === propertyId);
      if (property) {
        setUserPropertyAccess(prev => [...prev, { ...property, user_id: userId }]);
      }
    } else {
      setUserPropertyAccess(prev => prev.filter(p => !(p.id === propertyId && p.user_id === userId)));
    }
    setHasUnsavedChanges(true);
  };

  const handleIncomeAccessChangeForUser = (incomeId, userId, hasAccess) => {
    if (hasAccess) {
      const income = availableIncomes.find(i => i.id === incomeId);
      if (income) {
        setUserIncomeAccess(prev => [...prev, { ...income, user_id: userId }]);
      }
    } else {
      setUserIncomeAccess(prev => prev.filter(i => !(i.id === incomeId && i.user_id === userId)));
    }
    setHasUnsavedChanges(true);
  };

  const handlePensionAccessChangeForUser = (pensionId, userId, hasAccess) => {
    if (hasAccess) {
      const pension = availablePensions.find(p => p.id === pensionId);
      if (pension) {
        setUserPensionAccess(prev => [...prev, { ...pension, user_id: userId }]);
      }
    } else {
      setUserPensionAccess(prev => prev.filter(p => !(p.id === pensionId && p.user_id === userId)));
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
        return axios.post(`/api/user-access/loans/${userId}`, { loan_ids: loanIds });
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
        return axios.post(`/api/user-access/accounts/${userId}`, { account_ids: accountIds });
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

      const response = await axios.put(`/api/dashboard-settings/${selectedUser.id}`, {
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
      const response = await axios.post(`/api/users/${resettingUser.id}/reset-password`, {
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
      const response = await axios.get('/api/app-settings');
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
      const response = await axios.put('/api/app-settings', {
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
            ⚙️
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
            👥
            User Permissions
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'loans' ? 'active' : ''}`}
            onClick={() => handleTabChange('loans')}
            type="button"
          >
            💳
            Loans Access
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'bank-accounts' ? 'active' : ''}`}
            onClick={() => handleTabChange('bank-accounts')}
            type="button"
          >
            🏦
            Bank Accounts Access
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'properties' ? 'active' : ''}`}
            onClick={() => handleTabChange('properties')}
            type="button"
          >
            <i className="fas fa-home me-2"></i>
            Properties Access
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'income' ? 'active' : ''}`}
            onClick={() => handleTabChange('income')}
            type="button"
          >
            <i className="fas fa-euro-sign me-2"></i>
            Income Access
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'pensions' ? 'active' : ''}`}
            onClick={() => handleTabChange('pensions')}
            type="button"
          >
            <i className="fas fa-piggy-bank me-2"></i>
            Pensions Access
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
                      {getSortedUsers().map(user => (
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
                        {getSortedUsers().map(user => {
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
                      {getSortedUsers().map(user => (
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
                    {/* OmHe Group - Only Omar and Heidi can access */}
                    <tr className="table-info">
                      <td colSpan={users.length + 1} className="fw-bold text-center">
                        <i className="fas fa-building me-2"></i>OmHe Group
                        <small className="text-muted d-block">Restricted to Omar and Heidi only</small>
                      </td>
                    </tr>
                    {availableLoans.filter(loan => 
                      ['19Abb Mortgage', '3GD Mortgage', '51LC Mortgage'].includes(loan.loan_name)
                    ).map(loan => (
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
                        {getSortedUsers().map(user => {
                          const isOmHeUser = user.email === 'omarosullivan@gmail.com' || user.email === 'heidiosullivan@gmail.com';
                          const hasAccess = user.role === 'admin' || (isOmHeUser && userLoanAccess.some(l => l.id === loan.id && l.user_id === user.id));
                          
                          return (
                            <td key={user.id} className="text-center">
                              {user.role === 'admin' ? (
                                <span className="badge bg-success">All Access</span>
                              ) : isOmHeUser ? (
                                <div className="form-check form-switch d-inline-block">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`loan-${loan.id}-${user.id}`}
                                    checked={hasAccess}
                                    onChange={(e) => handleLoanAccessChangeForUser(loan.id, user.id, e.target.checked)}
                                  />
                                </div>
                              ) : (
                                <span className="badge bg-secondary">No Access</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Secodwom Group - All users can access */}
                    <tr className="table-success">
                      <td colSpan={users.length + 1} className="fw-bold text-center">
                        🏦Secodwom Group
                        <small className="text-muted d-block">All users can access</small>
                      </td>
                    </tr>
                    {availableLoans.filter(loan => 
                      !['19Abb Mortgage', '3GD Mortgage', '51LC Mortgage'].includes(loan.loan_name)
                    ).map(loan => (
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
                        {getSortedUsers().map(user => {
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
        {activeTab === 'bank-accounts' && (
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
                      {getSortedUsers().map(user => (
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
                    {/* Omar and Heidi Group - Currently empty, will be populated later */}
                    <tr className="table-info">
                      <td colSpan={getSortedUsers().length + 1} className="fw-bold text-center">
                        <i className="fas fa-crown me-2"></i>Omar and Heidi Group
                        <small className="text-muted d-block">Restricted to Omar and Heidi only</small>
                      </td>
                    </tr>
                    {availableAccounts.filter(account => 
                      // For now, no accounts in this group - will be added later
                      false
                    ).map(account => (
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
                        {getSortedUsers().map(user => {
                          const isOmHeUser = user.email === 'omarosullivan@gmail.com' || user.email === 'heidiosullivan@gmail.com';
                          const hasAccess = user.role === 'admin' || (isOmHeUser && userAccountAccess.some(a => a.id === account.id && a.user_id === user.id));
                          
                          return (
                            <td key={user.id} className="text-center">
                              {user.role === 'admin' ? (
                                <span className="badge bg-success">All Access</span>
                              ) : isOmHeUser ? (
                                <div className="form-check form-switch d-inline-block">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`account-${account.id}-${user.id}`}
                                    checked={hasAccess}
                                    onChange={(e) => handleAccountAccessChangeForUser(account.id, user.id, e.target.checked)}
                                  />
                                </div>
                              ) : (
                                <span className="badge bg-secondary">No Access</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Secodwom Group - All users can access */}
                    <tr className="table-success">
                      <td colSpan={getSortedUsers().length + 1} className="fw-bold text-center">
                        🏦Secodwom Group
                        <small className="text-muted d-block">All users can access</small>
                      </td>
                    </tr>
                    {availableAccounts.filter(account => 
                      // For now, all accounts are in this group
                      true
                    ).map(account => (
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
                        {getSortedUsers().map(user => {
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

        {/* Properties Access Tab */}
        {activeTab === 'properties' && (
          <div className="card">
            <div className="card-header">
              <h5>Properties Access Control</h5>
              <p className="text-muted mb-0">Select which properties each user can access.</p>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th style={{ minWidth: '200px' }}>Property</th>
                      {getSortedUsers().map(user => (
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
                    {/* OmHe Group - Only Omar and Heidi can access */}
                    <tr className="table-info">
                      <td colSpan={getSortedUsers().length + 1} className="fw-bold text-center">
                        <i className="fas fa-building me-2"></i>OmHe Group
                        <small className="text-muted d-block">Restricted to Omar and Heidi only</small>
                      </td>
                    </tr>
                    {availableProperties.filter(property => 
                      ['19Abb', '3GD', '51LC'].includes(property.nickname)
                    ).map(property => (
                      <tr key={property.id}>
                        <td>
                          <div>
                            <strong>{property.nickname}</strong>
                            <br />
                            <small className="text-muted">
                              {property.address} - €{property.valuation?.toLocaleString() || '0'}
                            </small>
                          </div>
                        </td>
                        {getSortedUsers().map(user => {
                          const isOmHeUser = user.email === 'omarosullivan@gmail.com' || user.email === 'heidiosullivan@gmail.com';
                          const hasAccess = user.role === 'admin' || (isOmHeUser && userPropertyAccess.some(p => p.id === property.id && p.user_id === user.id));
                          
                          return (
                            <td key={user.id} className="text-center">
                              {user.role === 'admin' ? (
                                <span className="badge bg-success">All Access</span>
                              ) : isOmHeUser ? (
                                <div className="form-check form-switch d-inline-block">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`property-${property.id}-${user.id}`}
                                    checked={hasAccess}
                                    onChange={(e) => handlePropertyAccessChangeForUser(property.id, user.id, e.target.checked)}
                                  />
                                </div>
                              ) : (
                                <span className="badge bg-secondary">No Access</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Secodwom Group - All users can access */}
                    <tr className="table-success">
                      <td colSpan={getSortedUsers().length + 1} className="fw-bold text-center">
                        🏦Secodwom Group
                        <small className="text-muted d-block">All users can access</small>
                      </td>
                    </tr>
                    {availableProperties.filter(property => 
                      !['19Abb', '3GD', '51LC'].includes(property.nickname)
                    ).map(property => (
                      <tr key={property.id}>
                        <td>
                          <div>
                            <strong>{property.nickname}</strong>
                            <br />
                            <small className="text-muted">
                              {property.address} - €{property.valuation?.toLocaleString() || '0'}
                            </small>
                          </div>
                        </td>
                        {getSortedUsers().map(user => {
                          const hasAccess = user.role === 'admin' || userPropertyAccess.some(p => p.id === property.id && p.user_id === user.id);
                          const userHasPropertyAccess = hasPropertyAccess(user.id);
                          
                          return (
                            <td key={user.id} className="text-center">
                              {user.role === 'admin' ? (
                                <span className="badge bg-success">All Access</span>
                              ) : (
                                <div className={`form-check form-switch d-inline-block ${!userHasPropertyAccess ? 'opacity-50' : ''}`}>
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`property-${property.id}-${user.id}`}
                                    checked={hasAccess}
                                    disabled={!userHasPropertyAccess}
                                    onChange={(e) => handlePropertyAccessChangeForUser(property.id, user.id, e.target.checked)}
                                  />
                                  {!userHasPropertyAccess && (
                                    <small className="text-muted d-block">Properties disabled</small>
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

        {/* Income Access Tab */}
        {activeTab === 'income' && (
          <div className="card">
            <div className="card-header">
              <h5>Income Access Control</h5>
              <p className="text-muted mb-0">Select which income records each user can access.</p>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th style={{ minWidth: '200px' }}>Income Record</th>
                      {getSortedUsers().map(user => (
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
                    {/* Omar and Heidi Group - All Omar and Heidi incomes */}
                    <tr className="table-info">
                      <td colSpan={getSortedUsers().length + 1} className="fw-bold text-center">
                        <i className="fas fa-crown me-2"></i>Omar and Heidi Group
                        <small className="text-muted d-block">Restricted to Omar and Heidi only</small>
                      </td>
                    </tr>
                    {availableIncomes.filter(income => 
                      income.person_name === 'Omar' || income.person_name === 'Heidi'
                    ).map(income => (
                      <tr key={income.id}>
                        <td>
                          <div>
                            <strong>{income.person_name}</strong>
                            <br />
                            <small className="text-muted">
                              {income.income_type} - {income.income_category} - €{income.amount_yearly?.toLocaleString() || '0'}/year
                            </small>
                          </div>
                        </td>
                        {getSortedUsers().map(user => {
                          const isOmHeUser = user.email === 'omarosullivan@gmail.com' || user.email === 'heidiosullivan@gmail.com';
                          const hasAccess = user.role === 'admin' || (isOmHeUser && userIncomeAccess.some(i => i.id === income.id && i.user_id === user.id));
                          
                          return (
                            <td key={user.id} className="text-center">
                              {user.role === 'admin' ? (
                                <span className="badge bg-success">All Access</span>
                              ) : isOmHeUser ? (
                                <div className="form-check form-switch d-inline-block">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`income-${income.id}-${user.id}`}
                                    checked={hasAccess}
                                    onChange={(e) => handleIncomeAccessChangeForUser(income.id, user.id, e.target.checked)}
                                  />
                                </div>
                              ) : (
                                <span className="badge bg-secondary">No Access</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Other Users Group - All other incomes */}
                    <tr className="table-success">
                      <td colSpan={getSortedUsers().length + 1} className="fw-bold text-center">
                        👥Other Users Group
                        <small className="text-muted d-block">All users can access</small>
                      </td>
                    </tr>
                    {availableIncomes.filter(income => 
                      income.person_name !== 'Omar' && income.person_name !== 'Heidi'
                    ).map(income => (
                      <tr key={income.id}>
                        <td>
                          <div>
                            <strong>{income.person_name}</strong>
                            <br />
                            <small className="text-muted">
                              {income.income_type} - {income.income_category} - €{income.amount_yearly?.toLocaleString() || '0'}/year
                            </small>
                          </div>
                        </td>
                        {getSortedUsers().map(user => {
                          const hasAccess = user.role === 'admin' || userIncomeAccess.some(i => i.id === income.id && i.user_id === user.id);
                          const userHasIncomeAccess = hasIncomeAccess(user.id);
                          
                          return (
                            <td key={user.id} className="text-center">
                              {user.role === 'admin' ? (
                                <span className="badge bg-success">All Access</span>
                              ) : (
                                <div className={`form-check form-switch d-inline-block ${!userHasIncomeAccess ? 'opacity-50' : ''}`}>
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`income-${income.id}-${user.id}`}
                                    checked={hasAccess}
                                    disabled={!userHasIncomeAccess}
                                    onChange={(e) => handleIncomeAccessChangeForUser(income.id, user.id, e.target.checked)}
                                  />
                                  {!userHasIncomeAccess && (
                                    <small className="text-muted d-block">Income disabled</small>
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

        {/* Pensions Access Tab */}
        {activeTab === 'pensions' && (
          <div className="card">
            <div className="card-header">
              <h5>Pensions Access Control</h5>
              <p className="text-muted mb-0">Select which pension accounts each user can access.</p>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th style={{ minWidth: '200px' }}>Pension Account</th>
                      {getSortedUsers().map(user => (
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
                    {/* Omar and Heidi Group - All Omar and Heidi pensions */}
                    <tr className="table-info">
                      <td colSpan={getSortedUsers().length + 1} className="fw-bold text-center">
                        <i className="fas fa-crown me-2"></i>Omar and Heidi Group
                        <small className="text-muted d-block">Restricted to Omar and Heidi only</small>
                      </td>
                    </tr>
                    {availablePensions.filter(pension => 
                      pension.person_name === 'Omar' || pension.person_name === 'Heidi'
                    ).map(pension => (
                      <tr key={pension.id}>
                        <td>
                          <div>
                            <strong>{pension.account_name}</strong>
                            <br />
                            <small className="text-muted">
                              {pension.person_name} - {pension.account_type} - {pension.provider} - €{pension.current_balance?.toLocaleString() || '0'}
                            </small>
                          </div>
                        </td>
                        {getSortedUsers().map(user => {
                          const isOmHeUser = user.email === 'omarosullivan@gmail.com' || user.email === 'heidiosullivan@gmail.com';
                          const hasAccess = user.role === 'admin' || (isOmHeUser && userPensionAccess.some(p => p.id === pension.id && p.user_id === user.id));
                          
                          return (
                            <td key={user.id} className="text-center">
                              {user.role === 'admin' ? (
                                <span className="badge bg-success">All Access</span>
                              ) : isOmHeUser ? (
                                <div className="form-check form-switch d-inline-block">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`pension-${pension.id}-${user.id}`}
                                    checked={hasAccess}
                                    onChange={(e) => handlePensionAccessChangeForUser(pension.id, user.id, e.target.checked)}
                                  />
                                </div>
                              ) : (
                                <span className="badge bg-secondary">No Access</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Other Users Group - All other pensions */}
                    <tr className="table-success">
                      <td colSpan={getSortedUsers().length + 1} className="fw-bold text-center">
                        👥Other Users Group
                        <small className="text-muted d-block">All users can access</small>
                      </td>
                    </tr>
                    {availablePensions.filter(pension => 
                      pension.person_name !== 'Omar' && pension.person_name !== 'Heidi'
                    ).map(pension => (
                      <tr key={pension.id}>
                        <td>
                          <div>
                            <strong>{pension.account_name}</strong>
                            <br />
                            <small className="text-muted">
                              {pension.person_name} - {pension.account_type} - {pension.provider} - €{pension.current_balance?.toLocaleString() || '0'}
                            </small>
                          </div>
                        </td>
                        {getSortedUsers().map(user => {
                          const hasAccess = user.role === 'admin' || userPensionAccess.some(p => p.id === pension.id && p.user_id === user.id);
                          const userHasPensionAccess = hasPensionAccess(user.id);
                          
                          return (
                            <td key={user.id} className="text-center">
                              {user.role === 'admin' ? (
                                <span className="badge bg-success">All Access</span>
                              ) : (
                                <div className={`form-check form-switch d-inline-block ${!userHasPensionAccess ? 'opacity-50' : ''}`}>
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`pension-${pension.id}-${user.id}`}
                                    checked={hasAccess}
                                    disabled={!userHasPensionAccess}
                                    onChange={(e) => handlePensionAccessChangeForUser(pension.id, user.id, e.target.checked)}
                                  />
                                  {!userHasPensionAccess && (
                                    <small className="text-muted d-block">Pensions disabled</small>
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
                  ⚙️
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
