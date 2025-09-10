import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, getChartConfig } from '../utils/chartConfig';

function LoanCalculator() {
  const [properties, setProperties] = useState([]);
  const [income, setIncome] = useState([]);
  const [people, setPeople] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [currentRate, setCurrentRate] = useState(4.5);
  const [newRate, setNewRate] = useState(3.5);
  const [currentTerm, setCurrentTerm] = useState(25);
  const [newTerm, setNewTerm] = useState(30);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('refinancing');
  const [restructuringResults, setRestructuringResults] = useState(null);
  const [showOverview, setShowOverview] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [propertiesRes, incomeRes, peopleRes] = await Promise.all([
        axios.get('/properties'),
        axios.get('/income'),
        axios.get('/people')
      ]);
      setProperties(propertiesRes.data);
      setIncome(incomeRes.data);
      setPeople(peopleRes.data);
    } catch (err) {
      console.error('Failed to load data');
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

  // Irish Tax Calculation Functions
  const calculateIrishTax = (grossIncome, maritalStatus, isSelfEmployed, isDirector, pensionContribution = 0) => {
    const TAX_BANDS = {
      single: [
        { min: 0, max: 42000, rate: 0.20 },
        { min: 42000, max: Infinity, rate: 0.40 }
      ],
      married: [
        { min: 0, max: 88000, rate: 0.20 },
        { min: 88000, max: Infinity, rate: 0.40 }
      ]
    };

    const TAX_CREDITS = {
      single: 3750,
      married: 7500
    };

    const PRSI_RATE = 0.04;
    const USC_RATES = [
      { min: 0, max: 12012, rate: 0.005 },
      { min: 12012, max: 22020, rate: 0.02 },
      { min: 22020, max: 70044, rate: 0.045 },
      { min: 70044, max: Infinity, rate: 0.08 }
    ];

    const taxableIncome = Math.max(0, grossIncome - pensionContribution);
    const bands = TAX_BANDS[maritalStatus] || TAX_BANDS.single;
    
    let incomeTax = 0;
    let remainingIncome = taxableIncome;
    
    for (const band of bands) {
      if (remainingIncome <= 0) break;
      const bandIncome = Math.min(remainingIncome, band.max - band.min);
      incomeTax += bandIncome * band.rate;
      remainingIncome -= bandIncome;
    }

    // Calculate USC
    let usc = 0;
    let uscRemainingIncome = grossIncome;
    for (const uscBand of USC_RATES) {
      if (uscRemainingIncome <= 0) break;
      const uscBandIncome = Math.min(uscRemainingIncome, uscBand.max - uscBand.min);
      usc += uscBandIncome * uscBand.rate;
      uscRemainingIncome -= uscBandIncome;
    }

    // Calculate PRSI
    const prsi = grossIncome * PRSI_RATE;

    const totalTax = incomeTax + usc + prsi - TAX_CREDITS[maritalStatus];
    const netIncome = grossIncome - totalTax;

    return {
      grossIncome,
      pensionContribution,
      taxableIncome,
      incomeTax,
      usc,
      prsi,
      totalTax: Math.max(0, totalTax),
      netIncome
    };
  };

  const calculateOptimalPension = (grossIncome, maritalStatus, isSelfEmployed, isDirector, age) => {
    const MAX_PENSION_PERCENTAGE = age < 30 ? 0.15 : age < 40 ? 0.20 : age < 50 ? 0.25 : 0.30;
    const MAX_PENSION_AMOUNT = 2000000; // €2M lifetime limit
    
    const maxContribution = Math.min(
      grossIncome * MAX_PENSION_PERCENTAGE,
      MAX_PENSION_AMOUNT
    );

    // Find optimal contribution to minimize tax
    let bestContribution = 0;
    let minTax = calculateIrishTax(grossIncome, maritalStatus, isSelfEmployed, isDirector, 0).totalTax;

    for (let contribution = 0; contribution <= maxContribution; contribution += 1000) {
      const tax = calculateIrishTax(grossIncome, maritalStatus, isSelfEmployed, isDirector, contribution);
      if (tax.totalTax < minTax) {
        minTax = tax.totalTax;
        bestContribution = contribution;
      }
    }

    return {
      maxContribution: bestContribution,
      taxSavings: calculateIrishTax(grossIncome, maritalStatus, isSelfEmployed, isDirector, 0).totalTax - minTax
    };
  };

  const calculateRestructuring = () => {
    setLoading(true);

    // Current scenario data - initialize with actual data
    const currentData = {
      // RRltd "Secodwom Props" sub-entity (Sean, Dwayne, Omar & Heidi)
      rrltdSecodwomProps: {
        '2SA': 0, '87HP': 0
      },
      // Individual long-term rental income (personal ownership)
      individualLongTerm: {
        '28LC': 0, '19Abb': 0, '51LC': 0
      },
      // RRltd salaries (to employees, not owners)
      rrltdSalaries: {
        'Dwayne': 0, 'Sean': 0, 'Heidi': 0
      },
      // Property ownership percentages
      ownership: {
        '2SA': { 'Omar': 0, 'Sean': 0, 'Dwayne': 0 }, // Heidi NOT an owner
        '87HP': { 'Omar': 0, 'Sean': 0, 'Dwayne': 0 }, // Heidi NOT an owner
        '28LC': { 'Omar': 0, 'Heidi': 0 },
        '19Abb': { 'Omar': 0, 'Heidi': 0 },
        '51LC': { 'Omar': 0, 'Heidi': 0 }
      }
    };

    // Extract data from properties
    properties.forEach(property => {
      const nickname = property.nickname;
      if (['2SA', '87HP'].includes(nickname)) {
        // "Secodwom Props" sub-entity (Sean, Dwayne, Omar & Heidi)
        currentData.rrltdSecodwomProps[nickname] = property.income_yearly || 0;
      } else if (['28LC', '19Abb', '51LC'].includes(nickname)) {
        // Individual long-term rentals (personal ownership)
        currentData.individualLongTerm[nickname] = property.income_yearly || 0;
      }
      
      // Extract ownership percentages
      if (property.ownership_percentages) {
        const ownership = JSON.parse(property.ownership_percentages);
        currentData.ownership[nickname] = ownership;
      }
    });

    // Extract RRltd salaries (employees including Heidi)
    income.forEach(incomeRecord => {
      if (incomeRecord.company_name === 'RRltd' && incomeRecord.income_type === 'salary') {
        const personName = incomeRecord.person_name;
        if (['Dwayne', 'Sean', 'Heidi'].includes(personName)) {
          currentData.rrltdSalaries[personName] = incomeRecord.amount_yearly || 0;
        }
      }
    });

    // Calculate current scenario totals
    const currentRrltdSecodwomProps = Object.values(currentData.rrltdSecodwomProps).reduce((sum, val) => sum + val, 0);
    const currentIndividualRental = Object.values(currentData.individualLongTerm).reduce((sum, val) => sum + val, 0);
    const currentRrltdSalaries = Object.values(currentData.rrltdSalaries).reduce((sum, val) => sum + val, 0);

    // Proposed scenario: RRltd raises €850k loan to buy 28LC, 19Abb, 51LC
    const proposedData = {
      loanAmount: 850000, // €850k loan
      loanRate: 0.05, // 5% assumed
      loanTerm: 25,
      // "Secodwom Props" sub-entity (unchanged)
      rrltdSecodwomPropsIncome: currentRrltdSecodwomProps, // 2SA, 87HP (12.5% CT)
      rrltdSecodwomPropsSalaries: currentData.rrltdSalaries['Dwayne'] + currentData.rrltdSalaries['Sean'], // Dwayne, Sean only
      // "OmHe Props" sub-entity (new)
      rrltdOmHePropsShortTerm: (currentData.individualLongTerm['28LC'] || 0) + (currentData.individualLongTerm['51LC'] || 0), // 28LC, 51LC (12.5% CT) - 51LC changes from long-term to short-term
      rrltdOmHePropsLongTerm: currentData.individualLongTerm['19Abb'] || 0, // 19Abb (25% CT) - remains long-term
      rrltdOmHePropsTotal: (currentData.individualLongTerm['28LC'] || 0) + (currentData.individualLongTerm['51LC'] || 0) + (currentData.individualLongTerm['19Abb'] || 0),
      rrltdOmHePropsSalaries: currentData.rrltdSalaries['Heidi'], // Heidi only
      rrltdTotalIncome: currentRrltdSecodwomProps + (currentData.individualLongTerm['28LC'] || 0) + (currentData.individualLongTerm['51LC'] || 0) + (currentData.individualLongTerm['19Abb'] || 0),
      rrltdTotalSalaries: currentRrltdSalaries
    };

    // Calculate optimal pension contributions for Omar and Heidi
    const omarIncome = (currentData.individualLongTerm['28LC'] * (currentData.ownership['28LC']['Omar'] || 0) / 100) +
                      (currentData.individualLongTerm['19Abb'] * (currentData.ownership['19Abb']['Omar'] || 0) / 100) +
                      (currentData.individualLongTerm['51LC'] * (currentData.ownership['51LC']['Omar'] || 0) / 100);
    const heidiIncome = (currentData.individualLongTerm['28LC'] * (currentData.ownership['28LC']['Heidi'] || 0) / 100) +
                       (currentData.individualLongTerm['19Abb'] * (currentData.ownership['19Abb']['Heidi'] || 0) / 100) +
                       (currentData.individualLongTerm['51LC'] * (currentData.ownership['51LC']['Heidi'] || 0) / 100);

    const omarOptimal = calculateOptimalPension(omarIncome, 'married', false, true, 40);
    const heidiOptimal = calculateOptimalPension(heidiIncome, 'married', false, true, 40);

    // Current tax calculations
    const currentOmarTax = calculateIrishTax(omarIncome, 'married', false, true);
    const currentHeidiTax = calculateIrishTax(heidiIncome, 'married', false, true);
    const currentRrltdSecodwomPropsTax = currentRrltdSecodwomProps * 0.125; // 12.5% CT on "Secodwom Props" trading income
    const currentRrltdTotalTax = currentRrltdSecodwomPropsTax; // Only "Secodwom Props" income currently

    // Proposed tax calculations
    const proposedOmarTax = calculateIrishTax(omarIncome, 'married', false, true, omarOptimal.maxContribution);
    const proposedHeidiTax = calculateIrishTax(heidiIncome, 'married', false, true, heidiOptimal.maxContribution);
    const proposedRrltdSecodwomPropsTax = proposedData.rrltdSecodwomPropsIncome * 0.125; // 12.5% CT on "Secodwom Props" trading income
    const proposedRrltdOmHePropsShortTermTax = proposedData.rrltdOmHePropsShortTerm * 0.125; // 12.5% CT on "OmHe Props" short-term trading income
    const proposedRrltdOmHePropsLongTermTax = proposedData.rrltdOmHePropsLongTerm * 0.25; // 25% CT on "OmHe Props" long-term non-trading income
    const proposedRrltdTotalTax = proposedRrltdSecodwomPropsTax + proposedRrltdOmHePropsShortTermTax + proposedRrltdOmHePropsLongTermTax;

    const results = {
      current: {
        rrltdSecodwomPropsIncome: currentRrltdSecodwomProps,
        rrltdSecodwomPropsTax: currentRrltdSecodwomPropsTax,
        individualRental: currentIndividualRental,
        rrltdSalaries: currentRrltdSalaries,
        omarTax: currentOmarTax,
        heidiTax: currentHeidiTax,
        rrltdTotalTax: currentRrltdTotalTax,
        totalTax: currentOmarTax.totalTax + currentHeidiTax.totalTax + currentRrltdTotalTax
      },
      proposed: {
        loanAmount: proposedData.loanAmount,
        rrltdSecodwomPropsIncome: proposedData.rrltdSecodwomPropsIncome,
        rrltdSecodwomPropsTax: proposedRrltdSecodwomPropsTax,
        rrltdOmHePropsShortTermIncome: proposedData.rrltdOmHePropsShortTerm,
        rrltdOmHePropsLongTermIncome: proposedData.rrltdOmHePropsLongTerm,
        rrltdOmHePropsShortTermTax: proposedRrltdOmHePropsShortTermTax,
        rrltdOmHePropsLongTermTax: proposedRrltdOmHePropsLongTermTax,
        rrltdOmHePropsTotalTax: proposedRrltdOmHePropsShortTermTax + proposedRrltdOmHePropsLongTermTax,
        rrltdTotalTax: proposedRrltdTotalTax,
        rrltdSecodwomPropsSalaries: proposedData.rrltdSecodwomPropsSalaries,
        rrltdOmHePropsSalaries: proposedData.rrltdOmHePropsSalaries,
        rrltdTotalSalaries: proposedData.rrltdTotalSalaries,
        omarTax: proposedOmarTax,
        heidiTax: proposedHeidiTax,
        omarPension: omarOptimal.maxContribution,
        heidiPension: heidiOptimal.maxContribution,
        totalPension: omarOptimal.maxContribution + heidiOptimal.maxContribution,
        totalTax: proposedOmarTax.totalTax + proposedHeidiTax.totalTax + proposedRrltdTotalTax
      },
      savings: {
        omarTaxSavings: currentOmarTax.totalTax - proposedOmarTax.totalTax,
        heidiTaxSavings: currentHeidiTax.totalTax - proposedHeidiTax.totalTax,
        totalTaxSavings: (currentOmarTax.totalTax + currentHeidiTax.totalTax + currentRrltdTotalTax) - 
                        (proposedOmarTax.totalTax + proposedHeidiTax.totalTax + proposedRrltdTotalTax),
        netCost: (omarOptimal.maxContribution + heidiOptimal.maxContribution) - 
                ((currentOmarTax.totalTax - proposedOmarTax.totalTax) + (currentHeidiTax.totalTax - proposedHeidiTax.totalTax))
      }
    };

    setRestructuringResults(results);
    setLoading(false);
  };


  return (
    <div>
      <h1>Financial Analysis Tools</h1>
      
      {/* Tab Navigation */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          className={`btn ${activeTab === 'refinancing' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('refinancing')}
          style={{ marginRight: '10px' }}
        >
          Loan Refinancing
        </button>
        <button 
          className={`btn ${activeTab === 'restructuring' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('restructuring')}
          style={{ marginRight: '10px' }}
        >
          Tax Restructuring Analysis
        </button>
        <button 
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('overview')}
        >
          Complete Overview
        </button>
      </div>

      {activeTab === 'refinancing' && (
        <div>
          <h2>Loan Refinancing Calculator</h2>
          
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
                  {properties.filter(p => p.mortgage_balance > 0).map(property => (
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
      )}

      {activeTab === 'restructuring' && (
        <div>
          <h2>Tax Restructuring Analysis</h2>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            Compare current property ownership structure with proposed RRltd restructuring including pension optimization.
          </p>
          
          <div className="card">
            <h3>Analysis Parameters</h3>
            <p>This analysis compares:</p>
            <ul>
              <li><strong>Current:</strong> Individual ownership of 28LC, 19Abb & 51LC, RRltd "Secodwom Props" (2SA, 87HP)</li>
              <li><strong>Proposed:</strong> RRltd raises €850k loan to buy 28LC, 19Abb, 51LC and creates "OmHe Props" sub-entity</li>
            </ul>
            <p><strong>RRltd Sub-Entity Structure:</strong></p>
            <ul>
              <li><strong>"Secodwom Props"</strong> (Sean, Dwayne, Omar): 2SA, 87HP - Short-term rentals (12.5% CT)</li>
              <li><strong>"OmHe Props"</strong> (Omar & Heidi only): 28LC, 51LC - Short-term rentals (12.5% CT), 19Abb - Long-term rental (25% CT)</li>
            </ul>
            <p><strong>Key Details:</strong></p>
            <ul>
              <li>RRltd owned by Omar & Heidi (50:50)</li>
              <li>RRltd currently pays salaries to Dwayne, Sean, and Heidi (employees)</li>
              <li>Lena and Omar could potentially receive salaries in future</li>
              <li>Sub-entities are isolated from each other within RRltd</li>
              <li>Sean, Dwayne, Lena have no involvement in "OmHe Props"</li>
              <li><strong>51LC Strategy:</strong> Changes from long-term to short-term rental for better tax efficiency</li>
            </ul>
            
            <button 
              className="btn btn-primary" 
              onClick={calculateRestructuring}
              disabled={loading}
              style={{ marginTop: '20px' }}
            >
              {loading ? 'Calculating...' : 'Calculate Restructuring Analysis'}
            </button>
          </div>

          {restructuringResults && (
            <div>
              {/* Current vs Proposed Summary */}
              <div className="card" style={{ marginBottom: '20px' }}>
                <h3>Summary Comparison</h3>
                <div className="dashboard-grid">
                  <div className="dashboard-card">
                    <h4>Current Total Tax</h4>
                    <div className="value negative">{formatCurrency(restructuringResults.current.totalTax)}</div>
                  </div>
                  <div className="dashboard-card">
                    <h4>Proposed Total Tax</h4>
                    <div className="value negative">{formatCurrency(restructuringResults.proposed.totalTax)}</div>
                  </div>
                  <div className="dashboard-card">
                    <h4>Total Tax Savings</h4>
                    <div className="value positive">{formatCurrency(restructuringResults.savings.totalTaxSavings)}</div>
                  </div>
                  <div className="dashboard-card">
                    <h4>Required Pension Contributions</h4>
                    <div className="value negative">{formatCurrency(restructuringResults.proposed.totalPension)}</div>
                  </div>
                  <div className="dashboard-card">
                    <h4>Net Cost After Tax Relief</h4>
                    <div className="value" style={{ color: restructuringResults.savings.netCost > 0 ? '#dc3545' : '#28a745' }}>
                      {formatCurrency(restructuringResults.savings.netCost)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Scenario Details */}
              <div className="card" style={{ marginBottom: '20px' }}>
                <h3>Current Scenario</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <h4>RRltd "Secodwom Props" Sub-Entity</h4>
                    <p><strong>Short-term Rental Income (2SA, 87HP):</strong> {formatCurrency(restructuringResults.current.rrltdSecodwomPropsIncome)}</p>
                    <p><strong>Corporation Tax (12.5%):</strong> {formatCurrency(restructuringResults.current.rrltdSecodwomPropsTax)}</p>
                    <p><strong>Salaries Paid (Dwayne, Sean, Heidi):</strong> {formatCurrency(restructuringResults.current.rrltdSalaries)}</p>
                  </div>
                  <div>
                    <h4>Individual Rental Income & Tax</h4>
                    <p><strong>Long-term Rental Income (28LC, 19Abb, 51LC):</strong> {formatCurrency(restructuringResults.current.individualRental)}</p>
                    <p><strong>Omar's Tax:</strong> {formatCurrency(restructuringResults.current.omarTax.totalTax)}</p>
                    <p><strong>Heidi's Tax:</strong> {formatCurrency(restructuringResults.current.heidiTax.totalTax)}</p>
                  </div>
                </div>
              </div>

              {/* Proposed Scenario Details */}
              <div className="card" style={{ marginBottom: '20px' }}>
                <h3>Proposed Scenario</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <h4>RRltd Sub-Entities & Tax</h4>
                    <p><strong>Loan Amount:</strong> {formatCurrency(restructuringResults.proposed.loanAmount)}</p>
                    <p><strong>"Secodwom Props" Income (2SA, 87HP):</strong> {formatCurrency(restructuringResults.proposed.rrltdSecodwomPropsIncome)}</p>
                    <p><strong>"Secodwom Props" CT (12.5%):</strong> {formatCurrency(restructuringResults.proposed.rrltdSecodwomPropsTax)}</p>
                    <p><strong>"OmHe Props" Short-term Income (28LC, 51LC):</strong> {formatCurrency(restructuringResults.proposed.rrltdOmHePropsShortTermIncome)}</p>
                    <p><strong>"OmHe Props" Long-term Income (19Abb):</strong> {formatCurrency(restructuringResults.proposed.rrltdOmHePropsLongTermIncome)}</p>
                    <p><strong>"OmHe Props" Short-term CT (12.5%):</strong> {formatCurrency(restructuringResults.proposed.rrltdOmHePropsShortTermTax)}</p>
                    <p><strong>"OmHe Props" Long-term CT (25%):</strong> {formatCurrency(restructuringResults.proposed.rrltdOmHePropsLongTermTax)}</p>
                    <p><strong>Total Corporation Tax:</strong> {formatCurrency(restructuringResults.proposed.rrltdTotalTax)}</p>
                    <p><strong>"Secodwom Props" Salaries (Dwayne, Sean):</strong> {formatCurrency(restructuringResults.proposed.rrltdSecodwomPropsSalaries)}</p>
                    <p><strong>"OmHe Props" Salaries (Heidi):</strong> {formatCurrency(restructuringResults.proposed.rrltdOmHePropsSalaries)}</p>
                    <p><strong>Total Salaries:</strong> {formatCurrency(restructuringResults.proposed.rrltdTotalSalaries)}</p>
                  </div>
                  <div>
                    <h4>Pension Contributions & Tax Relief</h4>
                    <p><strong>Omar's Pension:</strong> {formatCurrency(restructuringResults.proposed.omarPension)}</p>
                    <p><strong>Heidi's Pension:</strong> {formatCurrency(restructuringResults.proposed.heidiPension)}</p>
                    <p><strong>Total Pensions:</strong> {formatCurrency(restructuringResults.proposed.totalPension)}</p>
                    <p><strong>Omar's Tax After Pension:</strong> {formatCurrency(restructuringResults.proposed.omarTax.totalTax)}</p>
                    <p><strong>Heidi's Tax After Pension:</strong> {formatCurrency(restructuringResults.proposed.heidiTax.totalTax)}</p>
                  </div>
                </div>
              </div>

              {/* Tax Savings Breakdown */}
              <div className="card">
                <h3>Tax Savings Breakdown</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <h4>Individual Tax Savings</h4>
                    <p><strong>Omar's Tax Savings:</strong> {formatCurrency(restructuringResults.savings.omarTaxSavings)}</p>
                    <p><strong>Heidi's Tax Savings:</strong> {formatCurrency(restructuringResults.savings.heidiTaxSavings)}</p>
                    <p><strong>Total Individual Savings:</strong> {formatCurrency(restructuringResults.savings.omarTaxSavings + restructuringResults.savings.heidiTaxSavings)}</p>
                  </div>
                  <div>
                    <h4>Implementation Cost</h4>
                    <p><strong>Required Pension Contributions:</strong> {formatCurrency(restructuringResults.proposed.totalPension)}</p>
                    <p><strong>Tax Relief Received:</strong> {formatCurrency(restructuringResults.savings.omarTaxSavings + restructuringResults.savings.heidiTaxSavings)}</p>
                    <p><strong>Net Cost to RRltd:</strong> {formatCurrency(restructuringResults.savings.netCost)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'overview' && (
        <div>
          <h2>Complete Current vs Proposed Scenario Overview</h2>
          
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3>🏗️ Current Scenario</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <h4>Corporate Structure</h4>
                <div style={{ fontFamily: 'monospace', fontSize: '14px', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                  RRltd (Ireland) - 100% owned by Omar & Heidi (50:50)<br/>
                  ├── Subsidiary: SECODWOM UK LTD (100% owned by RRltd)<br/>
                  │   └── Property: 67RR (Bristol, UK)<br/>
                  └── Individual Properties: 2SA, 87HP, 28LC, 19Abb, 51LC (personal ownership)
                </div>
              </div>
              <div>
                <h4>Property Ownership & Income</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><strong>2SA:</strong> €200,000/year (short-term rental, personal tax) - Sean, Dwayne, Omar</li>
                  <li><strong>87HP:</strong> €125,000/year (short-term rental, personal tax) - Sean, Dwayne, Omar</li>
                  <li><strong>28LC:</strong> €75,000/year (short-term rental, personal tax) - Omar & Heidi</li>
                  <li><strong>19Abb:</strong> €32,244/year (long-term rental, personal tax) - Omar & Heidi</li>
                  <li><strong>51LC:</strong> €29,040/year (long-term rental, personal tax) - Omar & Heidi</li>
                  <li><strong>67RR:</strong> €150,000/year (short-term rental, UK CT ~19%)</li>
                </ul>
                <p><strong>Total Individual Income:</strong> €611,284/year</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h4>Current Loans</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><strong>BOI Loan (2SA):</strong> €400,000 balance, €6,400/month</li>
                  <li><strong>AIB Loan (28LC):</strong> €300,000 balance, €1,500/month</li>
                  <li><strong>Pepper Loan (19Abb):</strong> €200,000 balance, €1,200/month</li>
                  <li><strong>UK HTB Loan (67RR):</strong> £600,000 (5.2% interest, 25 years)</li>
                </ul>
                <p><strong>Total Monthly Payments:</strong> €9,100 + £3,600</p>
              </div>
              <div>
                <h4>Current Tax Structure</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><strong>RRltd Corporation Tax:</strong> 12.5% on trading income</li>
                  <li><strong>Personal Income Tax:</strong> 20% up to €88k, 40% above</li>
                  <li><strong>VAT:</strong> 23% on short-term rentals (RRltd registered)</li>
                  <li><strong>UK Corporation Tax:</strong> ~19% on 67RR profits</li>
                </ul>
                <p><strong>Net Cash Flow:</strong> €502,084/year</p>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '20px' }}>
            <h3>🚀 Proposed Scenario</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <h4>Corporate Structure</h4>
                <div style={{ fontFamily: 'monospace', fontSize: '14px', backgroundColor: '#e8f5e8', padding: '10px', borderRadius: '4px' }}>
                  RRltd (Ireland) - 100% owned by Omar & Heidi (50:50)<br/>
                  ├── "OmHe Props" Sub-entity (Omar & Heidi only)<br/>
                  │   ├── Properties: 28LC, 51LC (short-term rentals)<br/>
                  │   └── Property: 19Abb (long-term rental)<br/>
                  ├── Subsidiary: SECODWOM UK LTD (100% owned by RRltd)<br/>
                  │   ├── Property: 67RR (Bristol, UK)<br/>
                  │   └── UK HTB Loan: £600,000 (5.2% interest, 25 years)<br/>
                  ├── New ICS Loan: €850,000 (to purchase 28LC, 19Abb, 51LC)<br/>
                  └── Individual Properties (UNCHANGED - NO CGT): 2SA, 87HP
                </div>
              </div>
              <div>
                <h4>Property Ownership & Income</h4>
                <div style={{ marginBottom: '15px' }}>
                  <h5>Individual Properties (UNCHANGED - NO CGT ISSUES):</h5>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li><strong>2SA:</strong> €200,000/year (short-term rental, personal tax) - Sean, Dwayne, Omar</li>
                    <li><strong>87HP:</strong> €125,000/year (short-term rental, personal tax) - Sean, Dwayne, Omar</li>
                  </ul>
                  <p><strong>Total Individual Income:</strong> €325,000/year</p>
                </div>
                <div>
                  <h5>"OmHe Props" (RRltd - Omar & Heidi only):</h5>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li><strong>28LC:</strong> €75,000/year (short-term rental, 12.5% CT + 23% VAT)</li>
                    <li><strong>51LC:</strong> €75,000/year (short-term rental, 12.5% CT + 23% VAT) *up from €29,040*</li>
                    <li><strong>19Abb:</strong> €32,244/year (long-term rental, 25% CT, no VAT)</li>
                  </ul>
                  <p><strong>Total "OmHe Props" Income:</strong> €182,244/year</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h4>New Loan Structure</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><strong>ICS Loan (Ireland):</strong> €850,000 (new, to purchase 28LC, 19Abb, 51LC)</li>
                  <li><strong>Monthly Payment:</strong> ~€5,000/month (€60,000/year)</li>
                  <li><strong>UK HTB Loan (UK):</strong> £600,000 (5.2% interest, 25 years)</li>
                  <li><strong>Monthly Payment:</strong> ~£3,600/month (£43,200/year)</li>
                  <li><strong>Personal Loans:</strong> ALL ELIMINATED (AIB, Pepper)</li>
                  <li><strong>BOI Loan:</strong> ELIMINATED (paid off with 28LC sale proceeds)</li>
                </ul>
              </div>
              <div>
                <h4>Proposed Tax Structure</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><strong>"OmHe Props" CT:</strong> 12.5% (short-term) + 25% (long-term)</li>
                  <li><strong>Personal Tax:</strong> Near zero (due to pension contributions)</li>
                  <li><strong>VAT:</strong> 23% on short-term rentals (RRltd registered)</li>
                  <li><strong>UK Corporation Tax:</strong> ~19% on 67RR profits</li>
                </ul>
                <p><strong>Net Cash Flow:</strong> €554,044/year (€597,244 - £43,200)</p>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '20px' }}>
            <h3>💰 Financial Comparison</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div>
                <h4>Current Scenario</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><strong>Total Property Income:</strong> €611,284/year</li>
                  <li><strong>Total Loan Payments:</strong> €109,200/year (BOI + AIB + Pepper)</li>
                  <li><strong>Net Cash Flow:</strong> €502,084/year</li>
                  <li><strong>Tax Burden:</strong> High (personal + corporation)</li>
                </ul>
              </div>
              <div>
                <h4>Proposed Scenario</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><strong>Total Property Income:</strong> €657,244/year (+€45,960 from 51LC conversion)</li>
                  <li><strong>Total Loan Payments:</strong> €60,000/year (ICS) + £43,200/year (UK HTB)</li>
                  <li><strong>Net Cash Flow:</strong> €554,044/year</li>
                  <li><strong>Tax Burden:</strong> Significantly reduced (pension optimization)</li>
                </ul>
              </div>
              <div>
                <h4>Improvement</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><strong>Net Cash Flow:</strong> +€51,960/year</li>
                  <li><strong>Monthly Loan Payments:</strong> -€500 + £3,600</li>
                  <li><strong>Personal Tax:</strong> Near Zero (vs High)</li>
                  <li><strong>Property Income:</strong> +€45,960</li>
                  <li><strong>Risk Profile:</strong> Much Better</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '20px' }}>
            <h3>🎯 Key Benefits of Proposed Scenario</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h4>1. Cash Flow Optimization</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><strong>Net Cash Flow Improvement:</strong> €51,960/year</li>
                  <li><strong>Eliminates 3 personal loans:</strong> €32,400/year saved</li>
                  <li><strong>BOI loan elimination:</strong> €76,800/year saved</li>
                  <li><strong>51LC income increase:</strong> €45,960/year</li>
                  <li><strong>UK HTB loan cost:</strong> £43,200/year (£37,600/year in euros)</li>
                </ul>
              </div>
              <div>
                <h4>2. Tax Efficiency</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><strong>Pension contributions</strong> reduce personal tax to near zero</li>
                  <li><strong>Corporation tax optimization</strong> with sub-entity structure</li>
                  <li><strong>VAT benefits</strong> on short-term rentals</li>
                  <li><strong>UK-Ireland tax optimization</strong> potential</li>
                </ul>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
              <div>
                <h4>3. Risk Management</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><strong>Personal liability eliminated</strong> for property loans</li>
                  <li><strong>Company structure</strong> provides better protection</li>
                  <li><strong>Consolidated management</strong> of all properties</li>
                  <li><strong>Isolated sub-entities</strong> prevent cross-contamination</li>
                </ul>
              </div>
              <div>
                <h4>4. Strategic Advantages</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><strong>Higher income potential</strong> with 51LC conversion</li>
                  <li><strong>Better loan serviceability</strong> with consolidated income</li>
                  <li><strong>Tax optimization</strong> through pension contributions</li>
                  <li><strong>International expansion</strong> potential with UK subsidiary</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>📊 Final Summary Impact</h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left' }}>Metric</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left' }}>Current</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left' }}>Proposed</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left' }}>Improvement</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #dee2e6', padding: '12px' }}><strong>Net Cash Flow</strong></td>
                    <td style={{ border: '1px solid #dee2e6', padding: '12px' }}>€502,084</td>
                    <td style={{ border: '1px solid #dee2e6', padding: '12px' }}>€554,044</td>
                    <td style={{ border: '1px solid #dee2e6', padding: '12px', color: '#28a745' }}>+€51,960</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #dee2e6', padding: '12px' }}><strong>Monthly Loan Payments</strong></td>
                    <td style={{ border: '1px solid #dee2e6', padding: '12px' }}>€9,100</td>
                    <td style={{ border: '1px solid #dee2e6', padding: '12px' }}>€8,600 + £3,600</td>
                    <td style={{ border: '1px solid #dee2e6', padding: '12px', color: '#28a745' }}>-€500 + £3,600</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #dee2e6', padding: '12px' }}><strong>Personal Tax</strong></td>
                    <td style={{ border: '1px solid #dee2e6', padding: '12px' }}>High</td>
                    <td style={{ border: '1px solid #dee2e6', padding: '12px' }}>Near Zero</td>
                    <td style={{ border: '1px solid #dee2e6', padding: '12px', color: '#28a745' }}>Significant</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #dee2e6', padding: '12px' }}><strong>Property Income</strong></td>
                    <td style={{ border: '1px solid #dee2e6', padding: '12px' }}>€611,284</td>
                    <td style={{ border: '1px solid #dee2e6', padding: '12px' }}>€657,244</td>
                    <td style={{ border: '1px solid #dee2e6', padding: '12px', color: '#28a745' }}>+€45,960</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #dee2e6', padding: '12px' }}><strong>Risk Profile</strong></td>
                    <td style={{ border: '1px solid #dee2e6', padding: '12px' }}>High (personal loans)</td>
                    <td style={{ border: '1px solid #dee2e6', padding: '12px' }}>Low (company structure)</td>
                    <td style={{ border: '1px solid #dee2e6', padding: '12px', color: '#28a745' }}>Much Better</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '6px', border: '2px solid #28a745' }}>
              <h4 style={{ marginTop: 0, color: '#155724' }}>Final Result</h4>
              <p style={{ marginBottom: 0, fontSize: '18px', fontWeight: 'bold' }}>
                The proposed restructuring provides a <strong>€51,960/year net improvement</strong> even after accounting for the UK HTB loan payments!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoanCalculator;
