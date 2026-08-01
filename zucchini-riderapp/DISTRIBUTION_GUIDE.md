# Easybox Rider App - Distribution Guide for Admins

Complete guide for building, hosting, and distributing the Easybox Rider APK to your delivery fleet.

---

## 📋 Distribution Checklist

- [ ] Build APK using `bash build-apk.sh`
- [ ] Test APK on physical device
- [ ] Create download link/portal
- [ ] Generate QR code
- [ ] Prepare installation instructions
- [ ] Communicate to riders
- [ ] Monitor installations
- [ ] Provide support

---

## 🏗️ Step 1: Build APK

### Method A: Automatic Build Script (Easiest)

```bash
bash build-apk.sh

# Select option 1 for EAS Cloud Build
# Wait 5-10 minutes
# Download link sent via email
```

### Method B: Manual EAS Command

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Build preview APK
eas build --platform android --profile preview

# Check build status
eas build:list --platform android

# Download when ready
eas build:download --id <BUILD_ID>
```

---

## ✅ Step 2: Test APK

Before distributing to riders, test thoroughly:

```bash
# Install on test device
adb install easybox-rider-1.0.0.apk

# Test checklist:
# - App launches without crashing
# - Can login with test credentials
# - Can see orders (if any assigned)
# - Location permission works
# - Camera permission works
# - Socket.io real-time updates work
# - Status updates save correctly
# - App doesn't drain battery excessively
```

---

## 🌐 Step 3: Host APK

### Option A: Simple File Hosting

```bash
# 1. Upload to web server
scp easybox-rider-1.0.0.apk user@server:/var/www/apks/

# 2. Create download link
https://yourcompany.com/apk/easybox-rider-1.0.0.apk

# 3. Share with riders via email/SMS
```

### Option B: Firebase App Distribution (Recommended)

```bash
# Setup Firebase (one-time)
npm install -g firebase-tools
firebase login
firebase init

# Distribute APK to testers
firebase app-distribution:distribute easybox-rider-1.0.0.apk \
  --app=1:123456789:android:abcdef1234567890 \
  --testers="rider1@company.com,rider2@company.com,rider3@company.com"

# Features:
# ✅ Automatic email notifications
# ✅ One-click install for testers
# ✅ Install tracking
# ✅ Feedback collection
# ✅ Version history
```

### Option C: Self-Hosted Admin Portal

Create a download portal for riders:

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Easybox Rider App Download</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 40px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        h1 { color: #333; }
        .version { color: #666; font-size: 14px; }
        .download-btn {
            background: #667eea;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 20px 0;
            transition: background 0.3s;
        }
        .download-btn:hover {
            background: #764ba2;
        }
        .qr-code {
            margin: 30px 0;
        }
        .qr-code img {
            width: 200px;
            height: 200px;
            border: 1px solid #ddd;
            padding: 10px;
        }
        .instructions {
            text-align: left;
            background: #f5f5f5;
            padding: 20px;
            border-radius: 5px;
            margin-top: 20px;
        }
        .instructions ol {
            margin: 10px 0;
            padding-left: 20px;
        }
        .instructions li {
            margin: 8px 0;
        }
        .support {
            margin-top: 30px;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📱 Easybox Rider App</h1>
        <p class="version">Version 1.0.0 • Released June 26, 2026</p>
        
        <a href="https://storage.company.com/apk/easybox-rider-1.0.0.apk" 
           class="download-btn">
            ⬇️ Download APK (45 MB)
        </a>
        
        <div class="qr-code">
            <p>Or scan QR code:</p>
            <img src="qr-code.png" alt="Download QR Code">
        </div>
        
        <div class="instructions">
            <h3>Installation Steps:</h3>
            <ol>
                <li>Tap download button or scan QR code</li>
                <li>Open the downloaded file (easybox-rider-*.apk)</li>
                <li>Tap "Install" button</li>
                <li>Grant requested permissions</li>
                <li>Tap "Open" to launch app</li>
                <li>Login with your rider credentials</li>
            </ol>
        </div>
        
        <div class="support">
            <p>📞 Need help? Email: support@easybox.com</p>
            <p>⚠️ Requires Android 8.0 or higher</p>
        </div>
    </div>
</body>
</html>
```

---

## 🎯 Step 4: Generate QR Code

### Automatic (with build script)
```bash
bash build-apk.sh
# Select option 1
# QR code auto-generated as build/apk/download-qr.png
```

### Manual
```bash
# Install qrencode
brew install qrencode        # macOS
sudo apt-get install qrencode  # Linux

# Generate QR code
qrencode -o qr-code.png "https://yourcompany.com/apk/easybox-rider-1.0.0.apk"

# Or use online tool: https://qr-code-generator.com/
```

---

## 📧 Step 5: Communicate to Riders

### Email Template

Subject: 📱 Download Easybox Rider App v1.0.0

