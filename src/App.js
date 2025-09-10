import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      // Fetch user data for already logged in users
      const fetchUserData = async () => {
        try {
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
        }
      };
      fetchUserData();
    }
    setLoading(false);
  }, []);

  const handleLogin = async (token, userData) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    setCurrentUser(userData);
    
    // Fetch user role
    try {
      const response = await axios.get('/user-dashboard');
      if (response.data.success) {
        setUserRole(response.data.dashboard.user.role);
        setCurrentUser(response.data.dashboard.user);
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentUser(null);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="App">
        <Navbar onLogout={handleLogout} userRole={userRole} currentUser={currentUser} />
        <div className="container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/people" element={<People />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/business-accounts" element={<BusinessAccounts />} />
            <Route path="/income" element={<Income />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/loan-calculator" element={<LoanCalculator />} />
            <Route path="/taxation" element={<Taxation />} />
            <Route path="/pension" element={<Pension />} />
            <Route path="/company-pension" element={<CompanyPensionCalculator />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/user-dashboard" element={<UserDashboard />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

function Navbar({ onLogout, userRole, currentUser }) {
  return (
    <nav className="navbar">
      <div className="container">
        <h1>Family Finance Management</h1>
        <div className="d-flex align-items-center">
          <ul className="navbar-nav me-auto">
            {userRole === 'admin' ? (
              <>
                <li><Link to="/">Dashboard</Link></li>
                <li><Link to="/people">People</Link></li>
                <li><Link to="/properties">Properties</Link></li>
                <li><Link to="/business-accounts">Business Accounts</Link></li>
                <li><Link to="/income">Income</Link></li>
                <li><Link to="/loans">Loans</Link></li>
                <li><Link to="/loan-calculator">Loan Calculator</Link></li>
                <li><Link to="/taxation">Taxation</Link></li>
                <li><Link to="/pension">Pension</Link></li>
                <li><Link to="/company-pension">Company Pension</Link></li>
                <li><Link to="/transactions">Transactions</Link></li>
                <li><Link to="/bookings">Bookings</Link></li>
                <li><Link to="/admin">Admin Panel</Link></li>
              </>
            ) : (
              <>
                <li><Link to="/user-dashboard">My Dashboard</Link></li>
              </>
            )}
          </ul>
          <div className="d-flex align-items-center">
            {currentUser && (
              <span className="me-3 text-muted">
                Logged in as: <strong>{currentUser.email}</strong>
                <span className={`badge ms-2 ${userRole === 'admin' ? 'bg-danger' : 'bg-primary'}`}>
                  {userRole?.toUpperCase()}
                </span>
              </span>
            )}
            <button className="btn btn-secondary" onClick={onLogout}>Logout</button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default App;
