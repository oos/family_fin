import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import Entities from './components/Entities';
import People from './components/People';
import Properties from './components/Properties';
import BusinessAccounts from './components/BusinessAccounts';
import Income from './components/Income';
import LoanCalculator from './components/LoanCalculator';
import Loans from './components/Loans';
import Taxation from './components/Taxation';
import CompanyTaxation from './components/CompanyTaxation';
import Pension from './components/Pension';
import CompanyPensionCalculator from './components/CompanyPensionCalculator';
import NetWorth from './components/NetWorth';
import Transactions from './components/Transactions';
import GLTransactions from './components/GLTransactions';
import TaxReturns from './components/TaxReturns';
import TransactionMatching from './components/TransactionMatching';
import TransactionPredictions from './components/TransactionPredictions';
import Bookings from './components/Bookings';
import FileViewer from './components/FileViewer';
import AdminPanel from './components/AdminPanel';
import UserDashboard from './components/UserDashboard';
import UserLoans from './components/UserLoans';
import UserAccounts from './components/UserAccounts';
import Login from './components/Login';
import './sidebar.css';

// Set up axios defaults
axios.defaults.baseURL = (process.env.REACT_APP_API_URL || 'http://localhost:5002') + '/api';

// Function to validate and refresh token if needed
const validateToken = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('🔐 No token found in localStorage');
    return false;
  }
  
  try {
    console.log('🔐 Validating token...');
    // Test the token with a simple API call
    await axios.get('/api/user-dashboard');
    console.log('🔐 Token is valid');
    return true;
  } catch (error) {
    console.error('🔐 Token validation failed:', error);
    // Token is invalid, clear it
    localStorage.removeItem('token');
    return false;
  }
};

// Add request interceptor to include JWT token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 and 500 errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 500) {
      // Clear token and redirect to login for any auth-related errors
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Protected Route Component
function ProtectedRoute({ children, userRole, requiredRole, fallbackPath }) {
  if (userRole === requiredRole) {
    return children;
  }
  return <Navigate to={fallbackPath} replace />;
}

// Role-based Dashboard Component
function RoleBasedDashboard({ userRole, currentUser }) {
  if (userRole === 'admin') {
    return <Dashboard currentUser={currentUser} />;
  } else if (userRole === 'user') {
    return <Navigate to="/user-dashboard" replace />;
  } else {
    // If role is not determined yet, show loading or redirect
    return <Navigate to="/user-dashboard" replace />;
  }
}

