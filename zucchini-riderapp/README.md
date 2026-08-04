# Easybox Rider App

Professional React Native delivery rider application with real-time order management, location tracking, and proof of delivery capture.

## 📱 Features

✅ **Authentication & Login**
- Secure rider login with JWT
- Session management
- Auto-logout on inactivity

✅ **Order Management**
- Real-time order assignments
- Order details with customer info
- Delivery location maps
- Pickup & delivery instructions

✅ **Status Tracking**
- Accepted
- Arrived at Pickup
- Picked Up
- In Transit
- Delivered
- Delivery Failed (with reason)

✅ **Real-time Features**
- Socket.io live updates
- Instant order notifications
- Dispatch communication
- Location sharing

✅ **Location Services**
- GPS tracking
- Periodic location updates (10 second intervals)
- Map navigation integration
- Distance calculations

✅ **Proof of Delivery**
- Photo capture capability
- Digital signature (optional)
- Delivery confirmation
- Note attachments

✅ **Offline Support**
- Queue actions when offline
- Sync when reconnected
- Local data persistence

✅ **Performance**
- Optimized battery usage
- Efficient network calls
- Smooth animations
- Fast navigation

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| **Framework** | React Native 0.74 |
| **Bundler** | Expo 51 |
| **UI** | React Native Components |
| **Navigation** | React Navigation 6 |
| **State** | React Context + Hooks |
| **API** | Axios |
| **Real-time** | Socket.io |
| **Storage** | AsyncStorage |
| **Location** | Expo Location |
| **Camera** | Expo Camera |
| **Build** | EAS (Expo Application Services) |

---

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo Go app (for testing on device)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
# Edit .env with your backend URLs
# EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP:4000
# EXPO_PUBLIC_SOCKET_URL=http://YOUR_IP:4000
```

### Step 3: Run on Device/Emulator

#### Option A: Expo Go (Quick Testing)
```bash
npm start
# Scan QR code with Expo Go app
```

#### Option B: Android Emulator
```bash
npm run android
# Requires Android SDK/Emulator
```

#### Option C: Physical Device
```bash
npm start
# In terminal, press 'a' for Android
# Or scan QR code with Expo Go
```

---

## 🚀 Build APK for Distribution

### Easiest Method: EAS Cloud Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build preview APK
npm run build:android

# Or use interactive script
bash build-apk.sh
```

✅ APK ready in ~5-10 minutes  
✅ Download link sent via email  
✅ No local setup required

### Quick Build Commands

```bash
# Preview build (for testing)
npm run build:android

# Production build (for Play Store)
npm run build:android:production

# Download specific build
eas build:download --id <BUILD_ID>

# View all builds
eas build:list --platform android
```

---

## 📋 Project Structure

```
riderapp/
├── src/
│   ├── screens/          # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── DeliveriesScreen.tsx
│   │   ├── DeliveryDetailScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── components/       # Reusable components
│   │   └── StatusBadge.tsx
│   ├── api/              # API integration
│   │   ├── client.ts     # Axios instance
│   │   └── endpoints.ts  # API routes
│   ├── services/         # Business logic
│   │   ├── auth.service.ts
│   │   └── orders.service.ts
│   ├── navigation/       # Navigation setup
│   │   └── index.tsx
│   ├── context/          # State management
│   │   └── AuthContext.tsx
│   ├── theme/            # Design tokens
│   │   └── colors.ts
│   └── utils/            # Utilities
│       └── orderStatus.ts
├── App.tsx               # Root component
├── app.json              # Expo configuration
├── eas.json              # EAS build config
├── package.json          # Dependencies
├── .env.example          # Environment template
├── .env                  # Environment variables
├── APK_BUILD_GUIDE.md    # Detailed build guide
├── build-apk.sh          # Build automation script
└── README.md             # This file
```

---

## 🔧 API Configuration

Update `.env` with your backend URLs:

```env
# Local Development
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:4000
EXPO_PUBLIC_SOCKET_URL=http://192.168.1.100:4000

# Docker/LAN
EXPO_PUBLIC_API_BASE_URL=http://10.0.0.5:4000
EXPO_PUBLIC_SOCKET_URL=http://10.0.0.5:4000

# Production
EXPO_PUBLIC_API_BASE_URL=https://api.easybox.com
EXPO_PUBLIC_SOCKET_URL=https://api.easybox.com
```

> **Note**: Use your local machine IP (not localhost) for testing on physical devices

---

## 📡 Real-time Events

### Listening for Updates

```typescript
import { socket } from '../services/socket';

useEffect(() => {
  socket.on('orderAssigned', (order) => {
    // New delivery assigned
    setOrder(order);
    playNotificationSound();
  });

  socket.on('orderUpdated', (order) => {
    // Order status changed
    setOrder(order);
  });

  return () => {
    socket.off('orderAssigned');
    socket.off('orderUpdated');
  };
}, []);
```

### Sending Updates

