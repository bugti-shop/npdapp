#!/bin/bash

# ==============================================
# iOS Production Build Script
# ==============================================
# This script automates the build, sync, and 
# deployment process for iOS
# Requires macOS with Xcode installed
# ==============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Npd"
SCHEME="App"
BUILD_TYPE="${1:-debug}"  # debug or release

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}   ${APP_NAME} - iOS Build Script${NC}"
echo -e "${BLUE}===============================================${NC}"
echo ""

# Function to print step
print_step() {
    echo -e "${YELLOW}▶ $1${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "This script must be run on macOS"
    exit 1
fi

# Check if required tools are installed
print_step "Checking required tools..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

if ! command -v xcodebuild &> /dev/null; then
    print_error "Xcode is not installed"
    exit 1
fi

print_success "All required tools are installed"

# Step 1: Install dependencies
print_step "Installing dependencies..."
npm install
print_success "Dependencies installed"

# Step 2: Build web app
print_step "Building web application..."
npm run build
print_success "Web app built successfully"

# Step 3: Check if iOS platform exists
if [ ! -d "ios" ]; then
    print_step "iOS platform not found. Adding iOS..."
    npx cap add ios
    print_success "iOS platform added"
fi

# Step 4: Update iOS dependencies
print_step "Updating iOS dependencies..."
npx cap update ios
print_success "iOS dependencies updated"

# Step 5: Install CocoaPods dependencies
print_step "Installing CocoaPods dependencies..."
cd ios/App
if [ -f "Podfile" ]; then
    pod install
    print_success "CocoaPods dependencies installed"
else
    print_step "No Podfile found, skipping CocoaPods"
fi
cd ../..

# Step 6: Sync with Capacitor
print_step "Syncing with Capacitor..."
npx cap sync ios
print_success "Capacitor sync complete"

# Step 7: Build iOS app
print_step "Building iOS app (${BUILD_TYPE})..."
cd ios/App

if [ "$BUILD_TYPE" = "release" ]; then
    # Build for release (archive)
    xcodebuild -workspace App.xcworkspace \
        -scheme "${SCHEME}" \
        -configuration Release \
        -destination 'generic/platform=iOS' \
        -archivePath "build/${APP_NAME}.xcarchive" \
        archive
    
    print_success "Release archive built: ios/App/build/${APP_NAME}.xcarchive"
    
    echo ""
    echo "To export IPA for App Store:"
    echo "  1. Open Xcode: npx cap open ios"
    echo "  2. Product > Archive"
    echo "  3. Distribute App"
else
    # Build for debug (simulator)
    xcodebuild -workspace App.xcworkspace \
        -scheme "${SCHEME}" \
        -configuration Debug \
        -destination 'platform=iOS Simulator,name=iPhone 15' \
        build
    
    print_success "Debug build complete"
fi

cd ../..

# Step 8: Optional - Run on simulator
echo ""
read -p "Do you want to run on iOS Simulator? (y/n): " run_choice
if [ "$run_choice" = "y" ] || [ "$run_choice" = "Y" ]; then
    print_step "Launching iOS Simulator..."
    npx cap run ios
    print_success "App running on simulator"
fi

echo ""
echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}   Build Complete!${NC}"
echo -e "${GREEN}===============================================${NC}"
echo ""
echo "To open in Xcode:"
echo "  npx cap open ios"
echo ""
echo "For App Store submission:"
echo "  1. Open Xcode"
echo "  2. Set your Team in Signing & Capabilities"
echo "  3. Product > Archive"
echo "  4. Distribute App > App Store Connect"
