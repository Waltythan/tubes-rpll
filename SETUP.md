# Mini HRIS - Setup & Installation Guide

Complete step-by-step guide to set up and run the Mini HRIS backend application.

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Prerequisites Installation](#prerequisites-installation)
3. [Project Setup](#project-setup)
4. [Database Configuration](#database-configuration)
5. [Environment Variables](#environment-variables)
6. [Running the Application](#running-the-application)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Requirements
- **RAM:** 2 GB
- **Disk Space:** 500 MB
- **OS:** Windows, macOS, or Linux

### Software Requirements
- **Node.js:** v16.x or higher
- **npm:** v7.x or higher (comes with Node.js)
- **PostgreSQL:** v12.x or higher
- **Git:** v2.20 or higher

---

## Prerequisites Installation

### 1. Install Node.js and npm

#### Windows
1. Download from [nodejs.org](https://nodejs.org/)
2. Choose LTS version
3. Run the installer and follow the prompts
4. Verify installation:
```bash
node --version
npm --version
```

#### macOS
```bash
# Using Homebrew
brew install node

# Verify
node --version
npm --version
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install nodejs npm

# Verify
node --version
npm --version
```

### 2. Install PostgreSQL

#### Windows
1. Download from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Run installer
3. Remember the password you set for `postgres` user
4. Choose default port 5432
5. Verify:
```bash
psql --version
```

#### macOS
```bash
brew install postgresql

# Start PostgreSQL service
brew services start postgresql

# Verify
psql --version
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Verify
psql --version
```

### 3. Install Git

#### Windows
Download from [git-scm.com](https://git-scm.com/)

#### macOS
```bash
brew install git
```

#### Linux
```bash
sudo apt install git
```

---

## Project Setup

### Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd "Tubes RPLL"
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs all required packages specified in `package.json`:
- Express.js (HTTP server)
- PostgreSQL driver (pg)
- JWT authentication (jsonwebtoken)
- Bcrypt (password hashing)
- Zod (request validation)
- express-rate-limit (rate limiting)
- And development dependencies

### Step 3: Build TypeScript

```bash
npm run build
```

This compiles TypeScript files to JavaScript in the `dist/` directory.

---

## Database Configuration

### Step 1: Create PostgreSQL User and Database

#### On Windows/macOS/Linux:

Open Command Prompt/Terminal and connect to PostgreSQL:

```bash
psql -U postgres
```

You'll be prompted for the postgres user password. Enter it.

Once connected, run these SQL commands:

```sql
-- Create database user
CREATE USER hris_user WITH PASSWORD 'secure_password_123';

-- Create database
CREATE DATABASE mini_hris OWNER hris_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE mini_hris TO hris_user;

-- Exit psql
\q
```

**Replace `secure_password_123` with your own secure password.**

### Step 2: Verify Database Connection

```bash
# Connect to the new database with the new user
psql -U hris_user -d mini_hris -h localhost
```

If successful, you'll see the `mini_hris=#` prompt.

Exit with: `\q`

---

## Environment Variables

### Step 1: Check for .env file

In the project root directory, check if `.env` file exists:

```bash
# Windows
dir .env

# macOS/Linux
ls -la .env
```

### Step 2: Create or Update .env

If `.env` doesn't exist, create it:

```bash
# Windows (PowerShell)
New-Item .env -Type File

# macOS/Linux
touch .env
```

### Step 3: Add Configuration

Open `.env` file and add the following:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mini_hris
DB_USER=hris_user
DB_PASSWORD=secure_password_123

# JWT Secret (change this in production!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Office IP Range (for attendance check-in)
# Use your actual office IP or allow localhost for development
OFFICE_IP_RANGE=127.0.0.1/32,192.168.1.0/24

# Optional: Email Configuration (for password reset)
# EMAIL_SERVICE=gmail
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASSWORD=your-app-password
```

**Important Security Notes:**
- Replace `secure_password_123` with the actual password you set
- Never commit `.env` to Git
- Change `JWT_SECRET` to a random value in production
- For office IP, use your actual office network range

### Step 4: Add .env to .gitignore

Ensure `.env` is not tracked by Git:

```bash
# Check if .gitignore exists
cat .gitignore

# If not, create one
echo ".env" > .gitignore
echo "node_modules/" >> .gitignore
echo "dist/" >> .gitignore
```

---

## Running the Application

### Option 1: Development Mode (Recommended for Development)

With automatic reload on file changes:

```bash
npm run dev
```

Output should show:
```
Server running on port 3000
```

### Option 2: Production Mode

1. Build the project:
```bash
npm run build
```

2. Start the server:
```bash
npm start
```

The server will run on `http://localhost:3000`

---

## Verification

### Step 1: Test Server Health

```bash
# In a new terminal, test if server is running
curl http://localhost:3000/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"password123"}'
```

You should get a JSON response (even if it's an error, it means the server is running).

### Step 2: Verify Database Tables

Connect to the database and check tables:

```bash
psql -U hris_user -d mini_hris

# In psql, list all tables
\dt

# Should show tables like: users, attendances, leaves, etc.
```

### Step 3: Test a Login Request

Using curl or Postman:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

---

## Quick Start Checklist

- [ ] Node.js installed (`node --version`)
- [ ] PostgreSQL installed and running
- [ ] Git installed
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created with correct credentials
- [ ] Database user and database created
- [ ] TypeScript compiled (`npm run build`)
- [ ] Server started (`npm run dev` or `npm start`)
- [ ] Verified on `http://localhost:3000`

---

## Troubleshooting

### "Cannot connect to database"

**Solution:**
1. Verify PostgreSQL is running:
```bash
# Windows (in Services)
# macOS: brew services list
# Linux: sudo systemctl status postgresql
```

2. Check credentials in `.env` match what you created

3. Test connection manually:
```bash
psql -U hris_user -d mini_hris -h localhost -p 5432
```

### "npm: command not found"

**Solution:**
- Node.js/npm not installed
- Restart terminal after installation
- Check PATH environment variable

### "Port 3000 already in use"

**Solution:**

Windows (PowerShell):
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

macOS/Linux:
```bash
lsof -i :3000
kill -9 <PID>
```

Or use a different port in `.env`:
```env
PORT=3001
```

### "Cannot find module" errors

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Database user creation failed

**Solution:**

Check if user already exists:
```bash
psql -U postgres -c "SELECT * FROM pg_user WHERE usename='hris_user';"
```

Drop and recreate:
```bash
psql -U postgres -c "DROP USER IF EXISTS hris_user;"
psql -U postgres -c "CREATE USER hris_user WITH PASSWORD 'secure_password_123';"
```

---

## Next Steps

1. **Read the API Documentation** - Check the main `README.md` for API endpoints
2. **Set Up a Database GUI** - Use pgAdmin for easier database management
3. **Test the Endpoints** - Use Postman or curl to test API endpoints
4. **Configure Email** (Optional) - Set up email for password reset functionality

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review project documentation in `README.md`
3. Check your `.env` configuration
4. Verify all prerequisites are installed

---

**Created:** May 2026  
**Last Updated:** May 2026
