# Mini HRIS - Quick Start Guide

Get the Mini HRIS backend running in **5 minutes** ⚡

## Prerequisites (Install First)
- Node.js v16+ → [nodejs.org](https://nodejs.org/)
- PostgreSQL v12+ → [postgresql.org](https://www.postgresql.org/download/)
- Git → [git-scm.com](https://git-scm.com/)

Verify: `node --version`, `psql --version`, `git --version`

---

## 1. Clone & Setup (1 min)

```bash
git clone <repository-url>
cd "Tubes RPLL"
npm install
```

---

## 2. Setup Database (2 min)

```bash
# Connect to PostgreSQL
psql -U postgres

# Run these commands in psql:
```
```sql
CREATE USER postgres WITH PASSWORD 'changeme';
CREATE DATABASE mini_hris OWNER postgres;
GRANT ALL PRIVILEGES ON DATABASE mini_hris TO postgres;
\q
```

---

## 3. Configure Environment (1 min)

Create `.env` file in project root:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=mini_hris
DB_USER=postgres
DB_PASSWORD=changeme

JWT_SECRET=my_secret_key_123
OFFICE_IP_PREFIX=127.0.0.
```

---

## 4. Run Server (1 min)

Development mode (auto-reload):
```bash
npm run dev
```

Or production mode:
```bash
npm run build
npm start
```

✅ Server running on `http://localhost:3000`

If this is a fresh database, run migrations before starting the server:

```bash
npx sequelize-cli db:migrate
```

---

## Test It Works

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'
```

Should get a JSON response (even if error = server is running ✓)

---

## Key Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/auth/login` | ❌ | Login |
| POST | `/auth/forgot` | ❌ | Password reset request |
| POST | `/auth/reset` | ❌ | Password reset with token |
| GET | `/attendance/qr` | ✅ JWT | Generate QR token |
| POST | `/attendance/check-in` | ✅ JWT | Clock in |
| POST | `/attendance/check-out` | ✅ JWT | Clock out |
| POST | `/leaves` | ✅ JWT | Request leave |
| POST | `/reimbursements` | ✅ JWT | Submit reimbursement |
| GET | `/activity-logs` | ✅ Admin | View audit logs |

Note: `/profiles` is PATCH-only in the current server. Use `PATCH /profiles/me` or `PATCH /profiles/:userId`.

---

## Useful Commands

```bash
npm run dev              # Start in development mode
npm run build           # Compile TypeScript
npm start               # Start production server
psql -U postgres -d mini_hris  # Connect to database
```

---

## Database Connection Test

```bash
psql -U postgres -d mini_hris -h localhost

# In psql:
\dt                     # List all tables
\q                      # Exit
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot connect to database" | Check DB is running, verify credentials in `.env` |
| "Port 3000 in use" | Change `PORT` in `.env` or kill process on port 3000 |
| "Command not found" | Reinstall Node.js/PostgreSQL, restart terminal |
| "npm install fails" | Run `npm cache clean --force`, then reinstall |

---

## Full Documentation

See `SETUP.md` for detailed setup instructions and `README.md` for full API documentation.

---

Enjoy! 🚀
