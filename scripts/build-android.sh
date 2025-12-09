#!/bin/bash

# ==============================================
# Android Production Build Script
# ==============================================
# This script automates the build, sync, and 
# deployment process for Android
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
PACKAGE_ID="app.nota.com"
BUILD_TYPE="${1:-debug}"  # debug or release

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}   ${APP_NAME} - Android Build Script${NC}"
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

print_success "All required tools are installed"

# Step 1: Install dependencies
print_step "Installing dependencies..."
npm install
print_success "Dependencies installed"

# Step 2: Build web app
print_step "Building web application..."
npm run build
print_success "Web app built successfully"

# Step 3: Check if Android platform exists
if [ ! -d "android" ]; then
    print_step "Android platform not found. Adding Android..."
    npx cap add android
    print_success "Android platform added"
fi

# Step 4: Update Android dependencies
print_step "Updating Android dependencies..."
npx cap update android
print_success "Android dependencies updated"

# Step 5: Sync with Capacitor
print_step "Syncing with Capacitor..."
npx cap sync android
print_success "Capacitor sync complete"

# Step 6: Build Android app
print_step "Building Android app (${BUILD_TYPE})..."
cd android

if [ "$BUILD_TYPE" = "release" ]; then
    # Check for keystore
    if [ ! -f "app/release-keystore.jks" ]; then
        print_error "Release keystore not found at android/app/release-keystore.jks"
        echo "To create a keystore, run:"
        echo "keytool -genkey -v -keystore android/app/release-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias release"
        exit 1
    fi
    
    ./gradlew assembleRelease
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
    print_success "Release APK built: android/${APK_PATH}"
else
    ./gradlew assembleDebug
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    print_success "Debug APK built: android/${APK_PATH}"
fi

cd ..

# Step 7: Optional - Install on connected device
echo ""
read -p "Do you want to install on a connected device? (y/n): " install_choice
if [ "$install_choice" = "y" ] || [ "$install_choice" = "Y" ]; then
    print_step "Installing on device..."
    
    if ! command -v adb &> /dev/null; then
        print_error "ADB is not installed or not in PATH"
        exit 1
    fi
    
    # Check if device is connected
    DEVICES=$(adb devices | grep -v "List" | grep -v "^$" | wc -l)
    if [ "$DEVICES" -eq 0 ]; then
        print_error "No Android device connected"
        exit 1
    fi
    
    adb install -r "android/${APK_PATH}"
    print_success "App installed on device"
    
    # Launch the app
    read -p "Launch the app? (y/n): " launch_choice
    if [ "$launch_choice" = "y" ] || [ "$launch_choice" = "Y" ]; then
        adb shell am start -n "${PACKAGE_ID}/.MainActivity"
        print_success "App launched"
    fi
fi

echo ""
echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}   Build Complete!${NC}"
echo -e "${GREEN}===============================================${NC}"
echo ""
echo "APK Location: android/${APK_PATH}"
echo ""
echo "To install manually:"
echo "  adb install -r android/${APK_PATH}"
echo ""
echo "To open in Android Studio:"
echo "  npx cap open android"