function Sidebar({ userRole, sidebarOpen, setSidebarOpen }) {
  const adminMenuItems = [
    { path: '/', icon: '📊', label: 'Dashboard' },
    { path: '/entities', icon: '🗄️', label: 'Entities' },
    { path: '/networth', icon: '📈', label: 'Net Worth' },
    { path: '/income', icon: '💰', label: 'Family Incomes' },
    { path: '/loan-calculator', icon: '🧮', label: 'Loan Calculator' },
    { path: '/taxation', icon: '📋', label: 'Family Taxation' },
    { path: '/company-taxation', icon: '🏢', label: 'Company Taxation' },
    { path: '/pension', icon: '🐷', label: 'Pension' },
    { path: '/company-pension', icon: '🏢', label: 'Company Pension' },
        { path: '/transactions', icon: '🔄', label: 'Transactions' },
        { path: '/gl-transactions', icon: '📚', label: 'GL Transactions' },
        { path: '/tax-returns', icon: '📄', label: 'Tax Returns' },
        { path: '/transaction-matching', icon: '🔗', label: 'Transaction Matching' },
        { path: '/transaction-predictions', icon: '🧠', label: 'ML Predictions' },
        { path: '/bookings', icon: '📅', label: 'Bookings' },
        { path: '/files', icon: '📁', label: 'File Viewer' },
    { path: '/admin', icon: '⚙️', label: 'Admin Panel' }
  ];

  const userMenuItems = [
    { path: '/user-dashboard', icon: '📊', label: 'My Dashboard' },
    { path: '/user-loans', icon: '💳', label: 'My Loans' },
    { path: '/user-accounts', icon: '🏦', label: 'My Bank Accounts' }
  ];

  const menuItems = userRole === 'admin' ? adminMenuItems : userMenuItems;

  return (
    <>
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1040
          }}
        />
      )}
      
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h5 className="mb-0">Navigation</h5>
          <button 
            className="btn btn-sm btn-outline-light" 
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <ul className="nav flex-column">
            {menuItems.map((item, index) => (
              <li key={index} className="nav-item">
                <Link 
                  to={item.path} 
                  className="nav-link"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="me-2">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);

  // Expose authentication state to window for debugging
  useEffect(() => {
    window.isAuthenticated = isAuthenticated;
    window.userRole = userRole;
    window.currentUser = currentUser;
    window.roleLoading = roleLoading;
    window.loading = loading;
  }, [isAuthenticated, userRole, currentUser, roleLoading, loading]);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        // Validate the token first
        const isValid = await validateToken();
        if (isValid) {
          setIsAuthenticated(true);
          // Fetch user data for already logged in users
          try {
            setRoleLoading(true);
            const response = await axios.get('/api/user-dashboard');
            if (response.data.success) {
              setUserRole(response.data.dashboard.user.role);
              setCurrentUser(response.data.dashboard.user);
            }
          } catch (err) {
            console.error('Error fetching user data:', err);
            localStorage.removeItem('token');
            setIsAuthenticated(false);
          } finally {
            setRoleLoading(false);
          }
        } else {
          setIsAuthenticated(false);
          setRoleLoading(false);
        }
      } else {
        setIsAuthenticated(false);
        setRoleLoading(false);
      }
      setLoading(false);
    };
    
    initializeAuth();
  }, []);

  const handleLogin = async (token, userData) => {
    console.log('🔐 handleLogin called with:', { token: token ? 'Present' : 'Missing', userData });
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    setCurrentUser(userData);
    
    // Use role from login response if available
    if (userData && userData.role) {
      console.log('🔐 Using role from login response:', userData.role);
      setUserRole(userData.role);
      setRoleLoading(false);
    } else {
      console.log('🔐 Fetching user role from API...');
      // Fallback: fetch user role if not provided in login response
      setRoleLoading(true);
      try {
        const response = await Promise.race([
          axios.get('/api/user-dashboard'),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 10000)
          )
        ]);
        
        if (response.data.success) {
          setUserRole(response.data.dashboard.user.role);
          setCurrentUser(response.data.dashboard.user);
          console.log('🔐 User role fetched:', response.data.dashboard.user.role);
        } else {
          console.error('User dashboard response not successful:', response.data);
          setUserRole('user'); // Default fallback
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
        setUserRole('user'); // Default fallback
      } finally {
        setRoleLoading(false);
      }
    }
    
    console.log('🔐 Authentication state set, React will handle routing...');
    // Let React handle the routing - no need for manual redirect
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentUser(null);
    setSidebarOpen(false);
    setRoleLoading(false);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="App">
        {!isAuthenticated ? (
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        ) : roleLoading ? (
          <div className="loading">Loading user data...</div>
        ) : (
          <>
            <Navbar 
              onLogout={handleLogout} 
              userRole={userRole} 
              currentUser={currentUser}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
            />
            <Sidebar 
              userRole={userRole}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
            />
            <div className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`} style={{ paddingTop: '50px' }}>
              <div className="container-fluid mt-1">
                <Routes>
                  {/* Root route - role-based dashboard */}
                  <Route path="/" element={<RoleBasedDashboard userRole={userRole} currentUser={currentUser} />} />
              
              {/* Admin-only routes */}
              <Route path="/entities" element={
                <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
                  <Entities />
                </ProtectedRoute>
              } />
              <Route path="/networth" element={
                <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
                  <NetWorth />
                </ProtectedRoute>
              } />
              <Route path="/income" element={
                <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
                  <Income />
                </ProtectedRoute>
              } />
              <Route path="/loan-calculator" element={
                <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
                  <LoanCalculator />
                </ProtectedRoute>
              } />
              <Route path="/taxation" element={
                <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
                  <Taxation />
                </ProtectedRoute>
              } />
              <Route path="/company-taxation" element={
                <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
                  <CompanyTaxation />
                </ProtectedRoute>
              } />
              <Route path="/pension" element={
                <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
                  <Pension />
                </ProtectedRoute>
              } />
              <Route path="/company-pension" element={
                <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
                  <CompanyPensionCalculator />
                </ProtectedRoute>
              } />
              <Route path="/transactions" element={
                <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
                  <Transactions />
                </ProtectedRoute>
              } />
              <Route path="/gl-transactions" element={
                <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
                  <GLTransactions />
                </ProtectedRoute>
              } />
        <Route path="/tax-returns" element={
          <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
            <TaxReturns />
          </ProtectedRoute>
        } />
        <Route path="/transaction-matching" element={
          <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
            <TransactionMatching />
          </ProtectedRoute>
        } />
        <Route path="/transaction-predictions" element={
          <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
            <TransactionPredictions />
          </ProtectedRoute>
        } />
              <Route path="/bookings" element={
                <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
                  <Bookings />
                </ProtectedRoute>
              } />
              <Route path="/files" element={
                <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
                  <FileViewer />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
                  <AdminPanel />
                </ProtectedRoute>
              } />
              
              {/* User dashboard route */}
              <Route path="/user-dashboard" element={
                <ProtectedRoute userRole={userRole} requiredRole="user" fallbackPath="/">
                  <UserDashboard />
                </ProtectedRoute>
              } />
              
              {/* User-specific routes */}
              <Route path="/user-loans" element={
                <ProtectedRoute userRole={userRole} requiredRole="user" fallbackPath="/">
                  <UserLoans />
                </ProtectedRoute>
              } />
              <Route path="/user-accounts" element={
                <ProtectedRoute userRole={userRole} requiredRole="user" fallbackPath="/">
                  <UserAccounts />
                </ProtectedRoute>
              } />
                </Routes>
              </div>
            </div>
          </>
        )}
      </div>
    </Router>
  );
}

function Navbar({ onLogout, userRole, currentUser, sidebarOpen, setSidebarOpen }) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const handleProfileClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setProfileDropdownOpen(!profileDropdownOpen);
  };

  const handleLogoutClick = () => {
    setProfileDropdownOpen(false);
    onLogout();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownOpen && !event.target.closest('.profile-dropdown')) {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
      <div className="container-fluid">
          <button 
            className="btn btn-outline-light me-3" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
        
        <h1 className="navbar-brand mb-0">Family Finance Management</h1>
        
        <div className="d-flex align-items-center ms-auto">
          {currentUser && (
            <>
              <span className="text-light me-3">
                Welcome, {currentUser.username}!
              </span>
              <div className="dropdown profile-dropdown" key={`profile-${currentUser.id}`}>
              <button 
                className="btn btn-outline-light dropdown-toggle d-flex align-items-center" 
                type="button" 
                onClick={handleProfileClick}
                aria-expanded={profileDropdownOpen}
                title={`${currentUser.email} (${userRole?.toUpperCase()})`}
              >
                👤
              </button>
              <ul className={`dropdown-menu dropdown-menu-end ${profileDropdownOpen ? 'show' : ''}`}>
                <li><h6 className="dropdown-header">Account</h6></li>
                <li><span className="dropdown-item-text">
                  📧 {currentUser.email}
                </span></li>
                <li><span className="dropdown-item-text">
                  🛡️ Role: {userRole?.toUpperCase()}
                </span></li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item" onClick={handleLogoutClick}>
                    🚪 Logout
                  </button>
                </li>
              </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default App;
