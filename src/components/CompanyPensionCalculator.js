import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency } from '../utils/chartConfig';

function CompanyPensionCalculator() {
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
      setIncome(incomeRes.data.success ? incomeRes.data.incomes : []);
      setProperties(propertiesRes.data.success ? propertiesRes.data.properties : []);
      setPeople(peopleRes.data); // /api/people returns direct array
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate RRltd available funds for pension contributions
  const calculateRRltdFunds = () => {
    // RRltd income from properties (short-term rentals)
    const rrltdProperties = properties.filter(prop => 
      ['2SA', '87HP', '28LC'].includes(prop.nickname)
    );
    
    const grossIncome = rrltdProperties.reduce((sum, prop) => {
      return sum + (prop.income_yearly || 0);
    }, 0);

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

  // Calculate optimal pension contribution for each person
  const calculateOptimalPension = (personName, currentIncome) => {
    const MAX_ANNUAL_CONTRIBUTION = 115000;
    const INCOME_PERCENTAGE_LIMIT = 0.25; // 25% of income
    
    // Personal contribution limit
    const personalLimit = Math.min(currentIncome * INCOME_PERCENTAGE_LIMIT, MAX_ANNUAL_CONTRIBUTION);
    
    // Company contribution limit
    const companyLimit = MAX_ANNUAL_CONTRIBUTION;
    
    // Total possible contribution
    const totalLimit = Math.min(personalLimit + companyLimit, currentIncome + MAX_ANNUAL_CONTRIBUTION);
    
    // Tax rates
    const PERSONAL_TAX_RATE = 0.20; // 20% for most income
    const CORPORATION_TAX_RATE = 0.125; // 12.5%
    const PRSI_RATE = 0.04; // 4%
    const USC_RATE = 0.08; // 8% (simplified)
    
    // Current tax without pension
    const currentTax = currentIncome * (PERSONAL_TAX_RATE + PRSI_RATE + USC_RATE);
    
    // Optimal strategy: Company pays maximum possible
    const optimalCompanyContribution = Math.min(companyLimit, currentIncome);
    const personalContribution = Math.min(personalLimit, currentIncome - optimalCompanyContribution);
    const totalContribution = optimalCompanyContribution + personalContribution;
    
    // Tax savings
    const personalTaxSavings = personalContribution * PERSONAL_TAX_RATE;
    const companyTaxSavings = optimalCompanyContribution * PERSONAL_TAX_RATE;
    const corporationTaxRelief = optimalCompanyContribution * CORPORATION_TAX_RATE;
    
    const totalTaxSavings = personalTaxSavings + companyTaxSavings;
    const totalRelief = totalTaxSavings + corporationTaxRelief;
    
    // Remaining tax (PRSI and USC cannot be eliminated)
    const remainingTax = currentIncome * (PRSI_RATE + USC_RATE);
    
    // Net cost to company
    const netCostToCompany = optimalCompanyContribution - corporationTaxRelief;
    
    return {
      currentIncome,
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

  // Get all family members who could receive pension contributions
  const getFamilyMembers = () => {
    return people.filter(person => !person.is_deceased);
  };

  // Calculate total optimal pension strategy
  const calculateTotalStrategy = () => {
    const familyMembers = getFamilyMembers();
    const rrltdFunds = calculateRRltdFunds();
    
    const memberCalculations = familyMembers.map(person => {
      // Get current income for this person
      const personIncome = income
        .filter(inc => inc.person_name === person.name)
        .reduce((sum, inc) => sum + (inc.amount_yearly || 0), 0);
      
      const pensionCalc = calculateOptimalPension(person.name, personIncome);
      
      return {
        person: person,
        currentIncome: personIncome,
        pensionCalc: pensionCalc
      };
    });
    
    const totalCompanyContribution = memberCalculations.reduce((sum, calc) => 
      sum + calc.pensionCalc.companyContribution, 0
    );
    
    const totalCorporationTaxRelief = memberCalculations.reduce((sum, calc) => 
      sum + calc.pensionCalc.corporationTaxRelief, 0
    );
    
    const totalNetCost = totalCompanyContribution - totalCorporationTaxRelief;
    
    return {
      rrltdFunds,
      memberCalculations,
      totalCompanyContribution,
      totalCorporationTaxRelief,
      totalNetCost,
      availableFunds: rrltdFunds.afterTaxProfit
    };
  };

  if (loading) {
    return <div className="loading">Loading pension calculator...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const strategy = calculateTotalStrategy();

  return (
    <div>
      <div className="card">
        <h2>Company Pension Contribution Calculator</h2>
        <p>Calculate optimal pension contribution strategies for RRltd to pay all family members</p>
        
        {/* RRltd Funds Analysis */}
        <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
          <h3>RRltd Available Funds for Pension Contributions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Gross Income</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976d2' }}>
                {formatCurrency(strategy.rrltdFunds.grossIncome)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>After VAT (23%)</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976d2' }}>
                {formatCurrency(strategy.rrltdFunds.netIncome)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Expenses (40%)</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d32f2f' }}>
                -{formatCurrency(strategy.rrltdFunds.expenses)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Trading Income</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2e7d32' }}>
                {formatCurrency(strategy.rrltdFunds.tradingIncome)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Corporation Tax (12.5%)</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d32f2f' }}>
                -{formatCurrency(strategy.rrltdFunds.corporationTax)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Available for Pensions</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4caf50' }}>
                {formatCurrency(strategy.rrltdFunds.afterTaxProfit)}
              </div>
            </div>
          </div>
        </div>

        {/* Key Information */}
        <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h3>Key Information</h3>
          <ul>
            <li><strong>Personal Contribution Limit:</strong> 25% of income or €115,000 (whichever is lower)</li>
            <li><strong>Company Contribution Limit:</strong> €115,000 per person per year</li>
            <li><strong>Corporation Tax Relief:</strong> 12.5% on company pension contributions</li>
            <li><strong>Personal Tax Relief:</strong> 20% on personal contributions</li>
            <li><strong>PRSI & USC:</strong> Still calculated on gross income (cannot be reduced by pension contributions)</li>
          </ul>
        </div>

        {/* Individual Member Analysis */}
        <div style={{ marginBottom: '30px' }}>
          <h3>Optimal Pension Contributions by Family Member</h3>
          {strategy.memberCalculations.map((memberCalc, index) => (
            <div key={index} className="card" style={{ marginBottom: '20px' }}>
              <h4>{memberCalc.person.name} - Pension Strategy</h4>
              <p><strong>Current Annual Income:</strong> {formatCurrency(memberCalc.currentIncome)}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
                <div style={{ padding: '15px', backgroundColor: '#f3e5f5', borderRadius: '8px' }}>
                  <h5 style={{ color: '#7b1fa2', marginBottom: '10px' }}>Personal Contribution</h5>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Amount:</strong><br/>
                    {formatCurrency(memberCalc.pensionCalc.personalContribution)}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Tax Savings:</strong><br/>
                    {formatCurrency(memberCalc.pensionCalc.personalTaxSavings)}
                  </div>
                </div>

                <div style={{ padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
                  <h5 style={{ color: '#2e7d32', marginBottom: '10px' }}>Company Contribution</h5>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Amount:</strong><br/>
                    {formatCurrency(memberCalc.pensionCalc.companyContribution)}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Corporation Tax Relief:</strong><br/>
                    {formatCurrency(memberCalc.pensionCalc.corporationTaxRelief)}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Net Cost to Company:</strong><br/>
                    {formatCurrency(memberCalc.pensionCalc.netCostToCompany)}
                  </div>
                </div>

                <div style={{ padding: '15px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
                  <h5 style={{ color: '#ef6c00', marginBottom: '10px' }}>Total Strategy</h5>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Total Contribution:</strong><br/>
                    {formatCurrency(memberCalc.pensionCalc.totalContribution)}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Total Tax Relief:</strong><br/>
                    {formatCurrency(memberCalc.pensionCalc.totalRelief)}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Remaining Tax:</strong><br/>
                    {formatCurrency(memberCalc.pensionCalc.remainingTax)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total Strategy Summary */}
        <div className="card" style={{ backgroundColor: '#e8f5e8' }}>
          <h3>Total Pension Strategy Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Total Company Contributions</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2e7d32' }}>
                {formatCurrency(strategy.totalCompanyContribution)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Total Corporation Tax Relief</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4caf50' }}>
                {formatCurrency(strategy.totalCorporationTaxRelief)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Net Cost to Company</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976d2' }}>
                {formatCurrency(strategy.totalNetCost)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Available RRltd Funds</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4caf50' }}>
                {formatCurrency(strategy.availableFunds)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Funds Utilization</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: strategy.totalNetCost <= strategy.availableFunds ? '#4caf50' : '#d32f2f' }}>
                {((strategy.totalNetCost / strategy.availableFunds) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <h4>Strategy Recommendation:</h4>
            <p>
              <strong>RRltd should pay pension contributions totaling {formatCurrency(strategy.totalCompanyContribution)} to all family members.</strong>
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
    </div>
  );
}

export default CompanyPensionCalculator;