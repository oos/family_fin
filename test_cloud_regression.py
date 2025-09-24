#!/usr/bin/env python3
"""
Cloud regression test suite for production API endpoints.
Tests all functionality against the live cloud deployment.
"""

import pytest
import requests
import json
from datetime import datetime

class TestCloudRegression:
    """Cloud regression test suite for production API"""
    
    BASE_URL = "https://family-finance-api-ycku.onrender.com"
    
    def get_auth_token(self, email, password):
        """Get authentication token for a user"""
        response = requests.post(f"{self.BASE_URL}/api/auth/login", json={
            'email': email,
            'password': password
        })
        if response.status_code == 200:
            return response.json()['access_token']
        return None
    
    def get_headers(self, token):
        """Get headers with authorization token"""
        return {'Authorization': f'Bearer {token}'}
    
    # ==================== AUTHENTICATION TESTS ====================
    
    def test_admin_login(self):
        """Test admin can login successfully"""
        token = self.get_auth_token('omarosullivan@gmail.com', 'admin123')
        assert token is not None, "Admin login failed"
    
    def test_user_login(self):
        """Test user can login successfully"""
        token = self.get_auth_token('sean.osullivan@gmail.com', 'Secodwom01')
        assert token is not None, "User login failed"
    
    def test_invalid_login(self):
        """Test invalid login is rejected"""
        response = requests.post(f"{self.BASE_URL}/api/auth/login", json={
            'email': 'nonexistent@example.com',
            'password': 'wrongpassword'
        })
        assert response.status_code == 401, "Invalid login should return 401"
    
    # ==================== ADMIN FUNCTIONALITY TESTS ====================
    
    def test_admin_dashboard_access(self):
        """Test admin can access dashboard"""
        token = self.get_auth_token('omarosullivan@gmail.com', 'admin123')
        assert token is not None, "Admin login failed"
        
        response = requests.get(f"{self.BASE_URL}/api/user-dashboard", 
                              headers=self.get_headers(token))
        assert response.status_code == 200, f"Admin dashboard access failed: {response.status_code}"
        data = response.json()
        assert 'dashboard' in data, "Dashboard data not found"
    
    def test_admin_users_access(self):
        """Test admin can access users list"""
        token = self.get_auth_token('omarosullivan@gmail.com', 'admin123')
        assert token is not None, "Admin login failed"
        
        response = requests.get(f"{self.BASE_URL}/api/users", 
                              headers=self.get_headers(token))
        assert response.status_code == 200, f"Admin users access failed: {response.status_code}"
        data = response.json()
        assert 'users' in data, "Users data not found"
    
    def test_admin_properties_access(self):
        """Test admin can access properties"""
        token = self.get_auth_token('omarosullivan@gmail.com', 'admin123')
        assert token is not None, "Admin login failed"
        
        response = requests.get(f"{self.BASE_URL}/api/properties", 
                              headers=self.get_headers(token))
        assert response.status_code == 200, f"Admin properties access failed: {response.status_code}"
        data = response.json()
        assert 'properties' in data, "Properties data not found"
        assert len(data['properties']) > 0, "No properties found"
    
    def test_admin_income_access(self):
        """Test admin can access income data"""
        token = self.get_auth_token('omarosullivan@gmail.com', 'admin123')
        assert token is not None, "Admin login failed"
        
        response = requests.get(f"{self.BASE_URL}/api/income", 
                              headers=self.get_headers(token))
        assert response.status_code == 200, f"Admin income access failed: {response.status_code}"
        data = response.json()
        assert 'incomes' in data, "Income data not found"
        assert len(data['incomes']) > 0, "No income records found"
    
    def test_admin_loans_access(self):
        """Test admin can access all loans"""
        token = self.get_auth_token('omarosullivan@gmail.com', 'admin123')
        assert token is not None, "Admin login failed"
        
        response = requests.get(f"{self.BASE_URL}/api/loans", 
                              headers=self.get_headers(token))
        assert response.status_code == 200, f"Admin loans access failed: {response.status_code}"
        data = response.json()
        assert 'loans' in data, "Loans data not found"
        assert len(data['loans']) > 0, "No loans found"
    
    def test_admin_business_accounts_access(self):
        """Test admin can access all business accounts"""
        token = self.get_auth_token('omarosullivan@gmail.com', 'admin123')
        assert token is not None, "Admin login failed"
        
        response = requests.get(f"{self.BASE_URL}/api/business-accounts", 
                              headers=self.get_headers(token))
        assert response.status_code == 200, f"Admin business accounts access failed: {response.status_code}"
        data = response.json()
        assert 'accounts' in data, "Business accounts data not found"
        assert len(data['accounts']) > 0, "No business accounts found"
    
    def test_admin_people_access(self):
        """Test admin can access people data"""
        token = self.get_auth_token('omarosullivan@gmail.com', 'admin123')
        assert token is not None, "Admin login failed"
        
        response = requests.get(f"{self.BASE_URL}/api/people", 
                              headers=self.get_headers(token))
        assert response.status_code == 200, f"Admin people access failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "People data should be a list"
        assert len(data) > 0, "No people found"
    
    def test_admin_families_access(self):
        """Test admin can access families data"""
        token = self.get_auth_token('omarosullivan@gmail.com', 'admin123')
        assert token is not None, "Admin login failed"
        
        response = requests.get(f"{self.BASE_URL}/api/families", 
                              headers=self.get_headers(token))
        assert response.status_code == 200, f"Admin families access failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Families data should be a list"
        assert len(data) > 0, "No families found"
    
    def test_admin_gl_transactions_access(self):
        """Test admin can access GL transactions"""
        token = self.get_auth_token('omarosullivan@gmail.com', 'admin123')
        assert token is not None, "Admin login failed"
        
        response = requests.get(f"{self.BASE_URL}/api/gl-transactions", 
                              headers=self.get_headers(token))
        assert response.status_code == 200, f"Admin GL transactions access failed: {response.status_code}"
        data = response.json()
        assert 'transactions' in data, "GL transactions data not found"
    
    def test_admin_dashboard_summary(self):
        """Test admin can access dashboard summary"""
        token = self.get_auth_token('omarosullivan@gmail.com', 'admin123')
        assert token is not None, "Admin login failed"
        
        response = requests.get(f"{self.BASE_URL}/api/dashboard/summary", 
                              headers=self.get_headers(token))
        assert response.status_code == 200, f"Admin dashboard summary access failed: {response.status_code}"
        data = response.json()
        assert 'net_worth' in data or 'total_family_income' in data, "Dashboard summary data not found"
    
    # ==================== USER FUNCTIONALITY TESTS ====================
    
    def test_user_dashboard_access(self):
        """Test user can access their dashboard"""
        token = self.get_auth_token('sean.osullivan@gmail.com', 'Secodwom01')
        assert token is not None, "User login failed"
        
        response = requests.get(f"{self.BASE_URL}/api/user-dashboard", 
                              headers=self.get_headers(token))
        assert response.status_code == 200, f"User dashboard access failed: {response.status_code}"
        data = response.json()
        assert 'dashboard' in data, "Dashboard data not found"
    
    def test_user_loans_access(self):
        """Test user can access their permitted loans"""
        token = self.get_auth_token('sean.osullivan@gmail.com', 'Secodwom01')
        assert token is not None, "User login failed"
        
        response = requests.get(f"{self.BASE_URL}/api/loans", 
                              headers=self.get_headers(token))
        assert response.status_code == 200, f"User loans access failed: {response.status_code}"
        data = response.json()
        assert 'loans' in data, "Loans data not found"
        # User should see loans based on their permissions
    
    def test_user_accounts_access(self):
        """Test user can access their permitted accounts"""
        token = self.get_auth_token('sean.osullivan@gmail.com', 'Secodwom01')
        assert token is not None, "User login failed"
        
        response = requests.get(f"{self.BASE_URL}/api/business-accounts", 
                              headers=self.get_headers(token))
        assert response.status_code == 200, f"User business accounts access failed: {response.status_code}"
        data = response.json()
        assert 'accounts' in data, "Business accounts data not found"
        # User should see accounts based on their permissions
    
    def test_user_loan_balances_access(self):
        """Test user can access their loan balances"""
        token = self.get_auth_token('sean.osullivan@gmail.com', 'Secodwom01')
        assert token is not None, "User login failed"
        
        response = requests.get(f"{self.BASE_URL}/api/user-loan-balances", 
                              headers=self.get_headers(token))
        assert response.status_code == 200, f"User loan balances access failed: {response.status_code}"
        data = response.json()
        assert 'balances' in data, "Loan balances data not found"
    
    def test_user_account_balances_access(self):
        """Test user can access their account balances"""
        token = self.get_auth_token('sean.osullivan@gmail.com', 'Secodwom01')
        assert token is not None, "User login failed"
        
        response = requests.get(f"{self.BASE_URL}/api/user-account-balances", 
                              headers=self.get_headers(token))
        assert response.status_code == 200, f"User account balances access failed: {response.status_code}"
        data = response.json()
        assert 'balances' in data, "Account balances data not found"
    
    # ==================== DATA INTEGRITY TESTS ====================
    
    def test_data_consistency(self):
        """Test that data is consistent across endpoints"""
        token = self.get_auth_token('omarosullivan@gmail.com', 'admin123')
        assert token is not None, "Admin login failed"
        headers = self.get_headers(token)
        
        # Get all data
        properties_res = requests.get(f"{self.BASE_URL}/api/properties", headers=headers)
        income_res = requests.get(f"{self.BASE_URL}/api/income", headers=headers)
        loans_res = requests.get(f"{self.BASE_URL}/api/loans", headers=headers)
        people_res = requests.get(f"{self.BASE_URL}/api/people", headers=headers)
        
        # Verify all endpoints return data
        assert properties_res.status_code == 200, "Properties endpoint failed"
        assert income_res.status_code == 200, "Income endpoint failed"
        assert loans_res.status_code == 200, "Loans endpoint failed"
        assert people_res.status_code == 200, "People endpoint failed"
        
        # Verify data structure
        properties_data = properties_res.json()
        income_data = income_res.json()
        loans_data = loans_res.json()
        people_data = people_res.json()
        
        assert 'properties' in properties_data, "Properties data structure incorrect"
        assert 'incomes' in income_data, "Income data structure incorrect"
        assert 'loans' in loans_data, "Loans data structure incorrect"
        assert isinstance(people_data, list), "People data structure incorrect"
    
    def test_api_response_times(self):
        """Test that API responses are reasonably fast"""
        token = self.get_auth_token('omarosullivan@gmail.com', 'admin123')
        assert token is not None, "Admin login failed"
        headers = self.get_headers(token)
        
        endpoints = [
            '/api/user-dashboard',
            '/api/properties',
            '/api/income',
            '/api/loans',
            '/api/business-accounts',
            '/api/people',
            '/api/families'
        ]
        
        for endpoint in endpoints:
            start_time = datetime.now()
            response = requests.get(f"{self.BASE_URL}{endpoint}", headers=headers)
            end_time = datetime.now()
            
            response_time = (end_time - start_time).total_seconds()
            assert response.status_code == 200, f"{endpoint} failed with status {response.status_code}"
            assert response_time < 10, f"{endpoint} took too long: {response_time:.2f}s"
    
    # ==================== ERROR HANDLING TESTS ====================
    
    def test_unauthorized_access(self):
        """Test unauthorized access is properly handled"""
        endpoints = [
            '/api/user-dashboard',
            '/api/properties',
            '/api/income',
            '/api/loans',
            '/api/business-accounts',
            '/api/user-loan-balances',
            '/api/user-account-balances'
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{self.BASE_URL}{endpoint}")
            assert response.status_code == 401, f"Unauthorized access to {endpoint} should return 401"
    
    def test_invalid_token(self):
        """Test invalid token is properly handled"""
        headers = {'Authorization': 'Bearer invalid_token'}
        
        response = requests.get(f"{self.BASE_URL}/api/user-dashboard", headers=headers)
        assert response.status_code in [401, 422], f"Invalid token should return 401 or 422, got {response.status_code}"

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
