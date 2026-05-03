import dotenv from 'dotenv';
import path from 'path';

// ⚠️ CRITICAL: Load .env BEFORE any service imports
// Services import db.ts which creates pool at module load time
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import attendanceRouter from './routes/attendance';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import profilesRouter from './routes/profiles';
import leavesRouter from './routes/leaves';
import reimbursementsRouter from './routes/reimbursements';
import payrollRouter from './routes/payroll';
import activityLogsRouter from './routes/activityLogs';

const app = express();
const port = process.env.PORT || 5000;

// --- 1. MIDDLEWARE ---
app.use(express.json());
app.use(cors({
    origin: [
    'http://localhost',      // Origin dari error kamu
    'http://localhost:80',   // Origin alternatif
    'http://localhost:3000', // Jika kamu pakai React dev server (Vite/CRA)
    'http://127.0.0.1'       // Untuk jaga-jaga
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// --- 2. ROUTES ---
app.get('/', (req: Request, res: Response) => {
    res.json({ success: true, message: 'CRM API is Running' });
});

app.use('/attendance', attendanceRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/profiles', profilesRouter);
app.use('/leaves', leavesRouter);
app.use('/reimbursements', reimbursementsRouter);
app.use('/payroll', payrollRouter);
app.use('/activity-logs', activityLogsRouter);

// --- 3. DATABASE & SERVER START ---
// Use Sequelize instance created by the Sequelize CLI models index
// require the JS module emitted by sequelize-cli (located at project root)
// @ts-ignore
const db: any = require('../models');

db.sequelize
    .authenticate()
    .then(() => {
        console.log('✅ PostgreSQL Connected.');
        app.listen(port, () => {
            console.log(`🚀 Server running on port ${port}`);
            console.log(`📡 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
        });
    })
    .catch((err: any) => {
        console.error('❌ Database Connection Error:', err);
        process.exit(1);
    });

export default app;
