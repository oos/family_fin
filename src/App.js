import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import People from './components/People';
import Properties from './components/Properties';
import BusinessAccounts from './components/BusinessAccounts';
import Income from './components/Income';
import LoanCalculator from './components/LoanCalculator';
import Loans from './components/Loans';
import Taxation from './components/Taxation';
import Pension from './components/Pension';
import CompanyPensionCalculator from './components/CompanyPensionCalculator';
import Transactions from './components/Transactions';
import Bookings from './components/Bookings';
import AdminPanel from './components/AdminPanel';
import UserDashboard from './components/UserDashboard';
import Login from './components/Login';
import './sidebar.css';

// Set up axios defaults
axios.defaults.baseURL = 'http://localhost:5001/api';

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

// Add response interceptor to handle 401 errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
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
function RoleBasedDashboard({ userRole }) {
  if (userRole === 'admin') {
    return <Dashboard />;
  } else if (userRole === 'user') {
    return <Navigate to="/user-dashboard" replace />;
  } else {
    // If role is not determined yet, show loading or redirect
    return <Navigate to="/user-dashboard" replace />;
  }
}

function Sidebar({ userRole, sidebarOpen, setSidebarOpen }) {
  const adminMenuItems = [
    { path: '/', icon: 'fas fa-tachometer-alt', label: 'Dashboard' },
    { path: '/people', icon: 'fas fa-users', label: 'People' },
    { path: '/properties', icon: 'fas fa-home', label: 'Properties' },
    { path: '/business-accounts', icon: 'fas fa-university', label: 'Business Accounts' },
    { path: '/income', icon: 'fas fa-euro-sign', label: 'Income' },
    { path: '/loans', icon: 'fas fa-credit-card', label: 'Loans' },
    { path: '/loan-calculator', icon: 'fas fa-calculator', label: 'Loan Calculator' },
    { path: '/taxation', icon: 'fas fa-file-invoice-dollar', label: 'Taxation' },
    { path: '/pension', icon: 'fas fa-piggy-bank', label: 'Pension' },
    { path: '/company-pension', icon: 'fas fa-building', label: 'Company Pension' },
    { path: '/transactions', icon: 'fas fa-exchange-alt', label: 'Transactions' },
    { path: '/bookings', icon: 'fas fa-calendar-check', label: 'Bookings' },
    { path: '/admin', icon: 'fas fa-cog', label: 'Admin Panel' }
  ];

  const userMenuItems = [
    { path: '/user-dashboard', icon: 'fas fa-tachometer-alt', label: 'My Dashboard' }
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
            <i className="fas fa-times"></i>
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
                  <i className={`${item.icon} me-2`}></i>
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      // Fetch user data for already logged in users
      const fetchUserData = async () => {
        try {
          setRoleLoading(true);
          const response = await axios.get('/user-dashboard');
          if (response.data.success) {
            setUserRole(response.data.dashboard.user.role);
            setCurrentUser(response.data.dashboard.user);
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          // If token is invalid, clear it
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        } finally {
          setRoleLoading(false);
        }
      };
      fetchUserData();
    } else {
      setRoleLoading(false);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (token, userData) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    setCurrentUser(userData);
    setRoleLoading(true);
    
    // Fetch user role
    try {
      const response = await axios.get('/user-dashboard');
      if (response.data.success) {
        setUserRole(response.data.dashboard.user.role);
        setCurrentUser(response.data.dashboard.user);
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
    } finally {
      setRoleLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentUser(null);
    setSidebarOpen(false);
    setRoleLoading(true);
  };

  if (loading || roleLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="App">
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
              <Route path="/" element={<RoleBasedDashboard userRole={userRole} />} />
              
              {/* Admin-only routes */}
              <Route path="/people" element={
                <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
                  <People />
                </ProtectedRoute>
              } />
              <Route path="/properties" element={
                <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
                  <Properties />
                </ProtectedRoute>
              } />
              <Route path="/business-accounts" element={
                <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
                  <BusinessAccounts />
                </ProtectedRoute>
              } />
              <Route path="/income" element={
                <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
                  <Income />
                </ProtectedRoute>
              } />
              <Route path="/loans" element={
                <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
                  <Loans />
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
              <Route path="/bookings" element={
                <ProtectedRoute userRole={userRole} requiredRole="admin" fallbackPath="/user-dashboard">
                  <Bookings />
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
            </Routes>
          </div>
        </div>
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
          <i className="fas fa-bars"></i>
        </button>
        
        <h1 className="navbar-brand mb-0">Family Finance Management</h1>
        
        <div className="d-flex align-items-center ms-auto">
          {currentUser && (
            <div className="dropdown profile-dropdown" key={`profile-${currentUser.id}`}>
              <button 
                className="btn btn-outline-light dropdown-toggle d-flex align-items-center" 
                type="button" 
                onClick={handleProfileClick}
                aria-expanded={profileDropdownOpen}
                title={`${currentUser.email} (${userRole?.toUpperCase()})`}
              >
                <i className="fas fa-user-circle fs-4"></i>
              </button>
              <ul className={`dropdown-menu dropdown-menu-end ${profileDropdownOpen ? 'show' : ''}`}>
                <li><h6 className="dropdown-header">Account</h6></li>
                <li><span className="dropdown-item-text">
                  <i className="fas fa-envelope me-2"></i>
                  {currentUser.email}
                </span></li>
                <li><span className="dropdown-item-text">
                  <i className="fas fa-shield-alt me-2"></i>
                  Role: {userRole?.toUpperCase()}
                </span></li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item" onClick={handleLogoutClick}>
                    <i className="fas fa-sign-out-alt me-2"></i>
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default App;
