# 📋 SoshoPay Mock API - Quick Reference Card

## 🔧 Server Commands

```bash
# Start server
npm start

# Start with auto-reload
npm run dev

# Run tests
./test-api.sh
```

**Server URL:** `http://localhost:8080`

---

## 👥 Mock Users

| User | Mobile | PIN | Client ID |
|------|--------|-----|-----------|
| Tinashe Moyo | 0771234567 | 1234 | CLIENT001 |
| Rumbidzai Ncube | 0772345678 | 5678 | CLIENT002 |

---

## 🔐 Authentication Endpoints

### Login
```bash
POST /api/mobile/client/login
Content-Type: application/json

{
  "mobile": "0771234567",
  "pin": "1234"
}

Response: access_token, refresh_token, client
```

### Set PIN
```bash
POST /api/mobile/client/set-pin
Content-Type: application/json

{
  "mobile": "0771234567",
  "new_pin": "1234",
  "confirm_pin": "1234"
}
```

### Refresh Token
```bash
POST /api/mobile/client/refresh-token
Content-Type: application/json

{
  "refresh_token": "YOUR_REFRESH_TOKEN"
}
```

### Update PIN
```bash
POST /api/mobile/client/pin
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "current_pin": "1234",
  "new_pin": "5678",
  "confirm_pin": "5678"
}
```

### Logout
```bash
POST /api/mobile/client/logout
Authorization: Bearer TOKEN
X-Device-ID: device-id
```

---

## 👤 Profile Endpoints

### Get Current User
```bash
GET /api/mobile/client/me
Authorization: Bearer TOKEN

Response: Full client profile
```

---

## 💰 Loan Endpoints

### Get All Loans
```bash
GET /api/mobile/client/loans
Authorization: Bearer TOKEN

# With status filter
GET /api/mobile/client/loans?status=3

Status Codes:
0 = New
1 = Not signed
2 = Stop Order
3 = Disbursed (Active)
4 = Declined
5 = Paid back (Settled)
6 = Signed
7 = Amended
```

### Get Loan by ID
```bash
GET /api/mobile/client/loans/{loan_id}
Authorization: Bearer TOKEN

Example: GET /api/mobile/client/loans/LOAN001
```

### Get Settled Loans
```bash
GET /api/mobile/client/loans/settled
Authorization: Bearer TOKEN
```

### Get Settled Loan by ID
```bash
GET /api/mobile/client/loans/settled/{settled_id}
Authorization: Bearer TOKEN
```

---

## 💳 Payment Endpoints

### Get Payment Dashboard
```bash
GET /api/payments/dashboard
Authorization: Bearer TOKEN

Response:
{
  "total_outstanding": 2875.0,
  "next_payment_amount": 575.0,
  "next_payment_date": "2024-10-15",
  "overdue_amount": 0.0,
  "overdue_count": 0,
  "payment_summaries": [...],
  "recent_payments": [...]
}
```

### Get Payment History
```bash
GET /api/payments/history?page=1&limit=20
Authorization: Bearer TOKEN
```

### Get Payment Methods
```bash
GET /api/payments/methods
Authorization: Bearer TOKEN

Response:
{
  "methods": [
    {
      "id": "ecocash",
      "name": "EcoCash",
      "type": "mobile_money",
      "is_available": true,
      "minimum_amount": 1.0,
      "maximum_amount": 500000.0
    }
  ]
}
```

### Process Payment
```bash
POST /api/payments/process
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "loan_id": "LOAN001",
  "amount": 575.00,
  "payment_method": "ecocash",
  "phone_number": "0771234567"
}

Response:
{
  "payment_id": "PAY123...",
  "receipt_number": "REC123...",
  "status": "processing",
  "message": "Payment is being processed..."
}
```

### Get Payment Status
```bash
GET /api/payments/{payment_id}/status
Authorization: Bearer TOKEN

Example: GET /api/payments/PAY1725537600000/status
```

### Download Receipt
```bash
GET /api/payments/receipt/{receipt_number}
Authorization: Bearer TOKEN

Example: GET /api/payments/receipt/REC1725537600000
```

---

## 🔔 Notification Endpoints

### Get All Notifications
```bash
GET /api/notifications
Authorization: Bearer TOKEN

# Filter by status
GET /api/notifications?filter=unread
GET /api/notifications?filter=read
GET /api/notifications?filter=all

# With pagination
GET /api/notifications?page=1&limit=20
```

### Get Unread Count
```bash
GET /api/notifications/unread/count
Authorization: Bearer TOKEN

Response:
{
  "unread_count": 3
}
```

