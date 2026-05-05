# ✅ PRIORITY ACTION ITEMS - DEMO PREP

**Last Updated:** May 5, 2026  
**Target:** Demo-ready in 1-2 days  
**Owner:** Development Team

---

## 🔴 CRITICAL (MUST FIX)

### 1. Fix API Port Configuration
**Issue:** Frontend expects port 5000, backend runs on 3000  
**Risk:** All API calls will fail  
**Time:** 30 minutes

**Checklist:**
- [ ] Open `frontend/.env.local` or set `VITE_API_BASE_URL`
- [ ] Confirm value: `VITE_API_BASE_URL=http://localhost:3000`
- [ ] Test login flow end-to-end
- [ ] Verify all API calls work

**Tests:**
```bash
# Backend
npm run dev  # Should start on port 3000

# Frontend (in separate terminal)
cd frontend
npm run dev  # Should start on port 5173

# Test login with curl
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'
```

---

### 2. Fix TypeScript Configuration
**Issue:** tsconfig.json includes frontend files, causes 45+ compile errors  
**Risk:** Build will fail, CI/CD breaks  
**Time:** 30 minutes

**Checklist:**
- [ ] Create `frontend/tsconfig.json` with proper settings
- [ ] Update root `tsconfig.json` to exclude `frontend/` directory
- [ ] Verify `npm run build` passes
- [ ] Verify `cd frontend && npm run build` passes

**Solution:**
Update root `tsconfig.json`:
```json
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "frontend", "dist"]
}
```

---

### 3. Seed Test Data
**Issue:** Database may be empty  
**Risk:** No data to demo with  
**Time:** 15 minutes

**Checklist:**
- [ ] Connect to PostgreSQL
- [ ] Run seeders: `npx sequelize-cli db:seed:all`
- [ ] Verify users exist with different roles
- [ ] Create test leave/reimbursement records if needed

**Verify:**
```bash
psql -U postgres -d mini_hris

SELECT * FROM users LIMIT 5;
\q
```

---

### 4. Test Login Flow
**Issue:** Critical path must work for demo  
**Risk:** Demo fails immediately  
**Time:** 15 minutes

**Checklist:**
- [ ] Frontend running on 5173
- [ ] Backend running on 3000
- [ ] Test admin login
- [ ] Test staff login
- [ ] Test invalid credentials (error handling)
- [ ] Verify dashboard loads after login

**Test Accounts:**
- Admin: `admin@test.com` / `password123`
- Staff: `staff@test.com` / `password123`
- Manager: `manager@test.com` / `password123`

---

## 🟠 HIGH PRIORITY (DEMO FEATURES)

### 5. Test Attendance Workflow
**Status:** Mostly working  
**Time:** 30 minutes

**Checklist:**
- [ ] Log in as staff user
- [ ] Navigate to /attendance
- [ ] Click "Generate QR"
- [ ] Verify QR code displays
- [ ] Click "Check In"
- [ ] Verify check-in time updates
- [ ] Verify history shows today's record

**Note:** Check-in requires office IP. If blocked:
- Set `.env` `OFFICE_IP_PREFIX=127.0.` for localhost testing

---

### 6. Test Leave Request Workflow
**Status:** Complete (except approval)  
**Time:** 20 minutes

**Checklist:**
- [ ] Navigate to /leave
- [ ] Click "Request Leave"
- [ ] Fill form (dates, type)
- [ ] Submit
- [ ] Verify appears in list with "pending" status
- [ ] Show approval flow with curl (backend only)

**Note:** Approval UI doesn't exist - show API works via curl

---

### 7. Test Reimbursement Workflow
**Status:** Complete (except approval)  
**Time:** 20 minutes

**Checklist:**
- [ ] Navigate to /reimbursement
- [ ] Click "Request Reimbursement"
- [ ] Fill form (amount, description)
- [ ] Submit
- [ ] Verify appears in list
- [ ] Show approval flow with curl

---

### 8. Test Dashboard
**Status:** Complete  
**Time:** 10 minutes

**Checklist:**
- [ ] Dashboard loads on login
- [ ] Verify 4 metric cards display
- [ ] Attendance count is accurate
- [ ] Leave remaining calculates correctly
- [ ] Latest leave/reimbursement cards show

---

### 9. Test Profile
**Status:** Complete  
**Time:** 10 minutes

**Checklist:**
- [ ] Navigate to /profile
- [ ] View own profile
- [ ] Edit a field (e.g., phone)
- [ ] Save changes
- [ ] Verify changes persist on reload

---

## 🟡 MEDIUM PRIORITY (Before Full Demo)

### 10. Document API Endpoints for Demo
**Purpose:** Show backend capabilities if UI missing  
**Time:** 1 hour

