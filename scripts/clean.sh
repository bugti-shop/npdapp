#!/bin/bash

# ==============================================
# Clean Build Script
# ==============================================
# Cleans all build artifacts and caches
# ==============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Cleaning build artifacts...${NC}"

# Clean web build
if [ -d "dist" ]; then
    rm -rf dist
    echo "  ✓ Removed dist/"
fi

# Clean node_modules (optional)
read -p "Remove node_modules? (y/n): " remove_nm
if [ "$remove_nm" = "y" ] || [ "$remove_nm" = "Y" ]; then
    rm -rf node_modules
    echo "  ✓ Removed node_modules/"
fi

# Clean Android
if [ -d "android" ]; then
    cd android
    if [ -f "gradlew" ]; then
        ./gradlew clean
        echo "  ✓ Cleaned Android build"
    fi
    cd ..
    
    read -p "Remove entire android folder? (y/n): " remove_android
    if [ "$remove_android" = "y" ] || [ "$remove_android" = "Y" ]; then
        rm -rf android
        echo "  ✓ Removed android/"
    fi
fi

# Clean iOS
if [ -d "ios" ]; then
    cd ios/App
    if [ -d "build" ]; then
        rm -rf build
        echo "  ✓ Removed iOS build/"
    fi
    if [ -d "Pods" ]; then
        rm -rf Pods
        echo "  ✓ Removed Pods/"
    fi
    cd ../..
    
    read -p "Remove entire ios folder? (y/n): " remove_ios
    if [ "$remove_ios" = "y" ] || [ "$remove_ios" = "Y" ]; then
        rm -rf ios
        echo "  ✓ Removed ios/"
    fi
fi

echo ""
echo -e "${GREEN}Clean complete!${NC}"
echo ""
echo "To rebuild:"
echo "  ./scripts/build-android.sh   # For Android"
echo "  ./scripts/build-ios.sh       # For iOS (macOS only)"
echo "  ./scripts/build-all.sh       # For both platforms"
