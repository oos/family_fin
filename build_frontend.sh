#!/bin/bash
# Build script for frontend deployment

echo "Installing dependencies..."
npm install

echo "Building React app..."
npm run build

echo "Build completed successfully!"
