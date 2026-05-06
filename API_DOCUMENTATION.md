# Mini HRIS API Documentation

Complete reference for all Mini HRIS API endpoints.

## Base URL
```
http://localhost:3000
```

## Authentication

Most endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

### Response Format

**Success Response:**
```json
{
  "status": "success",
  "message": "Operation description",
  "data": { /* response data */ }
}
```

**Error Response:**
```json
{
  "status": "error",
  "message": "Error description",
  "code": 400
}
```

---

## Authentication Endpoints

### 1. Login
**POST** `/auth/login`

Request:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response (200):
```json
{
  "status": "success",
  "message": "Login berhasil",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "staff",
      "managerId": null
    }
  }
}
```

**Errors:**
- `401` - Invalid email or password
- `400` - Validation error

---

### 2. Forgot Password
**POST** `/auth/forgot`

Request:
```json
{
  "email": "user@example.com"
}
```

Response (200):
```json
{
  "status": "success",
  "message": "Jika email terdaftar, instruksi untuk mereset password telah dikirim"
}
```

**Note:** Returns same message whether email exists or not (security best practice)

---

### 3. Reset Password
**POST** `/auth/reset`

Request:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "newPassword123"
}
```

Response (200):
```json
{
  "status": "success",
  "message": "Password berhasil direset"
}
```

**Errors:**
- `400` - Invalid or expired token
- `400` - Password validation failed

---

## User Management (Admin Only)

### 1. Get All Users
**GET** `/users`

Authentication: ✅ Required (Admin)

Query Parameters:
- None

Response (200):
```json
{
  "status": "success",
  "message": "Users retrieved",
  "data": [
    {
      "user_id": 1,
      "department_id": 1,
      "email": "admin@example.com",
      "role": "admin",
      "base_salary": 10000000,
      "manager_id": null,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 2. Create User
**POST** `/users`

Authentication: ✅ Required (Admin)

Request:
```json
{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "role": "staff",
  "departmentId": 1,
  "baseSalary": 5000000,
  "managerId": 2
}
```

Response (201):
```json
{
  "status": "success",
  "message": "User created",
  "data": {
    "user_id": 5,
    "email": "newuser@example.com",
    "role": "staff",
    "created_at": "2024-05-03T10:30:00Z"
  }
}
```

**Errors:**
- `400` - Invalid input or duplicate email
- `404` - Manager not found

---

### 3. Update User
**PATCH** `/users/:userId`

Authentication: ✅ Required (Admin)

Request (partial update):
```json
{
  "password": "newPassword456",
  "baseSalary": 6000000,
  "managerId": 3
}
```

Response (200):
```json
{
  "status": "success",
  "message": "User updated",
  "data": { /* updated user */ }
}
```

---

### 4. Delete User
**DELETE** `/users/:userId`

Authentication: ✅ Required (Admin)

Response (200):
```json
{
  "status": "success",
  "message": "User deleted",
  "data": { "userId": 5 }
}
```

---

## Attendance Endpoints

### 1. Generate QR Token
**GET** `/attendance/qr`

Authentication: ✅ Required (JWT)

Response (200):
```json
{
  "status": "success",
  "message": "QR attendance token generated",
  "data": {
    "qrToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "expiresIn": 30,
    "expiresAt": "2024-05-03T10:35:00Z"
  }
}
```

**Note:** Token valid for 30 seconds only, single-use

**Important:** Check-in also requires an office IP prefix that matches `OFFICE_IP_PREFIX` in `.env` (default is `192.168.`). For local testing, set that prefix to your local network or provide a matching forwarded IP.

---

### 2. Check In
**POST** `/attendance/check-in`

Authentication: ✅ Required (JWT)

Requirements:
- Must be from office IP
- QR token must be valid and not expired

Request:
```json
{
  "qrToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "deviceId": "DEVICE_001"
}
```

Response (200):
```json
{
  "status": "success",
  "message": "Check-in berhasil",
  "data": {
    "id": 101,
    "user_id": 5,
    "date": "2024-05-03",
    "clock_in": "2024-05-03T08:00:00Z",
    "clock_out": null,
    "status": "present"
  }
}
```

**Errors:**
- `403` - Not from office IP
- `400` - Invalid or expired QR token
- `409` - Already checked in today

---

### 3. Check Out
**POST** `/attendance/check-out`

Authentication: ✅ Required (JWT)

Response (200):
```json
{
  "status": "success",
  "message": "Check-out berhasil",
  "data": {
    "id": 101,
    "clock_out": "2024-05-03T17:00:00Z",
    "status": "present"
  }
}
```

**Errors:**
- `404` - No check-in found today
- `409` - Already checked out

---

### 4. Get Own Attendance History
**GET** `/attendance/me`

Authentication: ✅ Required (JWT)

Query Parameters:
- `from` (optional): ISO date (YYYY-MM-DD)
- `to` (optional): ISO date (YYYY-MM-DD)

Example: `/attendance/me?from=2024-05-01&to=2024-05-31`

Response (200):
```json
{
  "status": "success",
  "message": "Attendance history retrieved",
  "data": [
    {
      "id": 101,
      "date": "2024-05-03",
      "clock_in": "2024-05-03T08:00:00Z",
      "clock_out": "2024-05-03T17:00:00Z",
      "status": "present"
    }
  ]
}
```

---

### 5. Get Team Attendance
**GET** `/attendance/team`

Authentication: ✅ Required (Manager/Admin)

Response (200): Array of all team members' attendance

---

### 6. Admin Edit Attendance
**PATCH** `/attendance/:id`

Authentication: ✅ Required (Admin only)

Request:
```json
{
  "clock_in": "2024-05-03T08:00:00Z",
  "clock_out": "2024-05-03T17:00:00Z",
  "status": "present"
}
```

Response (200):
```json
{
  "status": "success",
  "message": "Attendance updated",
  "data": { /* updated attendance */ }
}
```

Authentication: ✅ Required (Admin only)

Request (partial update):
```json
{
  "clock_in": "2024-05-03T09:00:00Z",
  "clock_out": "2024-05-03T17:30:00Z",
  "status": "present"
}
```

Response (200):
```json
{
  "status": "success",
  "message": "Attendance updated",
  "data": { /* updated attendance */ }
}
```

**Note:** Changes are logged to activity_logs for audit

---

## Leave Management Endpoints

### 1. Request Leave
**POST** `/leaves`

Authentication: ✅ Required (JWT)

Request:
```json
{
  "startDate": "2024-05-10",
  "endDate": "2024-05-12",
  "type": "paid_leave",
  "attachmentUrl": "https://example.com/document.pdf"
}
```

Response (201):
```json
{
  "status": "success",
  "message": "Leave request created",
  "data": {
    "id": 50,
    "user_id": 5,
    "start_date": "2024-05-10",
    "end_date": "2024-05-12",
    "status": "pending"
  }
}
```

**Errors:**
- `409` - Overlapping leave found
- `400` - Invalid dates

---

### 2. Get Own Leave Requests
**GET** `/leaves/me`

Authentication: ✅ Required (JWT)

Response (200): Array of user's leave requests

---

### 3. Get Team Leaves
**GET** `/leaves/team`

Authentication: ✅ Required (Manager/Admin)

Response (200): Array of subordinates' leave requests

---

### 4. Approve/Reject Leave
**PATCH** `/leaves/:id/decision`

Authentication: ✅ Required (Manager/Admin)

Request:
```json
{
  "decision": "approved"
}
```

Response (200):
```json
{
  "status": "success",
  "message": "Leave request updated",
  "data": { /* updated leave request */ }
}
```

**Errors:**
- `403` - Not manager/admin or insufficient authority
- `409` - Self-approval not allowed

---

## Reimbursement Endpoints

### 1. Submit Reimbursement
**POST** `/reimbursements`

Authentication: ✅ Required (JWT)

Request:
```json
{
  "title": "Office supplies",
  "description": "Printer ink cartridges",
  "amount": 500000,
  "attachmentUrl": "https://example.com/receipt.jpg"
}
```

Response (201):
```json
{
  "status": "success",
  "message": "Reimbursement submitted",
  "data": {
    "id": 75,
    "user_id": 5,
    "amount": 500000,
    "status": "pending"
  }
}
```

---

### 2. Get Own Reimbursements
**GET** `/reimbursements/me`

Authentication: ✅ Required (JWT)

---

### 3. Get Team Reimbursements
**GET** `/reimbursements/team`

Authentication: ✅ Required (Manager/Admin)

---

### 4. Approve/Reject Reimbursement
**PATCH** `/reimbursements/:id/decision`

Authentication: ✅ Required (Manager/Admin)

Request:
```json
{
  "status": "approved",
  "notes": "Approved"
}
```

---

## Payroll Endpoints

### 1. Generate Monthly Payroll
**POST** `/payroll/generate`

Authentication: ✅ Required (Admin)

Request:
```json
{
  "period": "2024-05-01"
}
```

Response (200):
```json
{
  "status": "success",
  "message": "Payroll generated",
  "data": {
    "periodStart": "2024-05-01",
    "periodEnd": "2024-05-31",
    "payrollCount": 6,
    "generatedPayrolls": [ /* payroll records */ ]
  }
}
```

---

### 2. Add Payroll Adjustment
**POST** `/payroll/:payrollId/items`

Authentication: ✅ Required (Admin)

Request:
```json
{
  "type": "allowance",
  "amount": 500000,
  "description": "Performance bonus",
  "referenceId": "REF_001"
}
```

Response (201):
```json
{
  "status": "success",
  "message": "Payroll adjustment added",
  "data": { /* adjustment */ }
}
```

---

### 3. Get Own Payroll
**GET** `/payroll/me`

Authentication: ✅ Required (JWT)

---

## Profile Management Endpoints

### 1. Update Own Profile
**PATCH** `/profiles/me`

Authentication: ✅ Required (JWT)

Request (partial):
```json
{
  "address": "123 Main Street, City",
  "phone_number": "+62812345678",
  "profile_picture_url": "https://example.com/photo.jpg"
}
```

Response (200):
```json
{
  "status": "success",
  "message": "Profile updated",
  "data": { /* updated profile */ }
}
```

---

### 2. Update Any User Profile
**PATCH** `/profiles/:userId`

Authentication: ✅ Required (Admin only)

Same as above but for any user

Note: this module intentionally exposes PATCH-only operations. There is no GET /profiles route in the current server.

---

## Activity Logs Endpoint

### 1. Get Activity Logs
**GET** `/activity-logs`

Authentication: ✅ Required (Admin only)

Query Parameters:
- `limit` (optional, default: 50, max: 500)
- `offset` (optional, default: 0)
- `userId` (optional): Filter by user
- `action` (optional): Filter by action type

Example: `/activity-logs?limit=100&offset=0&userId=5&action=login_failed`

Response (200):
```json
{
  "status": "success",
  "message": "Activity logs fetched",
  "data": {
    "rows": [
      {
        "user_id": 2,
        "action": "attendance.checkin.success",
        "target_table": "attendances",
        "target_id": "101",
        "ip_address": "192.168.1.100",
        "created_at": "2024-05-03T08:00:00Z"
      }
    ]
  }
}
```

---

## Common Error Codes

| Code | Message | Cause |
|------|---------|-------|
| 400 | Bad Request | Invalid input or validation error |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Business rule violation (e.g., duplicate check-in) |
| 500 | Internal Server Error | Server error |

---

## Image Upload Endpoints

### 1. Upload Image
**POST** `/upload/image`

**Authentication:** Required (JWT)

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `file` (required) - Image file (JPEG, PNG, WebP, GIF)

**Constraints:**
- Max file size: 5MB
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`

**Response (201):**
```json
{
  "status": "success",
  "message": "Image uploaded successfully",
  "data": {
    "id": 1,
    "url": "http://localhost:5000/uploads/1715000000_abc123_photo.jpg",
    "filename": "1715000000_abc123_photo.jpg",
    "uploadedAt": "2026-05-06T10:30:00.000Z"
  }
}
```

**Errors:**
- `400` - No file uploaded or invalid file type
- `413` - File too large
- `401` - Unauthorized
- `500` - Server error

**cURL Example:**
```bash
curl -X POST http://localhost:5000/upload/image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

---

### 2. Get Recent Uploads
**GET** `/upload/recent?limit=20`

**Authentication:** Required (JWT)

**Query Parameters:**
- `limit` (optional) - Number of images to return (1-50, default: 20)

**Response (200):**
```json
{
  "status": "success",
  "message": "Recent uploads retrieved",
  "data": [
    {
      "id": 1,
      "url": "http://localhost:5000/uploads/1715000000_abc123_photo.jpg",
      "filename": "1715000000_abc123_photo.jpg",
      "mimeType": "image/jpeg",
      "fileSize": 245632,
      "uploadedAt": "2026-05-06T10:30:00.000Z"
    },
    {
      "id": 2,
      "url": "http://localhost:5000/uploads/1715000100_def456_receipt.png",
      "filename": "1715000100_def456_receipt.png",
      "mimeType": "image/png",
      "fileSize": 128456,
      "uploadedAt": "2026-05-06T10:25:00.000Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl "http://localhost:5000/upload/recent?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 3. Delete Upload
**DELETE** `/upload/:uploadId`

**Authentication:** Required (JWT)

**Path Parameters:**
- `uploadId` (required) - ID of the upload to delete

**Response (200):**
```json
{
  "status": "success",
  "message": "Upload deleted successfully",
  "data": {
    "id": 1
  }
}
```

**Errors:**
- `404` - Upload not found or unauthorized
- `401` - Unauthorized
- `500` - Server error

---

## Integration with Profile & Reimbursement

### Update Profile with Image
**PATCH** `/profiles/me`

```json
{
  "full_name": "John Doe",
  "phone_number": "+1234567890",
  "address": "123 Main St",
  "profile_picture_url": "http://localhost:5000/uploads/1715000000_abc123_photo.jpg"
}
```

### Create Reimbursement with Receipt
**POST** `/reimbursements`

```json
{
  "title": "Office supplies",
  "description": "Purchased printer ink",
  "amount": 50.00,
  "attachmentUrl": "http://localhost:5000/uploads/1715000100_def456_receipt.png"
}
```

---

## Rate Limiting

- **Login:** 5 requests per 15 minutes per IP
- **Attendance:** 60 requests per minute per IP
- **Image Upload:** 30 uploads per hour per user
- **General API:** Standard rate limits apply

---

## Pagination Example

```bash
# Get first 50 activity logs
curl "http://localhost:3000/activity-logs?limit=50&offset=0"

# Get next 50 (page 2)
curl "http://localhost:3000/activity-logs?limit=50&offset=50"

# Get next 50 (page 3)
curl "http://localhost:3000/activity-logs?limit=50&offset=100"
```

---

## Example Usage with cURL

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Check In (with token)
```bash
curl -X POST http://localhost:3000/attendance/check-in \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qrToken": "your_qr_token",
    "deviceId": "DEVICE_001"
  }'
```

### Get Activity Logs (Admin)
```bash
curl "http://localhost:3000/activity-logs?limit=50" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

---

**API Version:** 1.0  
**Last Updated:** May 2026
