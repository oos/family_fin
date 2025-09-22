#!/usr/bin/env python3
"""
Minimal Flask app for production deployment
Bypasses all migration and complex dependency issues
"""

from flask import Flask, jsonify
from flask_cors import CORS
import os

# Create minimal Flask app
app = Flask(__name__)
CORS(app)

# Basic configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Health check endpoint
@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Family Finance API is running',
        'version': '1.0.0'
    })

# Basic API endpoints
@app.route('/api/test')
def test_endpoint():
    return jsonify({
        'message': 'API is working!',
        'database_url': app.config['SQLALCHEMY_DATABASE_URI'][:20] + '...' if len(app.config['SQLALCHEMY_DATABASE_URI']) > 20 else app.config['SQLALCHEMY_DATABASE_URI']
    })

@app.route('/')
def index():
    return jsonify({
        'message': 'Family Finance Management API',
        'status': 'running',
        'endpoints': ['/api/health', '/api/test']
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
