import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

function Income() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [income, setIncome] = useState([]);
  const [people, setPeople] = useState([]);
  const [pensions, setPensions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [editingPension, setEditingPension] = useState(null);
  const [formData, setFormData] = useState({
    person_id: '',
    income_type: 'external_source',
    income_category: 'non_rental',
    amount_yearly: '',
    amount_monthly: ''
  });
  const [pensionFormData, setPensionFormData] = useState({
    person_id: '',
    pension_type: '',
    contribution_amount: '',
    contribution_frequency: 'annual',
    tax_year: new Date().getFullYear(),
    is_company_contribution: false,
    company_name: '',
    pension_provider: '',
    notes: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'summary');
  const [showCalculations, setShowCalculations] = useState({});
  const [collapsedFamilies, setCollapsedFamilies] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [incomeRes, peopleRes, pensionsRes] = await Promise.all([
        axios.get('/api/income'),
        axios.get('/api/people'),
        axios.get('/api/pensions')
      ]);
      setIncome(incomeRes.data.success ? incomeRes.data.incomes : []);
      setPeople(peopleRes.data);
      setPensions(pensionsRes.data);
    } catch (err) {
      setError('Failed to load income data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        amount_yearly: parseFloat(formData.amount_yearly) || 0,
        amount_monthly: parseFloat(formData.amount_monthly) || 0
      };

      if (editingIncome) {
        await axios.put(`/income/${editingIncome.id}`, data);
      } else {
        await axios.post('/income', data);
      }
      setShowModal(false);
      setEditingIncome(null);
      setFormData({ person_id: '', income_type: 'external_source', amount_yearly: '', amount_monthly: '' });
      fetchData();
    } catch (err) {
      setError('Failed to save income record');
      console.error(err);
    }
  };

  const handleEdit = (incomeRecord) => {
    setEditingIncome(incomeRecord);
    setFormData({
      person_id: incomeRecord.person_id.toString(),
      income_type: incomeRecord.income_type,
      income_category: incomeRecord.income_category || 'non_rental',
      amount_yearly: incomeRecord.amount_yearly.toString(),
      amount_monthly: incomeRecord.amount_monthly.toString()
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this income record?')) {
      try {
        await axios.delete(`/income/${id}`);
        fetchData();
      } catch (err) {
        setError('Failed to delete income record');
        console.error(err);
      }
    }
  };

  // Pension-related functions
  const handlePensionEdit = (pension) => {
    setEditingPension(pension);
    setPensionFormData({
      person_id: pension.person_id,
      pension_type: pension.pension_type,
      contribution_amount: pension.contribution_amount,
      contribution_frequency: pension.contribution_frequency,
      tax_year: pension.tax_year,
      is_company_contribution: pension.is_company_contribution,
      company_name: pension.company_name || '',
      pension_provider: pension.pension_provider || '',
      notes: pension.notes || ''
    });
    setShowModal(true);
  };

  const handlePensionDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this pension record?')) {
      try {
        await axios.delete(`/pensions/${id}`);
        setPensions(pensions.filter(p => p.id !== id));
      } catch (err) {
        setError('Failed to delete pension record');
        console.error(err);
      }
    }
  };

  const handlePensionSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...pensionFormData,
        contribution_amount: parseFloat(pensionFormData.contribution_amount),
        tax_year: parseInt(pensionFormData.tax_year)
      };

      if (editingPension) {
        await axios.put(`/pensions/${editingPension.id}`, data);
        setPensions(pensions.map(p => p.id === editingPension.id ? { ...p, ...data } : p));
      } else {
        const response = await axios.post('/pensions', data);
        setPensions([...pensions, response.data]);
      }

      setShowModal(false);
      setEditingPension(null);
      setPensionFormData({
        person_id: '',
        pension_type: '',
        contribution_amount: '',
        contribution_frequency: 'annual',
        tax_year: new Date().getFullYear(),
        is_company_contribution: false,
        company_name: '',
        pension_provider: '',
        notes: ''
      });
    } catch (err) {
      setError('Failed to save pension record');
      console.error(err);
    }
  };

  const handleAddNew = () => {
    setEditingIncome(null);
    setEditingPension(null);
    setFormData({ person_id: '', income_type: 'external_source', income_category: 'non_rental', amount_yearly: '', amount_monthly: '' });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingIncome(null);
    setEditingPension(null);
    setFormData({ person_id: '', income_type: 'external_source', income_category: 'non_rental', amount_yearly: '', amount_monthly: '' });
    setPensionFormData({
      person_id: '',
      pension_type: '',
      contribution_amount: '',
      contribution_frequency: 'annual',
      tax_year: new Date().getFullYear(),
      is_company_contribution: false,
      company_name: '',
      pension_provider: '',
      notes: ''
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Irish Tax Calculation Functions
  const calculateIrishTax = (grossIncome, familyType, isPensioner = false) => {
    // 2024 Irish Tax Rates and Bands
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

    // PRSI Rates
    const PRSI_RATE = 0.04; // 4% for most employees

    // USC Rates (Universal Social Charge) - 2024 rates
    const USC_BANDS = [
      { min: 0, max: 12012, rate: 0.005 },
      { min: 12012, max: 25076, rate: 0.02 },
      { min: 25076, max: 70044, rate: 0.045 },
      { min: 70044, max: Infinity, rate: 0.08 }
    ];

    // Tax Credits - 2024 rates
    const TAX_CREDITS = {
      single: 3750,
      married: 7500, // Married couple gets double the single person credit
      pensioner: 3750 + 1650 // Additional age tax credit for pensioners
    };

    // Determine tax bands based on family type
    const taxBands = familyType === 'married' ? TAX_BANDS.married : TAX_BANDS.single;
    const taxCredit = isPensioner ? TAX_CREDITS.pensioner : TAX_CREDITS[familyType];

    // Calculate Income Tax
    let incomeTax = 0;
    let remainingIncome = grossIncome;

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
      incomeTax,
      prsi,
      usc,
      totalTax,
      netIncome: grossIncome - totalTax
    };
  };


  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const toggleCalculations = (familyName) => {
    setShowCalculations(prev => ({
      ...prev,
      [familyName]: !prev[familyName]
    }));
  };

  const toggleFamilyCollapse = (familyIndex) => {
    setCollapsedFamilies(prev => ({
      ...prev,
      [familyIndex]: !prev[familyIndex]
    }));
  };

  // Calculate tax relief rate based on income level
  const getTaxReliefRate = (grossIncome) => {
    // For 2024: 20% for income up to €88,000 (married couples), 40% above
    return grossIncome <= 88000 ? 0.20 : 0.40;
  };

  // Calculate pension contributions for a person
  const calculatePensionContributions = (personTotal) => {
    const grossIncome = personTotal.external + personTotal.rrltd + personTotal.omhe_props;
    const isDirector = personTotal.person_name === 'Omar' || personTotal.person_name === 'Heidi';
    const isEligibleForPension = personTotal.person_name !== 'Sean'; // Sean is 83, over age limit
    
    if (!isEligibleForPension) {
      return {
        employee: 0,
        employer: 0,
        director: 0,
        total: 0
      };
    }
    
    // Employee contribution: 15% of income, max €20,000
    const employeeContribution = Math.min(grossIncome * 0.15, 20000);
    
    // Employer contribution: 15% of income, max €20,000
    const employerContribution = Math.min(grossIncome * 0.15, 20000);
    
    // Director pension: up to €20,000 (no percentage limit)
    const directorContribution = isDirector ? 20000 : 0;
    
    // Calculate tax relief
    const taxReliefRate = getTaxReliefRate(grossIncome);
    const employeeTaxRelief = employeeContribution * taxReliefRate;
    const employerTaxRelief = employerContribution * 0.125; // 12.5% corporation tax relief
    const directorTaxRelief = directorContribution * 0.125; // 12.5% corporation tax relief
    
    return {
      employee: employeeContribution,
      employer: employerContribution,
      director: directorContribution,
      total: employeeContribution + employerContribution + directorContribution,
      employeeTaxRelief,
      employerTaxRelief,
      directorTaxRelief,
      employeeNetCost: employeeContribution - employeeTaxRelief,
      employerNetCost: employerContribution - employerTaxRelief,
      directorNetCost: directorContribution - directorTaxRelief
    };
  };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setSearchParams({ tab: tabName });
  };

  const getSortedIncome = (incomeRecords) => {
    if (!sortConfig.key) return incomeRecords;

    return [...incomeRecords].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'person_name') {
        aValue = a.person_name || '';
        bValue = b.person_name || '';
      } else if (sortConfig.key === 'amount_yearly' || sortConfig.key === 'amount_monthly') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Group income by family with proper family mapping
  const familyMapping = {
    'Omar and Heidi': { type: 'married', code: 'OmHe' },
    'Dwayne and Lena': { type: 'married', code: 'DwLe' },
    'Sean and Coral': { type: 'pensioner', code: 'SeCo' }
  };

  const incomeByFamily = income.reduce((groups, incomeRecord) => {
    const familyName = incomeRecord.family?.name || 'Unknown Family';
    if (!groups[familyName]) {
      groups[familyName] = [];
    }
    groups[familyName].push(incomeRecord);
    return groups;
  }, {});

  // Convert to array and sort by family name, with tax calculations
  const familyGroups = Object.entries(incomeByFamily).map(([familyName, records]) => {
    const familyInfo = familyMapping[familyName] || { type: 'single', code: 'Unknown' };
    
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
        totals[inc.person_name].external += inc.amount_yearly;
      } else if (inc.income_type === 'rrltd') {
        totals[inc.person_name].rrltd += inc.amount_yearly;
      } else if (inc.income_type === 'omhe_props') {
        totals[inc.person_name].omhe_props += inc.amount_yearly;
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

    // Calculate total pension contributions for the family
    const totalPensionContributions = personTotalsArray.reduce((total, person) => {
      const pensionContributions = calculatePensionContributions(person);
      return total + pensionContributions.total;
    }, 0);
    
    // Calculate taxable income (gross income minus pension contributions)
    const taxableIncome = familyTotals.total - totalPensionContributions;
    
    // Calculate tax for the family using taxable income
    const taxCalculation = calculateIrishTax(
      taxableIncome, 
      familyInfo.type, 
      familyInfo.type === 'pensioner'
    );
    

    return {
      familyName,
      familyInfo,
      records,
      personTotals: personTotalsArray,
      familyTotals,
      taxCalculation
    };
  }).sort((a, b) => {
    // Custom sorting to put Omar and Heidi first, then Dwayne and Lena, then others alphabetically
    const order = {
      'Omar and Heidi': 1,
      'Dwayne and Lena': 2
    };
    
    const aOrder = order[a.familyName] || 999;
    const bOrder = order[b.familyName] || 999;
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    return a.familyName.localeCompare(b.familyName);
  });

  // Generate monthly cashflow data for a person
  const generateMonthlyCashflow = (personTotal) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const monthlyData = [];
    
    // Calculate monthly amounts
    const monthlyExternal = (personTotal.external || 0) / 12;
    const monthlyRRltd = (personTotal.rrltd || 0) / 12;
    const monthlyOmHeProps = (personTotal.omhe_props || 0) / 12;
    
    // Calculate pension contributions
    const pensionContributions = calculatePensionContributions(personTotal);
    const monthlyPensionContribution = (pensionContributions.total || 0) / 12;
    
    // Calculate tax for the year
    const grossIncome = (personTotal.external || 0) + (personTotal.rrltd || 0) + (personTotal.omhe_props || 0);
    const taxableIncome = grossIncome - (pensionContributions.total || 0);
    
    // Calculate income tax on taxable income (after pension contributions)
    const incomeTaxCalculation = calculateIrishTax(taxableIncome, 'married', false);
    const monthlyTax = (incomeTaxCalculation.incomeTax || 0) / 12;
    
    // Calculate PRSI and USC on gross income (before pension contributions)
    const grossTaxCalculation = calculateIrishTax(grossIncome, 'married', false);
    const monthlyPRSI = (grossTaxCalculation.prsi || 0) / 12;
    const monthlyUSC = (grossTaxCalculation.usc || 0) / 12;
    
    // Debug logging
    console.log('Monthly Cashflow Debug for', personTotal.person_name, ':', {
      grossIncome,
      taxableIncome,
      incomeTaxCalculation,
      grossTaxCalculation,
      monthlyTax,
      monthlyPRSI,
      monthlyUSC,
      pensionContributions
    });
    
    // Generate data for each month (one row per month)
    months.forEach((month, index) => {
      const monthlyGross = monthlyExternal + monthlyRRltd + monthlyOmHeProps;
      const monthlyTaxable = monthlyGross - monthlyPensionContribution;
      const monthlyNet = monthlyGross - monthlyPensionContribution - monthlyTax - monthlyPRSI - monthlyUSC;
      
      monthlyData.push({
        month: month,
        externalIncome: monthlyExternal,
        rrltdIncome: monthlyRRltd,
        omhePropsIncome: monthlyOmHeProps,
        totalGrossIncome: monthlyGross,
        pensionContribution: monthlyPensionContribution,
        taxableIncome: monthlyTaxable,
        taxPayable: monthlyTax,
        prsi: monthlyPRSI,
        usc: monthlyUSC,
        netIncome: monthlyNet
      });
    });
    
    return monthlyData;
  };

  if (loading) {
    return <div className="loading">Loading income data...</div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>Family Incomes</h1>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Tab Navigation */}
      <div className="tab-navigation mb-3">
        <button
          className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => handleTabChange('summary')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            border: '1px solid #ddd',
            backgroundColor: activeTab === 'summary' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'summary' ? 'white' : '#333',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0',
            borderBottom: activeTab === 'summary' ? 'none' : '1px solid #ddd'
          }}
        >
          Income Summary by Family
        </button>
        <button
          className={`tab-button ${activeTab === 'records' ? 'active' : ''}`}
          onClick={() => handleTabChange('records')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            border: '1px solid #ddd',
            backgroundColor: activeTab === 'records' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'records' ? 'white' : '#333',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0',
            borderBottom: activeTab === 'records' ? 'none' : '1px solid #ddd'
          }}
        >
          Individual Income Records
        </button>
        <button
          className={`tab-button ${activeTab === 'pensions' ? 'active' : ''}`}
          onClick={() => handleTabChange('pensions')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            border: '1px solid #ddd',
            backgroundColor: activeTab === 'pensions' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'pensions' ? 'white' : '#333',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0',
            borderBottom: activeTab === 'pensions' ? 'none' : '1px solid #ddd'
          }}
        >
          Pension Contributions
        </button>
        <button
          className={`tab-button ${activeTab === 'cashflow' ? 'active' : ''}`}
          onClick={() => handleTabChange('cashflow')}
          style={{
            padding: '10px 20px',
            border: '1px solid #ddd',
            backgroundColor: activeTab === 'cashflow' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'cashflow' ? 'white' : '#333',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0',
            borderBottom: activeTab === 'cashflow' ? 'none' : '1px solid #ddd'
          }}
        >
          Monthly Cashflow
        </button>
      </div>

      {/* Income Summary by Family */}
      {activeTab === 'summary' && (
      <div className="card">
        <h3>Income Summary by Family</h3>
          
          {familyGroups.map((group, groupIndex) => (
            <div key={groupIndex} style={{ marginBottom: '30px', border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden' }}>
              {/* Family Header */}
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '15px 20px', 
                borderBottom: '1px solid #dee2e6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                  {group.familyName} ({group.familyInfo.code})
                </h4>
                <button
                  className="btn btn-primary"
                  onClick={() => toggleCalculations(group.familyName)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    backgroundColor: showCalculations[group.familyName] ? '#dc3545' : '#007bff',
                    borderColor: showCalculations[group.familyName] ? '#dc3545' : '#007bff'
                  }}
                >
                  {showCalculations[group.familyName] ? 'Hide' : 'Explain'}
                </button>
              </div>

              {/* Income Breakdown Table */}
              <table className="table" style={{ margin: 0 }}>
          <thead>
            <tr>
                    <th style={{ width: '30%' }}>Person</th>
                    <th style={{ width: '17.5%', textAlign: 'right' }}>External Source</th>
                    <th style={{ width: '17.5%', textAlign: 'right' }}>RRltd</th>
                    <th style={{ width: '17.5%', textAlign: 'right' }}>OmHe Props</th>
                    <th style={{ width: '17.5%', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
                  {group.personTotals.map((personTotal, index) => {
                    const grossTotal = personTotal.external + personTotal.rrltd + personTotal.omhe_props;
                    const pensionContributions = calculatePensionContributions(personTotal);
                    
                    return (
                      <tr key={index}>
                        <td style={{ paddingLeft: '20px' }} className="db-data">{personTotal.person_name}</td>
                        <td style={{ textAlign: 'right' }} className="db-data">{formatCurrency(personTotal.external)}</td>
                        <td style={{ textAlign: 'right' }} className="db-data">{formatCurrency(personTotal.rrltd)}</td>
                        <td style={{ textAlign: 'right' }} className="db-data">{formatCurrency(personTotal.omhe_props)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }} className="calculated-data">{formatCurrency(grossTotal)}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold', borderTop: '2px solid #dee2e6' }}>
                    <td style={{ paddingLeft: '20px' }}>Family Gross Total</td>
                    <td style={{ textAlign: 'right' }} className="calculated-data">{formatCurrency(group.familyTotals.external)}</td>
                    <td style={{ textAlign: 'right' }} className="calculated-data">{formatCurrency(group.familyTotals.rrltd)}</td>
                    <td style={{ textAlign: 'right' }} className="calculated-data">{formatCurrency(group.familyTotals.omhe_props)}</td>
                    <td style={{ textAlign: 'right', fontSize: '16px' }} className="calculated-data">{formatCurrency(group.familyTotals.total)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Financial Flow Table */}
              <table className="table" style={{ margin: 0, borderTop: 'none' }}>
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Calculation Step</th>
                    <th style={{ width: '70%', textAlign: 'right' }}>Amount (€)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <td style={{ paddingLeft: '20px' }}>Gross Income</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(group.familyTotals.total)}</td>
                  </tr>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <td style={{ paddingLeft: '20px' }}>Pension Contributions</td>
                    <td style={{ textAlign: 'right', color: '#28a745' }}>
                      {formatCurrency(group.personTotals.reduce((total, person) => {
                        const pensionContributions = calculatePensionContributions(person);
                        return total + pensionContributions.total;
                      }, 0))}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <td style={{ paddingLeft: '20px' }}>Taxable Income</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(group.familyTotals.total - group.personTotals.reduce((total, person) => {
                        const pensionContributions = calculatePensionContributions(person);
                        return total + pensionContributions.total;
                      }, 0))}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <td style={{ paddingLeft: '20px' }}>Tax Payable</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(group.taxCalculation.totalTax)}</td>
                  </tr>
                  <tr style={{ backgroundColor: '#d4edda', fontWeight: 'bold', borderTop: '2px solid #28a745' }}>
                    <td style={{ paddingLeft: '20px' }}>Net Income</td>
                    <td style={{ textAlign: 'right', fontSize: '16px' }}>{formatCurrency(group.taxCalculation.netIncome)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Detailed Explanation */}
              {showCalculations[group.familyName] && (
                <div style={{ 
                  backgroundColor: '#f8f9fa', 
                  padding: '20px', 
                  borderTop: '1px solid #dee2e6',
                  fontSize: '14px'
                }}>
                  <h5 style={{ color: '#495057', marginBottom: '15px' }}>
                    Detailed Explanation for {group.familyName}
                  </h5>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <h6 style={{ color: '#6c757d', marginBottom: '10px' }}>Income Sources Breakdown:</h6>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {group.personTotals.map((personTotal, index) => {
                        const grossTotal = personTotal.external + personTotal.rrltd + personTotal.omhe_props;
                        return (
                          <li key={index} style={{ marginBottom: '5px' }}>
                            <strong>{personTotal.person_name}:</strong> 
                            {personTotal.external > 0 && ` External Source: ${formatCurrency(personTotal.external)}`}
                            {personTotal.rrltd > 0 && ` + RRltd: ${formatCurrency(personTotal.rrltd)}`}
                            {personTotal.omhe_props > 0 && ` + OmHe Props: ${formatCurrency(personTotal.omhe_props)}`}
                            {` = ${formatCurrency(grossTotal)}`}
                          </li>
              );
            })}
                    </ul>
      </div>

                  <div style={{ marginBottom: '20px' }}>
                    <h6 style={{ color: '#6c757d', marginBottom: '10px' }}>Tax Calculation Breakdown:</h6>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      <li style={{ marginBottom: '5px' }}>
                        <strong>Income Tax:</strong> {formatCurrency(group.taxCalculation.incomeTax)} 
                        (calculated using {group.familyInfo.type} tax bands)
                      </li>
                      <li style={{ marginBottom: '5px' }}>
                        <strong>PRSI:</strong> {formatCurrency(group.taxCalculation.prsi)} 
                        (4% of gross income)
                      </li>
                      <li style={{ marginBottom: '5px' }}>
                        <strong>USC:</strong> {formatCurrency(group.taxCalculation.usc)} 
                        (Universal Social Charge)
                      </li>
                      <li style={{ marginBottom: '5px' }}>
                        <strong>Total Tax:</strong> {formatCurrency(group.taxCalculation.totalTax)}
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h6 style={{ color: '#6c757d', marginBottom: '10px' }}>Pension Contributions Breakdown:</h6>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {group.personTotals.map((personTotal, index) => {
                        const pensionContributions = calculatePensionContributions(personTotal);
                        if (pensionContributions.total > 0) {
                          return (
                            <li key={index} style={{ marginBottom: '5px' }}>
                              <strong>{personTotal.person_name}:</strong> 
                              {pensionContributions.employee > 0 && ` Employee: ${formatCurrency(pensionContributions.employee)}`}
                              {pensionContributions.employer > 0 && ` + Employer: ${formatCurrency(pensionContributions.employer)}`}
                              {pensionContributions.director > 0 && ` + Director: ${formatCurrency(pensionContributions.director)}`}
                              {` = ${formatCurrency(pensionContributions.total)}`}
                            </li>
                          );
                        }
                        return null;
                      })}
                    </ul>
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <h6 style={{ color: '#6c757d', marginBottom: '10px' }}>Final Calculation:</h6>
                    <p style={{ margin: 0, fontFamily: 'monospace', backgroundColor: '#e9ecef', padding: '10px', borderRadius: '4px' }}>
                      Gross Income: {formatCurrency(group.familyTotals.total)}<br/>
                      - Pension Contributions: {formatCurrency(group.personTotals.reduce((total, person) => {
                        const pensionContributions = calculatePensionContributions(person);
                        return total + pensionContributions.total;
                      }, 0))}<br/>
                      = Taxable Income: {formatCurrency(group.familyTotals.total - group.personTotals.reduce((total, person) => {
                        const pensionContributions = calculatePensionContributions(person);
                        return total + pensionContributions.total;
                      }, 0))}<br/>
                      - Total Tax: {formatCurrency(group.taxCalculation.totalTax)}<br/>
                      = <strong>Net Income: {formatCurrency(group.taxCalculation.netIncome)}</strong>
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Individual Income Records Table */}
      {activeTab === 'records' && (
      <div className="card">
        <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Individual Income Records</h3>
          <button className="btn btn-primary" onClick={handleAddNew}>
            Add New Income Record
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th 
                onClick={() => handleSort('person_name')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Person {sortConfig.key === 'person_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('income_type')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Income Type {sortConfig.key === 'income_type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('income_category')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Type of Income {sortConfig.key === 'income_category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('amount_yearly')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Annual Amount {sortConfig.key === 'amount_yearly' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('amount_monthly')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Monthly Amount {sortConfig.key === 'amount_monthly' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {getSortedIncome(income).map(incomeRecord => (
              <tr key={incomeRecord.id}>
                <td>{incomeRecord.person_name}</td>
                <td>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px',
                    backgroundColor: incomeRecord.income_type === 'external_source' ? '#d4edda' : 
                                   incomeRecord.income_type === 'rrltd' ? '#d1ecf1' : 
                                   incomeRecord.income_type === 'omhe_props' ? '#fff3cd' : '#f8d7da',
                    color: incomeRecord.income_type === 'external_source' ? '#155724' : 
                           incomeRecord.income_type === 'rrltd' ? '#0c5460' : 
                           incomeRecord.income_type === 'omhe_props' ? '#856404' : '#721c24'
                  }}>
                    {incomeRecord.income_type === 'external_source' ? 'External Source' : 
                     incomeRecord.income_type === 'rrltd' ? 'RRltd' : 
                     incomeRecord.income_type === 'omhe_props' ? 'OmHe Props' : incomeRecord.income_type}
                  </span>
                </td>
                <td>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px',
                    backgroundColor: incomeRecord.income_category === 'rental' ? '#e2e3e5' : '#f8d7da',
                    color: incomeRecord.income_category === 'rental' ? '#495057' : '#721c24'
                  }}>
                    {incomeRecord.income_category === 'rental' ? 'Rental' : 'Non-Rental'}
                  </span>
                </td>
                <td>{formatCurrency(incomeRecord.amount_yearly)}</td>
                <td>{formatCurrency(incomeRecord.amount_monthly)}</td>
                <td>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handleEdit(incomeRecord)}
                    style={{ marginRight: '5px' }}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleDelete(incomeRecord.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Pension Contributions Table - DB Records Only */}
      {activeTab === 'pensions' && (
        <div className="card">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Pension Contributions</h3>
            <button className="btn btn-primary" onClick={() => {
              setEditingIncome(null);
              setEditingPension(null);
              setPensionFormData({
                person_id: '',
                pension_type: '',
                contribution_amount: '',
                contribution_frequency: 'annual',
                tax_year: new Date().getFullYear(),
                is_company_contribution: false,
                company_name: '',
                pension_provider: '',
                notes: ''
              });
              setShowModal(true);
            }}>
              Add Pension Contribution
            </button>
          </div>
          
          <div style={{ 
            backgroundColor: '#e7f3ff', 
            border: '1px solid #b3d9ff', 
            borderRadius: '4px', 
            padding: '10px 15px', 
            marginBottom: '15px',
            fontSize: '14px'
          }}>
            <strong>Note:</strong> Pension contributions are not available for persons over 75 years of age. 
            Sean (age 83) is not eligible for pension contributions under Irish pension rules.
          </div>
          
          <table className="table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Person</th>
                <th style={{ textAlign: 'left' }}>Type</th>
                <th style={{ textAlign: 'right' }}>Annual Contribution</th>
                <th style={{ textAlign: 'right' }}>Monthly Contribution</th>
                <th style={{ textAlign: 'right' }}>Tax Relief</th>
                <th style={{ textAlign: 'right' }}>Net Cost to Person</th>
                <th style={{ textAlign: 'right' }}>Net Cost to Company</th>
                <th style={{ textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pensions.map((pension) => {
                const person = people.find(p => p.id === pension.person_id);
                const isDirector = person && (person.name === 'Omar' || person.name === 'Heidi');
                const isEligibleForPension = person && person.name !== 'Sean';
                
                // Calculate tax relief based on pension type
                let taxRelief = 0;
                let netCostToPerson = 0;
                let netCostToCompany = 0;
                
                if (pension.pension_type === 'personal') {
                  const grossIncome = income
                    .filter(inc => inc.person_id === pension.person_id)
                    .reduce((total, inc) => total + parseFloat(inc.amount_yearly), 0);
                  const taxReliefRate = getTaxReliefRate(grossIncome);
                  taxRelief = pension.contribution_amount * taxReliefRate;
                  netCostToPerson = pension.contribution_amount - taxRelief;
                } else if (pension.pension_type === 'occupational' || pension.pension_type === 'company') {
                  taxRelief = pension.contribution_amount * 0.125; // 12.5% corporation tax relief
                  netCostToCompany = pension.contribution_amount - taxRelief;
                }
                
                const monthlyContribution = pension.contribution_frequency === 'annual' 
                  ? pension.contribution_amount / 12 
                  : pension.contribution_amount;
                
                return (
                  <tr key={pension.id} style={{ 
                    backgroundColor: pension.pension_type === 'company' ? '#fff3cd' : 'white' 
                  }}>
                    <td style={{ paddingLeft: '20px' }}>
                      {person ? person.name : 'Unknown'}
                    </td>
                    <td>
                      <span style={{ 
                        backgroundColor: pension.pension_type === 'personal' ? '#007bff' : 
                                       pension.pension_type === 'occupational' ? '#28a745' : '#ffc107',
                        color: pension.pension_type === 'company' ? '#212529' : 'white',
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {pension.pension_type === 'personal' ? 'Employee' :
                         pension.pension_type === 'occupational' ? 'Employer' : 'Director'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(pension.contribution_amount)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(monthlyContribution)}</td>
                    <td style={{ textAlign: 'right', color: '#28a745' }}>{formatCurrency(taxRelief)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {pension.pension_type === 'personal' ? formatCurrency(netCostToPerson) : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {(pension.pension_type === 'occupational' || pension.pension_type === 'company') 
                        ? formatCurrency(netCostToCompany) : '-'}
                    </td>
                    <td>
                      <button 
                        className="btn btn-primary" 
                        style={{ marginRight: '5px', padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => handlePensionEdit(pension)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => handlePensionDelete(pension.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              
              {pensions.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                    No pension contributions found. Click "Add Pension Contribution" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && editingIncome !== null && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingIncome ? 'Edit Income Record' : 'Add New Income Record'}</h2>
              <button className="close" onClick={handleCloseModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="person_id">Person</label>
                <select
                  id="person_id"
                  value={formData.person_id}
                  onChange={(e) => setFormData({ ...formData, person_id: e.target.value })}
                  required
                >
                  <option value="">Select a person</option>
                  {people.map(person => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="income_type">Income Type</label>
                <select
                  id="income_type"
                  value={formData.income_type}
                  onChange={(e) => setFormData({ ...formData, income_type: e.target.value })}
                  required
                >
                  <option value="external_source">External Source</option>
                  <option value="rrltd">RRltd</option>
                  <option value="omhe_props">OmHe Props</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="income_category">Type of Income</label>
                <select
                  id="income_category"
                  value={formData.income_category}
                  onChange={(e) => setFormData({ ...formData, income_category: e.target.value })}
                  required
                >
                  <option value="non_rental">Non-Rental</option>
                  <option value="rental">Rental</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="amount_yearly">Annual Amount (€)</label>
                <input
                  type="number"
                  id="amount_yearly"
                  value={formData.amount_yearly}
                  onChange={(e) => {
                    const yearly = parseFloat(e.target.value) || 0;
                    setFormData({ 
                      ...formData, 
                      amount_yearly: e.target.value,
                      amount_monthly: (yearly / 12).toFixed(2)
                    });
                  }}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="amount_monthly">Monthly Amount (€)</label>
                <input
                  type="number"
                  id="amount_monthly"
                  value={formData.amount_monthly}
                  onChange={(e) => {
                    const monthly = parseFloat(e.target.value) || 0;
                    setFormData({ 
                      ...formData, 
                      amount_monthly: e.target.value,
                      amount_yearly: (monthly * 12).toFixed(2)
                    });
                  }}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingIncome ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pension Modal */}
      {showModal && editingPension !== null && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingPension ? 'Edit Pension Contribution' : 'Add Pension Contribution'}</h2>
              <button className="close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handlePensionSubmit}>
              <div className="form-group">
                <label htmlFor="pension_person_id">Person</label>
                <select
                  id="pension_person_id"
                  value={pensionFormData.person_id}
                  onChange={(e) => setPensionFormData({...pensionFormData, person_id: e.target.value})}
                  required
                >
                  <option value="">Select a person</option>
                  {people.map(person => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="pension_type">Pension Type</label>
                <select
                  id="pension_type"
                  value={pensionFormData.pension_type}
                  onChange={(e) => setPensionFormData({...pensionFormData, pension_type: e.target.value})}
                  required
                >
                  <option value="">Select Type</option>
                  <option value="personal">Personal (Employee)</option>
                  <option value="occupational">Occupational (Employer)</option>
                  <option value="company">Company (Director)</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="contribution_amount">Contribution Amount (€)</label>
                <input
                  type="number"
                  id="contribution_amount"
                  step="0.01"
                  value={pensionFormData.contribution_amount}
                  onChange={(e) => setPensionFormData({...pensionFormData, contribution_amount: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="contribution_frequency">Contribution Frequency</label>
                <select
                  id="contribution_frequency"
                  value={pensionFormData.contribution_frequency}
                  onChange={(e) => setPensionFormData({...pensionFormData, contribution_frequency: e.target.value})}
                  required
                >
                  <option value="annual">Annual</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="tax_year">Tax Year</label>
                <input
                  type="number"
                  id="tax_year"
                  value={pensionFormData.tax_year}
                  onChange={(e) => setPensionFormData({...pensionFormData, tax_year: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={pensionFormData.is_company_contribution}
                    onChange={(e) => setPensionFormData({...pensionFormData, is_company_contribution: e.target.checked})}
                  />
                  Is Company Contribution
                </label>
              </div>
              <div className="form-group">
                <label htmlFor="company_name">Company Name</label>
                <input
                  type="text"
                  id="company_name"
                  value={pensionFormData.company_name}
                  onChange={(e) => setPensionFormData({...pensionFormData, company_name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label htmlFor="pension_provider">Pension Provider</label>
                <input
                  type="text"
                  id="pension_provider"
                  value={pensionFormData.pension_provider}
                  onChange={(e) => setPensionFormData({...pensionFormData, pension_provider: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  value={pensionFormData.notes}
                  onChange={(e) => setPensionFormData({...pensionFormData, notes: e.target.value})}
                  rows="3"
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingPension ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Monthly Cashflow Tab */}
      {activeTab === 'cashflow' && (
        <div className="card">
          <h3>Monthly Cashflow Analysis</h3>
          <p style={{ color: '#6c757d', marginBottom: '20px' }}>
            Month-by-month breakdown of income sources, pension contributions, and net income for each person.
          </p>
          
          {familyGroups.map((group, groupIndex) => (
            <div key={groupIndex} style={{ marginBottom: '30px', border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden' }}>
              {/* Family Header */}
              <div 
                style={{ 
                  backgroundColor: '#f8f9fa', 
                  padding: '15px 20px', 
                  borderBottom: '1px solid #dee2e6',
                  marginBottom: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onClick={() => toggleFamilyCollapse(groupIndex)}
              >
                <h4 style={{ margin: 0, color: '#495057' }}>{group.familyName}</h4>
                <span style={{ fontSize: '18px', color: '#6c757d' }}>
                  {collapsedFamilies[groupIndex] ? '▼' : '▲'}
                </span>
              </div>

              {/* Monthly Cashflow for each person in the family */}
              {!collapsedFamilies[groupIndex] && group.personTotals.map((personTotal, personIndex) => {
                const monthlyCashflow = generateMonthlyCashflow(personTotal);
                return (
                  <div key={personIndex} style={{ padding: '20px', borderBottom: personIndex < group.personTotals.length - 1 ? '1px solid #e9ecef' : 'none' }}>
                    <h5 style={{ color: '#495057', marginBottom: '15px' }} className="db-data">{personTotal.person_name}</h5>
                    
                    
                    <div className="table-responsive">
                      <table className="table" style={{ marginBottom: '0' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Month</th>
                            <th style={{ textAlign: 'right' }}>External Income</th>
                            <th style={{ textAlign: 'right' }}>RRltd Salary</th>
                            <th style={{ textAlign: 'right' }}>OmHe Props</th>
                            <th style={{ textAlign: 'right' }}>Total Gross</th>
                            <th style={{ textAlign: 'right' }}>Pension Contribution</th>
                            <th style={{ textAlign: 'right' }}>Taxable Income</th>
                            <th style={{ textAlign: 'right' }}>Tax Payable</th>
                            <th style={{ textAlign: 'right' }}>PRSI</th>
                            <th style={{ textAlign: 'right' }}>USC</th>
                            <th style={{ textAlign: 'right' }}>Net Income</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyCashflow.map((month, monthIndex) => (
                            <tr key={monthIndex}>
                              <td style={{ textAlign: 'left' }}>{month.month}</td>
                              <td style={{ textAlign: 'right' }} className="db-data">{formatCurrency(month.externalIncome)}</td>
                              <td style={{ textAlign: 'right' }} className="db-data">{formatCurrency(month.rrltdIncome)}</td>
                              <td style={{ textAlign: 'right' }} className="db-data">{formatCurrency(month.omhePropsIncome)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold' }} className="calculated-data">{formatCurrency(month.totalGrossIncome)}</td>
                              <td style={{ textAlign: 'right' }} className="calculated-data">{formatCurrency(month.pensionContribution)}</td>
                              <td style={{ textAlign: 'right' }} className="calculated-data">{formatCurrency(month.taxableIncome)}</td>
                              <td style={{ textAlign: 'right' }} className="calculated-data">{formatCurrency(month.taxPayable)}</td>
                              <td style={{ textAlign: 'right' }} className="calculated-data">{formatCurrency(month.prsi)}</td>
                              <td style={{ textAlign: 'right' }} className="calculated-data">{formatCurrency(month.usc)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold' }} className="calculated-data">{formatCurrency(month.netIncome)}</td>
                            </tr>
                          ))}
                          {/* Annual Totals */}
                          <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                            <td style={{ textAlign: 'left' }}>Annual Totals</td>
                            <td style={{ textAlign: 'right' }} className="db-data">{formatCurrency(monthlyCashflow.reduce((sum, month) => sum + month.externalIncome, 0))}</td>
                            <td style={{ textAlign: 'right' }} className="db-data">{formatCurrency(monthlyCashflow.reduce((sum, month) => sum + month.rrltdIncome, 0))}</td>
                            <td style={{ textAlign: 'right' }} className="db-data">{formatCurrency(monthlyCashflow.reduce((sum, month) => sum + month.omhePropsIncome, 0))}</td>
                            <td style={{ textAlign: 'right' }} className="calculated-data">{formatCurrency(monthlyCashflow.reduce((sum, month) => sum + month.totalGrossIncome, 0))}</td>
                            <td style={{ textAlign: 'right' }} className="calculated-data">{formatCurrency(monthlyCashflow.reduce((sum, month) => sum + month.pensionContribution, 0))}</td>
                            <td style={{ textAlign: 'right' }} className="calculated-data">{formatCurrency(monthlyCashflow.reduce((sum, month) => sum + month.taxableIncome, 0))}</td>
                            <td style={{ textAlign: 'right' }} className="calculated-data">{formatCurrency(monthlyCashflow.reduce((sum, month) => sum + month.taxPayable, 0))}</td>
                            <td style={{ textAlign: 'right' }} className="calculated-data">{formatCurrency(monthlyCashflow.reduce((sum, month) => sum + month.prsi, 0))}</td>
                            <td style={{ textAlign: 'right' }} className="calculated-data">{formatCurrency(monthlyCashflow.reduce((sum, month) => sum + month.usc, 0))}</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }} className="calculated-data">{formatCurrency(monthlyCashflow.reduce((sum, month) => sum + month.netIncome, 0))}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
              
              {/* Family Annual Totals */}
              {!collapsedFamilies[groupIndex] && (
              <div className="table-responsive" style={{ marginTop: '20px' }}>
                <table className="table" style={{ marginBottom: '0' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Month</th>
                      <th style={{ textAlign: 'right' }}>External Income</th>
                      <th style={{ textAlign: 'right' }}>RRltd Salary</th>
                      <th style={{ textAlign: 'right' }}>OmHe Props</th>
                      <th style={{ textAlign: 'right' }}>Total Gross</th>
                      <th style={{ textAlign: 'right' }}>Pension Contribution</th>
                      <th style={{ textAlign: 'right' }}>Taxable Income</th>
                      <th style={{ textAlign: 'right' }}>Tax Payable</th>
                      <th style={{ textAlign: 'right' }}>PRSI</th>
                      <th style={{ textAlign: 'right' }}>USC</th>
                      <th style={{ textAlign: 'right' }}>Net Income</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
                      <td style={{ textAlign: 'left' }}>Family Annual Totals</td>
                      <td style={{ textAlign: 'right' }} className="db-data">{formatCurrency(group.personTotals.reduce((sum, person) => sum + (person.external || 0), 0))}</td>
                      <td style={{ textAlign: 'right' }} className="db-data">{formatCurrency(group.personTotals.reduce((sum, person) => sum + (person.rrltd || 0), 0))}</td>
                      <td style={{ textAlign: 'right' }} className="db-data">{formatCurrency(group.personTotals.reduce((sum, person) => sum + (person.omhe_props || 0), 0))}</td>
                      <td style={{ textAlign: 'right' }} className="calculated-data">{formatCurrency(group.personTotals.reduce((sum, person) => sum + (person.external || 0) + (person.rrltd || 0) + (person.omhe_props || 0), 0))}</td>
                      <td style={{ textAlign: 'right' }} className="calculated-data">{formatCurrency(group.personTotals.reduce((sum, person) => {
                        const pensionContributions = calculatePensionContributions(person);
                        return sum + (pensionContributions.total || 0);
                      }, 0))}</td>
                      <td style={{ textAlign: 'right' }} className="calculated-data">{formatCurrency(group.personTotals.reduce((sum, person) => {
                        const grossIncome = (person.external || 0) + (person.rrltd || 0) + (person.omhe_props || 0);
                        const pensionContributions = calculatePensionContributions(person);
                        const taxableIncome = grossIncome - (pensionContributions.total || 0);
                        return sum + taxableIncome;
                      }, 0))}</td>
                      <td style={{ textAlign: 'right' }} className="calculated-data">{formatCurrency(group.personTotals.reduce((sum, person) => {
                        const grossIncome = (person.external || 0) + (person.rrltd || 0) + (person.omhe_props || 0);
                        const pensionContributions = calculatePensionContributions(person);
                        const taxableIncome = grossIncome - (pensionContributions.total || 0);
                        const incomeTaxCalculation = calculateIrishTax(taxableIncome, 'married', false);
                        return sum + (incomeTaxCalculation.incomeTax || 0);
                      }, 0))}</td>
                      <td style={{ textAlign: 'right' }} className="calculated-data">{formatCurrency(group.personTotals.reduce((sum, person) => {
                        const grossIncome = (person.external || 0) + (person.rrltd || 0) + (person.omhe_props || 0);
                        const grossTaxCalculation = calculateIrishTax(grossIncome, 'married', false);
                        return sum + (grossTaxCalculation.prsi || 0);
                      }, 0))}</td>
                      <td style={{ textAlign: 'right' }} className="calculated-data">{formatCurrency(group.personTotals.reduce((sum, person) => {
                        const grossIncome = (person.external || 0) + (person.rrltd || 0) + (person.omhe_props || 0);
                        const grossTaxCalculation = calculateIrishTax(grossIncome, 'married', false);
                        return sum + (grossTaxCalculation.usc || 0);
                      }, 0))}</td>
                      <td style={{ textAlign: 'right' }} className="calculated-data" style={{ fontWeight: 'bold' }}>{formatCurrency(group.personTotals.reduce((sum, person) => {
                        const grossIncome = (person.external || 0) + (person.rrltd || 0) + (person.omhe_props || 0);
                        const pensionContributions = calculatePensionContributions(person);
                        const taxableIncome = grossIncome - (pensionContributions.total || 0);
                        const incomeTaxCalculation = calculateIrishTax(taxableIncome, 'married', false);
                        const grossTaxCalculation = calculateIrishTax(grossIncome, 'married', false);
                        const netIncome = grossIncome - (pensionContributions.total || 0) - (incomeTaxCalculation.incomeTax || 0) - (grossTaxCalculation.prsi || 0) - (grossTaxCalculation.usc || 0);
                        return sum + netIncome;
                      }, 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Income;
