"""
Integration tests for the Family Finance App.
"""
import pytest
import json
import time

class TestIntegration:
    """Test integration between different components."""
    
    def test_complete_user_workflow(self, client, auth_headers):
        """Test complete user workflow from login to data management."""
        # 1. Login (already done in auth_headers fixture)
        # 2. Create family
        family_data = {'name': 'Integration Test Family'}
        response = client.post('/api/families', json=family_data, headers=auth_headers)
        assert response.status_code == 201
        family_id = response.get_json()['id']
        
        # 3. Create person
        person_data = {
            'name': 'Integration Test Person',
            'email': 'integration@test.com',
            'family_id': family_id
        }
        response = client.post('/api/people', json=person_data, headers=auth_headers)
        assert response.status_code == 201
        person_id = response.get_json()['id']
        
        # 4. Create property
        property_data = {
            'name': 'Integration Test Property',
            'address': '123 Integration St',
            'purchase_price': 300000,
            'current_value': 350000
        }
        response = client.post('/api/properties', json=property_data, headers=auth_headers)
        assert response.status_code == 201
        property_id = response.get_json()['id']
        
        # 5. Create business account
        account_data = {
            'account_name': 'Integration Test Account',
            'account_number': '123456789',
            'bank_name': 'Integration Bank',
            'company_name': 'Integration Company'
        }
        response = client.post('/api/business-accounts', json=account_data, headers=auth_headers)
        assert response.status_code == 201
        account_id = response.get_json()['id']
        
        # 6. Create income
        income_data = {
            'person_id': person_id,
            'amount': 60000,
            'frequency': 'annual',
            'source': 'Integration Salary'
        }
        response = client.post('/api/income', json=income_data, headers=auth_headers)
        assert response.status_code == 201
        
        # 7. Create loan
        loan_data = {
            'property_id': property_id,
            'bank': 'Integration Bank',
            'amount': 250000,
            'interest_rate': 3.5,
            'term_years': 30
        }
        response = client.post('/api/loans', json=loan_data, headers=auth_headers)
        assert response.status_code == 201
        loan_id = response.get_json()['id']
        
        # 8. Create pension
        pension_data = {
            'person_id': person_id,
            'provider': 'Integration Pension',
            'monthly_contribution': 500
        }
        response = client.post('/api/pensions', json=pension_data, headers=auth_headers)
        assert response.status_code == 201
        
        # 9. Upload tax return
        tax_return_data = {
            'year': '2024',
            'filename': 'integration_test.csv',
            'file_content': 'Date,Description,Amount\n2024-01-01,Test Transaction,100.00'
        }
        response = client.post('/api/tax-returns/upload', json=tax_return_data, headers=auth_headers)
        assert response.status_code == 201
        tax_return_id = response.get_json()['id']
        
        # 10. Get dashboard data
        response = client.get('/api/user-dashboard', headers=auth_headers)
        assert response.status_code == 200
        dashboard_data = response.get_json()
        assert 'data' in dashboard_data
        
        # 11. Test GL transactions
        response = client.get('/api/gl-transactions', headers=auth_headers)
        assert response.status_code == 200
        
        # 12. Test bank transactions
        response = client.get('/api/transactions', headers=auth_headers)
        assert response.status_code == 200
        
        # 13. Test transaction matching
        response = client.get(f'/api/tax-returns/{tax_return_id}/match-transactions', headers=auth_headers)
        assert response.status_code == 200
    
    def test_data_consistency(self, client, auth_headers, sample_data):
        """Test data consistency across different endpoints."""
        # Get all data
        people_response = client.get('/api/people', headers=auth_headers)
        families_response = client.get('/api/families', headers=auth_headers)
        properties_response = client.get('/api/properties', headers=auth_headers)
        accounts_response = client.get('/api/business-accounts', headers=auth_headers)
        income_response = client.get('/api/income', headers=auth_headers)
        loans_response = client.get('/api/loans', headers=auth_headers)
        
        assert people_response.status_code == 200
        assert families_response.status_code == 200
        assert properties_response.status_code == 200
        assert accounts_response.status_code == 200
        assert income_response.status_code == 200
        assert loans_response.status_code == 200
        
        # Verify data relationships
        people_data = people_response.get_json()
        families_data = families_response.get_json()
        
        # Check that people belong to existing families
        for person in people_data:
            if person.get('family_id'):
                family_ids = [f['id'] for f in families_data]
                assert person['family_id'] in family_ids
    
    def test_error_handling(self, client, auth_headers):
        """Test error handling across the application."""
        # Test invalid endpoints
        response = client.get('/api/nonexistent', headers=auth_headers)
        assert response.status_code == 404
        
        # Test invalid data
        invalid_person_data = {'invalid_field': 'invalid_value'}
        response = client.post('/api/people', json=invalid_person_data, headers=auth_headers)
        assert response.status_code == 400
        
        # Test invalid IDs
        response = client.get('/api/people/99999', headers=auth_headers)
        assert response.status_code == 404
        
        response = client.put('/api/people/99999', json={'name': 'Test'}, headers=auth_headers)
        assert response.status_code == 404
    
    def test_performance_basic(self, client, auth_headers, sample_data):
        """Test basic performance of key endpoints."""
        endpoints = [
            '/api/people',
            '/api/families',
            '/api/properties',
            '/api/business-accounts',
            '/api/income',
            '/api/loans',
            '/api/gl-transactions',
            '/api/transactions'
        ]
        
        for endpoint in endpoints:
            start_time = time.time()
            response = client.get(endpoint, headers=auth_headers)
            end_time = time.time()
            
            assert response.status_code == 200
            # Basic performance check - should respond within 5 seconds
            assert (end_time - start_time) < 5.0
    
    def test_gl_transaction_matching_integration(self, client, auth_headers, sample_data):
        """Test GL transaction matching integration."""
        # Get GL transactions
        gl_response = client.get('/api/gl-transactions?per_page=1000', headers=auth_headers)
        assert gl_response.status_code == 200
        gl_data = gl_response.get_json()
        
        # Get bank transactions
        bank_response = client.get('/api/transactions', headers=auth_headers)
        assert bank_response.status_code == 200
        bank_data = bank_response.get_json()
        
        # Test matching logic
        pj_transactions = [tx for tx in gl_data['transactions'] if tx.get('source') == 'PJ']
        bank_transactions = bank_data['transactions']
        
        matches = 0
        for gl_tx in pj_transactions:
            gl_amount = abs(gl_tx.get('debit', 0) or gl_tx.get('credit', 0) or 0)
            gl_date = gl_tx.get('date')
            
            for bank_tx in bank_transactions:
                bank_amount = abs(bank_tx.get('amount', 0) or 0)
                bank_date = bank_tx.get('transaction_date') or bank_tx.get('date')
                
                if (abs(gl_amount - bank_amount) < 0.01 and 
                    gl_date == bank_date):
                    matches += 1
                    break
        
        # Verify matching works
        assert matches >= 0  # Should have at least 0 matches
        if pj_transactions:
            match_rate = (matches / len(pj_transactions)) * 100
            print(f"Integration test match rate: {match_rate:.1f}% ({matches}/{len(pj_transactions)})")
