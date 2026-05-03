# Mini HRIS - Getting Started

Welcome to **Mini HRIS** - A comprehensive HR Information System backend built with Node.js and PostgreSQL.

## 📚 Documentation Overview

Choose the right guide for your needs:

### 🚀 **New? Start Here**
- **[QUICK_START.md](QUICK_START.md)** ⚡ Get running in 5 minutes
  - Perfect for development or quick testing
  - Minimal setup, maximum speed
  - Follow if you just want to run the app locally

### 📖 **Detailed Setup**
- **[SETUP.md](SETUP.md)** 📋 Complete step-by-step guide
  - Comprehensive installation instructions
  - Detailed troubleshooting section
  - Best for first-time setup or production deployment
  - Covers all prerequisites, database config, and verification

### 🔌 **API Reference**
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** 📡 Complete endpoint documentation
  - All endpoints with request/response examples
  - Authentication requirements
  - Error codes and rate limits
  - cURL examples for testing

### 💻 **Development & Features**
- **[README.md](README.md)** - Project overview and features
  - Key features overview
  - Project structure
  - Architecture details
  - Development workflow

---

## 📋 Requirements

Before starting, ensure you have:

✅ **Node.js** v16+  
✅ **PostgreSQL** v12+  
✅ **npm** v7+  
✅ **Git**  

