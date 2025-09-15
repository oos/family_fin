"""
Test suite for authentication API endpoints.
"""
import pytest
import json

class TestAuthAPI:
    """Test authentication endpoints."""
    
    def test_login_success(self, client):
        """Test successful login."""
        # Create test user
        from app import db, User
        from werkzeug.security import generate_password_hash
        
        test_user = User(
            username='testuser@example.com',
            email='testuser@example.com',
            password_hash=generate_password_hash('testpassword123')
        )
        test_user.is_active = True
        db.session.add(test_user)
        db.session.commit()
        
        response = client.post('/api/auth/login', 
                              json={'username': 'testuser@example.com', 'password': 'testpassword123'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'access_token' in data
        assert 'user' in data
        assert data['user']['username'] == 'testuser@example.com'
    
    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials."""
        response = client.post('/api/auth/login', 
                              json={'username': 'nonexistent@example.com', 'password': 'wrongpassword'})
        
        assert response.status_code == 401
        data = response.get_json()
        assert data['message'] == 'Invalid credentials'
    
    def test_login_missing_credentials(self, client):
        """Test login with missing credentials."""
        response = client.post('/api/auth/login', json={})
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'Username and password are required' in data['message']
    
    def test_login_inactive_user(self, client):
        """Test login with inactive user."""
        from app import db, User
        from werkzeug.security import generate_password_hash
        
        test_user = User(
            username='inactive@example.com',
            email='inactive@example.com',
            password_hash=generate_password_hash('testpassword123')
        )
        test_user.is_active = False
        db.session.add(test_user)
        db.session.commit()
        
        response = client.post('/api/auth/login', 
                              json={'username': 'inactive@example.com', 'password': 'testpassword123'})
        
        assert response.status_code == 401
        data = response.get_json()
        assert data['message'] == 'Invalid credentials'
    
    def test_protected_endpoint_without_auth(self, client):
        """Test accessing protected endpoint without authentication."""
        response = client.get('/api/people')
        assert response.status_code == 401
    
    def test_protected_endpoint_with_auth(self, client, auth_headers):
        """Test accessing protected endpoint with authentication."""
        response = client.get('/api/people', headers=auth_headers)
        assert response.status_code == 200
