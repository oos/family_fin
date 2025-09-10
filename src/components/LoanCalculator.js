import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, getChartConfig } from '../utils/chartConfig';

function LoanCalculator() {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [currentRate, setCurrentRate] = useState(4.5);
  const [newRate, setNewRate] = useState(3.5);
  const [currentTerm, setCurrentTerm] = useState(25);
  const [newTerm, setNewTerm] = useState(30);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await axios.get('/properties');
      setProperties(response.data.filter(p => p.mortgage_balance > 0));
    } catch (err) {
      console.error('Failed to load properties');
    }
  };

  const calculateRefinancing = () => {
    if (!selectedProperty) return;

    const property = properties.find(p => p.id.toString() === selectedProperty);
    if (!property) return;

    setLoading(true);

    const principal = property.mortgage_balance;
    const currentMonthlyPayment = calculateMonthlyPayment(principal, currentRate, currentTerm);
    const newMonthlyPayment = calculateMonthlyPayment(principal, newRate, newTerm);
    const monthlySavings = currentMonthlyPayment - newMonthlyPayment;
    const annualSavings = monthlySavings * 12;

    // Calculate cash flow over time
    const cashFlowData = [];
    let remainingBalance = principal;
    let currentRemainingBalance = principal;
    
    for (let year = 0; year <= Math.max(currentTerm, newTerm); year++) {
      if (year === 0) {
        cashFlowData.push({
          year,
          currentPayment: 0,
          newPayment: 0,
          savings: 0,
          currentBalance: currentRemainingBalance,
          newBalance: remainingBalance
        });
        continue;
      }

      // Calculate remaining balance for current loan
      if (currentRemainingBalance > 0) {
        const currentInterest = currentRemainingBalance * (currentRate / 100);
        const currentPrincipalPayment = currentMonthlyPayment * 12 - currentInterest;
        currentRemainingBalance = Math.max(0, currentRemainingBalance - currentPrincipalPayment);
      }

      // Calculate remaining balance for new loan
      if (remainingBalance > 0) {
        const newInterest = remainingBalance * (newRate / 100);
        const newPrincipalPayment = newMonthlyPayment * 12 - newInterest;
        remainingBalance = Math.max(0, remainingBalance - newPrincipalPayment);
      }

      const currentPayment = currentRemainingBalance > 0 ? currentMonthlyPayment * 12 : 0;
      const newPayment = remainingBalance > 0 ? newMonthlyPayment * 12 : 0;
      const savings = currentPayment - newPayment;

      cashFlowData.push({
        year,
        currentPayment,
        newPayment,
        savings,
        currentBalance: currentRemainingBalance,
        newBalance: remainingBalance
      });
    }

    setResults({
      property,
      currentMonthlyPayment,
      newMonthlyPayment,
      monthlySavings,
      annualSavings,
      totalSavings: monthlySavings * newTerm * 12,
      cashFlowData
    });

    setLoading(false);
  };

  const calculateMonthlyPayment = (principal, rate, term) => {
    const monthlyRate = rate / 100 / 12;
    const numPayments = term * 12;
    
    if (monthlyRate === 0) {
      return principal / numPayments;
    }
    
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
           (Math.pow(1 + monthlyRate, numPayments) - 1);
  };


  return (
    <div>
      <h1>Loan Refinancing Calculator</h1>
      
      <div className="card">
        <h3>Refinancing Parameters</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group">
            <label htmlFor="property">Select Property</label>
            <select
              id="property"
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
            >
              <option value="">Select a property</option>
              {properties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.nickname} - {formatCurrency(property.mortgage_balance)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="currentRate">Current Interest Rate (%)</label>
            <input
              type="number"
              id="currentRate"
              value={currentRate}
              onChange={(e) => setCurrentRate(parseFloat(e.target.value))}
              step="0.1"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="newRate">New Interest Rate (%)</label>
            <input
              type="number"
              id="newRate"
              value={newRate}
              onChange={(e) => setNewRate(parseFloat(e.target.value))}
              step="0.1"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="currentTerm">Current Term (years)</label>
            <input
              type="number"
              id="currentTerm"
              value={currentTerm}
              onChange={(e) => setCurrentTerm(parseInt(e.target.value))}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="newTerm">New Term (years)</label>
            <input
              type="number"
              id="newTerm"
              value={newTerm}
              onChange={(e) => setNewTerm(parseInt(e.target.value))}
            />
          </div>
        </div>
        
        <button 
          className="btn btn-primary" 
          onClick={calculateRefinancing}
          disabled={!selectedProperty || loading}
          style={{ marginTop: '20px' }}
        >
          {loading ? 'Calculating...' : 'Calculate Refinancing'}
        </button>
      </div>

      {results && (
        <div>
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <h3>Current Monthly Payment</h3>
              <div className="value negative">{formatCurrency(results.currentMonthlyPayment)}</div>
            </div>
            <div className="dashboard-card">
              <h3>New Monthly Payment</h3>
              <div className="value negative">{formatCurrency(results.newMonthlyPayment)}</div>
            </div>
            <div className="dashboard-card">
              <h3>Monthly Savings</h3>
              <div className="value positive">{formatCurrency(results.monthlySavings)}</div>
            </div>
            <div className="dashboard-card">
              <h3>Annual Savings</h3>
              <div className="value positive">{formatCurrency(results.annualSavings)}</div>
            </div>
            <div className="dashboard-card">
              <h3>Total Savings (New Term)</h3>
              <div className="value positive">{formatCurrency(results.totalSavings)}</div>
            </div>
          </div>

          <div className="card">
            <h3>Cash Flow Comparison</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={results.cashFlowData} margin={getChartConfig('line').margin}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="year" 
                  {...getChartConfig('line').xAxis}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)} 
                  {...getChartConfig('line').yAxis}
                />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Line 
                  type="monotone" 
                  dataKey="currentPayment" 
                  stroke="#8884d8" 
                  name="Current Payment" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="newPayment" 
                  stroke="#82ca9d" 
                  name="New Payment" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="savings" 
                  stroke="#ffc658" 
                  name="Savings" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3>Detailed Analysis</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Current Payment</th>
                  <th>New Payment</th>
                  <th>Annual Savings</th>
                  <th>Current Balance</th>
                  <th>New Balance</th>
                </tr>
              </thead>
              <tbody>
                {results.cashFlowData.slice(0, 10).map((data, index) => (
                  <tr key={index}>
                    <td>{data.year}</td>
                    <td>{formatCurrency(data.currentPayment)}</td>
                    <td>{formatCurrency(data.newPayment)}</td>
                    <td style={{ color: data.savings > 0 ? '#28a745' : '#dc3545' }}>
                      {formatCurrency(data.savings)}
                    </td>
                    <td>{formatCurrency(data.currentBalance)}</td>
                    <td>{formatCurrency(data.newBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoanCalculator;
