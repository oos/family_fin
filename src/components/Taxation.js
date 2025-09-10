import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Taxation() {
  const [income, setIncome] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [incomeRes, peopleRes] = await Promise.all([
        axios.get('/income'),
        axios.get('/people')
      ]);
      setIncome(incomeRes.data);
      setPeople(peopleRes.data);
    } catch (err) {
      setError('Failed to load taxation data');
      console.error(err);
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

  // Irish Tax Calculation Functions
  const calculateIrishTax = (grossIncome, familyType, isPensioner = false, isSecondEarner = false, pensionContribution = 0) => {
    // 2024 Irish Tax Rates and Bands
    const TAX_BANDS = {
      single: [
        { min: 0, max: 42000, rate: 0.20 },
        { min: 42000, max: Infinity, rate: 0.40 }
      ],
      married_first_earner: [
        { min: 0, max: 53000, rate: 0.20 },
        { min: 53000, max: Infinity, rate: 0.40 }
      ],
      married_second_earner: [
        { min: 0, max: 35000, rate: 0.20 },
        { min: 35000, max: Infinity, rate: 0.40 }
      ]
    };

    // PRSI Rates
    const PRSI_RATE = 0.04; // 4% for most employees

    // USC Rates (Universal Social Charge)
    const USC_BANDS = [
      { min: 0, max: 12012, rate: 0.005 },
      { min: 12012, max: 25076, rate: 0.02 },
      { min: 25076, max: 70044, rate: 0.045 },
      { min: 70044, max: Infinity, rate: 0.08 }
    ];

    // Tax Credits
    const TAX_CREDITS = {
      single: 3750,
      married: 7500, // Married couple gets double the single person credit
      pensioner: 3750 + 1650 // Additional age tax credit for pensioners
    };

    // Determine tax bands based on family type and earner position
    let taxBands;
    if (familyType === 'married') {
      taxBands = isSecondEarner ? TAX_BANDS.married_second_earner : TAX_BANDS.married_first_earner;
    } else {
      taxBands = TAX_BANDS.single;
    }
    const taxCredit = isPensioner ? TAX_CREDITS.pensioner : TAX_CREDITS[familyType];

    // Calculate taxable income (gross income minus pension contribution)
    const taxableIncome = Math.max(0, grossIncome - pensionContribution);

    // Calculate Income Tax on taxable income
    let incomeTax = 0;
    let remainingIncome = taxableIncome;

    for (const band of taxBands) {
      if (remainingIncome <= 0) break;
      const taxableInBand = Math.min(remainingIncome, band.max - band.min);
      incomeTax += taxableInBand * band.rate;
      remainingIncome -= taxableInBand;
    }

    // Apply tax credits
    incomeTax = Math.max(0, incomeTax - taxCredit);

    // Calculate PRSI
    const prsi = grossIncome * PRSI_RATE;

    // Calculate USC
    let usc = 0;
    let uscRemainingIncome = grossIncome;

    for (const band of USC_BANDS) {
      if (uscRemainingIncome <= 0) break;
      const uscInBand = Math.min(uscRemainingIncome, band.max - band.min);
      usc += uscInBand * band.rate;
      uscRemainingIncome -= uscInBand;
    }

    // Calculate total tax
    const totalTax = incomeTax + prsi + usc;

    return {
      grossIncome,
      pensionContribution,
      taxableIncome,
      incomeTax,
      prsi,
      usc,
      totalTax,
      netIncome: grossIncome - totalTax - pensionContribution,
      taxCredit,
      taxBands: taxBands || [],
      uscBands: USC_BANDS || []
    };
  };

  // Calculate optimal pension contribution for tax reduction
  const calculateOptimalPension = (grossIncome, familyType, isPensioner = false, isSecondEarner = false, age = 40) => {
    // Irish pension contribution limits for 2024
    const PENSION_LIMITS = {
      under30: 0.15, // 15% of gross income
      under40: 0.20, // 20% of gross income
      under50: 0.25, // 25% of gross income
      under55: 0.30, // 30% of gross income
      under60: 0.35, // 35% of gross income
      over60: 0.40   // 40% of gross income
    };

    // Maximum annual contribution (€115,000 for 2024)
    const MAX_ANNUAL_CONTRIBUTION = 115000;

    // Determine age-based percentage limit
    let ageLimit;
    if (age < 30) ageLimit = PENSION_LIMITS.under30;
    else if (age < 40) ageLimit = PENSION_LIMITS.under40;
    else if (age < 50) ageLimit = PENSION_LIMITS.under50;
    else if (age < 55) ageLimit = PENSION_LIMITS.under55;
    else if (age < 60) ageLimit = PENSION_LIMITS.under60;
    else ageLimit = PENSION_LIMITS.over60;

    // Calculate maximum allowed contribution
    const maxContributionByAge = grossIncome * ageLimit;
    const maxContribution = Math.min(maxContributionByAge, MAX_ANNUAL_CONTRIBUTION);

    // Calculate tax without pension
    const taxWithoutPension = calculateIrishTax(grossIncome, familyType, isPensioner, isSecondEarner, 0);
    
    // Calculate tax with maximum pension contribution
    const taxWithMaxPension = calculateIrishTax(grossIncome, familyType, isPensioner, isSecondEarner, maxContribution);
    
    // Calculate tax savings
    const taxSavings = taxWithoutPension.totalTax - taxWithMaxPension.totalTax;
    const netCost = maxContribution - taxSavings;

    return {
      maxContribution,
      maxContributionByAge,
      ageLimit: ageLimit * 100,
      taxSavings,
      netCost,
      taxWithoutPension,
      taxWithMaxPension,
      effectiveTaxRate: (taxSavings / maxContribution) * 100
    };
  };

  // Group income by family with proper family mapping
  const familyMapping = {
    'Omar and Heidi': { type: 'married', code: 'OmHe', description: 'Married couple - both directors' },
    'Dwayne and Lena': { type: 'married', code: 'DwLe', description: 'Married couple - brother and sister-in-law' },
    'Sean and Coral': { type: 'pensioner', code: 'SeCo', description: 'Pensioner (Coral deceased)' }
  };

  const incomeByFamily = income.reduce((groups, incomeRecord) => {
    const familyName = incomeRecord.family?.name || 'Unknown Family';
    if (!groups[familyName]) {
      groups[familyName] = [];
    }
    groups[familyName].push(incomeRecord);
    return groups;
  }, {});

  // Process family data with tax calculations
  const familyTaxData = Object.entries(incomeByFamily).map(([familyName, records]) => {
    const familyInfo = familyMapping[familyName] || { type: 'single', code: 'Unknown', description: 'Unknown family' };
    
    // Group records by person within each family
    const personTotals = records.reduce((totals, inc) => {
      if (!totals[inc.person_name]) {
        totals[inc.person_name] = {
          person_name: inc.person_name,
          external: 0,
          rrltd: 0,
          omhe_props: 0
        };
      }
      
      if (inc.income_type === 'external_source') {
        totals[inc.person_name].external = inc.amount_yearly;
      } else if (inc.income_type === 'rrltd') {
        totals[inc.person_name].rrltd = inc.amount_yearly;
      } else if (inc.income_type === 'omhe_props') {
        totals[inc.person_name].omhe_props = inc.amount_yearly;
      }
      
      return totals;
    }, {});

    const personTotalsArray = Object.values(personTotals);
    
    // Calculate family totals
    const familyTotals = personTotalsArray.reduce((totals, person) => ({
      external: totals.external + person.external,
      rrltd: totals.rrltd + person.rrltd,
      omhe_props: totals.omhe_props + person.omhe_props,
      total: totals.total + person.external + person.rrltd + person.omhe_props
    }), { external: 0, rrltd: 0, omhe_props: 0, total: 0 });

    // Calculate tax for the family
    let taxCalculation;
    let pensionOptimization;
    
    if (familyInfo.type === 'married' && personTotalsArray.length === 2) {
      // For married couples, calculate tax for each person individually
      const person1 = personTotalsArray[0];
      const person2 = personTotalsArray[1];
      const person1Total = person1.external + person1.rrltd + person1.omhe_props;
      const person2Total = person2.external + person2.rrltd + person2.omhe_props;
      
      // Determine who is the higher earner (first earner gets €53k band)
      const isPerson1HigherEarner = person1Total >= person2Total;
      
      const person1Tax = calculateIrishTax(
        person1Total, 
        familyInfo.type, 
        false, // not pensioner
        !isPerson1HigherEarner // person1 is second earner if person1 is NOT the higher earner
      );
      
      const person2Tax = calculateIrishTax(
        person2Total, 
        familyInfo.type, 
        false, // not pensioner
        isPerson1HigherEarner // person2 is second earner if person1 IS the higher earner
      );
      
      // Combine the tax calculations
      // For married couples, the combined tax credit is €7,500 (not €3,750 each)
      const combinedTaxCredit = 7500;
      
      taxCalculation = {
        grossIncome: person1Tax.grossIncome + person2Tax.grossIncome,
        incomeTax: person1Tax.incomeTax + person2Tax.incomeTax,
        prsi: person1Tax.prsi + person2Tax.prsi,
        usc: person1Tax.usc + person2Tax.usc,
        totalTax: person1Tax.totalTax + person2Tax.totalTax,
        netIncome: person1Tax.netIncome + person2Tax.netIncome,
        taxCredit: combinedTaxCredit, // Show the combined tax credit
        taxBands: [person1Tax.taxBands || [], person2Tax.taxBands || []],
        uscBands: person1Tax.uscBands || []
      };
      
      // Calculate pension optimization for married couples
      // Use the higher earner's income for pension calculation (they can contribute more)
      const higherEarnerIncome = Math.max(person1Total, person2Total);
      pensionOptimization = calculateOptimalPension(
        higherEarnerIncome, 
        familyInfo.type, 
        false, 
        false, // Use first earner rates for pension calculation
        40 // Default age - could be made configurable
      );
    } else {
      // For single people or pensioners, use the original calculation
      taxCalculation = calculateIrishTax(
        familyTotals.total, 
        familyInfo.type, 
        familyInfo.type === 'pensioner'
      );
      
      // Calculate pension optimization for single people
      pensionOptimization = calculateOptimalPension(
        familyTotals.total, 
        familyInfo.type, 
        familyInfo.type === 'pensioner',
        false,
        40 // Default age - could be made configurable
      );
    }

    return {
      familyName,
      familyInfo,
      personTotals: personTotalsArray,
      familyTotals,
      taxCalculation,
      pensionOptimization
    };
  }).sort((a, b) => a.familyName.localeCompare(b.familyName));

  if (loading) {
    return <div className="loading">Loading taxation data...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1>Taxation Analysis</h1>
        <p style={{ color: '#666', fontSize: '16px', marginBottom: '20px' }}>
          Detailed Irish tax calculations for each family unit based on 2024 tax rates and bands.
        </p>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Tax Overview */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3>2024 Irish Tax System Overview</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <h4>Income Tax Bands</h4>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li><strong>Single/Pensioner:</strong> 20% up to €42,000, 40% above</li>
                <li><strong>Married Couple - First Earner:</strong> 20% up to €53,000, 40% above</li>
                <li><strong>Married Couple - Second Earner:</strong> 20% up to €35,000, 40% above</li>
                <li><strong>Married Couple Combined:</strong> Up to €88,000 at 20% rate</li>
              </ul>
            </div>
          <div>
            <h4>Other Charges</h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li><strong>PRSI:</strong> 4% on all income</li>
              <li><strong>USC:</strong> Progressive rates (0.5% to 8%)</li>
            </ul>
          </div>
        </div>
        <div>
          <h4>Tax Credits</h4>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li><strong>Standard Credit:</strong> €3,750 per person</li>
            <li><strong>Age Credit:</strong> Additional €1,650 for pensioners (65+)</li>
            <li><strong>Married Couple:</strong> €7,500 total (€3,750 each)</li>
          </ul>
        </div>
      </div>

      {/* Family Tax Calculations */}
      {familyTaxData.map((family, familyIndex) => (
        <div key={familyIndex} className="card" style={{ marginBottom: '30px' }}>
          <h3 style={{ 
            marginBottom: '15px', 
            padding: '15px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            {family.familyName} ({family.familyInfo.code})
            <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#666', display: 'block', marginTop: '5px' }}>
              {family.familyInfo.description}
            </span>
          </h3>

          {/* Income Breakdown */}
          <div style={{ marginBottom: '20px' }}>
            <h4>Income Breakdown</h4>
            <table className="table" style={{ marginBottom: '15px' }}>
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
                {family.personTotals.map((person, index) => {
                  const total = person.external + person.rrltd + person.omhe_props;
                  return (
                    <tr key={index}>
                      <td>{person.person_name}</td>
                      <td>{formatCurrency(person.external)}</td>
                      <td>{formatCurrency(person.rrltd)}</td>
                      <td>{formatCurrency(person.omhe_props)}</td>
                      <td><strong>{formatCurrency(total)}</strong></td>
                    </tr>
                  );
                })}
                <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
                  <td>Family Total</td>
                  <td>{formatCurrency(family.familyTotals.external)}</td>
                  <td>{formatCurrency(family.familyTotals.rrltd)}</td>
                  <td>{formatCurrency(family.familyTotals.omhe_props)}</td>
                  <td style={{ fontSize: '16px' }}>{formatCurrency(family.familyTotals.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax Calculation Details */}
          <div style={{ marginBottom: '20px' }}>
            <h4>Tax Calculation Details</h4>
            
            {/* Income Tax Calculation */}
            <div style={{ marginBottom: '15px' }}>
              <h5>Income Tax Calculation</h5>
              <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                {family.familyInfo.type === 'married' && family.personTotals.length === 2 ? (
                  <div>
                    <p><strong>Tax Band:</strong> Married Couple (Individual Calculation)</p>
                    <p><strong>First Earner:</strong> Up to €53,000 at 20%, then 40%</p>
                    <p><strong>Second Earner:</strong> Up to €35,000 at 20%, then 40%</p>
                    <p><strong>Combined:</strong> Up to €88,000 at 20% rate</p>
                    
                    <div style={{ marginTop: '15px' }}>
                      <h6>Individual Tax Calculations:</h6>
                      {family.personTotals.map((person, personIndex) => {
                        const personTotal = person.external + person.rrltd + person.omhe_props;
                        const isHigherEarner = personIndex === 0 ? 
                          personTotal >= (family.personTotals[1].external + family.personTotals[1].rrltd + family.personTotals[1].omhe_props) :
                          personTotal < (family.personTotals[0].external + family.personTotals[0].rrltd + family.personTotals[0].omhe_props);
                        const personTax = calculateIrishTax(personTotal, 'married', false, !isHigherEarner);
                        
                        return (
                          <div key={personIndex} style={{ 
                            marginBottom: '10px', 
                            padding: '10px', 
                            backgroundColor: '#f0f8ff',
                            borderRadius: '6px',
                            border: '1px solid #2196f3'
                          }}>
                            <strong>{person.person_name} ({isHigherEarner ? 'First Earner' : 'Second Earner'}):</strong> {formatCurrency(personTotal)}
                            <div style={{ marginTop: '5px' }}>
                              {personTax.taxBands && personTax.taxBands.map((band, bandIndex) => {
                                if (!band || typeof band.min === 'undefined' || typeof band.max === 'undefined') {
                                  return null;
                                }
                                const taxableInBand = Math.min(personTotal - band.min, band.max - band.min);
                                const taxInBand = Math.max(0, taxableInBand) * band.rate;
                                const isActive = personTotal > band.min;
                                
                                return (
                                  <div key={bandIndex} style={{ 
                                    marginBottom: '3px', 
                                    padding: '3px 8px', 
                                    backgroundColor: isActive ? '#e3f2fd' : '#f5f5f5',
                                    borderRadius: '3px',
                                    fontSize: '12px'
                                  }}>
                                    <strong>{band.rate * 100}%</strong> on €{band.min.toLocaleString()} - €{band.max === Infinity ? '∞' : band.max.toLocaleString()}: 
                                    {isActive ? ` €${Math.max(0, taxableInBand).toLocaleString()} × ${band.rate * 100}% = ${formatCurrency(taxInBand)}` : ' Not applicable'}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p><strong>Tax Band:</strong> {family.familyInfo.type === 'married' ? 'Married Couple' : 'Single/Pensioner'}</p>
                    <p><strong>Standard Rate Band:</strong> {family.familyInfo.type === 'married' ? '€53,000' : '€42,000'}</p>
                    <p><strong>Higher Rate Band:</strong> Above standard rate band</p>
                    
                    <div style={{ marginTop: '10px' }}>
                      {family.taxCalculation.taxBands && family.taxCalculation.taxBands.map((band, index) => {
                        if (!band || typeof band.min === 'undefined' || typeof band.max === 'undefined') {
                          return null;
                        }
                        const taxableInBand = Math.min(family.familyTotals.total - band.min, band.max - band.min);
                        const taxInBand = Math.max(0, taxableInBand) * band.rate;
                        const isActive = family.familyTotals.total > band.min;
                        
                        return (
                          <div key={index} style={{ 
                            marginBottom: '5px', 
                            padding: '5px 10px', 
                            backgroundColor: isActive ? '#e3f2fd' : '#f5f5f5',
                            borderRadius: '4px',
                            border: isActive ? '1px solid #2196f3' : '1px solid #ddd'
                          }}>
                            <strong>{band.rate * 100}%</strong> on €{band.min.toLocaleString()} - €{band.max === Infinity ? '∞' : band.max.toLocaleString()}: 
                            {isActive ? ` €${Math.max(0, taxableInBand).toLocaleString()} × ${band.rate * 100}% = ${formatCurrency(taxInBand)}` : ' Not applicable'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
                  <p><strong>Subtotal Income Tax:</strong> {formatCurrency(family.taxCalculation.incomeTax + family.taxCalculation.taxCredit)}</p>
                  <p><strong>Less Tax Credit:</strong> -{formatCurrency(family.taxCalculation.taxCredit)}</p>
                  <p><strong>Net Income Tax:</strong> {formatCurrency(family.taxCalculation.incomeTax)}</p>
                </div>
              </div>
            </div>

            {/* PRSI Calculation */}
            <div style={{ marginBottom: '15px' }}>
              <h5>PRSI (Pay Related Social Insurance)</h5>
              <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <p><strong>Rate:</strong> 4% on all income</p>
                <p><strong>Calculation:</strong> {formatCurrency(family.familyTotals.total)} × 4% = {formatCurrency(family.taxCalculation.prsi)}</p>
              </div>
            </div>

            {/* USC Calculation */}
            <div style={{ marginBottom: '15px' }}>
              <h5>USC (Universal Social Charge)</h5>
              <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <p><strong>Progressive Rates:</strong></p>
                <div style={{ marginTop: '10px' }}>
                  {family.taxCalculation.uscBands && family.taxCalculation.uscBands.map((band, index) => {
                    if (!band || typeof band.min === 'undefined' || typeof band.max === 'undefined') {
                      return null;
                    }
                    const uscInBand = Math.min(Math.max(0, family.familyTotals.total - band.min), band.max - band.min);
                    const uscAmount = uscInBand * band.rate;
                    const isActive = family.familyTotals.total > band.min;
                    
                    return (
                      <div key={index} style={{ 
                        marginBottom: '5px', 
                        padding: '5px 10px', 
                        backgroundColor: isActive ? '#fff3e0' : '#f5f5f5',
                        borderRadius: '4px',
                        border: isActive ? '1px solid #ff9800' : '1px solid #ddd'
                      }}>
                        <strong>{band.rate * 100}%</strong> on €{band.min.toLocaleString()} - €{band.max === Infinity ? '∞' : band.max.toLocaleString()}: 
                        {isActive ? ` €${uscInBand.toLocaleString()} × ${band.rate * 100}% = ${formatCurrency(uscAmount)}` : ' Not applicable'}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff8e1', borderRadius: '4px' }}>
                  <p><strong>Total USC:</strong> {formatCurrency(family.taxCalculation.usc)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tax Summary */}
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#e3f2fd', 
            borderRadius: '8px',
            border: '2px solid #2196f3'
          }}>
            <h4 style={{ marginTop: 0, color: '#1976d2' }}>Tax Summary</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <p><strong>Gross Income:</strong> {formatCurrency(family.familyTotals.total)}</p>
                <p><strong>Income Tax:</strong> {formatCurrency(family.taxCalculation.incomeTax)}</p>
                <p><strong>PRSI:</strong> {formatCurrency(family.taxCalculation.prsi)}</p>
                <p><strong>USC:</strong> {formatCurrency(family.taxCalculation.usc)}</p>
              </div>
              <div>
                <p><strong>Total Tax:</strong> {formatCurrency(family.taxCalculation.totalTax)}</p>
                <p><strong>Net Income:</strong> {formatCurrency(family.taxCalculation.netIncome)}</p>
                <p><strong>Effective Tax Rate:</strong> {((family.taxCalculation.totalTax / family.familyTotals.total) * 100).toFixed(1)}%</p>
                <p><strong>Tax Credit Applied:</strong> {formatCurrency(family.taxCalculation.taxCredit)}</p>
              </div>
            </div>
          </div>

          {/* Pension Optimization */}
          {family.pensionOptimization && (
            <div style={{ 
              marginTop: '20px',
              padding: '20px', 
              backgroundColor: '#f3e5f5', 
              borderRadius: '8px',
              border: '2px solid #9c27b0'
            }}>
              <h4 style={{ marginTop: 0, color: '#7b1fa2' }}>Pension Optimization</h4>
              <div style={{ marginBottom: '15px' }}>
                <p><strong>Current Tax Bill:</strong> {formatCurrency(family.taxCalculation.totalTax)}</p>
                <p><strong>Minimum Tax Bill (with max pension):</strong> {formatCurrency(family.pensionOptimization.taxWithMaxPension.totalTax)}</p>
                <p><strong>Maximum Tax Savings:</strong> {formatCurrency(family.pensionOptimization.taxSavings)}</p>
              </div>
              
              <div style={{ 
                padding: '15px', 
                backgroundColor: '#e8f5e8', 
                borderRadius: '6px',
                marginBottom: '15px'
              }}>
                <h5 style={{ marginTop: 0, color: '#2e7d32' }}>Pension Contribution Details</h5>
                <p><strong>Maximum Annual Contribution:</strong> {formatCurrency(family.pensionOptimization.maxContribution)}</p>
                <p><strong>Age-Based Limit:</strong> {family.pensionOptimization.ageLimit}% of income (€{formatCurrency(family.pensionOptimization.maxContributionByAge)})</p>
                <p><strong>Annual Contribution Limit:</strong> €115,000 (2024 maximum)</p>
                <p><strong>Effective Tax Relief Rate:</strong> {family.pensionOptimization.effectiveTaxRate.toFixed(1)}%</p>
              </div>

              <div style={{ 
                padding: '15px', 
                backgroundColor: '#fff3e0', 
                borderRadius: '6px',
                border: '1px solid #ff9800'
              }}>
                <h5 style={{ marginTop: 0, color: '#f57c00' }}>Tax Reduction Strategy</h5>
                <p><strong>The minimum amount this tax bill can be reduced to is {formatCurrency(family.pensionOptimization.taxWithMaxPension.totalTax)} by paying {formatCurrency(family.pensionOptimization.maxContribution)} into a pension for this calendar year.</strong></p>
                <p><strong>Net Cost of Pension Contribution:</strong> {formatCurrency(family.pensionOptimization.netCost)} (after tax relief)</p>
                <p><strong>Tax Relief Received:</strong> {formatCurrency(family.pensionOptimization.taxSavings)}</p>
              </div>

              <div style={{ 
                padding: '15px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '6px',
                fontSize: '14px',
                color: '#666'
              }}>
                <h6 style={{ marginTop: 0, color: '#495057' }}>Important Notes:</h6>
                <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                  <li>Pension contributions reduce your taxable income, lowering your income tax bill</li>
                  <li>PRSI and USC are still calculated on your gross income (before pension contributions)</li>
                  <li>Company directors can make both personal and company pension contributions</li>
                  <li>Consider both personal PRSA/PRB contributions and company pension schemes</li>
                  <li>Pension contributions must be made before the end of the tax year to count for that year</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default Taxation;
