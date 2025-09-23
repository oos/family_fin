import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Families() {
  const [families, setFamilies] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [editingFamily, setEditingFamily] = useState(null);
  const [personFormData, setPersonFormData] = useState({
    name: '',
    relationship: '',
    is_director: false,
    is_deceased: false,
    family_id: ''
  });
  const [familyFormData, setFamilyFormData] = useState({
    name: '',
    code: '',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [familiesRes, peopleRes] = await Promise.all([
        axios.get('/api/families'),
        axios.get('/api/people')
      ]);
      setFamilies(familiesRes.data);
      setPeople(peopleRes.data);
    } catch (err) {
      setError('Failed to load families data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const groupPeopleByFamily = () => {
    const grouped = {};
    
    // Add people to their families
    people.forEach(person => {
      const familyId = person.family_id || 'unassigned';
      if (!grouped[familyId]) {
        grouped[familyId] = {
          family: person.family || { name: 'Unassigned', code: 'UNASSIGNED', description: 'People not assigned to any family' },
          people: []
        };
      }
      grouped[familyId].people.push(person);
    });

    // Add empty families
    families.forEach(family => {
      if (!grouped[family.id]) {
        grouped[family.id] = {
          family: family,
          people: []
        };
      }
    });

    return Object.values(grouped);
  };

  const handlePersonSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...personFormData,
        family_id: personFormData.family_id || null
      };

      if (editingPerson) {
        await axios.put(`/people/${editingPerson.id}`, data);
        setPeople(people.map(p => p.id === editingPerson.id ? { ...p, ...data } : p));
      } else {
        const response = await axios.post('/people', data);
        setPeople([...people, response.data]);
      }

      setShowPersonModal(false);
      setEditingPerson(null);
      resetPersonForm();
    } catch (err) {
      setError('Failed to save person');
      console.error(err);
    }
  };

  const handleFamilySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFamily) {
        await axios.put(`/families/${editingFamily.id}`, familyFormData);
        setFamilies(families.map(f => f.id === editingFamily.id ? { ...f, ...familyFormData } : f));
      } else {
        const response = await axios.post('/families', familyFormData);
        setFamilies([...families, response.data]);
      }

      setShowFamilyModal(false);
      setEditingFamily(null);
      resetFamilyForm();
    } catch (err) {
      setError('Failed to save family');
      console.error(err);
    }
  };

  const handlePersonEdit = (person) => {
    setEditingPerson(person);
    setPersonFormData({
      name: person.name,
      relationship: person.relationship,
      is_director: person.is_director,
      is_deceased: person.is_deceased,
      family_id: person.family_id || ''
    });
    setShowPersonModal(true);
  };

  const handleFamilyEdit = (family) => {
    setEditingFamily(family);
    setFamilyFormData({
      name: family.name,
      code: family.code,
      description: family.description || ''
    });
    setShowFamilyModal(true);
  };

  const handlePersonDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this person?')) {
      try {
        await axios.delete(`/people/${id}`);
        setPeople(people.filter(p => p.id !== id));
      } catch (err) {
        setError('Failed to delete person');
        console.error(err);
      }
    }
  };

  const handleFamilyDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this family? This will not delete the people in the family.')) {
      try {
        await axios.delete(`/families/${id}`);
        setFamilies(families.filter(f => f.id !== id));
      } catch (err) {
        setError('Failed to delete family');
        console.error(err);
      }
    }
  };

  const handleAddPerson = () => {
    setEditingPerson(null);
    resetPersonForm();
    setShowPersonModal(true);
  };

  const handleAddFamily = () => {
    setEditingFamily(null);
    resetFamilyForm();
    setShowFamilyModal(true);
  };

  const resetPersonForm = () => {
    setPersonFormData({
      name: '',
      relationship: '',
      is_director: false,
      is_deceased: false,
      family_id: ''
    });
  };

  const resetFamilyForm = () => {
    setFamilyFormData({
      name: '',
      code: '',
      description: ''
    });
  };

  const handleClosePersonModal = () => {
    setShowPersonModal(false);
    setEditingPerson(null);
    resetPersonForm();
  };

  const handleCloseFamilyModal = () => {
    setShowFamilyModal(false);
    setEditingFamily(null);
    resetFamilyForm();
  };

  if (loading) {
    return <div className="loading">Loading families...</div>;
  }

  const groupedFamilies = groupPeopleByFamily();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Families</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleAddFamily}>
            Add Family
          </button>
          <button className="btn btn-primary" onClick={handleAddPerson}>
            Add Person
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {groupedFamilies.map((group, index) => (
        <div key={group.family.id || 'unassigned'} className="card" style={{ marginBottom: '20px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '15px',
            paddingBottom: '10px',
            borderBottom: '2px solid #e9ecef'
          }}>
            <div>
              <h3 style={{ margin: 0, color: '#495057' }}>
                <span className="db-data">{group.family.name}</span> 
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: 'normal', 
                  color: '#6c757d',
                  marginLeft: '10px'
                }}>
                  ({group.family.code})
                </span>
              </h3>
              {group.family.description && (
                <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
                  {group.family.description}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button 
                className="btn btn-sm btn-secondary" 
                onClick={() => handleFamilyEdit(group.family)}
                style={{ padding: '4px 8px', fontSize: '11px' }}
              >
                Edit Family
              </button>
              {group.family.id && (
                <button 
                  className="btn btn-sm btn-danger" 
                  onClick={() => handleFamilyDelete(group.family.id)}
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                >
                  Delete Family
                </button>
              )}
            </div>
          </div>

          {group.people.length === 0 ? (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#6c757d',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px'
            }}>
              No people in this family
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Relationship</th>
                    <th>Director</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {group.people.map((person) => (
                    <tr key={person.id}>
                      <td style={{ fontWeight: '600' }} className="db-data">{person.name}</td>
                      <td className="db-data">{person.relationship}</td>
                      <td>
                        <span style={{
                          backgroundColor: person.is_director ? '#e8f5e8' : '#f8f9fa',
                          color: person.is_director ? '#2e7d32' : '#6c757d',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {person.is_director ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          backgroundColor: person.is_deceased ? '#ffebee' : '#e8f5e8',
                          color: person.is_deceased ? '#c62828' : '#2e7d32',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {person.is_deceased ? 'Deceased' : 'Active'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button 
                            className="btn btn-sm btn-secondary" 
                            onClick={() => handlePersonEdit(person)}
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-sm btn-danger" 
                            onClick={() => handlePersonDelete(person.id)}
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {/* Person Modal */}
      {showPersonModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingPerson ? 'Edit Person' : 'Add New Person'}</h2>
              <button className="close" onClick={handleClosePersonModal}>&times;</button>
            </div>
            <form onSubmit={handlePersonSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <input
                    type="text"
                    id="name"
                    value={personFormData.name}
                    onChange={(e) => setPersonFormData({ ...personFormData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="relationship">Relationship</label>
                  <input
                    type="text"
                    id="relationship"
                    value={personFormData.relationship}
                    onChange={(e) => setPersonFormData({ ...personFormData, relationship: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="family_id">Family</label>
                  <select
                    id="family_id"
                    value={personFormData.family_id}
                    onChange={(e) => setPersonFormData({ ...personFormData, family_id: e.target.value })}
                  >
                    <option value="">Select a family</option>
                    {families.map(family => (
                      <option key={family.id} value={family.id}>
                        {family.name} ({family.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={personFormData.is_director}
                      onChange={(e) => setPersonFormData({ ...personFormData, is_director: e.target.checked })}
                    />
                    Is Director
                  </label>
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={personFormData.is_deceased}
                      onChange={(e) => setPersonFormData({ ...personFormData, is_deceased: e.target.checked })}
                    />
                    Is Deceased
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleClosePersonModal}>
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

      {/* Family Modal */}
      {showFamilyModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingFamily ? 'Edit Family' : 'Add New Family'}</h2>
              <button className="close" onClick={handleCloseFamilyModal}>&times;</button>
            </div>
            <form onSubmit={handleFamilySubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="family_name">Family Name</label>
                  <input
                    type="text"
                    id="family_name"
                    value={familyFormData.name}
                    onChange={(e) => setFamilyFormData({ ...familyFormData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="code">Family Code</label>
                  <input
                    type="text"
                    id="code"
                    value={familyFormData.code}
                    onChange={(e) => setFamilyFormData({ ...familyFormData, code: e.target.value })}
                    required
                    placeholder="e.g., OSMULLIVAN"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={familyFormData.description}
                    onChange={(e) => setFamilyFormData({ ...familyFormData, description: e.target.value })}
                    rows="3"
                    placeholder="Optional description of the family"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseFamilyModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingFamily ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Families;