**Create demo script with curl examples:**
```bash
# Set token from login
TOKEN="your_jwt_token"

# Test leave approval (API only, no UI)
curl -X PATCH http://localhost:3000/leaves/1/decision \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decision":"approved"}'

# Test reimbursement approval
curl -X PATCH http://localhost:3000/reimbursements/1/decision \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decision":"approved"}'

# View activity logs
curl http://localhost:3000/activity-logs?limit=20 \
  -H "Authorization: Bearer $TOKEN"
```

---

### 11. Create Manager Approval Page (Optional)
**Status:** Not implemented  
**Impact:** Without this, manager workflow looks incomplete  
**Time:** 4-6 hours

**Skip for initial demo, implement if time permits**

**Checklist:**
- [ ] Create `/pages/Approvals.tsx`
- [ ] Show pending leaves for manager's team
- [ ] Add approve/reject buttons
- [ ] Show pending reimbursements
- [ ] Add to navbar if manager

---

## 📋 PRE-DEMO CHECKLIST

**24 Hours Before Demo:**

```
Infrastructure:
□ Database connected and seeded
□ Backend running on port 3000
□ Frontend running on port 5173
□ .env configured correctly
□ VITE_API_BASE_URL set to http://localhost:3000

Functionality:
□ Login works (admin, staff, manager)
□ Dashboard loads correctly
□ Attendance QR works
□ Check-in/out works
□ Leave request works
□ Reimbursement request works
□ Profile edit works
□ Logout works

Error Handling:
□ Test invalid login (error shows)
□ Test 404 page
□ Test server down scenario
□ Test network error

Performance:
□ Dashboard loads < 2 seconds
□ API calls < 1 second
□ No console errors
□ No broken images/styles

Documentation:
□ Demo script prepared
□ API examples documented
□ Known limitations documented
□ Fallback plans for issues

Backup Plans:
□ Have curl scripts ready
□ Have database export
□ Have screenshots of full workflows
□ Have API Postman collection
```

---

## 🎯 DEMO SCRIPT (8 minutes)

**Setup:** Open browser with frontend on localhost:5173

### Slide 1: Login (1.5 min)
1. Show login page
2. Explain form validation
3. Login as admin@test.com
4. Show successful redirect to dashboard

### Slide 2: Dashboard (1 min)
1. Show 4 metric cards
2. Explain data sources
3. Show latest activities

### Slide 3: Attendance (2 min)
1. Navigate to /attendance
2. Generate QR token
3. Show QR code display
4. Explain check-in/out
5. Show history table

### Slide 4: Leave Request (1.5 min)
1. Navigate to /leave
2. Click "Request Leave"
3. Fill form and submit
4. Show in list with status badge
5. Explain approval process (API)

### Slide 5: Profile (1 min)
1. Navigate to /profile
2. Show editable fields
3. Make a change and save
4. Show data persists

### Slide 6: Wrap-up (1 min)
1. Show logout
2. Summarize what's implemented
3. Discuss future improvements

---

## 🐛 TROUBLESHOOTING

### "API requests failing"
- [ ] Check `VITE_API_BASE_URL` is set correctly
- [ ] Verify backend running on port 3000
- [ ] Check browser console for CORS errors
- [ ] Clear browser cache and localStorage

### "Check-in fails with IP error"
- [ ] Set `.env` `OFFICE_IP_PREFIX=127.0.`
- [ ] Or show check-in via curl with matching IP
- [ ] Or skip check-in, show QR generation only

### "Late count always 0"
- [ ] Check if any records have status='late'
- [ ] Query: `SELECT * FROM attendances WHERE status='late';`
- [ ] Either mark some late or hide metric during demo

### "Profile picture URL field"
- [ ] Currently text-only (no upload)
- [ ] Use image URL from internet
- [ ] Or leave blank

### "Payroll page looks empty"
- [ ] Skip brief over payroll page
- [ ] Or populate payroll for user via curl
- [ ] Or show it as "feature in progress"

---

## ✨ NICE TO SHOW (If Time)

- Password reset flow (via curl)
- Different user roles (log out and login as different roles)
- Rate limiting (try login 6 times, see rate limit error)
- Activity logs (via curl, show audit trail)
- Error handling (try invalid form data, see validation)

---

## 📞 DEMO DAY SUPPORT

**If something breaks:**

1. **Login fails:** Reseed database, restart backend
2. **API timeouts:** Restart backend (`npm run dev`)
3. **Frontend blank:** Clear cache, restart frontend
4. **Port conflicts:** Kill process, restart
5. **Database down:** Restart PostgreSQL

**Have ready:**
- [ ] Database backup (psql dump)
- [ ] Screenshots of each page
- [ ] Curl command examples
- [ ] Postman collection
- [ ] Browser dev tools open (show network)

---

**Good luck with the demo! 🚀**

Questions? See SYSTEM_SUMMARY.md for detailed analysis.