```
Dear Delivery Team,

We're excited to announce the release of the new Easybox Rider App!

📥 DOWNLOAD
Visit: https://yourcompany.com/apk/download
Or scan: [QR CODE IMAGE]

✨ FEATURES
✅ Real-time order assignments
✅ Live location tracking
✅ Easy status updates
✅ Proof of delivery photos
✅ Works offline

📋 INSTALLATION
1. Click download link or scan QR code
2. Open downloaded file
3. Tap "Install"
4. Grant permissions when asked
5. Login with your credentials

🚀 FIRST STEPS
- Check your dashboard for assigned orders
- Accept orders as they come in
- Update status as you progress
- Take photos for proof of delivery
- Confirm delivery when complete

📞 NEED HELP?
Email: support@easybox.com
Phone: 1-800-EASYBOX
FAQ: https://help.easybox.com

Thank you for being part of Easybox!

Best regards,
Operations Team
```

### SMS Template

```
📱 Easybox Rider App v1.0.0 is here!

Download: https://bit.ly/easybox-rider
Or scan QR: [QR]

Features: Real-time orders, GPS tracking, proof photos.

Questions? Email: support@easybox.com
```

---

## 📊 Step 6: Monitor Installations

### Track Downloads

```bash
# If using Firebase
firebase app-distribution:list --app=<APP_ID>

# Shows:
# - Total downloads
# - Installation status per rider
# - Feedback/crash reports
```

### Check Active Users

```bash
# Monitor backend logs
tail -f logs/api.log | grep "rider-login"

# Track active sessions
SELECT COUNT(*) FROM sessions WHERE app_type='rider' AND active=true;
```

---

## 🔄 Step 7: Version Updates

### Rollout Process

```
Week 1: Release to 10% of riders
       Monitor for issues/feedback
       ↓
Week 2: Release to 50% of riders
       Continue monitoring
       ↓
Week 3: Release to 100% of riders
       Full production rollout
```

### Automated Update (Optional)

Configure in-app updates:
```javascript
// In app config
updates: {
  "url": "https://updates.yourdomain.com/easybox",
  "fallbackToCacheOnError": true
}
```

---

## 📈 Distribution Metrics

Track these metrics for each release:

| Metric | Target | How to Track |
|--------|--------|-------------|
| **Install Rate** | >95% in 2 weeks | Firebase/Admin panel |
| **Crash Rate** | <1% | Firebase Crashlytics |
| **Avg. Rating** | >4.5/5 | In-app feedback |
| **Active Users** | >80% of installed | Backend logs |
| **Session Duration** | >4 hours/day | Analytics |

---

## ⚠️ Troubleshooting Distribution

### Low Installation Rate

```bash
# 1. Check links work
curl -I https://yourcompany.com/apk/easybox-rider-1.0.0.apk

# 2. Send reminder emails
# 3. Provide USB installation option
# 4. Offer in-person installation help
```

### High Crash Rate

```bash
# 1. Check Firebase Crashlytics for error
# 2. Rollback to previous version
# 3. Build and release hotfix
# 4. Notify riders of update
```

### Compatibility Issues

```bash
# Ensure minimum Android version met
# Test on Android 8.0, 10.0, 12.0, 14.0

# If issues on specific version:
# 1. Document device/version
# 2. Build targeted fix
# 3. Release to affected riders first
```

---

## 🔐 Security Considerations

### APK Integrity

```bash
# Generate SHA-256 hash
sha256sum easybox-rider-1.0.0.apk

# Share hash with riders for verification
# Riders can verify: sha256sum downloaded_file.apk
```

### Secure Distribution

- ✅ Use HTTPS for downloads
- ✅ Set file permissions to 644 (readable, not writable)
- ✅ Store APKs on secure server
- ✅ Monitor for unauthorized distribution
- ✅ Set expiry date for old versions

### Signed APKs

APK is automatically signed by Expo for authenticity:
```bash
# Verify signature
jarsigner -verify -verbose easybox-rider-1.0.0.apk
```

---

## 📋 Release Notes Template

When distributing new version:

```markdown
# Easybox Rider App v1.1.0

**Release Date:** July 3, 2026

## ✨ What's New
- Improved location accuracy
- Faster order notifications
- Better offline support
- UI improvements

## 🐛 Bug Fixes
- Fixed crash when accepting delivery
- Fixed location permission issues
- Improved battery usage

## 📊 Performance
- 30% faster app launch
- 20% less battery drain
- Smoother animations

## 📱 Requirements
- Android 8.0+
- 50 MB storage
- Requires update from v1.0.0

## 🔄 Update Instructions
1. Download new APK
2. Tap to install
3. Grant permissions if prompted
4. Restart app

## 🆘 Support
Questions? Email: support@easybox.com
```

---

## ✅ Final Checklist

Before distribution:

- [ ] APK tested on multiple devices
- [ ] Version number updated
- [ ] Download link/QR code ready
- [ ] Email template prepared
- [ ] Support team briefed
- [ ] Monitoring configured
- [ ] Rollback plan documented
- [ ] Release notes written
- [ ] Riders notified
- [ ] Installation tracked

---

## 📞 Support & Escalation

**For Technical Issues:**
- Check logs: `adb logcat | grep easybox`
- Contact: dev-support@company.com

**For Distribution Issues:**
- Firebase support: https://firebase.google.com/support
- Expo support: https://expo.dev/support

**For Rider Support:**
- Create help desk tickets
- Provide installation videos
- Offer phone/in-person setup

---

**Ready to distribute?** Follow the checklist above and riders will be up and running! 🚀
