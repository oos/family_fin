import React, { useState, useEffect } from 'react';
import axios from 'axios';

function People() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const response = await axios.get('/api/people');
      setPeople(response.data);
    } catch (err) {
      setError('Failed to load people');
      console.error(err);
    } finally {
      setLoading(false);
    }
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
        <h1>People Management</h1>
        <button className="btn btn-primary" onClick={handleAddNew}>
          Add New Person
        </button>
      </div>

      {error && <div className="error">{error}</div>}

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
              <div className="modal-body">
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
              </div>
              <div className="modal-footer">
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