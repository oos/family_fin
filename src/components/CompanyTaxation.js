import React, { useState, useEffect } from 'react';
import axios from 'axios';

function CompanyTaxation() {
  const [properties, setProperties] = useState([]);
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [propertiesRes, incomeRes] = await Promise.all([
        axios.get('/api/properties'),
        axios.get('/api/income')
      ]);
      setProperties(propertiesRes.data);
      setIncome(incomeRes.data);
    } catch (err) {
      setError('Failed to load data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatCurrencyGBP = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  // Calculate RRltd income and expenses
  const calculateRRltdData = () => {
    // RRltd income from properties (short-term rentals)
    const rrltdProperties = properties.filter(prop => 
      ['2SA', '87HP', '28LC'].includes(prop.nickname)
    );
    
    const rrltdGrossIncome = rrltdProperties.reduce((sum, prop) => {
      return sum + (prop.income_yearly || 0);
    }, 0);

    // 40% of income spent on expenses (tax deductible)
    const rrltdExpenses = rrltdGrossIncome * 0.4;
    const rrltdNetIncome = rrltdGrossIncome - rrltdExpenses;

    // RRltd salary expenses (from income page)
    const rrltdSalaries = income.filter(inc => 
      inc.company_name === 'RRltd' && inc.income_type === 'salary'
    );
    
    const totalSalaryExpenses = rrltdSalaries.reduce((sum, salary) => {
      return sum + (salary.amount_yearly || 0);
    }, 0);

    // Corporation Tax calculation (12.5% for trading income)
    const corporationTax = rrltdNetIncome * 0.125;

    return {
      grossIncome: rrltdGrossIncome,
      expenses: rrltdExpenses,
      netIncome: rrltdNetIncome,
      salaryExpenses: totalSalaryExpenses,
      corporationTax: corporationTax,
      afterTaxProfit: rrltdNetIncome - corporationTax,
      properties: rrltdProperties
    };
  };

  // Calculate SECODWOM UK LTD data
  const calculateSECODWOMData = () => {
    // UK property income (67RR)
    const ukProperty = properties.find(prop => prop.nickname === '67RR');
    const ukGrossIncome = ukProperty ? (ukProperty.income_yearly || 0) : 0;
    
    // Convert to GBP (assuming 1 EUR = 0.85 GBP)
    const ukGrossIncomeGBP = ukGrossIncome * 0.85;
    
    // 40% of income spent on expenses (tax deductible)
    const ukExpensesGBP = ukGrossIncomeGBP * 0.4;
    const ukNetIncomeGBP = ukGrossIncomeGBP - ukExpensesGBP;
    
    // UK Corporation Tax (~19%)
    const ukCorporationTaxGBP = ukNetIncomeGBP * 0.19;
    const ukAfterTaxProfitGBP = ukNetIncomeGBP - ukCorporationTaxGBP;
    
    // Convert back to EUR for display
    const ukAfterTaxProfitEUR = ukAfterTaxProfitGBP / 0.85;

    return {
      grossIncomeGBP: ukGrossIncomeGBP,
      grossIncomeEUR: ukGrossIncome,
      expensesGBP: ukExpensesGBP,
      netIncomeGBP: ukNetIncomeGBP,
      corporationTaxGBP: ukCorporationTaxGBP,
      afterTaxProfitGBP: ukAfterTaxProfitGBP,
      afterTaxProfitEUR: ukAfterTaxProfitEUR,
      property: ukProperty
    };
  };

  // Calculate optimal salary/pension strategy
  const calculateOptimalStrategy = (rrltdData, ukData) => {
    const totalAvailableForSalaries = rrltdData.afterTaxProfit + ukData.afterTaxProfitEUR;
    
    // Family members who could receive salaries/pensions
    const familyMembers = ['Omar', 'Heidi', 'Dwayne', 'Sean', 'Lena'];
    
    // Current external income for each person
    const externalIncome = income.filter(inc => 
      inc.company_name !== 'RRltd' && inc.income_type !== 'salary'
    );
    
    const currentExternalIncome = familyMembers.reduce((acc, person) => {
      const personIncome = externalIncome
        .filter(inc => inc.person_name === person)
        .reduce((sum, inc) => sum + (inc.amount_yearly || 0), 0);
      acc[person] = personIncome;
      return acc;
    }, {});

    return {
      totalAvailable: totalAvailableForSalaries,
      currentExternalIncome,
      familyMembers,
      strategy: "Repatriate UK profits to Ireland and pay as salaries/pensions to reduce Irish CT"
    };
  };

  if (loading) {
    return <div className="loading">Loading company taxation data...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  const rrltdData = calculateRRltdData();
  const ukData = calculateSECODWOMData();
  const strategy = calculateOptimalStrategy(rrltdData, ukData);

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1>Company Taxation Analysis</h1>
        <p style={{ color: '#666', fontSize: '16px', marginBottom: '20px' }}>
          Analysis of RRltd (Ireland) and SECODWOM UK LTD taxation with optimal salary/pension strategy.
        </p>
      </div>

      {/* Tax System Overview */}
      <div style={{ 
        marginBottom: '30px',
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ marginTop: 0, color: '#495057' }}>Tax System Overview</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div>
            <h4>Ireland (RRltd)</h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li><strong>Corporation Tax:</strong> 12.5% (trading income)</li>
              <li><strong>VAT:</strong> 23% on all income</li>
              <li><strong>Expense Deduction:</strong> 40% of income</li>
              <li><strong>Salary/Pension:</strong> Tax deductible</li>
            </ul>
          </div>
          <div>
            <h4>UK (SECODWOM UK LTD)</h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li><strong>Corporation Tax:</strong> ~19%</li>
              <li><strong>VAT:</strong> 20% (only above £90k threshold)</li>
              <li><strong>Expense Deduction:</strong> 40% of income</li>
              <li><strong>Profit Repatriation:</strong> No UK tax on dividends to Ireland</li>
            </ul>
          </div>
          <div>
            <h4>Strategy Benefits</h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li><strong>UK Profits:</strong> Can be sent to Ireland tax-free</li>
              <li><strong>Salary Payments:</strong> Reduce Irish CT on profits</li>
              <li><strong>Pension Contributions:</strong> Additional tax relief</li>
              <li><strong>Family Income:</strong> Distribute to all 5 family members</li>
            </ul>
          </div>
        </div>
      </div>

      {/* RRltd Analysis */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3>RRltd (Ireland) - Corporation Tax Analysis</h3>
        
        {/* Property Income Breakdown */}
        <div style={{ marginBottom: '20px' }}>
          <h4>Property Income Sources</h4>
          <table className="table" style={{ marginBottom: '15px' }}>
            <thead>
              <tr>
                <th>Property</th>
                <th>Type</th>
                <th>Annual Income</th>
                <th>VAT (23%)</th>
                <th>Net Income</th>
              </tr>
            </thead>
            <tbody>
              {rrltdData.properties.map((prop, index) => (
                <tr key={index}>
                  <td>{prop.nickname}</td>
                  <td>Short-term Rental</td>
                  <td>{formatCurrency(prop.income_yearly || 0)}</td>
                  <td>{formatCurrency((prop.income_yearly || 0) * 0.23)}</td>
                  <td>{formatCurrency((prop.income_yearly || 0) * 0.77)}</td>
                </tr>
              ))}
              <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
                <td colSpan="2">Total Gross Income</td>
                <td>{formatCurrency(rrltdData.grossIncome)}</td>
                <td>{formatCurrency(rrltdData.grossIncome * 0.23)}</td>
                <td>{formatCurrency(rrltdData.grossIncome * 0.77)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tax Calculation */}
        <div style={{ marginBottom: '20px' }}>
          <h4>Tax Calculation</h4>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
            <div style={{ marginBottom: '10px' }}>
              <strong>Gross Income (after VAT):</strong> {formatCurrency(rrltdData.grossIncome * 0.77)}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Operating Expenses (40%):</strong> -{formatCurrency(rrltdData.expenses)}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Net Trading Income:</strong> {formatCurrency(rrltdData.netIncome)}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Corporation Tax (12.5%):</strong> -{formatCurrency(rrltdData.corporationTax)}
            </div>
            <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#2e7d32' }}>
              <strong>After-Tax Profit:</strong> {formatCurrency(rrltdData.afterTaxProfit)}
            </div>
          </div>
        </div>

        {/* Current Salary Expenses */}
        <div style={{ marginBottom: '20px' }}>
          <h4>Current Salary Expenses</h4>
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Annual Salary</th>
              </tr>
            </thead>
            <tbody>
              {income.filter(inc => inc.company_name === 'RRltd' && inc.income_type === 'salary').map((salary, index) => (
                <tr key={index}>
                  <td>{salary.person_name}</td>
                  <td>{formatCurrency(salary.amount_yearly)}</td>
                </tr>
              ))}
              <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
                <td>Total Salary Expenses</td>
                <td>{formatCurrency(rrltdData.salaryExpenses)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECODWOM UK LTD Analysis */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3>SECODWOM UK LTD - Corporation Tax Analysis</h3>
        
        {ukData.property ? (
          <div>
            {/* UK Property Income */}
            <div style={{ marginBottom: '20px' }}>
              <h4>UK Property Income (67RR)</h4>
              <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Gross Income (EUR):</strong> {formatCurrency(ukData.grossIncomeEUR)}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Gross Income (GBP):</strong> {formatCurrencyGBP(ukData.grossIncomeGBP)}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>VAT Status:</strong> Not VAT registered (below £90k threshold)
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Operating Expenses (40%):</strong> -{formatCurrencyGBP(ukData.expensesGBP)}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Net Income:</strong> {formatCurrencyGBP(ukData.netIncomeGBP)}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>UK Corporation Tax (19%):</strong> -{formatCurrencyGBP(ukData.corporationTaxGBP)}
                </div>
                <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#2e7d32' }}>
                  <strong>After-Tax Profit (GBP):</strong> {formatCurrencyGBP(ukData.afterTaxProfitGBP)}
                </div>
                <div style={{ fontWeight: 'bold', color: '#2e7d32' }}>
                  <strong>After-Tax Profit (EUR):</strong> {formatCurrency(ukData.afterTaxProfitEUR)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            <p>No UK property data found (67RR)</p>
          </div>
        )}
      </div>

      {/* Optimal Strategy Analysis */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3>Optimal Salary/Pension Strategy</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <h4>Available Funds for Distribution</h4>
          <div style={{ padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '6px' }}>
            <div style={{ marginBottom: '10px' }}>
              <strong>RRltd After-Tax Profit:</strong> {formatCurrency(rrltdData.afterTaxProfit)}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>UK After-Tax Profit (EUR):</strong> {formatCurrency(ukData.afterTaxProfitEUR)}
            </div>
            <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#1976d2' }}>
              <strong>Total Available for Salaries/Pensions:</strong> {formatCurrency(strategy.totalAvailable)}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4>Current External Income by Family Member</h4>
          <table className="table">
            <thead>
              <tr>
                <th>Family Member</th>
                <th>Current External Income</th>
                <th>Potential Additional Income</th>
              </tr>
            </thead>
            <tbody>
              {strategy.familyMembers.map((person, index) => (
                <tr key={index}>
                  <td>{person}</td>
                  <td>{formatCurrency(strategy.currentExternalIncome[person] || 0)}</td>
                  <td>{formatCurrency(strategy.totalAvailable / 5)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ 
          padding: '20px', 
          backgroundColor: '#e8f5e8', 
          borderRadius: '8px',
          border: '2px solid #4caf50'
        }}>
          <h4 style={{ marginTop: 0, color: '#2e7d32' }}>Strategy Benefits</h4>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li><strong>UK Profit Repatriation:</strong> Send UK profits to Ireland tax-free</li>
            <li><strong>Salary Payments:</strong> Pay salaries to all 5 family members from combined profits</li>
            <li><strong>Tax Deduction:</strong> Salary payments reduce Irish Corporation Tax</li>
            <li><strong>Pension Contributions:</strong> Additional tax relief through pension contributions</li>
            <li><strong>Income Distribution:</strong> Spread income across family members for tax efficiency</li>
            <li><strong>VAT Optimization:</strong> UK entity below VAT threshold, Irish entity VAT registered</li>
          </ul>
        </div>
      </div>

      {/* Tax Optimization Summary */}
      <div className="card">
        <h3>Tax Optimization Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
            <h4 style={{ color: '#495057' }}>Current Structure</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
              <li>RRltd: {formatCurrency(rrltdData.afterTaxProfit)} profit</li>
              <li>UK: {formatCurrency(ukData.afterTaxProfitEUR)} profit</li>
              <li>Total: {formatCurrency(rrltdData.afterTaxProfit + ukData.afterTaxProfitEUR)}</li>
            </ul>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '6px' }}>
            <h4 style={{ color: '#1976d2' }}>Optimized Structure</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
              <li>Repatriate UK profits</li>
              <li>Pay salaries to all 5 family members</li>
              <li>Reduce Irish CT through salary deductions</li>
              <li>Maximize pension contributions</li>
            </ul>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '6px' }}>
            <h4 style={{ color: '#2e7d32' }}>Key Benefits</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
              <li>No UK tax on profit repatriation</li>
              <li>Irish CT reduction through salaries</li>
              <li>Family income distribution</li>
              <li>Pension tax relief</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompanyTaxation;