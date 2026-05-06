# FEATURE STATUS MATRIX (STRICT AUDIT)

Last Updated: May 6, 2026  
Project: Mini HRIS

## Legend

- ✅ COMPLETE: backend + frontend + integration flow is working
- ⚠️ PARTIAL: implemented but has known mismatch/limitation/bug risk
- ❌ NOT IMPLEMENTED: endpoint/UI/integration missing
- 🔥 BROKEN: currently fails in normal usage path

## Updated Feature Status Matrix

| Module | Backend | Frontend | Status | Notes |
|---|---|---|---|---|
| Authentication | ✅ | ✅ | ⚠️ PARTIAL | Login/forgot/reset routes and pages exist. Forgot password returns token in dev, but no real email delivery integration for production flow. |
| User Management | ✅ | ✅ | ✅ COMPLETE | `POST /users`, `PATCH /users/:userId`, list/delete are wired. Required fields now enforced (`name`, `email`, `password`, `role`) and `name` is persisted in DB. |
| Attendance | ✅ | ✅ | ⚠️ PARTIAL | Full attendance endpoints + UI exist (QR, check-in/out, history, team, admin edit). Demo depends on env/IP config (`NODE_ENV`, office IP settings). |
| Leave Management | ✅ | ✅ | ⚠️ PARTIAL | Core flow works, but frontend sends `reason` while backend schema uses `type`/`attachmentUrl`; request still succeeds via default `type`, meaning reason is not persisted as expected. |
| Reimbursement | ✅ | ✅ | ✅ COMPLETE | Submit/list/team/decision endpoints exist and are connected in UI with loading/error handling. |
| Payroll | ✅ | ✅ | ⚠️ PARTIAL | Generate/list/adjustment endpoints exist, but frontend generate payload uses `{ month, year }` while backend expects `period`. Also duplicated `/admin/payroll` route in frontend indicates routing conflict risk between `AdminPayroll` and `PayrollAdmin`. |
| Profile Management | ✅ | ✅ | ⚠️ PARTIAL | Own profile get/update and admin patch exist. Frontend attempts `GET /profiles/:userId` but backend only exposes `PATCH /profiles/:userId`; frontend fallback is used (data may be incomplete). |
| Activity Logs | ✅ | ✅ | ✅ COMPLETE | Admin-only logs route and page are connected with pagination and error handling. |
| Roles & Permissions | ✅ | ✅ | ✅ COMPLETE | Backend `requireRoles` and frontend `ProtectedRoute` enforce role-based access patterns for admin/manager/staff pages. |
| Dashboard | ✅ | ✅ | ⚠️ PARTIAL | UI and API calls are present, but some KPIs depend on partially mismatched modules (leave/payroll assumptions), reducing confidence of metric accuracy. |

## Coverage Summary

- Modules audited: 10
- ✅ COMPLETE: 4
- ⚠️ PARTIAL: 6
- ❌ NOT IMPLEMENTED: 0
- 🔥 BROKEN: 0 (at module level)

Estimated completion: 76%

## 🔥 CURRENT ISSUES (AUTO DETECTED)

1. Payroll payload mismatch:
   - Frontend (`hrService.generatePayroll`) sends `{ month, year }`.
   - Backend (`payrollGenerateSchema`) expects optional `period` (ISO date).
   - Impact: selected month/year may be ignored; generation falls back to current date.

2. Leave request field mismatch:
   - Frontend sends `reason`.
   - Backend validates/uses `type` + `attachmentUrl`.
   - Impact: user-entered reason is not captured in backend record.

3. Profile fetch mismatch for admin edit:
   - Frontend tries `GET /profiles/:userId`.
   - Backend does not implement this GET endpoint (only `PATCH /profiles/:userId`).
   - Impact: frontend fallback to users list may show partial profile data.

4. Frontend duplicate route path:
   - `/admin/payroll` appears twice in app routes.
   - Impact: route resolution ambiguity and one of payroll admin UIs can become unreachable.

## ⚠️ DEMO RISKS

1. Attendance demo risk:
   - Production-like environment requires proper office IP config; otherwise check-in/out can be blocked.

2. Forgot/reset demo risk:
   - Works smoothly in development (token returned), but production requires external email sender not yet integrated.

3. Payroll demo risk:
   - Admin selecting month/year may not generate intended period due to payload mismatch.

4. Admin profile edit risk:
   - Data prefill may be incomplete because GET detail endpoint for specific profile is absent.

## ✅ RECENTLY FIXED

1. User creation validation hardening:
   - Required fields now enforced with explicit messages: `name`, `email`, `password`, `role`.

2. Undefined input crash mitigation:
   - Request parsing uses safe schema parsing and defensive `req.body || {}` usage in user routes.

3. User name persistence:
   - `name` is now inserted/updated in `users` table and returned by user service.

## Final Readiness Score

Readiness Score: 7.2 / 10

Reasoning:
- Core modules and most UI flows are implemented.
- Key demo blockers are integration mismatches (payroll period payload, leave reason mapping, missing profile GET detail route) rather than missing entire features.
- With 3-4 targeted fixes, this can be moved to 8.5+ for live demo confidence.