```typescript
// Update delivery status
socket.emit('updateOrderStatus', {
  orderId: '123',
  status: 'DELIVERED'
});

// Share location
socket.emit('updateRiderLocation', {
  riderId: 'rider-1',
  latitude: 51.5074,
  longitude: -0.1278
});
```

---

## 📊 API Endpoints

### Authentication
- `POST /auth/login` - Rider login
- `POST /auth/refresh` - Refresh JWT token

### Orders
- `GET /orders` - Get assigned orders
- `GET /orders/:id` - Get order details
- `PUT /orders/:id/status` - Update order status

### Riders
- `GET /riders/:id` - Get rider profile
- `PUT /riders/:id/location` - Update location

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Login with valid credentials
- [ ] View list of assigned deliveries
- [ ] Tap delivery to view details
- [ ] Accept delivery (status → ACCEPTED)
- [ ] View map and navigation
- [ ] Arrive at pickup (status → ARRIVED_AT_PICKUP)
- [ ] Pick up order (status → PICKED_UP)
- [ ] See in transit indicator
- [ ] Arrive at delivery location
- [ ] Capture proof photo
- [ ] Mark delivered (status → DELIVERED)
- [ ] Receive confirmation
- [ ] Check real-time updates
- [ ] Test offline and online switch
- [ ] Verify battery impact
- [ ] Check data usage

---

## 🐛 Troubleshooting

### Can't Connect to Backend

```bash
# 1. Get your local machine IP
ifconfig getifaddr en0     # macOS
hostname -I                 # Linux
ipconfig                    # Windows

# 2. Update .env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP:4000

# 3. Verify backend is running
curl http://YOUR_IP:4000/health

# 4. Restart Expo
npm start
```

### Socket.io Connection Issues

```bash
# Check connection in developer console
localStorage.debug = '*'

# Verify CORS settings on backend
# Should include your frontend URL
```

### Location Permission Denied

1. Settings → Apps → Easybox Rider → Permissions
2. Enable Location: "Allow all the time"
3. Restart app

### APK Won't Install

```bash
# Uninstall previous version
adb uninstall com.easybox.rider

# Install new APK
adb install easybox-rider-1.0.0.apk
```

---

## 📈 Performance Optimization

### Battery Usage
- Location updates: 10 second intervals (configurable)
- Socket.io reconnection: Automatic with backoff
- Background tasks: Minimal when app backgrounded

### Network
- Request timeout: 15 seconds
- Auto-retry on network errors
- Data compression enabled
- Local caching for order details

### UI
- Lazy loading of screens
- Optimized re-renders with React.memo
- Efficient list rendering
- Image optimization

---

## 🔐 Security

### Encryption
- JWT token storage in AsyncStorage
- HTTPS in production
- Socket.io with credentials enabled

### Permissions
- Location: Required for delivery tracking
- Camera: Required for proof photos
- Internet: Required for all operations

---

## 🚀 Deployment Checklist

Before distributing to riders:

### Development
- [ ] All features tested locally
- [ ] No console errors or warnings
- [ ] Responsive on different screen sizes
- [ ] Offline mode working

### Build
- [ ] Version bumped in package.json & app.json
- [ ] APK built successfully
- [ ] File size < 100 MB
- [ ] Build succeeds without warnings

### Testing
- [ ] Tested on physical device
- [ ] Tested on multiple Android versions
- [ ] Battery usage acceptable
- [ ] No memory leaks
- [ ] Location tracking reliable
- [ ] Real-time updates working

### Distribution
- [ ] Release notes prepared
- [ ] Download link working
- [ ] QR code generated
- [ ] Support docs updated
- [ ] Installation instructions clear

---

## 📱 Device Requirements

- **Minimum**: Android 8.0 (API 26)
- **Recommended**: Android 10.0+ (API 29+)
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 50-100 MB free space
- **Permissions**: Location, Camera, Internet

---

## 🔄 Update Process for Riders

1. **Download**: Open link or scan QR code
2. **Install**: Tap downloaded APK file
3. **Permissions**: Grant location/camera access
4. **Login**: Use rider credentials
5. **Verify**: Test with first delivery

---

## 📞 Support

**For Developers:**
- API Documentation: Backend README
- Build Issues: Check APK_BUILD_GUIDE.md
- Socket.io Events: Check backend src/socket.ts

**For Riders:**
- In-app Support: Help screen
- Email: support@easybox.com
- Phone: 1-800-EASYBOX

---

## 📝 Version History

### v1.0.0 (June 26, 2026)
- ✅ Initial release
- ✅ Core delivery features
- ✅ Real-time updates
- ✅ Location tracking
- ✅ Proof of delivery
- ✅ Offline support

---

## 📄 License

© 2026 Easybox Inc. All rights reserved.

---

**Ready to build and distribute? Run:**
```bash
bash build-apk.sh
```

**Need help? See:**
- APK_BUILD_GUIDE.md - Detailed build instructions
- app.json - Expo configuration
- .env.example - Environment setup
