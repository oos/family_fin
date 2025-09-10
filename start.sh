#!/bin/bash

# Family Finance Management System Startup Script

echo "Starting Family Finance Management System..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required but not installed. Please install Python 3.8+ and try again."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is required but not installed. Please install Node.js 16+ and try again."
    exit 1
fi

# Install Python dependencies
echo "Installing Python dependencies..."
pip3 install -r requirements.txt

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Seed the database
echo "Setting up database with sample data..."
python3 seed_data.py

# Start the Flask backend in the background
echo "Starting Flask backend..."
PORT=5002 python3 app.py &
BACKEND_PID=$!

# Wait a moment for the backend to start
sleep 3

# Start the React frontend
echo "Starting React frontend..."
npm start &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo "Family Finance Management System Started!"
echo "=========================================="
echo "Backend: http://localhost:5002"
echo "Frontend: http://localhost:3000"
echo "Login: admin / admin123"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait
