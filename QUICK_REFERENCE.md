# 📌 QUICK REFERENCE CARD

**Print this and keep it handy!**

---

## 🚀 QUICK START (5 minutes)

### Start Backend
```bash
# Terminal 1
npm install          # First time only
npm run dev          # Starts on port 3000
```

### Start Frontend
```bash
# Terminal 2
cd frontend
npm install          # First time only
npm run dev          # Starts on port 5173
```

### Access
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Login: admin@test.com / password123

---

## 🔥 CRITICAL FIXES

| Issue | Fix | Time |
|-------|-----|------|
| **API fails** | Set `VITE_API_BASE_URL=http://localhost:3000` | 5 min |
| **TypeScript errors** | Create separate tsconfigs | 15 min |
| **Check-in fails** | Set `.env` `OFFICE_IP_PREFIX=127.0.` | 2 min |
| **No data** | Run `npx sequelize-cli db:seed:all` | 5 min |

---

## ✅ WHAT WORKS (Demo Safe)

- ✅ Login / Logout
- ✅ Attendance (QR, check-in/out, history)
- ✅ Leave requests
- ✅ Reimbursement requests
- ✅ Profile view/edit
- ✅ Dashboard metrics

---

## ❌ WHAT'S MISSING (Don't Demo)

- ❌ Manager approvals (no UI)
- ❌ User management (no UI)
- ❌ Payroll details (minimal UI)
- ❌ Activity logs viewer (no UI)
- ❌ Email service

---

## 🧪 TEST CREDENTIALS

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@test.com | password123 |
| Manager | manager@test.com | password123 |
| Staff | staff@test.com | password123 |

---

## 🌐 KEY ENDPOINTS

### Auth
- `POST /auth/login` - Login
- `POST /auth/forgot` - Forgot password
- `POST /auth/reset` - Reset password

### Attendance
- `GET /attendance/qr` - Generate QR
- `POST /attendance/check-in` - Check in
- `POST /attendance/check-out` - Check out
- `GET /attendance/me` - History

### Leave
- `POST /leaves` - Request
- `GET /leaves/me` - Own requests
- `PATCH /leaves/:id/decision` - Approve (manager)

### Reimbursement
- `POST /reimbursements` - Submit
- `GET /reimbursements/me` - Own requests
- `PATCH /reimbursements/:id/decision` - Approve (manager)

### Profile
- `GET /profiles/me` - View
- `PATCH /profiles/me` - Update

### Admin
- `GET /users` - List users
- `POST /payroll/generate` - Generate payroll
- `GET /activity-logs` - View logs

---

## 📁 PROJECT STRUCTURE

```
tubes-rpll/
├── src/                 # Backend (Node.js)
│   ├── routes/         # API endpoints
│   ├── services/       # Business logic
│   ├── middleware/     # Auth, RBAC, rate limit
│   └── utils/          # JWT, validation, errors
│
├── frontend/           # React + Vite
│   ├── src/
│   │   ├── pages/     # Page components
│   │   ├── components/# Reusable UI
│   │   ├── services/  # API calls
│   │   └── hooks/     # Auth, loading
│
├── models/            # Old (use Sequelize)
├── migrations/        # Database migrations
├── seeders/          # Test data
└── config/           # Database config
```

---

## 🗄️ DATABASE

### Connect
```bash
psql -U postgres -d mini_hris
\dt                    # List tables
SELECT * FROM users;   # Query
\q                     # Exit
```

### Seed Data
```bash
npx sequelize-cli db:seed:all
```

### Migrations
```bash
npx sequelize-cli db:migrate
npx sequelize-cli db:migrate:undo:all
```

---

## 🐛 COMMON ISSUES

### "Cannot GET /api/..."
**Cause:** Port mismatch or CORS  
**Fix:** Check `VITE_API_BASE_URL`

### "Unexpected token in JSON"
**Cause:** Server error response  
**Fix:** Check backend logs

### "IP check failed"
**Cause:** Office IP doesn't match  
**Fix:** Set `OFFICE_IP_PREFIX=127.0.`

