import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency } from '../utils/chartConfig';

function CompanyPensionCalculator() {
  const [income, setIncome] = useState([]);
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [incomeResponse, familiesResponse] = await Promise.all([
        axios.get('/income'),
        axios.get('/families')
      ]);
      setIncome(incomeResponse.data);
      setFamilies(familiesResponse.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calculateCompanyPensionStrategy = (personIncome, familyType) => {
    const CORPORATION_TAX_RATE = 0.125; // 12.5% in Ireland
    const PERSONAL_TAX_RATE_20 = 0.20;
    const PERSONAL_TAX_RATE_40 = 0.40;
    const PRSI_RATE = 0.04;
    const USC_RATE = 0.08; // Simplified - USC is progressive
    
    // Irish pension limits
    const MAX_ANNUAL_CONTRIBUTION = 115000;
    const AGE_BASED_LIMIT_PERCENT = 0.25; // 25% of income for most ages
    
    const personalLimit = Math.min(personIncome * AGE_BASED_LIMIT_PERCENT, MAX_ANNUAL_CONTRIBUTION);
    const companyLimit = MAX_ANNUAL_CONTRIBUTION;
    
    // Calculate current tax without pension
    const currentTax = calculateCurrentTax(personIncome, familyType);
    
    // Strategy 1: Personal contributions only
    const personalContribution = Math.min(personalLimit, personIncome * 0.25);
    const personalTaxSavings = personalContribution * PERSONAL_TAX_RATE_20;
    const personalNetCost = personalContribution - personalTaxSavings;
    const personalRemainingTax = currentTax.totalTax - personalTaxSavings;
    
    // Strategy 2: Company contributions (salary sacrifice)
    const maxCompanyContribution = Math.min(companyLimit, personIncome);
    const companyTaxSavings = maxCompanyContribution * PERSONAL_TAX_RATE_20; // Personal tax saved
    const corporationTaxRelief = maxCompanyContribution * CORPORATION_TAX_RATE; // Company tax relief
    const companyNetCost = maxCompanyContribution - companyTaxSavings - corporationTaxRelief;
    const companyRemainingTax = currentTax.totalTax - companyTaxSavings;
    
    // Strategy 3: Hybrid approach
    const hybridPersonal = personalContribution;
    const hybridCompany = Math.min(companyLimit - personalContribution, personIncome - personalContribution);
    const hybridTotalContribution = hybridPersonal + hybridCompany;
    const hybridTaxSavings = hybridPersonal * PERSONAL_TAX_RATE_20 + hybridCompany * PERSONAL_TAX_RATE_20;
    const hybridCorporationRelief = hybridCompany * CORPORATION_TAX_RATE;
    const hybridNetCost = hybridTotalContribution - hybridTaxSavings - hybridCorporationRelief;
    const hybridRemainingTax = currentTax.totalTax - hybridTaxSavings;
    
    return {
      currentTax,
      personal: {
        contribution: personalContribution,
        taxSavings: personalTaxSavings,
        netCost: personalNetCost,
        remainingTax: personalRemainingTax
      },
      company: {
        contribution: maxCompanyContribution,
        taxSavings: companyTaxSavings,
        corporationRelief: corporationTaxRelief,
        netCost: companyNetCost,
        remainingTax: companyRemainingTax
      },
      hybrid: {
        personalContribution: hybridPersonal,
        companyContribution: hybridCompany,
        totalContribution: hybridTotalContribution,
        taxSavings: hybridTaxSavings,
        corporationRelief: hybridCorporationRelief,
        netCost: hybridNetCost,
        remainingTax: hybridRemainingTax
      }
    };
  };

  const calculateCurrentTax = (grossIncome, familyType) => {
    const PRSI_RATE = 0.04;
    const USC_RATE = 0.08; // Simplified
    
    // Simplified tax calculation
    const prsi = grossIncome * PRSI_RATE;
    const usc = grossIncome * USC_RATE;
    const incomeTax = grossIncome * 0.20; // Simplified - should use proper bands
    
    return {
      grossIncome,
      incomeTax,
      prsi,
      usc,
      totalTax: incomeTax + prsi + usc
    };
  };

  const getDirectors = () => {
    return families.filter(family => 
      family.name === 'OmHe' && 
      family.members.some(member => 
        member.name === 'Omar' || member.name === 'Heidi'
      )
    ).flatMap(family => family.members.filter(member => 
      member.name === 'Omar' || member.name === 'Heidi'
    ));
  };

  if (loading) {
    return <div className="loading">Loading pension calculator...</div>;
  }

  const directors = getDirectors();

  return (
    <div>
      <div className="card">
        <h2>Company Pension Contribution Calculator</h2>
        <p>Calculate optimal pension contribution strategies for RRLtd directors</p>
        
        {error && <div className="error">{error}</div>}
        
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

        {directors.map((director, index) => {
          const directorIncome = income.find(inc => inc.person_name === director.name);
          if (!directorIncome) return null;
          
          const strategy = calculateCompanyPensionStrategy(directorIncome.amount, 'married');
          
          return (
            <div key={index} className="card" style={{ marginBottom: '20px' }}>
              <h3>{director.name} - Pension Strategy Analysis</h3>
              <p><strong>Current Annual Income:</strong> {formatCurrency(directorIncome.amount)}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '20px' }}>
                {/* Personal Contributions */}
                <div style={{ padding: '15px', backgroundColor: '#f3e5f5', borderRadius: '8px' }}>
                  <h4 style={{ color: '#7b1fa2', marginBottom: '15px' }}>Personal Contributions</h4>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Max Contribution:</strong><br/>
                    {formatCurrency(strategy.personal.contribution)}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Tax Savings:</strong><br/>
                    {formatCurrency(strategy.personal.taxSavings)}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Net Cost:</strong><br/>
                    {formatCurrency(strategy.personal.netCost)}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Remaining Tax:</strong><br/>
                    {formatCurrency(strategy.personal.remainingTax)}
                  </div>
                </div>

                {/* Company Contributions */}
                <div style={{ padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
                  <h4 style={{ color: '#2e7d32', marginBottom: '15px' }}>Company Contributions</h4>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Max Contribution:</strong><br/>
                    {formatCurrency(strategy.company.contribution)}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Personal Tax Savings:</strong><br/>
                    {formatCurrency(strategy.company.taxSavings)}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Corporation Tax Relief:</strong><br/>
                    {formatCurrency(strategy.company.corporationRelief)}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Net Cost:</strong><br/>
                    {formatCurrency(strategy.company.netCost)}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Remaining Tax:</strong><br/>
                    {formatCurrency(strategy.company.remainingTax)}
                  </div>
                </div>

                {/* Hybrid Approach */}
                <div style={{ padding: '15px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
                  <h4 style={{ color: '#ef6c00', marginBottom: '15px' }}>Hybrid Approach</h4>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Personal:</strong><br/>
                    {formatCurrency(strategy.hybrid.personalContribution)}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Company:</strong><br/>
                    {formatCurrency(strategy.hybrid.companyContribution)}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Total Contribution:</strong><br/>
                    {formatCurrency(strategy.hybrid.totalContribution)}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Total Tax Savings:</strong><br/>
                    {formatCurrency(strategy.hybrid.taxSavings + strategy.hybrid.corporationRelief)}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Net Cost:</strong><br/>
                    {formatCurrency(strategy.hybrid.netCost)}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Remaining Tax:</strong><br/>
                    {formatCurrency(strategy.hybrid.remainingTax)}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                <h4>Recommendation for {director.name}:</h4>
                <p>
                  <strong>Best Strategy:</strong> {strategy.hybrid.netCost < strategy.personal.netCost ? 'Hybrid Approach' : 'Personal Contributions Only'}
                </p>
                <p>
                  <strong>Why PRSI & USC can't be eliminated:</strong> These charges are calculated on gross income and cannot be reduced by pension contributions.
                </p>
                <p>
                  <strong>Minimum achievable tax:</strong> {formatCurrency(Math.min(strategy.personal.remainingTax, strategy.company.remainingTax, strategy.hybrid.remainingTax))}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CompanyPensionCalculator;
