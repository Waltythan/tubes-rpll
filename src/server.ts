import 'reflect-metadata';
import express from 'express';
import dotenv from 'dotenv';
import { ApiError } from './utils/apiError';
import attendanceRouter from './routes/attendance';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import leavesRouter from './routes/leaves';
import reimbursementsRouter from './routes/reimbursements';
import payrollRouter from './routes/payroll';
import profilesRouter from './routes/profiles';
import activityLogsRouter from './routes/activityLogs';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/attendance', attendanceRouter);
app.use('/leaves', leavesRouter);
app.use('/reimbursements', reimbursementsRouter);
app.use('/payroll', payrollRouter);
app.use('/profiles', profilesRouter);
app.use('/activity-logs', activityLogsRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
      code: error.statusCode,
    });
  }

  console.error(error);
  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    code: 500,
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