[Download Node.js](https://nodejs.org/) | [Download PostgreSQL](https://www.postgresql.org/download/) | [Download Git](https://git-scm.com/)

---

## ⚡ Quick Start (TL;DR)

```bash
# 1. Clone and install
git clone <url>
cd "Tubes RPLL"
npm install

# 2. Setup database
psql -U postgres
```
```sql
CREATE USER hris_user WITH PASSWORD 'password123';
CREATE DATABASE mini_hris OWNER hris_user;
GRANT ALL PRIVILEGES ON DATABASE mini_hris TO hris_user;
\q
```

```bash
# 3. Create .env
echo "PORT=3000" > .env
echo "NODE_ENV=development" >> .env
echo "DB_HOST=localhost" >> .env
echo "DB_PORT=5432" >> .env
echo "DB_NAME=mini_hris" >> .env
echo "DB_USER=hris_user" >> .env
echo "DB_PASSWORD=password123" >> .env
echo "JWT_SECRET=my_secret_123" >> .env
echo "OFFICE_IP_PREFIX=127.0.0." >> .env

# 4. Run
npm run dev
```

✅ Server running on `http://localhost:3000`

Notes:
- The app loads `.env` from the project root.
- Attendance check-in requires an office IP prefix. For local testing, set `OFFICE_IP_PREFIX=127.0.0.` or a forwarded office range such as `192.168.1.`.

See **[QUICK_START.md](QUICK_START.md)** for details.

---

## 🎯 Key Features

| Feature | Status | Description |
|---------|--------|-------------|
| 🔐 JWT Authentication | ✅ | Secure token-based auth with JWT |
| 🔑 Password Reset | ✅ | Email-based password reset flow |
| 👥 RBAC | ✅ | Role-based access control (Admin, Manager, Staff) |
| 📋 Attendance | ✅ | QR code-based check-in/out with IP verification |
| 📅 Leave Management | ✅ | Leave requests with approval workflow |
| 💰 Reimbursements | ✅ | Reimbursement submission and approval |
| 📊 Payroll | ✅ | Monthly payroll generation with adjustments |
| 📝 Profiles | ✅ | User profile management |
| 🔍 Activity Logs | ✅ | Admin audit trail viewer |
| ⏱️ Rate Limiting | ✅ | Login & API rate limiting |
| ✔️ Input Validation | ✅ | Zod schema validation |
| 📊 Error Handling | ✅ | Standardized API error responses |

---

## 📂 Directory Structure

```
📦 Tubes RPLL/
├── 📄 README.md                  # Project overview
├── 📄 QUICK_START.md             # 5-minute setup
├── 📄 SETUP.md                   # Detailed setup guide
├── 📄 API_DOCUMENTATION.md       # Complete API reference
├── 📄 .env.example               # Environment variables template
├── 📄 package.json               # Dependencies
├── 📄 tsconfig.json              # TypeScript config
├── 📁 src/
│   ├── server.ts                 # Express app entry
│   ├── 📁 routes/                # API endpoints
│   ├── 📁 services/              # Business logic
│   ├── 📁 middleware/            # Express middleware
│   ├── 📁 controllers/           # Route handlers
│   ├── 📁 utils/                 # Helper utilities
│   ├── 📁 models/                # Database models
│   └── 📁 migrations/            # Database migrations
└── 📁 dist/                      # Compiled JavaScript
```

---

## 🔗 Important Files

| File | Purpose |
|------|---------|
| `.env` | Environment variables (create from .env.example) |
| `.env.example` | Template for .env configuration |
| `src/server.ts` | Main server file |
| `src/services/` | All business logic |
| `src/routes/` | All API endpoints |
| `src/middleware/` | Auth, RBAC, rate limiting |

---

## 🛠️ Available Commands

```bash
# Development
npm run dev              # Start with hot reload
npm run build           # Compile TypeScript to JavaScript

# Production
npm start               # Start compiled server
npm run build && npm start  # Build then run

# Database (if using migrations)
npx sequelize-cli db:migrate      # Run migrations
npx sequelize-cli db:seed:all     # Seed initial data
npx sequelize-cli db:migrate:status  # Check migration state
```

---

## 🧪 Testing Endpoints

### Login Example
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

If you are testing against this repository's seeded/dev data, use the credentials you inserted locally. The backend now expects the `.env` file to exist in the project root before startup.

### Check Activity Logs (Admin)
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3000/activity-logs?limit=50"
```

See **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** for all endpoints and examples.

---

## 📞 Support & Troubleshooting

### Common Issues

#### "Cannot connect to database"
- Ensure PostgreSQL is running
- Verify credentials in `.env`
- Check database exists

#### "Port 3000 in use"
- Change `PORT` in `.env` to another port (e.g., 3001)
- Or kill the process using port 3000

#### "npm: command not found"
- Reinstall Node.js
- Restart your terminal

#### Full troubleshooting guide
See **[SETUP.md](SETUP.md#troubleshooting)**

---

## 📖 Learning Path

1. **New to the project?**
   - Start with [QUICK_START.md](QUICK_START.md)
   - Run the server locally
   - Test some endpoints with [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

2. **Want to understand the system?**
   - Read [README.md](README.md) for project overview
   - Check `src/` directory structure
   - Review business logic in `src/services/`

3. **Need to add features?**
   - Understand the current architecture
   - Follow the pattern in existing services
   - Add tests before committing

4. **Setting up production?**
   - Use [SETUP.md](SETUP.md) comprehensive guide
   - Update environment variables
   - Run database migrations
   - Ensure all security settings are configured

---

## 🚀 Next Steps

After setup:

1. ✅ Test all endpoints with examples from [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
2. 📝 Review database schema by connecting to PostgreSQL
3. 🔍 Check activity logs: `GET /activity-logs`
4. 👤 Create test users and test different roles
5. 🧪 Integrate with frontend application

---

## 💾 Database

The system uses **PostgreSQL** with auto-created tables:

| Table | Purpose |
|-------|---------|
| `users` | User accounts with roles and permissions |
| `attendances` | Attendance records with timestamps |
| `leaves` | Leave requests and approvals |
| `reimbursements` | Reimbursement submissions |
| `payrolls` | Monthly payroll records |
| `profiles` | User profile information |
| `activity_logs` | Audit trail for security |
| `qr_tokens` | Temporary QR tokens for attendance |
| `password_reset_tokens` | Password reset tokens |

---

## 🔐 Security

**Default configurations for development:**
- Rate limiting enabled (5 logins/15min)
- Password hashing with bcrypt
- JWT token expiry: 24 hours
- Activity logging enabled

**For production:** See [SETUP.md](SETUP.md#security-considerations)

---

## 📝 License & Submission

This is an academic project for **Semester 6 RPLL (Rekayasa Perangkat Lunak Lanjut)**.

---

## 📞 Questions?

1. Check the relevant documentation file above
2. Review [SETUP.md](SETUP.md#troubleshooting) troubleshooting section
3. Check [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for endpoint details
4. Review project structure in `src/` directory

---

**Happy coding!** 🚀

Version 1.0 | Last Updated: May 2026
