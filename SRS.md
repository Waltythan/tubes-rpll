Software Requirements Specification (SRS)
HR Management System
Version: 1.0
Date: 26 January 2026

Authors:
- 1123004 | Jonathan Alfons
- 1123029 | Derel Efraim Samosir
- 1123034 | Le Tallec Al-Tsaqiif Anggoroyudho Waltythan

1. Introduction
1.1 Purpose
This document describes the functional and non-functional requirements of a web-based Mini Employee Management System for small-scale startups (≤ 50 employees).

The system supports:
- Employee management
- QR-based attendance
- Leave management
- Reimbursement
- Basic payroll

1.2 Document Conventions
- Bold: important terms
- Monospace: system/API
- Priority: Must / Should / Optional

1.3 Intended Audience
- Developers
- Business Analysts
- QA/Testers
- System Admin

1.4 Project Scope
The system includes:
- Employee & hierarchy management
- QR-based attendance (check-in/out)
- Leave & reimbursement workflows
- Payroll calculation
Roles:
- Admin
- Manager
- Staff
Out of scope:
- Tax / BPJS / government payroll
Security (IMPORTANT)
- QR-based attendance
- Dynamic QR tokens
- Office network (IP-based restriction)

1.5 References
- React + Vite
- Node.js + Express
- PostgreSQL
- JWT, bcrypt, crypto


2. Overall Description
2.1 Background
Manual HR processes are inefficient and error-prone.
This system provides an integrated HR platform.

2.2 Problem Identification
- Employee management
- Attendance accuracy
- Leave workflow
- Reimbursement
- Payroll calculation
- Role-based access

2.3 Product Perspective
Architecture:
- Frontend: React + TypeScript
- Backend: Node.js + Express
- Database: PostgreSQL
- Auth: JWT

2.4 Design
ERD:
Table: users
- user_id (PK)
- department_id (FK -> departments.dep_id)
- email
- password
- role (admin | manager | staff)
- base_salary
- manager_id (FK -> users.user_id, nullable)
- created_at

Table: profiles
- user_id (PK, FK -> users.user_id)
- full_name
- phone_number
- address
- profile_picture_url
- birth_date
- bank_account_details

Table: departments
- dep_id (PK)
- name
- code

Table: attendances
- id (PK)
- user_id (FK -> users.user_id)
- date
- clock_in
- clock_out
- clock_in_location
- clock_out_location
- qr_token
- device_id
- status

Constraints:
- UNIQUE (user_id, date)

Table: leave_requests
- id (PK)
- user_id (FK -> users.user_id)
- approved_by (FK -> users.user_id)
- start_date
- end_date
- type
- status
- attachment_url
- created_at

Table: reimbursements
- id (PK)
- user_id (FK -> users.user_id)
- approved_by (FK -> users.user_id)
- payroll_id (FK -> payrolls.id, nullable)
- title
- description
- amount
- attachment_url
- status
- request_date

Table: payrolls
- id (PK)
- user_id (FK -> users.user_id)
- period_start
- period_end
- total_allowance
- total_deduction
- net_salary
- status
- generated_at

Table: payroll_items
- id (PK)
- payroll_id (FK -> payrolls.id)
- type (allowance | deduction)
- amount
- description
- reference_id

Table: activity_logs
- id (PK)
- user_id (FK -> users.user_id)
- action
- target_table
- target_id
- ip_address
- user_agent
- created_at

Table: trusted_devices
- id (PK)
- user_id (FK -> users.user_id)
- device_id
- device_name
- is_trusted
- last_login

Relationships:
- One department has many users
- One user belongs to one department
- One user can have one manager (self reference)
- One user has one profile
- One user has many attendances
- One user has many leave requests
- One user has many reimbursements
- One user has many payrolls
- One payroll has many payroll_items
- One manager (user) can approve many leave_requests
- One manager (user) can approve many reimbursements
- One user has many activity_logs
- One user can have many trusted_devices

