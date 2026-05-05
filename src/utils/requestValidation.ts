import { z } from 'zod';
import { ApiError } from './apiError';

export const positiveIntSchema = z.coerce.number().int().positive('Harus berupa bilangan bulat positif');

function isValidIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus berformat ISO YYYY-MM-DD')
  .refine(isValidIsoDate, 'Tanggal tidak valid');

export const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).trim().email('Format email tidak valid').transform((s) => s.toLowerCase()),
  password: z.string({ required_error: 'Password is required' }).min(8, 'Password minimal 8 karakter'),
});

export const forgotPasswordSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).trim().email('Format email tidak valid').transform((s) => s.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string({ required_error: 'Token is required' }).min(10, 'Token reset tidak valid'),
  newPassword: z.string({ required_error: 'New password is required' }).min(8, 'Password minimal 8 karakter'),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().trim().min(3).max(200, 'Nama maksimal 200 karakter').optional(),
  address: z.string().trim().max(500).optional(),
  phone_number: z.string().trim().min(3).max(32).optional(),
  profile_picture_url: z.string().trim().url('profile_picture_url harus berupa URL').optional(),
});

export const isoDateTimeSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Datetime harus valid');

export const attendanceUpdateSchema = z.object({
  clock_in: isoDateTimeSchema.optional(),
  clock_out: isoDateTimeSchema.optional(),
  status: z.string().trim().optional(),
});

export const activityLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  userId: z.coerce.number().int().min(1).optional(),
  action: z.string().trim().optional(),
});

export const payrollGenerateSchema = z.object({
  period: isoDateSchema.optional(),
});

export const userCreateSchema = z.object({
  departmentId: z.number().int().nullable().optional(),
  name: z.string({ required_error: 'Name is required' }).trim().min(3, 'Name must be at least 3 characters').max(200, 'Name maksimal 200 karakter'),
  email: z.string({ required_error: 'Email is required' }).trim().email('Format email tidak valid').transform((s) => s.toLowerCase()),
  password: z.string({ required_error: 'Password is required' }).min(8, 'Password minimal 8 karakter'),
  role: z.enum(['admin', 'manager', 'staff'], { required_error: 'Role is required' }),
  baseSalary: z.number().nonnegative().optional(),
  managerId: z.number().int().nullable().optional(),
});

export const userUpdateSchema = z.object({
  departmentId: z.number().int().nullable().optional(),
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(200, 'Name maksimal 200 karakter').optional(),
  email: z.string().trim().email('Format email tidak valid').transform((s) => s.toLowerCase()).optional(),
  password: z.string().min(8, 'Password minimal 8 karakter').optional(),
  role: z.enum(['admin', 'manager', 'staff']).optional(),
  baseSalary: z.number().nonnegative().optional(),
  managerId: z.number().int().nullable().optional(),
});

export const leaveRequestSchema = z
  .object({
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    type: z.string().trim().min(1, 'Type cuti wajib diisi'),
    attachmentUrl: z.string().trim().optional(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: 'start_date harus kurang dari atau sama dengan end_date',
    path: ['endDate'],
  });

export const reimbursementSubmitSchema = z.object({
  title: z.string().trim().min(1, 'Title wajib diisi').optional(),
  description: z.string().trim().min(1, 'Description wajib diisi'),
  amount: z.coerce.number().positive('Amount harus lebih besar dari 0'),
  attachmentUrl: z.string().trim().optional(),
});

export const payrollAdjustmentSchema = z.object({
  type: z.enum(['allowance', 'deduction']),
  amount: z.coerce.number().positive('Amount harus lebih besar dari 0'),
  description: z.string().trim().optional(),
  referenceId: z.string().trim().optional(),
});

export const attendanceHistoryQuerySchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: 'from harus kurang dari atau sama dengan to',
    path: ['to'],
  });

export function parseWithSchema<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    const message = result.error.issues
      .map((issue) => issue.message)
      .join('; ');
    throw new ApiError(400, message || 'Validation failed', true, errors);
  }

  return result.data;
}