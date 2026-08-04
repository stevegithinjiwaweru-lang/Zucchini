# Easybox Rider App - Quick Start Guide

## 🚀 For Developers: Build APK in 2 Steps

### Step 1: Automatic Build
```bash
cd riderapp
bash build-apk.sh
```
Select option `1` for EAS Cloud Build (recommended)

### Step 2: Download & Distribute
- Download link sent to email
- Share APK link with riders
- Or use QR code for easy access

**That's it!** ✅ APK ready for distribution in 5-10 minutes.

---

## 📱 For Riders: Install App

### Method 1: Direct Download Link
1. Click download link (or scan QR code)
2. Open downloaded file
3. Tap "Install"
4. Grant permissions (Location, Camera)
5. Open app and login

### Method 2: Via QR Code
1. Scan QR code with phone camera
2. Tap "Open in browser"
3. Tap download link
4. Follow Method 1 steps 2-5

### Method 3: USB Installation
1. Connect phone to computer via USB
2. Enable USB Debugging in phone settings
3. Run: `adb install easybox-rider-1.0.0.apk`
4. Open app and login

---

## ⚙️ Configuration (One-Time Setup)

### For Developers

```bash
# 1. Login to Expo
eas login

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your backend URL

# 4. Build APK
bash build-apk.sh
```

### For System Admins

Set environment variables in `.env`:
```env
# Backend API
EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com

# Location updates every 10 seconds
EXPO_PUBLIC_LOCATION_UPDATE_INTERVAL_MS=10000

# Enable real-time tracking
EXPO_PUBLIC_ENABLE_LOCATION_TRACKING=true
```

---

## 🎯 Key Features at a Glance

| Feature | How to Use |
|---------|-----------|
| **Accept Delivery** | Tap delivery → "Accept" button |
| **View Details** | Tap delivery to see customer info & location |
| **Navigate** | Tap address → Opens maps with directions |
| **Update Status** | Press next step button (e.g., "Picked Up") |
| **Share Location** | Automatic, real-time GPS tracking |
| **Proof Photo** | After delivery → Tap camera icon |
| **Mark Delivered** | Confirm delivery with photo/signature |

---

## 🔴 Troubleshooting

| Problem | Solution |
|---------|----------|
| **Won't install** | Uninstall old version first |
| **Can't login** | Check backend is running |
| **No location** | Enable location permissions in settings |
| **No orders appear** | Check dispatcher assigned you orders |
| **Updates not showing** | Force quit app and reopen |

---

## 📊 System Requirements

- ✅ Android 8.0+
- ✅ 2GB RAM minimum
- ✅ Internet connection
- ✅ GPS enabled
- ✅ Storage space for app (50-100MB)

---

## 📞 Getting Help

1. **In-App**: Open app menu → Help
2. **Email**: support@easybox.com
3. **Call**: 1-800-EASYBOX
4. **FAQ**: Check documentation in riderapp folder

---

## 🔄 Update Instructions

When new version available:

1. Download new APK
2. Uninstall old version (Settings → Apps)
3. Install new APK (follow install steps above)
4. Login again

**No data loss** - All saved data preserved!

---

## ✅ First Delivery Checklist

- [ ] App installed and logged in
- [ ] Can see assigned deliveries
- [ ] Location permission enabled
- [ ] Can tap delivery to view details
- [ ] Can accept delivery
- [ ] Can see navigation options
- [ ] Can update delivery status
- [ ] Received delivery completion confirmation

---

## 📋 Important Notes

- **Location tracking required** for real-time dispatch
- **Camera access needed** for proof of delivery photos
- **Internet always required** for order updates
- **Do not uninstall** during active deliveries
- **Keep phone charged** for all-day tracking
- **Enable background location** for best tracking

---

**Ready?** Download the APK and start delivering! 🚀
