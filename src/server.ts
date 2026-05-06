import dotenv from 'dotenv';
import path from 'path';

// ⚠️ CRITICAL: Load .env BEFORE any service imports
// Services import db.ts which creates pool at module load time
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import activityLogsRouter from './routes/activityLogs';
import attendanceRouter from './routes/attendance';
import authRouter from './routes/auth';
import leavesRouter from './routes/leaves';
import payrollRouter from './routes/payroll';
import profilesRouter from './routes/profiles';
import reimbursementsRouter from './routes/reimbursements';
import usersRouter from './routes/users';
import { ApiError } from './utils/apiError';

const app = express();
const port = process.env.PORT || 5000;

// --- TRUST PROXY (untuk mengambil IP address yang sebenarnya dari reverse proxy) ---
app.set('trust proxy', 1);

// --- 1. MIDDLEWARE ---
app.use(express.json());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? [process.env.CLIENT_URL || 'http://localhost:5173'] : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Retry-After', 'RateLimit-Reset', 'X-RateLimit-Reset'],
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

// Centralized API error handler for non-attendance routes.
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
            status: 'error',
            message: error.message || 'Validation failed',
            errors: error.details ?? undefined,
            code: error.statusCode,
        });
    }

    console.error('Unhandled error:', error);
    return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        code: 500,
    });
});

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
