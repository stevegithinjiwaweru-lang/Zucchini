# Easybox Rider App - APK Build & Distribution Guide

Complete guide for building, testing, and distributing the Easybox Rider App as an APK for Android devices.

## 📱 Quick Overview

| Method | Build Time | Ease | Cost | Best For |
|--------|-----------|------|------|----------|
| **EAS Cloud Build** | 5-10 min | Easy | Free (preview) | Production apps |
| **Local Build (Prebuild)** | 15-30 min | Medium | Free | Testing, custom builds |
| **Android Studio** | 20-40 min | Hard | Free | Development, debugging |

---

## 🚀 Method 1: EAS Cloud Build (Recommended)

This is the easiest and most reliable way to build APKs for distribution.

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo account (free at https://expo.dev)
- EAS CLI installed

### Step 1: Setup EAS CLI

```bash
npm install -g eas-cli
eas login
# Login with your Expo credentials
```

### Step 2: Configure Project

```bash
cd riderapp
eas build:configure

# This will:
# - Create eas.json
# - Set up project in Expo cloud
# - Configure Android build settings
```

### Step 3: Build APK

#### For Testing (Preview Build)
```bash
eas build --platform android --profile preview

# Returns:
# Build ID: abc123...
# Status: Building...
# Check status at: https://expo.dev/accounts/your-account/builds/abc123
```

Build completes in 5-10 minutes. APK link provided via email/dashboard.

#### For Production
```bash
eas build --platform android --profile production

# Creates signed, release-optimized APK
# Suitable for Play Store or direct distribution
```

### Step 4: Download APK

Option A: Via Email
- Download link sent to your email
- Valid for 30 days

Option B: Via Dashboard
```bash
eas build:list --platform android
# Shows all builds
# Copy download link
```

Option C: Via CLI
```bash
eas build:download --id <BUILD_ID>
# Downloads APK to current directory
```

---

## 🛠️ Method 2: Local Build with Expo Prebuild

For developers who want to build locally on their machine.

### Prerequisites
- Node.js 18+
- Android SDK installed
- Java Development Kit (JDK) 11+
- 10+ GB free disk space

### Step 1: Install Dependencies

```bash
cd riderapp
npm install
```

### Step 2: Configure Android Environment

#### macOS/Linux
```bash
# Install Android SDK via Homebrew
brew install android-sdk

# Set environment variables
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/emulator
export PATH=$PATH:$ANDROID_SDK_ROOT/tools
export PATH=$PATH:$ANDROID_SDK_ROOT/tools/bin
export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools
```

#### Windows
```bash
# Install Android SDK
# Download from: https://developer.android.com/studio/releases/platform-tools

# Set environment variables (Settings > Environment Variables):
ANDROID_SDK_ROOT=C:\Users\YourUsername\AppData\Local\Android\sdk
JAVA_HOME=C:\Program Files\Android\Android Studio\jre
```

### Step 3: Run Prebuild

```bash
npx expo prebuild --clean
# Generates Android native project
```

### Step 4: Build APK

```bash
cd android
./gradlew assembleRelease
# or
./gradlew assembleDebug

# APK created at:
# app/build/outputs/apk/release/app-release.apk
# app/build/outputs/apk/debug/app-debug.apk
```

---

## 🐳 Method 3: Docker Build

Build APK in isolated environment using Docker.

### Prerequisites
- Docker installed and running
- 5+ GB free disk space

### Step 1: Create Dockerfile

```dockerfile
FROM node:18-bullseye

# Install Android SDK and tools
RUN apt-get update && apt-get install -y \
  default-jdk \
  wget \
  unzip

# Install Android SDK
RUN mkdir -p /android-sdk && \
  wget -O /android-sdk/sdk-tools.zip \
  https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip && \
  unzip /android-sdk/sdk-tools.zip -d /android-sdk && \
  rm /android-sdk/sdk-tools.zip

ENV ANDROID_SDK_ROOT=/android-sdk
ENV PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/tools/bin:$ANDROID_SDK_ROOT/platform-tools

# Install SDK packages
RUN yes | sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"

WORKDIR /app

COPY . .
RUN npm install && npx expo prebuild --clean

WORKDIR /app/android
RUN ./gradlew assembleRelease

CMD ["cat", "app/build/outputs/apk/release/app-release.apk"]
```

### Step 2: Build Docker Image

```bash
docker build -t easybox-rider-builder .
```

### Step 3: Build APK

```bash
docker run --rm -v $(pwd)/output:/app/android/app/build/outputs \
  easybox-rider-builder

# APK available in ./output/
```

---

## 📦 APK Distribution Methods

### 1. Direct Download Link

```bash
# Host APK on your server
scp riderapp-1.0.0.apk user@yourserver:/var/www/apks/

# Create download page with QR code
# https://yourserver.com/riderapp-1.0.0.apk
```

### 2. Firebase App Distribution

```bash
# Setup Firebase project
firebase init hosting
firebase init app-distribution

# Upload APK
firebase app-distribution:distribute riderapp-1.0.0.apk \
  --app=1:123456789:android:abcdef \
  --testers="rider1@company.com,rider2@company.com"

# Testers receive email with download link
```

### 3. Google Play Store

```bash
# Create Google Play Developer account ($25)
# Setup app signing

# Upload APK
eas submit --platform android
# Interactive setup for Play Store submission
```

### 4. Self-Hosted Distribution Portal

Create a portal for riders to download updates:

```html
<div class="app-download">
  <h2>Easybox Rider App</h2>
  <p>Version: 1.0.0</p>
  <p>Size: 45 MB</p>
  <p>Released: June 26, 2026</p>
  
  <a href="https://storage.company.com/apk/easybox-rider-1.0.0.apk" 
     class="download-btn">
    Download APK
  </a>
  
  <p>
    <a href="https://storage.company.com/apk/qr-code.png">
      <img src="qr-code.png" alt="QR Code" width="150">
    </a>
  </p>
  
  <p>Installation: Open file → Install → Done!</p>
</div>
```

---

## 🔄 Update & Release Workflow

### Version Numbering

```json
{
  "version": "MAJOR.MINOR.PATCH",
  "examples": [
    "1.0.0 - Initial release",
    "1.1.0 - New feature",
    "1.0.1 - Bug fix",
    "2.0.0 - Major update"
  ]
}
```

### Update Checklist

- [ ] Update version in `package.json`
- [ ] Update version in `app.json`
- [ ] Update `CHANGELOG.md`
- [ ] Test on physical device
- [ ] Build APK
- [ ] Test APK on multiple devices
- [ ] Create release notes
- [ ] Upload to distribution channel
- [ ] Notify riders

### Build Version History

```bash
# View all builds
eas build:list --platform android

# View specific build details
eas build:view --id <BUILD_ID>

# Manage builds
eas build:cancel <BUILD_ID>
```

---

## 🧪 Testing APK Before Distribution

### Installation on Test Device

```bash
# Via ADB (Android Debug Bridge)
adb install riderapp-1.0.0.apk

# Via USB
1. Enable Developer Options: Settings → About → Tap Build Number 7x
2. Enable USB Debugging: Settings → Developer Options → USB Debugging
3. Connect via USB
4. adb install riderapp-1.0.0.apk
```

### Testing Checklist

- [ ] App launches without crashing
- [ ] Login works correctly
- [ ] Can see assigned deliveries
- [ ] Location tracking works
- [ ] Status updates function
- [ ] Socket.io real-time updates work
- [ ] Camera/photo capture works
- [ ] Navigation to pickup/delivery works
- [ ] Offline mode functions
- [ ] Network re-connection works
- [ ] Battery drain is acceptable
- [ ] App size is reasonable

### Performance Metrics

```bash
# Monitor app performance
adb shell am start -W com.easybox.rider/.MainActivity
# Measure startup time

# Check memory usage
adb shell dumpsys meminfo com.easybox.rider

# Monitor network
adb shell dumpsys connectivity | grep "DnsResolver"
```

---

## 🔐 Security & Signing

### App Signing Certificate

Generated automatically by EAS for preview builds.

For production/Play Store:

```bash
# Create keystore
keytool -genkey -v -keystore easybox-rider.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias easybox-rider

# Configure in eas.json
{
  "android": {
    "keystore": {
      "keystorePath": "easybox-rider.keystore",
      "keystorePassword": "YOUR_KEYSTORE_PASSWORD",
      "keyAlias": "easybox-rider",
      "keyPassword": "YOUR_KEY_PASSWORD"
    }
  }
}
```

### Permission Safety

The app requests these permissions:
- **Location**: For delivery tracking
- **Camera**: For proof of delivery
- **Internet**: For API communication
- **Background Location**: For tracking when app minimized

All are necessary for functionality and clearly explained in app descriptions.

---

## 📊 Distribution Analytics

Track APK usage:

```bash
# Setup Google Analytics in app
# In src/utils/analytics.ts

import { Analytics } from "@react-native-google-analytics-bridge";

Analytics.setTrackerId("UA-XXXXXXXXX-1");
Analytics.trackScreenView("DeliveriesScreen");
Analytics.trackEvent("order_accepted");
```

### Monitoring

- APK downloads
- Active installations
- Crash reports
- Performance metrics
- User engagement

Via: Google Play Console or Firebase Console

---

## ❌ Troubleshooting

### Build Fails on EAS

```bash
# Clear cache and rebuild
eas build --platform android --profile preview --clear

# View build logs
eas build:log --id <BUILD_ID>
```

### Local Build Gradle Errors

```bash
# Clear gradle cache
./gradlew clean

# Rebuild
./gradlew assembleRelease -x lint

# Update gradle wrapper
./gradlew wrapper --gradle-version latest
```

### APK Won't Install

```bash
# Check compatibility
adb shell getprop ro.build.version.release  # Android version

# Try clearning app data first
adb shell pm clear com.easybox.rider

# Uninstall and reinstall
adb uninstall com.easybox.rider
adb install riderapp-1.0.0.apk
```

### App Crashes on Startup

1. Check logs: `adb logcat | grep easybox`
2. Verify .env configuration
3. Check backend connectivity
4. Review console errors in Expo CLI

---

## 📋 Release Checklist

### Pre-Release
- [ ] All features implemented
- [ ] Unit tests passing
- [ ] Manual testing completed
- [ ] No critical bugs
- [ ] Version bumped
- [ ] CHANGELOG updated
- [ ] README updated

### Build Phase
- [ ] Build succeeds without warnings
- [ ] APK downloaded successfully
- [ ] File size acceptable (<100 MB)
- [ ] App installs on test device
- [ ] All permissions working

### Pre-Distribution
- [ ] Beta testing complete
- [ ] Release notes prepared
- [ ] Download links ready
- [ ] Support docs updated
- [ ] Communication to riders prepared

### Post-Distribution
- [ ] Monitor for crash reports
- [ ] Check user feedback
- [ ] Track download metrics
- [ ] Document issues
- [ ] Plan next release

---

## 📞 Support & Troubleshooting

**Having issues?**

1. Check logs: `adb logcat`
2. Review EAS documentation: https://docs.expo.dev/build/
3. Check community: https://forums.expo.dev/
4. Contact support: support@expo.dev

---

**Last Updated**: June 26, 2026  
**Status**: Ready for Production Distribution
