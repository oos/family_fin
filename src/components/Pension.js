import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Pension = () => {
  const [income, setIncome] = useState([]);
  const [properties, setProperties] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [incomeRes, propertiesRes, peopleRes] = await Promise.all([
        axios.get('/api/income'),
        axios.get('/api/properties'),
        axios.get('/api/people')
      ]);
      console.log('Income data:', incomeRes.data);
      console.log('Properties data:', propertiesRes.data);
      console.log('People data:', peopleRes.data);
      setIncome(incomeRes.data);
      setProperties(propertiesRes.data);
      setPeople(peopleRes.data);
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate RRltd available funds for pension contributions
  const calculateRRltdFunds = () => {
    console.log('All properties:', properties);
    // RRltd income from properties (short-term rentals)
    const rrltdProperties = properties.filter(prop => 
      ['2SA', '87HP', '28LC'].includes(prop.nickname)
    );
    console.log('RRltd properties:', rrltdProperties);
    
    const grossIncome = rrltdProperties.reduce((sum, prop) => {
      console.log(`Property ${prop.nickname}: income_yearly = ${prop.income_yearly}`);
      return sum + (prop.income_yearly || 0);
    }, 0);
    console.log('Gross income:', grossIncome);

    // After VAT (23%)
    const netIncome = grossIncome * 0.77;
    
    // 40% expenses
    const expenses = netIncome * 0.4;
    const tradingIncome = netIncome - expenses;
    
    // Corporation Tax (12.5%)
    const corporationTax = tradingIncome * 0.125;
    const afterTaxProfit = tradingIncome - corporationTax;

    return {
      grossIncome,
      netIncome,
      expenses,
      tradingIncome,
      corporationTax,
      afterTaxProfit
    };
  };

  // Calculate optimal pension contribution for each RRltd employee
  const calculateOptimalPension = (personName, currentSalary) => {
    const MAX_ANNUAL_CONTRIBUTION = 115000;
    const INCOME_PERCENTAGE_LIMIT = 0.25; // 25% of income
    
    // Personal contribution limit (25% of income or €115k)
    const personalLimit = Math.min(currentSalary * INCOME_PERCENTAGE_LIMIT, MAX_ANNUAL_CONTRIBUTION);
    
    // Company contribution limit (€115k per person)
    const companyLimit = MAX_ANNUAL_CONTRIBUTION;
    
    // Total possible contribution
    const totalLimit = Math.min(personalLimit + companyLimit, currentSalary + MAX_ANNUAL_CONTRIBUTION);
    
    // Tax rates
    const PERSONAL_TAX_RATE = 0.20; // 20% for most income
    const CORPORATION_TAX_RATE = 0.125; // 12.5%
    const PRSI_RATE = 0.04; // 4%
    const USC_RATE = 0.08; // 8% (simplified)
    
    // Current tax without pension
    const currentTax = currentSalary * (PERSONAL_TAX_RATE + PRSI_RATE + USC_RATE);
    
    // Optimal strategy: Company pays maximum possible
    const optimalCompanyContribution = Math.min(companyLimit, currentSalary);
    const personalContribution = Math.min(personalLimit, currentSalary - optimalCompanyContribution);
    const totalContribution = optimalCompanyContribution + personalContribution;
    
    // Tax savings
    const personalTaxSavings = personalContribution * PERSONAL_TAX_RATE;
    const companyTaxSavings = optimalCompanyContribution * PERSONAL_TAX_RATE;
    const corporationTaxRelief = optimalCompanyContribution * CORPORATION_TAX_RATE;
    
    const totalTaxSavings = personalTaxSavings + companyTaxSavings;
    const totalRelief = totalTaxSavings + corporationTaxRelief;
    
    // Remaining tax (PRSI and USC cannot be eliminated)
    const remainingTax = currentSalary * (PRSI_RATE + USC_RATE);
    
    // Net cost to company
    const netCostToCompany = optimalCompanyContribution - corporationTaxRelief;

    return {
      currentSalary,
      currentTax,
      personalContribution,
      companyContribution: optimalCompanyContribution,
      totalContribution,
      personalTaxSavings,
      companyTaxSavings,
      corporationTaxRelief,
      totalTaxSavings,
      totalRelief,
      remainingTax,
      netCostToCompany,
      finalTax: remainingTax
    };
  };

  // Get RRltd employees (people with RRltd salary income)
  const getRRltdEmployees = () => {
    const rrltdSalaries = income.filter(inc => 
      inc.company_name === 'RRltd' && inc.income_type === 'salary'
    );
    
    return rrltdSalaries.map(salary => {
      const person = people.find(p => p.name === salary.person_name);
      return {
        person: person,
        salary: salary.amount_yearly,
        pensionCalc: calculateOptimalPension(salary.person_name, salary.amount_yearly)
      };
    });
  };

  // Calculate total pension strategy
  const calculateTotalStrategy = () => {
    const rrltdFunds = calculateRRltdFunds();
    const employees = getRRltdEmployees();
    
    const totalCompanyContribution = employees.reduce((sum, emp) => 
      sum + emp.pensionCalc.companyContribution, 0
    );
    
    const totalCorporationTaxRelief = employees.reduce((sum, emp) => 
      sum + emp.pensionCalc.corporationTaxRelief, 0
    );
    
    const totalNetCost = totalCompanyContribution - totalCorporationTaxRelief;
    
    return {
      rrltdFunds,
      employees,
      totalCompanyContribution,
      totalCorporationTaxRelief,
      totalNetCost,
      availableFunds: rrltdFunds.afterTaxProfit
    };
  };

  if (loading) {
    return <div className="loading">Loading pension data...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const strategy = calculateTotalStrategy();

  return (
    <div className="pension-page">
      <div className="page-header">
        <h2>Pension Management</h2>
        <p style={{ color: '#666', fontSize: '16px', marginBottom: '20px' }}>
          Calculate optimal pension contributions that RRltd can pay to employees on top of their salaries.
        </p>
      </div>

      {/* RRltd Funds Analysis */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3>RRltd Available Funds for Pension Contributions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Gross Income</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976d2' }}>
              {formatCurrency(strategy.rrltdFunds.grossIncome)}
            </div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>After VAT (23%)</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976d2' }}>
              {formatCurrency(strategy.rrltdFunds.netIncome)}
            </div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Expenses (40%)</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d32f2f' }}>
              -{formatCurrency(strategy.rrltdFunds.expenses)}
            </div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Trading Income</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2e7d32' }}>
              {formatCurrency(strategy.rrltdFunds.tradingIncome)}
            </div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Corporation Tax (12.5%)</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d32f2f' }}>
              -{formatCurrency(strategy.rrltdFunds.corporationTax)}
            </div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Available for Pensions</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4caf50' }}>
              {formatCurrency(strategy.rrltdFunds.afterTaxProfit)}
            </div>
          </div>
        </div>
      </div>

      {/* Key Information */}
      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
        <h3>Key Information</h3>
        <ul>
          <li><strong>Personal Contribution Limit:</strong> 25% of income or €115,000 (whichever is lower)</li>
          <li><strong>Company Contribution Limit:</strong> €115,000 per person per year</li>
          <li><strong>Corporation Tax Relief:</strong> 12.5% on company pension contributions</li>
          <li><strong>Personal Tax Relief:</strong> 20% on personal contributions</li>
          <li><strong>PRSI & USC:</strong> Still calculated on gross income (cannot be reduced by pension contributions)</li>
        </ul>
      </div>

      {/* Individual Employee Analysis */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3>Optimal Pension Contributions by RRltd Employee</h3>
        {strategy.employees.length === 0 ? (
          <p>No RRltd employees found with salary income.</p>
        ) : (
          <div>
            {strategy.employees.map((employee, index) => (
              <div key={index} style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <h4>{employee.person?.name || 'Unknown'} - Pension Strategy</h4>
                <p><strong>Current Annual Salary:</strong> {formatCurrency(employee.salary)}</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
                  <div style={{ padding: '15px', backgroundColor: '#f3e5f5', borderRadius: '8px' }}>
                    <h5 style={{ color: '#7b1fa2', marginBottom: '10px' }}>Personal Contribution</h5>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Amount:</strong><br/>
                      {formatCurrency(employee.pensionCalc.personalContribution)}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Tax Savings:</strong><br/>
                      {formatCurrency(employee.pensionCalc.personalTaxSavings)}
                    </div>
                  </div>

                  <div style={{ padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
                    <h5 style={{ color: '#2e7d32', marginBottom: '10px' }}>Company Contribution</h5>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Amount:</strong><br/>
                      {formatCurrency(employee.pensionCalc.companyContribution)}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Corporation Tax Relief:</strong><br/>
                      {formatCurrency(employee.pensionCalc.corporationTaxRelief)}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Net Cost to Company:</strong><br/>
                      {formatCurrency(employee.pensionCalc.netCostToCompany)}
                    </div>
                  </div>

                  <div style={{ padding: '15px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
                    <h5 style={{ color: '#ef6c00', marginBottom: '10px' }}>Total Strategy</h5>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Total Contribution:</strong><br/>
                      {formatCurrency(employee.pensionCalc.totalContribution)}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Total Tax Relief:</strong><br/>
                      {formatCurrency(employee.pensionCalc.totalRelief)}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Remaining Tax:</strong><br/>
                      {formatCurrency(employee.pensionCalc.remainingTax)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total Strategy Summary */}
      <div className="card" style={{ backgroundColor: '#e8f5e8' }}>
        <h3>Total Pension Strategy Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Total Company Contributions</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2e7d32' }}>
              {formatCurrency(strategy.totalCompanyContribution)}
        </div>
      </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Total Corporation Tax Relief</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4caf50' }}>
              {formatCurrency(strategy.totalCorporationTaxRelief)}
            </div>
              </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Net Cost to Company</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976d2' }}>
              {formatCurrency(strategy.totalNetCost)}
              </div>
              </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Available RRltd Funds</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4caf50' }}>
              {formatCurrency(strategy.availableFunds)}
              </div>
              </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Funds Utilization</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: strategy.totalNetCost <= strategy.availableFunds ? '#4caf50' : '#d32f2f' }}>
              {((strategy.totalNetCost / strategy.availableFunds) * 100).toFixed(1)}%
              </div>
          </div>
        </div>
        
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <h4>Strategy Recommendation:</h4>
          <p>
            <strong>RRltd should pay pension contributions totaling {formatCurrency(strategy.totalCompanyContribution)} to all employees.</strong>
          </p>
          <p>
            This will provide {formatCurrency(strategy.totalCorporationTaxRelief)} in corporation tax relief, 
            reducing the net cost to {formatCurrency(strategy.totalNetCost)}.
          </p>
          <p>
            <strong>Note:</strong> PRSI and USC cannot be eliminated as they are calculated on gross income and cannot be reduced by pension contributions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pension;