#!/bin/bash

# Ride Feature Installation Script
# This script installs the required dependencies for the ride feature

echo "🚗 Installing Ride Feature Dependencies..."
echo ""

cd "$(dirname "$0")"

# Install socket.io-client for WebSocket functionality
echo "📦 Installing socket.io-client..."
yarn add socket.io-client@^4.8.1

echo ""
echo "✅ Installation complete!"
echo ""
echo "📖 Next steps:"
echo "1. Review RIDE_FEATURE_README.md for full documentation"
echo "2. Run 'npm start' to launch the app"
echo "3. Navigate to the Ride tab to test the feature"
echo ""
echo "🎉 The ride feature is now ready to use!"