System Rules:
- A user can only check-in once per day
- Attendance requires valid QR token
- QR token expires in 30 seconds
- QR token cannot be reused
- Attendance must be performed from office network (IP restriction)
- Manager can only approve requests from their subordinates
- Payroll is calculated monthly per user

Use Case:
Admin:
- Login
- Manage users (CRUD, hierarchy)
- Edit any attendance
- Edit any profile
- Input manual incentive/penalty
- Generate payroll (auto calculation)
- View activity logs
Manager:
- Login
- Approve/Decline leave requests
- Approve/Decline reimbursement requests
- View team attendance
- View team requests
Staff:
- Login
- Reset/Forgot Password
- Scan QR for attendance
- View own attendance
- Edit own profile (photo, address, phone)
- Request leave
- Request reimbursement
- View salary slip
- View calendar

2.5 Implementation and Deployment
Implementation
Modules:
- /auth
- /users
- /attendance
- /leaves
- /reimbursements
- /payroll
Deployment:
- npm install
- tsx server.ts
- npm run dev

2.6 Product Features
- Role-based auth
- Employee management
- QR attendance
- Leave workflow
- Reimbursement
- Payroll
- Activity log

2.7 User Roles
- Staff → attendance, leave, reimburse
- Manager → approve requests
- Admin → manage system

2.8 Operating Environment
- Browser: Chrome, Firefox, Edge
- Server: Node.js + PostgreSQL

2.9 Constraints
- Data encryption required
- Logging required
- Support 100+ users
- Attendance depends on office network

2.10 Documentation
- User guide
- API docs
- System manual

2.11 Assumptions
- Internet available
- PostgreSQL used
- Must use office network for attendance


3. System Features
3.1 Authentication
- Login/logout
- Role-based access
- Admin manages users

3.2 Employee Management
- CRUD employee
- Assign manager
- Profile management

3.3 Attendance Management (CORE)
- Generate QR code
- Check-in / check-out
- Store timestamp
- Late detection
- View history
- Admin edit attendance
Security:
- Dynamic QR tokens
- Token expiration
- Server validation
- IP restriction (office network)
- Prevent token reuse
- 1 check-in per day
Audit:
- Log all attempts (success & failed)

3.4 Leave Management
- Request leave
- Manager approval
- Calendar view

3.5 Reimbursement
- Submit request
- Approve/reject
- History

3.6 Payroll
- salary = base + incentive - penalty
- monthly summary
- no tax calculation

3.7 Activity Log
- Log all system activity
- Admin can view logs


4. Functional Requirements
- FR-01 Login
- FR-02 Reset Password
- FR-03 Manage Users
- FR-04 Manage Employee
- FR-05 Org Hierarchy
- FR-06 QR Attendance
- FR-07 Attendance Record
- FR-08 View Attendance
- FR-09 Request Leave
- FR-10 Approve Leave
- FR-11 Leave Monitoring
- FR-12 Reimbursement
- FR-13 Approve Reimbursement
- FR-14 Payroll Calculation
- FR-15 Payroll Adjustment
- FR-16 Salary Slip
- FR-17 Edit Profile
- FR-18 Activity Log
- FR-19 RBAC


5. Non-Functional Requirements
Scalability
- NFR-01 User scalability
- NFR-02 Feature scalability
- NFR-03 Modular design

Compatibility
- Browser/device/API compatibility

Data Integrity
- Validation
- Consistency
- Duplicate prevention

Logging
- Activity logs
- Audit trail

Backup
- Backup & recovery

Legal
- Data privacy
- Access limitation

Documentation
- User & technical docs

6. Other Requirements
6.1 Database
Tables:
- users
- profiles
- attendances
- leave_requests
- reimbursements
- payrolls
- payroll_items
- activity_logs
UNIQUE (user_id, date)

6.2 Internationalization
Language: Indonesian
Currency: IDR

6.3 Legal
UU PDP compliance

6.4 Reuse
Auth & encryption reusable

6.5 Conclusion
This system supports HR processes with secure QR-based attendance and network validation, ensuring reliable and fraud-resistant operation.