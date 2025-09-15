"""
Test suite for Loans API endpoints.
"""
import pytest
import json

class TestLoansAPI:
    """Test loans management endpoints."""
    
    def test_get_loans(self, client, auth_headers, sample_data):
        """Test getting all loans."""
        response = client.get('/api/loans', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        assert len(data) >= 1  # At least the sample loan
    
    def test_create_loan(self, client, auth_headers, sample_data):
        """Test creating a new loan."""
        loan_data = {
            'property_id': sample_data['property'].id,
            'bank': 'Test Bank 2',
            'amount': 200000,
            'interest_rate': 4.0,
            'term_years': 25
        }
        
        response = client.post('/api/loans', 
                              json=loan_data, 
                              headers=auth_headers)
        assert response.status_code == 201
        data = response.get_json()
        assert data['bank'] == 'Test Bank 2'
        assert data['amount'] == 200000
    
    def test_create_loan_missing_data(self, client, auth_headers):
        """Test creating loan with missing required data."""
        loan_data = {'bank': 'Test Bank'}  # Missing required fields
        
        response = client.post('/api/loans', 
                              json=loan_data, 
                              headers=auth_headers)
        assert response.status_code == 400
    
    def test_update_loan(self, client, auth_headers, sample_data):
        """Test updating a loan."""
        loan_id = sample_data['loan'].id
        update_data = {
            'bank': 'Updated Bank',
            'interest_rate': 3.8
        }
        
        response = client.put(f'/api/loans/{loan_id}', 
                             json=update_data, 
                             headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data['bank'] == 'Updated Bank'
        assert data['interest_rate'] == 3.8
    
    def test_delete_loan(self, client, auth_headers, sample_data):
        """Test deleting a loan."""
        loan_id = sample_data['loan'].id
        
        response = client.delete(f'/api/loans/{loan_id}', headers=auth_headers)
        assert response.status_code == 200
        
        # Verify loan is deleted
        response = client.get(f'/api/loans/{loan_id}', headers=auth_headers)
        assert response.status_code == 404
    
    def test_get_loan_schedule(self, client, auth_headers, sample_data):
        """Test getting loan payment schedule."""
        loan_id = sample_data['loan'].id
        
        response = client.get(f'/api/loans/{loan_id}/schedule', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert 'schedule' in data
        assert isinstance(data['schedule'], list)
    
    def test_get_loan_erc(self, client, auth_headers, sample_data):
        """Test getting loan ERC data."""
        loan_id = sample_data['loan'].id
        
        response = client.get(f'/api/loans/{loan_id}/erc', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
    
    def test_create_loan_erc(self, client, auth_headers, sample_data):
        """Test creating loan ERC entry."""
        loan_id = sample_data['loan'].id
        erc_data = {
            'amount': 5000,
            'date': '2024-01-01',
            'notes': 'Test ERC entry'
        }
        
        response = client.post(f'/api/loans/{loan_id}/erc', 
                              json=erc_data, 
                              headers=auth_headers)
        assert response.status_code == 201
        data = response.get_json()
        assert data['amount'] == 5000
    
    def test_get_loan_payments(self, client, auth_headers, sample_data):
        """Test getting loan payments."""
        loan_id = sample_data['loan'].id
        
        response = client.get(f'/api/loans/{loan_id}/payments', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
    
    def test_create_loan_payment(self, client, auth_headers, sample_data):
        """Test creating loan payment."""
        loan_id = sample_data['loan'].id
        payment_data = {
            'amount': 1500,
            'date': '2024-01-01',
            'payment_type': 'regular',
            'notes': 'Test payment'
        }
        
        response = client.post(f'/api/loans/{loan_id}/payments', 
                              json=payment_data, 
                              headers=auth_headers)
        assert response.status_code == 201
        data = response.get_json()
        assert data['amount'] == 1500
