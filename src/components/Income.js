import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Income() {
  const [income, setIncome] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [formData, setFormData] = useState({
    person_id: '',
    income_type: 'external_source',
    income_category: 'non_rental',
    amount_yearly: '',
    amount_monthly: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showNetIncome, setShowNetIncome] = useState(true);

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

  const handleAddNew = () => {
    setEditingIncome(null);
    setFormData({ person_id: '', income_type: 'external_source', income_category: 'non_rental', amount_yearly: '', amount_monthly: '' });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingIncome(null);
    setFormData({ person_id: '', income_type: 'external_source', income_category: 'non_rental', amount_yearly: '', amount_monthly: '' });
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
        { min: 0, max: 53000, rate: 0.20 },
        { min: 53000, max: Infinity, rate: 0.40 }
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
    const taxCalculation = calculateIrishTax(
      familyTotals.total, 
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
  }).sort((a, b) => a.familyName.localeCompare(b.familyName));

  if (loading) {
    return <div className="loading">Loading income data...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Income</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showNetIncome}
                onChange={(e) => setShowNetIncome(e.target.checked)}
                style={{ margin: 0 }}
              />
              <span>Show Net Income (After Tax)</span>
            </label>
          </div>
          <button className="btn btn-primary" onClick={handleAddNew}>
            Add New Income Record
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Income Summary by Family */}
      <div className="card">
        <h3>Income Summary by Family</h3>
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
            {familyGroups.map((group, groupIndex) => {
              return (
                <React.Fragment key={groupIndex}>
                  {/* Family Header */}
                  <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                    <td colSpan="5" style={{ padding: '10px 15px', fontSize: '16px' }}>
                      {group.familyName} ({group.familyInfo.code})
                    </td>
                  </tr>
                  
                  {/* Individual members */}
                  {group.personTotals.map((personTotal, index) => {
                    const grossTotal = personTotal.external + personTotal.rrltd + personTotal.omhe_props;
                    const displayTotal = showNetIncome ? 
                      calculateIrishTax(grossTotal, group.familyInfo.type, group.familyInfo.type === 'pensioner').netIncome : 
                      grossTotal;
                    
                    return (
                      <tr key={`${groupIndex}-${index}`}>
                        <td style={{ paddingLeft: '20px' }}>{personTotal.person_name}</td>
                        <td>{formatCurrency(personTotal.external)}</td>
                        <td>{formatCurrency(personTotal.rrltd)}</td>
                        <td>{formatCurrency(personTotal.omhe_props)}</td>
                        <td><strong>{formatCurrency(displayTotal)}</strong></td>
                      </tr>
                    );
                  })}
                  
                  {/* Family Gross Total Row */}
                  <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold', borderTop: '2px solid #dee2e6' }}>
                    <td style={{ paddingLeft: '20px' }}>Family Gross Total</td>
                    <td>{formatCurrency(group.familyTotals.external)}</td>
                    <td>{formatCurrency(group.familyTotals.rrltd)}</td>
                    <td>{formatCurrency(group.familyTotals.omhe_props)}</td>
                    <td style={{ fontSize: '16px' }}>
                      {formatCurrency(group.familyTotals.total)}
                    </td>
                  </tr>
                  
                  {/* Pension Contribution Row */}
                  <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                    <td style={{ paddingLeft: '20px' }}>Pension Contribution</td>
                    <td colSpan="3"></td>
                    <td style={{ fontSize: '16px' }}>
                      {formatCurrency(group.familyTotals.pensionContribution || 0)}
                    </td>
                  </tr>
                  
                  {/* Tax Payable Row */}
                  <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                    <td style={{ paddingLeft: '20px' }}>Tax Payable</td>
                    <td colSpan="3"></td>
                    <td style={{ fontSize: '16px' }}>
                      {formatCurrency(group.taxCalculation.totalTax)}
                    </td>
                  </tr>
                  
                  {/* Family Net Total Row */}
                  <tr style={{ backgroundColor: '#d4edda', fontWeight: 'bold', borderTop: '2px solid #28a745' }}>
                    <td style={{ paddingLeft: '20px' }}>Family Net Total</td>
                    <td colSpan="3"></td>
                    <td style={{ fontSize: '16px' }}>
                      {formatCurrency(group.taxCalculation.netIncome)}
                    </td>
                  </tr>
                  
                  {/* Tax Breakdown Row (only show when net income is selected) */}
                  {showNetIncome && (
                    <tr style={{ backgroundColor: '#f0f8ff', fontSize: '12px' }}>
                      <td style={{ paddingLeft: '20px', fontStyle: 'italic' }}>Tax Breakdown:</td>
                      <td colSpan="3" style={{ textAlign: 'center' }}>
                        Income Tax: {formatCurrency(group.taxCalculation.incomeTax)} | 
                        PRSI: {formatCurrency(group.taxCalculation.prsi)} | 
                        USC: {formatCurrency(group.taxCalculation.usc)}
                      </td>
                      <td style={{ fontStyle: 'italic' }}>
                        Total Tax: {formatCurrency(group.taxCalculation.totalTax)}
                      </td>
                    </tr>
                  )}
                  
                  {/* Spacer between families */}
                  {groupIndex < familyGroups.length - 1 && (
                    <tr key={`spacer-${groupIndex}`}>
                      <td colSpan="5" style={{ height: '15px', border: 'none' }}></td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Individual Income Records Table */}
      <div className="card">
        <h3>Individual Income Records</h3>
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

      {showModal && (
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
    </div>
  );
}

export default Income;
