#!/bin/bash

# ==============================================
# Full Production Build Script
# ==============================================
# Builds for both Android and iOS platforms
# ==============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_NAME="Npd"
BUILD_TYPE="${1:-debug}"

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}   ${APP_NAME} - Full Build Script${NC}"
echo -e "${BLUE}===============================================${NC}"
echo ""

print_step() {
    echo -e "${YELLOW}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Step 1: Install and build web app (shared step)
print_step "Installing dependencies..."
npm install
print_success "Dependencies installed"

print_step "Building web application..."
npm run build
print_success "Web app built"

# Step 2: Build Android
echo ""
echo -e "${BLUE}--- Building Android ---${NC}"

if [ ! -d "android" ]; then
    npx cap add android
fi
npx cap sync android

cd android
if [ "$BUILD_TYPE" = "release" ]; then
    ./gradlew assembleRelease
    print_success "Android Release APK built"
else
    ./gradlew assembleDebug
    print_success "Android Debug APK built"
fi
cd ..

# Step 3: Build iOS (only on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo ""
    echo -e "${BLUE}--- Building iOS ---${NC}"
    
    if [ ! -d "ios" ]; then
        npx cap add ios
    fi
    npx cap sync ios
    
    cd ios/App
    if [ -f "Podfile" ]; then
        pod install
    fi
    
    if [ "$BUILD_TYPE" = "release" ]; then
        xcodebuild -workspace App.xcworkspace \
            -scheme "App" \
            -configuration Release \
            -destination 'generic/platform=iOS' \
            -archivePath "build/${APP_NAME}.xcarchive" \
            archive
        print_success "iOS Release archive built"
    else
        xcodebuild -workspace App.xcworkspace \
            -scheme "App" \
            -configuration Debug \
            -destination 'platform=iOS Simulator,name=iPhone 15' \
            build
        print_success "iOS Debug build complete"
    fi
    cd ../..
else
    echo ""
    echo -e "${YELLOW}Skipping iOS build (requires macOS)${NC}"
fi

echo ""
echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}   All Builds Complete!${NC}"
echo -e "${GREEN}===============================================${NC}"
echo ""
echo "Output locations:"
echo "  Android: android/app/build/outputs/apk/${BUILD_TYPE}/"
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "  iOS: ios/App/build/"
fi
