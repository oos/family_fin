"""
Test suite for People API endpoints.
"""
import pytest
import json

class TestPeopleAPI:
    """Test people management endpoints."""
    
    def test_get_people(self, client, auth_headers, sample_data):
        """Test getting all people."""
        response = client.get('/api/people', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        assert len(data) >= 1  # At least the sample person
    
    def test_create_person(self, client, auth_headers, sample_data):
        """Test creating a new person."""
        person_data = {
            'name': 'Jane Doe',
            'email': 'jane@example.com',
            'family_id': sample_data['family'].id
        }
        
        response = client.post('/api/people', 
                              json=person_data, 
                              headers=auth_headers)
        assert response.status_code == 201
        data = response.get_json()
        assert data['name'] == 'Jane Doe'
        assert data['email'] == 'jane@example.com'
    
    def test_create_person_missing_data(self, client, auth_headers):
        """Test creating person with missing required data."""
        person_data = {'name': 'Jane Doe'}  # Missing email and family_id
        
        response = client.post('/api/people', 
                              json=person_data, 
                              headers=auth_headers)
        assert response.status_code == 400
    
    def test_update_person(self, client, auth_headers, sample_data):
        """Test updating a person."""
        person_id = sample_data['person'].id
        update_data = {
            'name': 'John Updated',
            'email': 'john.updated@example.com'
        }
        
        response = client.put(f'/api/people/{person_id}', 
                             json=update_data, 
                             headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data['name'] == 'John Updated'
        assert data['email'] == 'john.updated@example.com'
    
    def test_update_nonexistent_person(self, client, auth_headers):
        """Test updating a nonexistent person."""
        update_data = {'name': 'Nonexistent Person'}
        
        response = client.put('/api/people/99999', 
                             json=update_data, 
                             headers=auth_headers)
        assert response.status_code == 404
    
    def test_delete_person(self, client, auth_headers, sample_data):
        """Test deleting a person."""
        person_id = sample_data['person'].id
        
        response = client.delete(f'/api/people/{person_id}', headers=auth_headers)
        assert response.status_code == 200
        
        # Verify person is deleted
        response = client.get(f'/api/people/{person_id}', headers=auth_headers)
        assert response.status_code == 404
    
    def test_delete_nonexistent_person(self, client, auth_headers):
        """Test deleting a nonexistent person."""
        response = client.delete('/api/people/99999', headers=auth_headers)
        assert response.status_code == 404
