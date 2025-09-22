#!/usr/bin/env python3
"""
Start script for production deployment
Removes migrations directory to prevent Flask-Migrate issues
"""

import os
import shutil
import sys

# Remove migrations directory if it exists
migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
if os.path.exists(migrations_dir):
    print("Removing migrations directory to prevent Flask-Migrate issues...")
    shutil.rmtree(migrations_dir)
    print("Migrations directory removed successfully")

# Import and run the app
from wsgi import app

if __name__ == "__main__":
    app.run()
