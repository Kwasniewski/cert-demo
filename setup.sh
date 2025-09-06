#!/bin/bash

# Azure Certificate Chain Tool Setup Script
# This script helps set up the development environment

set -e

echo "🔧 Setting up Azure Certificate Chain Tool..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building the project..."
npm run build

# Create example environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your Azure Key Vault configuration"
fi

# Create certificates directory for examples
echo "📁 Creating example directories..."
mkdir -p examples/certs/intermediate
mkdir -p examples/certs/root

# Make CLI executable
chmod +x dist/index.js

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your Azure Key Vault configuration"
echo "2. Test connection: npm run dev -- test"
echo "3. List certificates: npm run dev -- list"
echo "4. Create certificate chain: npm run dev -- chain --source <cert-name> --target <new-cert-name>"
echo ""
echo "📚 For more information, see README.md"
echo ""
echo "🚀 Happy certificate chaining!"
