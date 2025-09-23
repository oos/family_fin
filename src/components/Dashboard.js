import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatNumber, getChartConfig } from '../utils/chartConfig';
import FinancialOverview from './FinancialOverview';

function Dashboard({ currentUser }) {
  const [summary, setSummary] = useState(null);
  const [properties, setProperties] = useState([]);
  const [income, setIncome] = useState([]);
  const [loans, setLoans] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loanBalances, setLoanBalances] = useState([]);
  const [accountBalances, setAccountBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState('equity');
  const [sortDirection, setSortDirection] = useState('desc');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [summaryRes, propertiesRes, incomeRes, loansRes, accountsRes, loanBalancesRes, accountBalancesRes] = await Promise.all([
        axios.get('/api/dashboard/summary'),
        axios.get('/api/properties'),
        axios.get('/api/income'),
        axios.get('/api/loans'),
        axios.get('/api/business-accounts'),
        axios.get('/api/user-loan-balances'),
        axios.get('/api/user-account-balances')
      ]);
      
      setSummary(summaryRes.data);
      setProperties(propertiesRes.data);
      setIncome(incomeRes.data);
      setLoans(loansRes.data.success ? loansRes.data.loans : []);
      setAccounts(accountsRes.data.success ? accountsRes.data.accounts : []);
      setLoanBalances(loanBalancesRes.data.success ? loanBalancesRes.data.balances : []);
      setAccountBalances(accountBalancesRes.data.success ? accountBalancesRes.data.balances : []);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
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

  const getSortedProperties = () => {
    return [...properties].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle string comparison for property names
      if (sortField === 'nickname' || sortField === 'address') {
        aValue = aValue?.toString().toLowerCase() || '';
        bValue = bValue?.toString().toLowerCase() || '';
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // Helper functions for financial calculations
  const getCurrentLoanBalance = (loanId) => {
    const balance = loanBalances.find(b => b.loan_id === loanId);
    return balance ? balance.balance : 0;
  };

  const getCurrentAccountBalance = (accountId) => {
    const balance = accountBalances.find(b => b.account_id === accountId);
    return balance ? balance.balance : 0;
  };

  const getTotalLoanBalance = () => {
    return loans.reduce((total, loan) => total + getCurrentLoanBalance(loan.id), 0);
  };

  const getTotalAccountBalance = () => {
    return accounts.reduce((total, account) => total + getCurrentAccountBalance(account.id), 0);
  };

  const getNetPosition = () => {
    return getTotalAccountBalance() - getTotalLoanBalance();
  };

  // Check if current user is Sean (either email)
  const isSeanUser = currentUser && (
    currentUser.email === 'seanosullivan@gmail.com' || 
    currentUser.email === 'sean.osullivan@gmail.com'
  );

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  // Prepare data for charts and sort by equity (high to low)
  const propertyData = properties
    .map(prop => ({
      name: prop.nickname,
      value: prop.valuation,
      mortgage: prop.mortgage_balance,
      equity: prop.equity,
      rental: prop.rental_income_yearly
    }))
    .sort((a, b) => b.equity - a.equity);

  // Prepare rental income data sorted by rental income (high to low)
  const rentalData = properties
    .map(prop => ({
      name: prop.nickname,
      rental: prop.rental_income_yearly
    }))
    .sort((a, b) => b.rental - a.rental);

  const incomeData = income.reduce((acc, inc) => {
    const existing = acc.find(item => item.person_name === inc.person_name);
    if (existing) {
      existing[inc.income_type] = inc.amount_yearly;
    } else {
      acc.push({
        person_name: inc.person_name,
        external_source: 0,
        rrltd: 0,
        omhe_props: 0,
        [inc.income_type]: inc.amount_yearly
      });
    }
    return acc;
  }, []);

  // Group by family using the family data from the API
  const familyGroups = incomeData.reduce((groups, person) => {
    const familyName = person.family?.name || 'Unknown Family';
    if (!groups[familyName]) {
      groups[familyName] = [];
    }
    groups[familyName].push(person);
    return groups;
  }, {});

  // Convert to array and sort by family name
  const familyGroupsArray = Object.entries(familyGroups).map(([name, members]) => ({
    name,
    members
  })).sort((a, b) => a.name.localeCompare(b.name));


  return (
    <div>
      {/* Conditional Layout - New layout only for Sean */}
      {isSeanUser ? (
        <>
          {/* Net Position Summary - Full width at the very top */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card" style={{ backgroundColor: '#f8f9fa', border: '2px solid #dee2e6' }}>
                <div className="card-body text-center">
                  <h4 className="mb-3">Net Financial Position</h4>
                  <div className="row">
                    <div className="col-md-4">
                      <h6 className="text-muted">Total Cash</h6>
                      <h4 className="text-success">{formatCurrency(getTotalAccountBalance())}</h4>
                    </div>
                    <div className="col-md-4">
                      <h6 className="text-muted">Total Debt</h6>
                      <h4 className="text-danger">{formatCurrency(getTotalLoanBalance())}</h4>
                    </div>
                    <div className="col-md-4">
                      <h6 className="text-muted">Net Position</h6>
                      <h3 className={getNetPosition() >= 0 ? 'text-success' : 'text-danger'}>
                        {formatCurrency(getNetPosition())}
                      </h3>
                      <small className="text-muted">
                        {getNetPosition() >= 0 ? 'Positive (Cash > Debt)' : 'Negative (Debt > Cash)'}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h1 style={{ marginTop: '0', marginBottom: '1rem' }}>Dashboard</h1>

          {/* Financial Position Overview - Split into two panels */}
          <div className="row" style={{ marginBottom: '20px' }}>
            {/* Left Panel - Bank Accounts & Cash */}
            <div className="col-md-6">
              <div className="card h-100" style={{ border: '2px solid #28a745' }}>
                <div className="card-header" style={{ backgroundColor: '#d4edda', borderBottom: '1px solid #28a745' }}>
                  <h3 className="mb-0 text-success">
                    <span className="me-2" style={{ fontSize: '1.2em' }}>🏦</span>Bank Accounts & Cash
                  </h3>
                </div>
                <div className="card-body">
                  <FinancialOverview
                    type="accounts"
                    items={accounts}
                    balances={accountBalances}
                    title=""
                    icon=""
                    colorClass="text-success"
                    borderClass="border-success"
                    showHistory={false}
                    showViewButton={true}
                  />
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid #dee2e6' }}>
                    <div className="text-center">
                      <h6 className="text-muted">Total Cash</h6>
                      <h4 className="text-success">{formatCurrency(getTotalAccountBalance())}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Loans & Debt */}
            <div className="col-md-6">
              <div className="card h-100" style={{ border: '2px solid #dc3545' }}>
                <div className="card-header" style={{ backgroundColor: '#f8d7da', borderBottom: '1px solid #dc3545' }}>
                  <h3 className="mb-0 text-danger">
                    <span className="me-2" style={{ fontSize: '1.2em' }}>💳</span>Loans & Debt
                  </h3>
                </div>
                <div className="card-body">
                  <FinancialOverview
                    type="loans"
                    items={loans}
                    balances={loanBalances}
                    title=""
                    icon=""
                    colorClass="text-danger"
                    borderClass="border-danger"
                    showHistory={false}
                    showViewButton={true}
                  />
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid #dee2e6' }}>
                    <div className="text-center">
                      <h6 className="text-muted">Total Debt</h6>
                      <h4 className="text-danger">{formatCurrency(getTotalLoanBalance())}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <h1 style={{ marginTop: '0', marginBottom: '1rem' }}>Dashboard</h1>
      )}

      {/* Summary Cards - Single Row */}
      <div className="dashboard-single-row">
        <div className="dashboard-card">
          <h3>Total Property Value</h3>
          <div className="value positive">{formatCurrency(summary?.total_property_value || 0)}</div>
        </div>
        <div className="dashboard-card">
          <h3>Total Mortgage Balance</h3>
          <div className="value negative">{formatCurrency(summary?.total_mortgage_balance || 0)}</div>
        </div>
        <div className="dashboard-card">
          <h3>Total Equity</h3>
          <div className="value positive">{formatCurrency(summary?.net_worth || 0)}</div>
        </div>
        <div className="dashboard-card">
          <h3>Annual Rental Income</h3>
          <div className="value positive">{formatCurrency(summary?.total_rental_income || 0)}</div>
        </div>
        <div className="dashboard-card">
          <h3>Monthly Total Income</h3>
          <div className="value positive">{formatCurrency(summary?.total_monthly_income || 0)}</div>
        </div>
        <div className="dashboard-card">
          <h3>Properties Count</h3>
          <div className="value">{properties.length}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3>Property Financial Overview</h3>
        <div className="charts-container" style={{ padding: '10px 0' }}>
          <div>
            <h4 style={{ marginBottom: '10px', textAlign: 'center', color: '#666', fontSize: '18px', fontWeight: '600' }}>Property Values, Mortgages & Equity</h4>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={propertyData} margin={getChartConfig().margin}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  {...getChartConfig().xAxis}
                />
                <YAxis 
                  tickFormatter={(value) => formatNumber(value)} 
                  domain={[0, 'dataMax']}
                  {...getChartConfig().yAxis}
                />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#8884d8" name="Property Value" />
                <Bar dataKey="mortgage" fill="#82ca9d" name="Mortgage Balance" />
                <Bar dataKey="equity" fill="#ffc658" name="Equity" />
              </BarChart>
            </ResponsiveContainer>
            
            {/* Legend for Property Values Chart */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              flexWrap: 'wrap',
              gap: '20px', 
              marginTop: '0px',
              padding: '8px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '18px', height: '18px', backgroundColor: '#8884d8', borderRadius: '3px' }}></div>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>Property Value</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '18px', height: '18px', backgroundColor: '#82ca9d', borderRadius: '3px' }}></div>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>Mortgage Balance</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '18px', height: '18px', backgroundColor: '#ffc658', borderRadius: '3px' }}></div>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>Equity</span>
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ marginBottom: '10px', textAlign: 'center', color: '#666', fontSize: '18px', fontWeight: '600' }}>Rental Income by Property</h4>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={rentalData} margin={getChartConfig().margin}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  {...getChartConfig().xAxis}
                />
                <YAxis 
                  tickFormatter={(value) => formatNumber(value)} 
                  domain={[0, 'dataMax']}
                  {...getChartConfig().yAxis}
                />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="rental" fill="#ffc658" name="Annual Rental Income" />
              </BarChart>
            </ResponsiveContainer>
            
            {/* Legend for Rental Income Chart */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              flexWrap: 'wrap',
              gap: '20px', 
              marginTop: '0px',
              padding: '8px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '18px', height: '18px', backgroundColor: '#ffc658', borderRadius: '3px', border: '2px solid #e9ecef' }}></div>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>Rental Income</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Property Details Table */}
      <div className="card" style={{ marginTop: '10px' }}>
        <h3>Property Details</h3>
        <table className="table">
          <thead>
            <tr>
              <th 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('nickname')}
              >
                Property {getSortIcon('nickname')}
              </th>
              <th 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('valuation')}
              >
                Value {getSortIcon('valuation')}
              </th>
              <th 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('mortgage_balance')}
              >
                Mortgage {getSortIcon('mortgage_balance')}
              </th>
              <th 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('equity')}
              >
                Equity {getSortIcon('equity')}
              </th>
              <th 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('rental_income_yearly')}
              >
                Rental Income {getSortIcon('rental_income_yearly')}
              </th>
              <th 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('lender')}
              >
                Lender {getSortIcon('lender')}
              </th>
              <th>Ownership</th>
            </tr>
          </thead>
          <tbody>
            {getSortedProperties().map(prop => (
              <tr key={prop.id}>
                <td>
                  <div>
                    <strong>{prop.nickname}</strong>
                    <br />
                    <small>{prop.address}</small>
                  </div>
                </td>
                <td>{formatCurrency(prop.valuation)}</td>
                <td>{formatCurrency(prop.mortgage_balance)}</td>
                <td style={{ color: prop.equity >= 0 ? '#28a745' : '#dc3545' }}>
                  {formatCurrency(prop.equity)}
                </td>
                <td>{formatCurrency(prop.rental_income_yearly)}</td>
                <td>{prop.lender}</td>
                <td>
                  <div style={{ fontSize: '12px' }}>
                    {prop.omar_ownership > 0 && <div>Omar: {prop.omar_ownership}%</div>}
                    {prop.heidi_ownership > 0 && <div>Heidi: {prop.heidi_ownership}%</div>}
                    {prop.dwayne_ownership > 0 && <div>Dwayne: {prop.dwayne_ownership}%</div>}
                    {prop.sean_ownership > 0 && <div>Sean: {prop.sean_ownership}%</div>}
                    {prop.lena_ownership > 0 && <div>Lena: {prop.lena_ownership}%</div>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Income Summary */}
      <div className="card">
        <h3>Family Income Summary</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Person</th>
              <th>External Source</th>
              <th>RRltd</th>
              <th>OmHe Props</th>
              <th>Total Annual Income</th>
            </tr>
          </thead>
          <tbody>
            {familyGroupsArray.map((group, groupIndex) => (
              <React.Fragment key={groupIndex}>
                {group.members.map((inc, index) => {
                  const external = inc.external_source || 0;
                  const rrltd = inc.rrltd || 0;
                  const omheProps = inc.omhe_props || 0;
                  const total = external + rrltd + omheProps;
                  return (
                    <tr key={`${groupIndex}-${index}`}>
                      <td>{inc.person_name}</td>
                      <td>{formatCurrency(external)}</td>
                      <td>{formatCurrency(rrltd)}</td>
                      <td>{formatCurrency(omheProps)}</td>
                      <td><strong>{formatCurrency(total)}</strong></td>
                    </tr>
                  );
                })}
                {groupIndex < familyGroupsArray.length - 1 && (
                  <tr key={`spacer-${groupIndex}`}>
                    <td colSpan="5" style={{ height: '10px', border: 'none' }}></td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;
