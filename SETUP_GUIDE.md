# 🚀 SoshoPay Mock API Server - Complete Setup Guide

This guide will walk you through setting up and using the SoshoPay Mock API Server for mobile application testing.

## 📑 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Starting the Server](#starting-the-server)
4. [Configuring Your Mobile App](#configuring-your-mobile-app)
5. [Testing the API](#testing-the-api)
6. [Common Issues & Solutions](#common-issues--solutions)
7. [Testing Workflows](#testing-workflows)

---

## Prerequisites

### Required Software

1. **Node.js** (v14.0.0 or higher)
    - Download from: https://nodejs.org/
    - Verify installation:
      ```bash
      node --version
      npm --version
      ```

2. **Code Editor** (Optional but recommended)
    - VS Code, Sublime Text, or any editor of your choice

3. **API Testing Tool** (Optional)
    - Postman: https://www.postman.com/downloads/
    - Or use cURL from command line

---

## Installation

### Step 1: Create Project Directory

```bash
mkdir soshopay-mock-api
cd soshopay-mock-api
```

### Step 2: Create Required Files

Create the following files in your project directory:

1. **package.json**
2. **server.js**
3. **db.json**

Copy the contents from the provided artifacts into each file.

### Step 3: Install Dependencies

```bash
npm install
```

This will install:
- `json-server` (v0.17.4) - The mock server
- `nodemon` (v3.0.1) - Development dependency for auto-reload

### Step 4: Verify Installation

Your directory structure should look like this:

```
soshopay-mock-api/
├── node_modules/
├── db.json
├── package.json
├── server.js
├── test-api.sh (optional)
└── README.md (optional)
```

---

## Starting the Server

### Option 1: Standard Start (Production Mode)

```bash
npm start
```

### Option 2: Development Mode (Auto-reload)

```bash
npm run dev
```

### Expected Output

You should see:

```
===========================================
🚀 SoshoPay Mock API Server is running!
📡 Server: http://localhost:8080
📚 Resources: http://localhost:8080/api
===========================================

📋 Available Endpoints:
   Auth: POST /api/mobile/client/login
   Auth: POST /api/mobile/client/set-pin
   Auth: POST /api/mobile/client/refresh-token
   Profile: GET /api/mobile/client/me
   Loans: GET /api/mobile/client/loans
   Payments: GET /api/payments/dashboard
   Notifications: GET /api/notifications

✨ Ready for testing!
```

### Verify Server is Running

Open your browser and navigate to:
- http://localhost:8080

You should see the json-server homepage.

---

## Configuring Your Mobile App

### Android Configuration

#### For Android Emulator

1. **Update your API base URL to:**
   ```kotlin
   const val BASE_URL = "http://10.0.2.2:8080/api"
   ```

2. **Why `10.0.2.2`?**
    - Android Emulator uses `10.0.2.2` to refer to your host machine's localhost
    - `localhost` or `127.0.0.1` refers to the emulator itself, not your machine

#### For Physical Android Device

1. **Find your machine's local IP address:**

   **Windows:**
   ```cmd
   ipconfig
   ```
   Look for "IPv4 Address" under your active network adapter

   **macOS/Linux:**
   ```bash
   ifconfig | grep "inet "
   # or
   ip addr show
   ```

2. **Update your API base URL:**
   ```kotlin
   const val BASE_URL = "http://192.168.1.XXX:8080/api"
   ```
   Replace `XXX` with your machine's IP address

3. **Ensure both devices are on the same network**

4. **Allow firewall access** (if prompted)

#### Using the Provided AppConfig.kt

1. Copy `AppConfig.kt` to your shared module:
   ```
   shared/src/commonMain/kotlin/com/soshopay/shared/config/AppConfig.kt
   ```

2. Update `MOCK_BASE_URL_PHYSICAL_DEVICE` with your IP:
   ```kotlin
   private const val MOCK_BASE_URL_PHYSICAL_DEVICE = "http://192.168.1.100:8080"
   ```

3. Set `USE_MOCK_SERVER = true`:
   ```kotlin
   const val USE_MOCK_SERVER = true
   ```

4. Use in your API client:
   ```kotlin
   val apiUrl = AppConfig.getApiUrl()
   ```

### iOS Configuration

#### For iOS Simulator

```swift
let baseURL = "http://localhost:8080/api"
// or
let baseURL = "http://127.0.0.1:8080/api"
```

#### For Physical iOS Device

Use your machine's local IP (same as Android physical device):
```swift
let baseURL = "http://192.168.1.XXX:8080/api"
```

---

## Testing the API

### Method 1: Using cURL (Command Line)

#### Test Login
```bash
curl -X POST http://localhost:8080/api/mobile/client/login \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: test-device" \
  -d '{
    "mobile": "0771234567",
    "pin": "1234"
  }'
```

#### Test Get Profile (After Login)
```bash
curl -X GET http://localhost:8080/api/mobile/client/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Method 2: Using the Test Script

1. **Make the script executable:**
   ```bash
   chmod +x test-api.sh
   ```

2. **Run the tests:**
   ```bash
   ./test-api.sh
   ```

3. **View results:**
   The script will test all endpoints and show pass/fail status

### Method 3: Using Postman

1. **Import the collection:**
    - Open Postman
    - Click "Import"
    - Select `SoshoPay-Mock-API.postman_collection.json`

2. **Set up environment variables:**
    - Create a new environment in Postman
    - Add variable: `base_url` = `http://localhost:8080`

3. **Run the collection:**
    - Navigate to the "Authentication" folder
    - Run "Login - User 1"
    - The token will be automatically saved
    - Run other requests in order

---

## Common Issues & Solutions

### Issue 1: Port 8080 Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::8080
```

**Solution:**

**Option A: Kill the process using port 8080**
```bash
# Find process
lsof -i :8080

# Kill it
kill -9 <PID>
```

**Option B: Change the port**
Edit `server.js`:
```javascript
const PORT = 3000; // Use a different port
```

### Issue 2: Cannot Connect from Android Emulator

**Error:**
```
Failed to connect to localhost/127.0.0.1:8080
```

**Solution:**
- Use `10.0.2.2:8080` instead of `localhost:8080`
- Verify the mock server is running on your host machine

### Issue 3: Cannot Connect from Physical Device

**Checklist:**
- ✅ Both devices on the same WiFi network
- ✅ Using correct IP address (not 127.0.0.1)
- ✅ Firewall allows connections on port 8080
- ✅ Mock server is running

**Test connectivity:**
```bash
# From your phone's browser, visit:
http://YOUR_IP:8080
```

### Issue 4: 401 Unauthorized on Protected Endpoints

**Cause:**
Missing or invalid authorization token

**Solution:**
1. Login first to get a token
2. Include the header: `Authorization: Bearer YOUR_TOKEN`
3. Ensure token format is correct (starts with "Bearer ")

### Issue 5: Network Delay Too Long

**Solution:**
Edit `server.js` to reduce delay:
```javascript
server.use((req, res, next) => {
  setTimeout(next, 100); // Reduce from 300-1000ms to 100ms
});
```

---

## Testing Workflows

### Workflow 1: Complete Authentication Flow

```bash
# 1. Login
curl -X POST http://localhost:8080/api/mobile/client/login \
  -H "Content-Type: application/json" \
  -d '{"mobile":"0771234567","pin":"1234"}'

# Save the access_token from response

# 2. Get User Profile
curl -X GET http://localhost:8080/api/mobile/client/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Update PIN
curl -X POST http://localhost:8080/api/mobile/client/pin \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_pin":"1234",
    "new_pin":"5678",
    "confirm_pin":"5678"
  }'

# 4. Logout
curl -X POST http://localhost:8080/api/mobile/client/logout \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Workflow 2: View Loans and Make Payment

```bash
# 1. Login and get token (as above)

# 2. Get all loans
curl -X GET http://localhost:8080/api/mobile/client/loans \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Get payment dashboard
curl -X GET http://localhost:8080/api/payments/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Process payment
curl -X POST http://localhost:8080/api/payments/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "loan_id":"LOAN001",
    "amount":575.00,
    "payment_method":"ecocash",
    "phone_number":"0771234567"
  }'

# Save the payment_id from response

# 5. Check payment status
curl -X GET "http://localhost:8080/api/payments/PAYMENT_ID/status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Workflow 3: Notification Management

```bash
# 1. Get unread notifications
curl -X GET "http://localhost:8080/api/notifications?filter=unread" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Get unread count
curl -X GET http://localhost:8080/api/notifications/unread/count \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Mark notification as read
curl -X PUT http://localhost:8080/api/notifications/NOTIF001/read \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Mark all as read
curl -X PUT http://localhost:8080/api/notifications/mark-all-read \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Mock Users for Testing

### User 1 (Tinashe Moyo)
- **Mobile:** 0771234567
- **PIN:** 1234
- **Loans:** 2 (1 active cash, 1 settled paygo)
- **Outstanding:** $2,875

### User 2 (Rumbidzai Ncube)
- **Mobile:** 0772345678
- **PIN:** 5678
- **Loans:** 2 (1 active cash, 1 settled paygo)
- **Outstanding:** $1,180

---

## Next Steps

1. ✅ **Start the mock server**
2. ✅ **Configure your mobile app**
3. ✅ **Test authentication flow**
4. ✅ **Test loan viewing**
5. ✅ **Test payment processing**
6. ✅ **Test notifications**

---

## Support

For issues or questions:
1. Check the [Common Issues](#common-issues--solutions) section
2. Review the console logs from the mock server
3. Test endpoints using cURL or Postman first
4. Verify network connectivity between devices

---

**Happy Testing! 🎉**

*This mock server is for development and testing only. Do not use in production.*