# FEATURE STATUS MATRIX (FULL AUDIT)

Last Updated: May 6, 2026
Project: Mini HRIS

## DONE

- Authentication login works with role-based access.
- Forgot password entry point is restored and now submits a reset request instead of direct token reset.
- Reset password request flow works end-to-end with admin approval.
- User management CRUD is wired and user creation/edit payloads are validated defensively.
- Reimbursement submit/list/approval flow works, including receipt upload through the shared upload service.
- Activity logs are available for admin review.
- Admin payroll list now uses `/payroll/all` instead of the personal payroll endpoint.
- Admin reset-request queue is available for review, approve, and reject actions.

## IN PROGRESS

- Attendance check-in/check-out works, but demo reliability still depends on office IP configuration.
- Attendance lateness is now configurable through `ATTENDANCE_LATE_TIME`, but the system still assumes UTC-based cutoff logic.
- Leave request and approval flow works, but the current create form stores a reason field while the backend persists leave type, so the user intent is not captured cleanly.
- Leave approvals show user names, but there is no leave calendar view that shows per-day entries.
- Profile update works, including picture upload and recent uploads selection, but admin profile detail still falls back to the users list because there is no dedicated `GET /profiles/:userId` endpoint.
- Payroll generation and payroll adjustment flow work, but the salary formula is still incomplete because it does not yet include attendance-based absence deductions or a dedicated penalty table.
- Dashboard KPIs depend on the partial modules above, so some totals are only as accurate as the underlying integration data.

## MISSING

- Dedicated penalties feature and table.
- Payroll integration for absence deductions and penalty totals.
- Leave calendar view grouped by day.
- Production email delivery for password-reset requests.
- CI/CD workflow files under `.github/workflows`.

## AUDIT NOTES

- The biggest demo risks are payroll correctness, leave/calendar completeness, and attendance environment dependency.
- Current error handling is mostly safe, but some development-era console logging still exists in backend services and should be trimmed for production.
- Recent images and uploads now use the shared API base URL setting, so image selection is less likely to break in non-local environments.

## SNAPSHOT

- Working modules: Authentication, User Management, Reimbursement, Activity Logs, Admin Reset Requests.
- Partial modules: Attendance, Leave, Payroll, Profile, Dashboard.
- Missing modules: Penalties, Leave Calendar, CI/CD workflows, production reset email delivery.
