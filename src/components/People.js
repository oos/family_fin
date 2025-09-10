import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency, formatNumber } from '../utils/chartConfig';

function People() {
  const [people, setPeople] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [netWorthData, setNetWorthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [netWorthLoading, setNetWorthLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    is_director: false,
    is_deceased: false
  });

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/people');
      setPeople(response.data);
    } catch (err) {
      setError('Failed to load people');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNetWorth = async (personId) => {
    try {
      setNetWorthLoading(true);
      const response = await axios.get(`/people/${personId}/networth`);
      setNetWorthData(response.data);
    } catch (err) {
      setError('Failed to load net worth data');
      console.error(err);
    } finally {
      setNetWorthLoading(false);
    }
  };

  const handlePersonSelect = (person) => {
    setSelectedPerson(person);
    fetchNetWorth(person.id);
  };

  const handleEdit = (person) => {
    setEditingPerson(person);
    setFormData({
      name: person.name,
      relationship: person.relationship,
      is_director: person.is_director,
      is_deceased: person.is_deceased
    });
    setShowModal(true);
  };

  const handleDelete = async (personId) => {
    if (window.confirm('Are you sure you want to delete this person?')) {
      try {
        await axios.delete(`/people/${personId}`);
        setPeople(people.filter(p => p.id !== personId));
        if (selectedPerson && selectedPerson.id === personId) {
          setSelectedPerson(null);
          setNetWorthData(null);
        }
      } catch (err) {
        setError('Failed to delete person');
        console.error(err);
      }
    }
  };

  const handleAddNew = () => {
    setEditingPerson(null);
    setFormData({
      name: '',
      relationship: '',
      is_director: false,
      is_deceased: false
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPerson) {
        await axios.put(`/people/${editingPerson.id}`, formData);
        setPeople(people.map(p => p.id === editingPerson.id ? { ...p, ...formData } : p));
      } else {
        const response = await axios.post('/people', formData);
        setPeople([...people, response.data]);
      }
      setShowModal(false);
      setEditingPerson(null);
      setFormData({
        name: '',
        relationship: '',
        is_director: false,
        is_deceased: false
      });
    } catch (err) {
      setError('Failed to save person');
      console.error(err);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPerson(null);
    setFormData({
      name: '',
      relationship: '',
      is_director: false,
      is_deceased: false
    });
  };

  if (loading) {
    return <div className="loading">Loading people...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>People</h1>
        <button className="btn btn-primary" onClick={handleAddNew}>
          Add New Person
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Person Selector */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3>Select Person to View Net Worth</h3>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            value={selectedPerson?.id || ''} 
            onChange={(e) => {
              const personId = parseInt(e.target.value);
              const person = people.find(p => p.id === personId);
              if (person) {
                handlePersonSelect(person);
              } else {
                setSelectedPerson(null);
                setNetWorthData(null);
              }
            }}
            style={{
              padding: '10px',
              borderRadius: '5px',
              border: '1px solid #ddd',
              fontSize: '16px',
              minWidth: '200px',
              backgroundColor: 'white'
            }}
          >
            <option value="">Select a person...</option>
            {people.map(person => (
              <option key={person.id} value={person.id}>
                {person.name} - {person.relationship} ({person.is_director ? 'Director' : 'Non-Director'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Net Worth Details */}
      <div className="card">
        {selectedPerson ? (
          <div>
            <h3>{selectedPerson.name}'s Net Worth</h3>
            {netWorthLoading ? (
              <div className="loading">Loading net worth data...</div>
            ) : netWorthData ? (
              <div>
                {/* Net Worth Summary */}
                <div style={{ 
                  textAlign: 'center', 
                  padding: '20px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '8px', 
                  marginBottom: '20px' 
                }}>
                  <h2 style={{ 
                    margin: '0 0 10px 0', 
                    color: netWorthData.net_worth.total_net_worth >= 0 ? '#28a745' : '#dc3545',
                    fontSize: '28px'
                  }}>
                    {formatCurrency(netWorthData.net_worth.total_net_worth)}
                  </h2>
                  <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Total Net Worth</p>
                </div>

                {/* Assets Breakdown */}
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#28a745', marginBottom: '10px' }}>Assets</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>Property Equity</div>
                      <div style={{ fontWeight: '600', color: '#28a745' }}>
                        {formatCurrency(netWorthData.net_worth.assets.property_equity)}
                      </div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>Business Value</div>
                      <div style={{ fontWeight: '600', color: '#28a745' }}>
                        {formatCurrency(netWorthData.net_worth.assets.business_value)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Assets */}
                <div style={{ 
                  marginBottom: '20px', 
                  padding: '15px', 
                  backgroundColor: '#d4edda', 
                  borderRadius: '6px',
                  border: '1px solid #c3e6cb'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', color: '#155724' }}>Total Assets</span>
                    <span style={{ fontWeight: '700', fontSize: '16px', color: '#155724' }}>
                      {formatCurrency(netWorthData.net_worth.assets.total_assets)}
                    </span>
                  </div>
                </div>

                {/* Liabilities */}
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#dc3545', marginBottom: '10px' }}>Liabilities</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                    <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>Loan Liabilities</div>
                      <div style={{ fontWeight: '600', color: '#dc3545' }}>
                        {formatCurrency(netWorthData.net_worth.liabilities.loan_liabilities)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Property Details */}
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#6f42c1', marginBottom: '10px' }}>Property Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>Total Property Value</div>
                      <div style={{ fontWeight: '600', color: '#6f42c1' }}>
                        {formatCurrency(netWorthData.net_worth.property_details.total_property_value)}
                      </div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>Total Mortgages</div>
                      <div style={{ fontWeight: '600', color: '#6f42c1' }}>
                        {formatCurrency(netWorthData.net_worth.property_details.total_mortgages)}
                      </div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>Net Equity</div>
                      <div style={{ fontWeight: '600', color: '#6f42c1' }}>
                        {formatCurrency(netWorthData.net_worth.property_details.net_equity)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Income */}
                <div>
                  <h4 style={{ color: '#6f42c1', marginBottom: '10px' }}>Income</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>Annual Income</div>
                      <div style={{ fontWeight: '600', color: '#6f42c1' }}>
                        {formatCurrency(netWorthData.net_worth.income.total_annual_income)}
                      </div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>Monthly Income</div>
                      <div style={{ fontWeight: '600', color: '#6f42c1' }}>
                        {formatCurrency(netWorthData.net_worth.income.monthly_income)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <p>Select a person to view their net worth details.</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <h3>Select a Person</h3>
            <p>Choose a person from the list to view their net worth and financial details.</p>
          </div>
        )}
      </div>

      {/* People Management */}
      <div className="card">
        <h3>People Management</h3>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {people.map(person => (
            <div 
              key={person.id} 
              style={{
                padding: '15px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                marginBottom: '10px',
                backgroundColor: 'white'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>{person.name}</h4>
                  <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                    {person.relationship}
                  </p>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#888' }}>
                    <span>{person.is_director ? 'Director' : 'Non-Director'}</span>
                    <span>{person.is_deceased ? 'Deceased' : 'Active'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handleEdit(person)}
                    style={{ padding: '5px 10px', fontSize: '12px' }}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleDelete(person.id)}
                    style={{ padding: '5px 10px', fontSize: '12px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingPerson ? 'Edit Person' : 'Add New Person'}</h2>
              <button className="close" onClick={handleCloseModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="relationship">Relationship</label>
                <input
                  type="text"
                  id="relationship"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_director}
                    onChange={(e) => setFormData({ ...formData, is_director: e.target.checked })}
                  />
                  Is Director
                </label>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_deceased}
                    onChange={(e) => setFormData({ ...formData, is_deceased: e.target.checked })}
                  />
                  Is Deceased
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingPerson ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default People;