### "Database connection refused"
**Cause:** PostgreSQL not running  
**Fix:** `brew services start postgresql` or use Services app

### "Port 3000 already in use"
**Cause:** Another process using port  
**Fix:** Kill process or change PORT in .env

---

## 📊 FEATURE COMPLETION

| Module | Status | UI? |
|--------|--------|-----|
| Auth | 75% | ✅ |
| Attendance | 83% | ✅ |
| Leave | 50% | ⚠️ |
| Reimbursement | 50% | ⚠️ |
| Payroll | 33% | ❌ |
| Profile | 67% | ✅ |
| Logs | 0% | ❌ |

---

## 🎯 DEMO SCRIPT (8 min)

1. **Login** (1.5 min) - Show form, login
2. **Dashboard** (1 min) - Show metrics
3. **Attendance** (2 min) - Generate QR, check in
4. **Leave** (1.5 min) - Request, show list
5. **Profile** (1 min) - Edit, save
6. **Wrap-up** (1 min) - Summary

**Skip:** Payroll, admin functions, approval workflows

---

## 🔐 SECURITY CHECKLIST

- ✅ Passwords hashed (bcrypt)
- ✅ JWT tokens used
- ✅ RBAC enforced
- ✅ Rate limiting on login
- ✅ Activity logging
- ❌ Email not configured
- ❌ File upload not secured

---

## 📈 PERFORMANCE

| Page | Load Time | Notes |
|------|-----------|-------|
| Login | < 1s | Fast |
| Dashboard | 1-2s | Loads 4 metrics in parallel |
| Attendance | < 1s | Simple list |
| Leave | 1-2s | Loads list |
| Profile | 1-2s | Form loading |

**Optimization:** No pagination implemented yet

---

## 🚨 MUST HAVE FOR DEMO

```
Before demo:
✓ Backend running on port 3000
✓ Frontend running on port 5173
✓ Database seeded with test data
✓ VITE_API_BASE_URL set correctly
✓ Login works
✓ Dashboard loads
✓ Curl commands ready for approvals
```

---

## 💡 HELPFUL CURL COMMANDS

### Get JWT Token
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"staff@test.com","password":"password123"}' \
  | jq -r '.data.accessToken')
echo $TOKEN
```

### Approve Leave
```bash
curl -X PATCH http://localhost:3000/leaves/1/decision \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decision":"approved"}'
```

### Check Activity Logs
```bash
curl http://localhost:3000/activity-logs?limit=10 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📞 EMERGENCY CONTACTS

| Issue | Who | Solution |
|-------|-----|----------|
| Backend crash | Dev Lead | Restart `npm run dev` |
| DB down | DBA | Restart PostgreSQL |
| Stuck process | DevOps | Kill port 3000/5173 |
| Merge conflict | Tech Lead | Resolve in Git |
| Need test data | QA | Run seeders |

---

## 🎓 LEARNING RESOURCES

- `SYSTEM_SUMMARY.md` - Full analysis
- `DEMO_PREP.md` - Demo checklist
- `FEATURE_STATUS.md` - Feature matrix
- `API_DOCUMENTATION.md` - All endpoints
- `README.md` - Project overview
- `SETUP.md` - Installation guide

---

## 📅 KEY DATES

| Event | Date | Owner |
|-------|------|-------|
| Demo | May 15 | Team |
| Feature freeze | May 20 | Tech Lead |
| Code review | May 22 | Leads |
| Final release | May 25 | DevOps |

---

## ⭐ PRIORITIES

### MUST FIX (Today)
- Fix port configuration
- Fix TypeScript errors
- Seed test data
- Test login flow

### SHOULD DO (This week)
- Create approval UIs
- Create admin interfaces
- Add email service

### NICE TO HAVE (Later)
- File upload
- Export/reports
- Mobile responsive
- Performance optimization

---

**Keep this card visible! Print it!** 🖨️

Version 1.0 | Last Updated: May 5, 2026
