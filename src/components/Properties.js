import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Properties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [sortField, setSortField] = useState('equity');
  const [sortDirection, setSortDirection] = useState('desc');
  const [formData, setFormData] = useState({
    address: '',
    nickname: '',
    valuation: '',
    rental_income_yearly: '',
    lender: '',
    omar_ownership: '',
    heidi_ownership: '',
    dwayne_ownership: '',
    sean_ownership: '',
    lena_ownership: ''
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/properties');
      setProperties(response.data);
    } catch (err) {
      setError('Failed to load properties');
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
        valuation: parseFloat(formData.valuation) || 0,
        rental_income_yearly: parseFloat(formData.rental_income_yearly) || 0,
        omar_ownership: parseFloat(formData.omar_ownership) || 0,
        heidi_ownership: parseFloat(formData.heidi_ownership) || 0,
        dwayne_ownership: parseFloat(formData.dwayne_ownership) || 0,
        sean_ownership: parseFloat(formData.sean_ownership) || 0,
        lena_ownership: parseFloat(formData.lena_ownership) || 0
      };

      if (editingProperty) {
        await axios.put(`/properties/${editingProperty.id}`, data);
      } else {
        await axios.post('/properties', data);
      }
      setShowModal(false);
      setEditingProperty(null);
      resetForm();
      fetchProperties();
    } catch (err) {
      setError('Failed to save property');
      console.error(err);
    }
  };

  const handleEdit = (property) => {
    setEditingProperty(property);
    setFormData({
      address: property.address,
      nickname: property.nickname,
      valuation: property.valuation.toString(),
      rental_income_yearly: property.rental_income_yearly.toString(),
      lender: property.lender,
      omar_ownership: property.omar_ownership.toString(),
      heidi_ownership: property.heidi_ownership.toString(),
      dwayne_ownership: property.dwayne_ownership.toString(),
      sean_ownership: property.sean_ownership.toString(),
      lena_ownership: property.lena_ownership.toString()
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this property?')) {
      try {
        await axios.delete(`/properties/${id}`);
        fetchProperties();
      } catch (err) {
        setError('Failed to delete property');
        console.error(err);
      }
    }
  };

  const handleAddNew = () => {
    setEditingProperty(null);
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      address: '',
      nickname: '',
      valuation: '',
      rental_income_yearly: '',
      lender: '',
      omar_ownership: '',
      heidi_ownership: '',
      dwayne_ownership: '',
      sean_ownership: '',
      lena_ownership: ''
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProperty(null);
    resetForm();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedProperties = () => {
    return [...properties].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle string comparison for property names
      if (sortField === 'nickname' || sortField === 'address') {
        aValue = aValue?.toString().toLowerCase() || '';
        bValue = bValue?.toString().toLowerCase() || '';
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return <div className="loading">Loading properties...</div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>Properties</h1>
        <button className="btn btn-primary" onClick={handleAddNew}>
          Add New Property
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('nickname')}
              >
                Property {getSortIcon('nickname')}
              </th>
              <th 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('valuation')}
              >
                Value {getSortIcon('valuation')}
              </th>
              <th 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('mortgage_balance')}
              >
                Mortgage {getSortIcon('mortgage_balance')}
              </th>
              <th 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('equity')}
              >
                Equity {getSortIcon('equity')}
              </th>
              <th 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('rental_income_yearly')}
              >
                Rental Income {getSortIcon('rental_income_yearly')}
              </th>
              <th 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('lender')}
              >
                Lender {getSortIcon('lender')}
              </th>
              <th>Ownership</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {getSortedProperties().map(property => (
              <tr key={property.id}>
                <td>
                  <div>
                    <strong className="db-data">{property.nickname}</strong>
                    <br />
                    <small className="db-data">{property.address}</small>
                  </div>
                </td>
                <td className="db-data">{formatCurrency(property.valuation)}</td>
                <td className="calculated-data">{formatCurrency(property.mortgage_balance)}</td>
                <td style={{ color: property.equity >= 0 ? '#28a745' : '#dc3545' }} className="calculated-data">
                  {formatCurrency(property.equity)}
                </td>
                <td className="db-data">{formatCurrency(property.rental_income_yearly)}</td>
                <td className="db-data">{property.lender}</td>
                <td>
                  <div style={{ fontSize: '12px' }}>
                    {property.omar_ownership > 0 && <div>Omar: <span className="db-data">{property.omar_ownership}%</span></div>}
                    {property.heidi_ownership > 0 && <div>Heidi: <span className="db-data">{property.heidi_ownership}%</span></div>}
                    {property.dwayne_ownership > 0 && <div>Dwayne: <span className="db-data">{property.dwayne_ownership}%</span></div>}
                    {property.sean_ownership > 0 && <div>Sean: <span className="db-data">{property.sean_ownership}%</span></div>}
                    {property.lena_ownership > 0 && <div>Lena: <span className="db-data">{property.lena_ownership}%</span></div>}
                  </div>
                </td>
                <td>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handleEdit(property)}
                    style={{ marginRight: '5px' }}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleDelete(property.id)}
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
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{editingProperty ? 'Edit Property' : 'Add New Property'}</h2>
              <button className="close" onClick={handleCloseModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label htmlFor="address">Address</label>
                  <input
                    type="text"
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="nickname">Nickname</label>
                  <input
                    type="text"
                    id="nickname"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="valuation">Valuation (€)</label>
                  <input
                    type="number"
                    id="valuation"
                    value={formData.valuation}
                    onChange={(e) => setFormData({ ...formData, valuation: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="rental_income_yearly">Rental Income (€/year)</label>
                  <input
                    type="number"
                    id="rental_income_yearly"
                    value={formData.rental_income_yearly}
                    onChange={(e) => setFormData({ ...formData, rental_income_yearly: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lender">Lender</label>
                  <input
                    type="text"
                    id="lender"
                    value={formData.lender}
                    onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
                  />
                </div>
              </div>
              
              <h4 style={{ marginTop: '20px', marginBottom: '15px' }}>Ownership (%)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label htmlFor="omar_ownership">Omar</label>
                  <input
                    type="number"
                    id="omar_ownership"
                    value={formData.omar_ownership}
                    onChange={(e) => setFormData({ ...formData, omar_ownership: e.target.value })}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="heidi_ownership">Heidi</label>
                  <input
                    type="number"
                    id="heidi_ownership"
                    value={formData.heidi_ownership}
                    onChange={(e) => setFormData({ ...formData, heidi_ownership: e.target.value })}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="dwayne_ownership">Dwayne</label>
                  <input
                    type="number"
                    id="dwayne_ownership"
                    value={formData.dwayne_ownership}
                    onChange={(e) => setFormData({ ...formData, dwayne_ownership: e.target.value })}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="sean_ownership">Sean</label>
                  <input
                    type="number"
                    id="sean_ownership"
                    value={formData.sean_ownership}
                    onChange={(e) => setFormData({ ...formData, sean_ownership: e.target.value })}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lena_ownership">Lena</label>
                  <input
                    type="number"
                    id="lena_ownership"
                    value={formData.lena_ownership}
                    onChange={(e) => setFormData({ ...formData, lena_ownership: e.target.value })}
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProperty ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Properties;
