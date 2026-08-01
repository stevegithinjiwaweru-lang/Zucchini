#!/bin/bash

# Easybox Rider App - APK Build Script
# Automates the APK building process

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_NAME="Easybox Rider"
APP_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
BUILD_DIR="build"
APK_DIR="$BUILD_DIR/apk"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}$APP_NAME - APK Build Script${NC}"
echo -e "${BLUE}Version: $APP_VERSION${NC}"
echo -e "${BLUE}================================${NC}"

# Function to print section headers
print_header() {
    echo -e "\n${YELLOW}$1${NC}"
    echo -e "${YELLOW}$(printf '%0.s=' {1..50})${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}✗ Node.js not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js $(node -v)${NC}"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}✗ npm not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ npm $(npm -v)${NC}"
    
    # Check if eas-cli is installed
    if ! command -v eas &> /dev/null; then
        echo -e "${YELLOW}⚠ EAS CLI not found. Installing...${NC}"
        npm install -g eas-cli
    fi
    echo -e "${GREEN}✓ eas-cli installed${NC}"
    
    # Check if logged into EAS
    if [ ! -f ~/.eas-cli/state.json ]; then
        echo -e "${YELLOW}⚠ Not logged into EAS. Please run: eas login${NC}"
        eas login
    fi
    echo -e "${GREEN}✓ EAS login verified${NC}"
}

# Function to install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    if [ ! -d "node_modules" ]; then
        npm install
        echo -e "${GREEN}✓ Dependencies installed${NC}"
    else
        echo -e "${GREEN}✓ Dependencies already installed${NC}"
    fi
}

# Function to build APK via EAS
build_apk_eas() {
    local profile=$1
    print_header "Building APK via EAS ($profile)"
    
    echo -e "Starting EAS build for Android..."
    
    if [ "$profile" == "production" ]; then
        eas build --platform android --profile production
    else
        eas build --platform android --profile preview
    fi
    
    echo -e "${GREEN}✓ Build complete!${NC}"
    echo -e "${YELLOW}Check your build status at: https://expo.dev/${NC}"
}

# Function to build APK locally
build_apk_local() {
    print_header "Building APK Locally with Prebuild"
    
    # Check Android SDK
    if [ -z "$ANDROID_SDK_ROOT" ]; then
        echo -e "${RED}✗ ANDROID_SDK_ROOT not set${NC}"
        echo -e "Please set: export ANDROID_SDK_ROOT=\$HOME/Library/Android/sdk"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Android SDK found: $ANDROID_SDK_ROOT${NC}"
    
    # Run prebuild
    echo -e "\nRunning prebuild..."
    npx expo prebuild --clean
    
    # Build APK
    echo -e "\nBuilding release APK..."
    cd android
    ./gradlew assembleRelease
    
    # Copy APK to output directory
    mkdir -p ../$APK_DIR
    cp app/build/outputs/apk/release/app-release.apk ../$APK_DIR/easybox-rider-$APP_VERSION.apk
    
    cd ..
    echo -e "${GREEN}✓ APK built successfully!${NC}"
    echo -e "Location: $APK_DIR/easybox-rider-$APP_VERSION.apk"
}

# Function to generate QR code
generate_qr() {
    local url=$1
    print_header "Generating QR Code"
    
    if ! command -v qrencode &> /dev/null; then
        echo -e "${YELLOW}⚠ qrencode not found. Skipping QR generation.${NC}"
        echo -e "Install with: brew install qrencode (macOS) or apt-get install qrencode (Linux)"
        return
    fi
    
    mkdir -p $APK_DIR
    qrencode -o $APK_DIR/download-qr.png "$url"
    echo -e "${GREEN}✓ QR code generated: $APK_DIR/download-qr.png${NC}"
}

# Function to create release notes
create_release_notes() {
    print_header "Creating Release Notes"
    
    local release_file="$BUILD_DIR/RELEASE_NOTES_$APP_VERSION.md"
    mkdir -p $BUILD_DIR
    
    cat > "$release_file" << EOF
# Easybox Rider App v$APP_VERSION Release Notes

## Build Date
$(date)

## Changes
- Bug fixes and improvements
- Enhanced location tracking
- Improved real-time updates
- Better offline handling

## Installation
1. Download APK: easybox-rider-$APP_VERSION.apk
2. Open downloaded file
3. Tap "Install"
4. Grant requested permissions
5. Launch app and login

## System Requirements
- Android 8.0 or higher
- Minimum 2GB RAM
- Internet connection required
- Location services required

## Support
For issues, contact: support@easybox.com

---
Generated: $(date)
EOF
    
    echo -e "${GREEN}✓ Release notes created: $release_file${NC}"
}

# Function to upload to storage
upload_apk() {
    print_header "Upload Instructions"
    
    echo -e "${YELLOW}To distribute the APK:${NC}"
    echo ""
    echo "1. Direct Download:"
    echo "   scp $APK_DIR/easybox-rider-$APP_VERSION.apk user@server:/var/www/apks/"
    echo ""
    echo "2. Firebase App Distribution:"
    echo "   firebase app-distribution:distribute $APK_DIR/easybox-rider-$APP_VERSION.apk \\"
    echo "     --app=FIREBASE_APP_ID \\"
    echo "     --testers=\"email@company.com\""
    echo ""
    echo "3. Google Play Store:"
    echo "   eas submit --platform android"
    echo ""
    echo "4. Self-hosted with QR Code:"
    echo "   Share QR code from: $APK_DIR/download-qr.png"
}

# Function to test APK
test_apk() {
    print_header "APK Testing Instructions"
    
    echo -e "${YELLOW}To test on physical device:${NC}"
    echo ""
    echo "1. Enable USB Debugging:"
    echo "   Settings → About Phone → Tap Build Number 7 times"
    echo "   Settings → Developer Options → USB Debugging → Enable"
    echo ""
    echo "2. Connect device via USB"
    echo ""
    echo "3. Install APK:"
    echo "   adb install $APK_DIR/easybox-rider-$APP_VERSION.apk"
    echo ""
    echo "4. Launch app and test:"
    echo "   - Login functionality"
    echo "   - View deliveries"
    echo "   - Accept delivery"
    echo "   - Update location"
    echo "   - Update status"
    echo "   - Complete delivery"
    echo "   - Check real-time updates"
}

# Main menu
show_menu() {
    echo -e "\n${BLUE}Select build method:${NC}"
    echo "1) EAS Cloud Build (Recommended - Easiest)"
    echo "2) Local Build (Fast - Requires Android SDK)"
    echo "3) EAS Production Build (For Play Store)"
    echo "4) Exit"
    echo ""
    read -p "Enter choice [1-4]: " choice
    
    case $choice in
        1)
            check_prerequisites
            install_dependencies
            build_apk_eas "preview"
            create_release_notes
            upload_apk
            test_apk
            ;;
        2)
            check_prerequisites
            install_dependencies
            build_apk_local
            create_release_notes
            upload_apk
            test_apk
            ;;
        3)
            check_prerequisites
            install_dependencies
            build_apk_eas "production"
            create_release_notes
            upload_apk
            ;;
        4)
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            show_menu
            ;;
    esac
}

# Run main menu
show_menu

echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}Build process complete!${NC}"
echo -e "${GREEN}================================${NC}"
