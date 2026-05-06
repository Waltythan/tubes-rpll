import dotenv from 'dotenv';
import path from 'path';

// ⚠️ CRITICAL: Load .env BEFORE any service imports
// Services import db.ts which creates pool at module load time
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import activityLogsRouter from './routes/activityLogs';
import attendanceRouter from './routes/attendance';
import authRouter from './routes/auth';
import leavesRouter from './routes/leaves';
import payrollRouter from './routes/payroll';
import profilesRouter from './routes/profiles';
import reimbursementsRouter from './routes/reimbursements';
import usersRouter from './routes/users';
import uploadsRouter from './routes/uploads';
import { ApiError } from './utils/apiError';
import { UPLOADS_DIR } from './utils/multerConfig';

const app = express();
const port = process.env.PORT || 5000;

// --- TRUST PROXY (untuk mengambil IP address yang sebenarnya dari reverse proxy) ---
app.set('trust proxy', 1);

// --- 1. MIDDLEWARE ---
app.use(express.json());
app.use(cors({
    origin: [
    'http://localhost',      // Origin dari error kamu
    'http://localhost:80',   // Origin alternatif
    'http://localhost:3000', // Jika kamu pakai React dev server (Vite/CRA)
    'http://localhost:5173', // Jika kamu pakai Vite default dev server
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

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

app.use('/attendance', attendanceRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/profiles', profilesRouter);
app.use('/leaves', leavesRouter);
app.use('/reimbursements', reimbursementsRouter);
app.use('/payroll', payrollRouter);
app.use('/activity-logs', activityLogsRouter);
app.use('/upload', uploadsRouter);

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

    if (error instanceof multer.MulterError) {
        const messageMap: Record<string, { statusCode: number; message: string }> = {
            LIMIT_FILE_SIZE: { statusCode: 413, message: 'File too large. Maximum size is 5MB.' },
            LIMIT_PART_COUNT: { statusCode: 400, message: 'Too many form parts.' },
            LIMIT_FILE_COUNT: { statusCode: 400, message: 'Too many files uploaded.' },
            LIMIT_FIELD_KEY: { statusCode: 400, message: 'Form field name is too long.' },
            LIMIT_FIELD_VALUE: { statusCode: 400, message: 'Form field value is too long.' },
            LIMIT_FIELD_COUNT: { statusCode: 400, message: 'Too many form fields.' },
            LIMIT_UNEXPECTED_FILE: { statusCode: 400, message: 'Unexpected file field.' },
        };

        const mapped = messageMap[error.code] ?? { statusCode: 400, message: error.message || 'Invalid upload request' };
        return res.status(mapped.statusCode).json({
            status: 'error',
            message: mapped.message,
            code: mapped.statusCode,
        });
    }

    if (typeof error === 'object' && error !== null && 'code' in error) {
        const dbError = error as { code?: string; detail?: string; message?: string };

        if (dbError.code === '23505') {
            return res.status(400).json({
                status: 'error',
                message: 'Duplicate data',
                code: 400,
            });
        }

        if (dbError.code === '23503') {
            return res.status(400).json({
                status: 'error',
                message: 'Referenced record does not exist',
                code: 400,
            });
        }

        if (dbError.code === '23502') {
            return res.status(400).json({
                status: 'error',
                message: 'Required field is missing',
                code: 400,
            });
        }

        if (dbError.code === '42703') {
            return res.status(500).json({
                status: 'error',
                message: 'Database schema mismatch detected',
                code: 500,
            });
        }

        if (dbError.code === '42P01') {
            return res.status(500).json({
                status: 'error',
                message: 'Database table not found',
                code: 500,
            });
        }

        if (dbError.code === '22P02') {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid input syntax',
                code: 400,
            });
        }
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