### Mark Notification as Read
```bash
PUT /api/notifications/{notification_id}/read
Authorization: Bearer TOKEN

Example: PUT /api/notifications/NOTIF001/read
```

### Mark All as Read
```bash
PUT /api/notifications/mark-all-read
Authorization: Bearer TOKEN
```

### Delete Notification
```bash
DELETE /api/notifications/{notification_id}
Authorization: Bearer TOKEN

Example: DELETE /api/notifications/NOTIF008
```

---

## 📱 Mobile App Configuration

### Android Emulator
```kotlin
const val BASE_URL = "http://10.0.2.2:8080/api"
```

### Android Physical Device
```kotlin
const val BASE_URL = "http://192.168.1.XXX:8080/api"
```

### iOS Simulator
```swift
let baseURL = "http://localhost:8080/api"
```

### iOS Physical Device
```swift
let baseURL = "http://192.168.1.XXX:8080/api"
```

---

## 🧪 Sample Loan Data

### LOAN001 (Tinashe - Cash Loan)
- **Type:** Cash
- **Product:** Quick Cash Loan
- **Principal:** $5,000
- **Outstanding:** $2,875
- **Status:** 3 (Disbursed)
- **Next Payment:** $575 on 2024-10-15
- **Payments Made:** 5 of 10

### LOAN002 (Tinashe - PayGo)
- **Type:** PayGo
- **Product:** Solar Panel Kit - 100W
- **Principal:** $3,000
- **Outstanding:** $0
- **Status:** 5 (Paid back)
- **Payments Made:** 12 of 12

### LOAN003 (Rumbidzai - Cash Loan)
- **Type:** Cash
- **Product:** Emergency Cash Advance
- **Principal:** $2,500
- **Outstanding:** $1,180
- **Status:** 3 (Disbursed)
- **Next Payment:** $590 on 2024-10-20
- **Payments Made:** 3 of 5

### LOAN004 (Rumbidzai - PayGo)
- **Type:** PayGo
- **Product:** Water Pump System
- **Principal:** $4,500
- **Outstanding:** $0
- **Status:** 5 (Paid back)
- **Payments Made:** 12 of 12

---

## 🎯 Common Testing Scenarios

### 1. Login Flow
```bash
# Login
POST /api/mobile/client/login
{"mobile":"0771234567","pin":"1234"}

# Get Profile
GET /api/mobile/client/me

# Logout
POST /api/mobile/client/logout
```

### 2. View Loans
```bash
# Get all loans
GET /api/mobile/client/loans

# Get specific loan
GET /api/mobile/client/loans/LOAN001

# Get settled loans
GET /api/mobile/client/loans/settled
```

### 3. Make Payment
```bash
# Get dashboard
GET /api/payments/dashboard

# Process payment
POST /api/payments/process
{
  "loan_id":"LOAN001",
  "amount":575.00,
  "payment_method":"ecocash",
  "phone_number":"0771234567"
}

# Check status
GET /api/payments/{payment_id}/status
```

### 4. Check Notifications
```bash
# Get unread count
GET /api/notifications/unread/count

# Get unread notifications
GET /api/notifications?filter=unread

# Mark as read
PUT /api/notifications/NOTIF001/read
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "error": "Validation Error",
  "message": "Mobile and PIN are required"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid PIN"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Loan not found"
}
```

---

## 🔍 Quick Debugging

### Check if server is running
```bash
curl http://localhost:8080
```

### Test authentication
```bash
curl -X POST http://localhost:8080/api/mobile/client/login \
  -H "Content-Type: application/json" \
  -d '{"mobile":"0771234567","pin":"1234"}'
```

### Test protected endpoint
```bash
curl -X GET http://localhost:8080/api/mobile/client/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Payment Status Codes

| Status | Description |
|--------|-------------|
| processing | Payment is being processed |
| completed | Payment successful |
| failed | Payment failed |
| pending | Payment pending confirmation |

---

## 🎨 Notification Types

| Type | Description |
|------|-------------|
| payment_reminder | Upcoming payment due |
| payment_success | Payment completed |
| payment_failed | Payment failed |
| loan_approved | Loan approved |
| loan_disbursed | Loan funds disbursed |
| loan_settled | Loan fully paid |
| document_required | Document upload needed |
| promotional | Marketing message |

---

## 💡 Pro Tips

1. **Save tokens:** Always save `access_token` and `refresh_token` after login
2. **Use device ID:** Include `X-Device-ID` header for better token management
3. **Check status codes:** Monitor HTTP status codes for proper error handling
4. **Test pagination:** Use `page` and `limit` parameters for large datasets
5. **Filter data:** Use query parameters to filter loans, notifications, etc.

---

**Need Help?** Check the [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions.