import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Pension = () => {
  const [pensions, setPensions] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingPension, setEditingPension] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    person_id: '',
    pension_type: 'personal',
    contribution_amount: '',
    contribution_frequency: 'annual',
    tax_year: new Date().getFullYear(),
    is_company_contribution: false,
    company_name: '',
    pension_provider: '',
    notes: ''
  });

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate pension limits based on age and income
  const calculatePensionLimits = (personAge, grossIncome) => {
    const PENSION_LIMITS = {
      under30: 0.15,
      under40: 0.20,
      under50: 0.25,
      under55: 0.30,
      under60: 0.35,
      over60: 0.40
    };

    const MAX_ANNUAL_CONTRIBUTION = 115000;

    let ageLimit;
    if (personAge < 30) ageLimit = PENSION_LIMITS.under30;
    else if (personAge < 40) ageLimit = PENSION_LIMITS.under40;
    else if (personAge < 50) ageLimit = PENSION_LIMITS.under50;
    else if (personAge < 55) ageLimit = PENSION_LIMITS.under55;
    else if (personAge < 60) ageLimit = PENSION_LIMITS.under60;
    else ageLimit = PENSION_LIMITS.over60;

    const maxContributionByAge = grossIncome * ageLimit;
    const maxContribution = Math.min(maxContributionByAge, MAX_ANNUAL_CONTRIBUTION);

    return {
      ageLimit: ageLimit * 100,
      maxContributionByAge,
      maxContribution,
      maxAnnualLimit: MAX_ANNUAL_CONTRIBUTION
    };
  };

  // Calculate tax savings from pension contribution
  const calculateTaxSavings = (contributionAmount, grossIncome, familyType, isSecondEarner = false) => {
    // Simplified tax calculation for pension relief
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

    const TAX_CREDITS = {
      single: 3750,
      married: 7500,
      pensioner: 3750 + 1650
    };

    // Determine tax bands
    let taxBands;
    if (familyType === 'married') {
      taxBands = isSecondEarner ? TAX_BANDS.married_second_earner : TAX_BANDS.married_first_earner;
    } else {
      taxBands = TAX_BANDS.single;
    }

    const taxCredit = TAX_CREDITS[familyType === 'married' ? 'married' : 'single'];

    // Calculate tax without pension
    let incomeTaxWithout = 0;
    let remainingIncome = grossIncome;
    for (const band of taxBands) {
      if (remainingIncome <= 0) break;
      const taxableInBand = Math.min(remainingIncome, band.max - band.min);
      incomeTaxWithout += taxableInBand * band.rate;
      remainingIncome -= taxableInBand;
    }
    incomeTaxWithout = Math.max(0, incomeTaxWithout - taxCredit);

    // Calculate tax with pension
    let incomeTaxWith = 0;
    remainingIncome = Math.max(0, grossIncome - contributionAmount);
    for (const band of taxBands) {
      if (remainingIncome <= 0) break;
      const taxableInBand = Math.min(remainingIncome, band.max - band.min);
      incomeTaxWith += taxableInBand * band.rate;
      remainingIncome -= taxableInBand;
    }
    incomeTaxWith = Math.max(0, incomeTaxWith - taxCredit);

    const taxSavings = incomeTaxWithout - incomeTaxWith;
    const netCost = contributionAmount - taxSavings;

    return {
      taxSavings,
      netCost,
      effectiveTaxRate: (taxSavings / contributionAmount) * 100
    };
  };

  useEffect(() => {
    fetchPensions();
    fetchPeople();
  }, []);

  const fetchPensions = async () => {
    try {
      const response = await axios.get('/pensions');
      setPensions(response.data);
    } catch (err) {
      setError('Failed to fetch pension data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPeople = async () => {
    try {
      const response = await axios.get('/people');
      setPeople(response.data);
    } catch (err) {
      console.error('Failed to fetch people:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPension) {
        await axios.put(`/pensions/${editingPension.id}`, formData);
      } else {
        await axios.post('/pensions', formData);
      }
      await fetchPensions();
      handleCloseModal();
    } catch (err) {
      setError('Failed to save pension record');
      console.error(err);
    }
  };

  const handleEdit = (pension) => {
    setEditingPension(pension);
    setFormData({
      person_id: pension.person_id.toString(),
      pension_type: pension.pension_type,
      contribution_amount: pension.contribution_amount.toString(),
      contribution_frequency: pension.contribution_frequency,
      tax_year: pension.tax_year.toString(),
      is_company_contribution: pension.is_company_contribution,
      company_name: pension.company_name || '',
      pension_provider: pension.pension_provider || '',
      notes: pension.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this pension record?')) {
      try {
        await axios.delete(`/pensions/${id}`);
        await fetchPensions();
      } catch (err) {
        setError('Failed to delete pension record');
        console.error(err);
      }
    }
  };

  const handleAddNew = () => {
    setEditingPension(null);
    setFormData({
      person_id: '',
      pension_type: 'personal',
      contribution_amount: '',
      contribution_frequency: 'annual',
      tax_year: new Date().getFullYear(),
      is_company_contribution: false,
      company_name: '',
      pension_provider: '',
      notes: ''
    });
    setShowForm(true);
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setEditingPension(null);
    setError('');
  };

  const resetForm = () => {
    setFormData({
      person_id: '',
      pension_type: 'personal',
      contribution_amount: '',
      contribution_frequency: 'annual',
      tax_year: new Date().getFullYear(),
      is_company_contribution: false,
      company_name: '',
      pension_provider: '',
      notes: ''
    });
  };

  // Group pensions by person
  const pensionsByPerson = pensions.reduce((groups, pension) => {
    const personName = pension.person_name || 'Unknown';
    if (!groups[personName]) {
      groups[personName] = [];
    }
    groups[personName].push(pension);
    return groups;
  }, {});

  if (loading) {
    return <div className="loading">Loading pension data...</div>;
  }

  return (
    <div className="pension-page">
      <div className="page-header">
        <h2>Pension Management</h2>
        <button onClick={handleAddNew} className="btn btn-primary">
          Add New Pension Contribution
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Pension Summary by Person */}
      <div className="card">
        <h3>Pension Contributions by Person</h3>
        {Object.keys(pensionsByPerson).length === 0 ? (
          <p>No pension contributions recorded.</p>
        ) : (
          <div className="pension-summary">
            {Object.entries(pensionsByPerson).map(([personName, personPensions]) => {
              const totalContribution = personPensions.reduce((sum, pension) => 
                sum + (pension.contribution_frequency === 'monthly' ? pension.contribution_amount * 12 : pension.contribution_amount), 0
              );
              
              // Get person details for calculations
              const person = people.find(p => p.name === personName);
              const personAge = person ? (new Date().getFullYear() - new Date(person.date_of_birth).getFullYear()) : 40;
              
              // Estimate gross income (this would ideally come from income data)
              const estimatedIncome = 100000; // Placeholder - would be calculated from actual income data
              const limits = calculatePensionLimits(personAge, estimatedIncome);
              const taxSavings = calculateTaxSavings(totalContribution, estimatedIncome, 'married', false);
              
              return (
                <div key={personName} className="person-pension-summary">
                  <h4>{personName}</h4>
                  <div className="summary-stats">
                    <div className="stat">
                      <span className="label">Total Annual Contribution:</span>
                      <span className="value">{formatCurrency(totalContribution)}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Age-Based Limit ({personAge} years):</span>
                      <span className="value">{limits.ageLimit}% (€{formatCurrency(limits.maxContributionByAge)})</span>
                    </div>
                    <div className="stat">
                      <span className="label">Annual Limit:</span>
                      <span className="value">€{formatCurrency(limits.maxAnnualLimit)}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Estimated Tax Savings:</span>
                      <span className="value">{formatCurrency(taxSavings.taxSavings)}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Net Cost:</span>
                      <span className="value">{formatCurrency(taxSavings.netCost)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pension Details Table */}
      <div className="card">
        <h3>Pension Contribution Details</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Frequency</th>
                <th>Tax Year</th>
                <th>Company</th>
                <th>Provider</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pensions.map((pension) => (
                <tr key={pension.id}>
                  <td>{pension.person_name}</td>
                  <td>
                    <span className={`badge ${pension.pension_type === 'personal' ? 'badge-primary' : 'badge-secondary'}`}>
                      {pension.pension_type}
                    </span>
                  </td>
                  <td>{formatCurrency(pension.contribution_amount)}</td>
                  <td>{pension.contribution_frequency}</td>
                  <td>{pension.tax_year}</td>
                  <td>{pension.is_company_contribution ? pension.company_name : 'N/A'}</td>
                  <td>{pension.pension_provider || 'N/A'}</td>
                  <td>
                    <button 
                      onClick={() => handleEdit(pension)}
                      className="btn btn-sm btn-outline"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(pension.id)}
                      className="btn btn-sm btn-danger"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pension Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingPension ? 'Edit Pension Contribution' : 'Add New Pension Contribution'}</h3>
              <button onClick={handleCloseModal} className="btn-close">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Person *</label>
                <select
                  value={formData.person_id}
                  onChange={(e) => setFormData({...formData, person_id: e.target.value})}
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
                <label>Pension Type *</label>
                <select
                  value={formData.pension_type}
                  onChange={(e) => setFormData({...formData, pension_type: e.target.value})}
                  required
                >
                  <option value="personal">Personal (PRSA/PRB)</option>
                  <option value="occupational">Occupational</option>
                  <option value="company">Company Director</option>
                </select>
              </div>

              <div className="form-group">
                <label>Contribution Amount *</label>
                <input
                  type="number"
                  value={formData.contribution_amount}
                  onChange={(e) => setFormData({...formData, contribution_amount: e.target.value})}
                  placeholder="Enter amount"
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Contribution Frequency *</label>
                <select
                  value={formData.contribution_frequency}
                  onChange={(e) => setFormData({...formData, contribution_frequency: e.target.value})}
                  required
                >
                  <option value="annual">Annual</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>

              <div className="form-group">
                <label>Tax Year *</label>
                <input
                  type="number"
                  value={formData.tax_year}
                  onChange={(e) => setFormData({...formData, tax_year: e.target.value})}
                  min="2020"
                  max="2030"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_company_contribution}
                    onChange={(e) => setFormData({...formData, is_company_contribution: e.target.checked})}
                  />
                  Company Contribution
                </label>
              </div>

              {formData.is_company_contribution && (
                <div className="form-group">
                  <label>Company Name</label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    placeholder="Enter company name"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Pension Provider</label>
                <input
                  type="text"
                  value={formData.pension_provider}
                  onChange={(e) => setFormData({...formData, pension_provider: e.target.value})}
                  placeholder="e.g., Irish Life, Aviva, etc."
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes"
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCloseModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingPension ? 'Update' : 'Add'} Pension Contribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pension;
