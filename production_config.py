"""
Production configuration for Family Finance Management
"""

import os

class ProductionConfig:
    """Production configuration class"""
    
    # Database
    # Convert postgresql:// to postgresql+psycopg:// for psycopg3 compatibility
    database_url = os.environ.get('DATABASE_URL', 'postgresql://localhost/family_finance')
    if database_url.startswith('postgresql://'):
        database_url = database_url.replace('postgresql://', 'postgresql+psycopg://', 1)
    SQLALCHEMY_DATABASE_URI = database_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key')
    
    # CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3007').split(',')
    
    # Flask
    DEBUG = False
    TESTING = False
    
    # File uploads
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
