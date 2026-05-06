import bcrypt from 'bcrypt';
import pool from '../../services/db';
import { authService } from '../../services/authService';
import { generateAccessToken, generatePasswordResetToken, verifyPasswordResetToken } from '../../utils/jwtHelper';

jest.mock('../../services/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    compare: jest.fn(),
    hash: jest.fn(),
  },
}));

jest.mock('../../utils/jwtHelper', () => ({
  __esModule: true,
  generateAccessToken: jest.fn(),
  generatePasswordResetToken: jest.fn(),
  verifyPasswordResetToken: jest.fn(),
}));

const mockedPool = pool as unknown as { query: jest.Mock };
const mockedBcrypt = bcrypt as unknown as { compare: jest.Mock; hash: jest.Mock };
const mockedGenerateAccessToken = generateAccessToken as jest.MockedFunction<typeof generateAccessToken>;
const mockedGeneratePasswordResetToken = generatePasswordResetToken as jest.MockedFunction<typeof generatePasswordResetToken>;
const mockedVerifyPasswordResetToken = verifyPasswordResetToken as jest.MockedFunction<typeof verifyPasswordResetToken>;

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return access token and user when credentials are valid', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            user_id: 7,
            email: 'staff@example.com',
            password: 'hashed-password',
            role: 'staff',
            manager_id: 2,
            department_id: 5,
          },
        ],
      });
      mockedBcrypt.compare.mockResolvedValueOnce(true);
      mockedGenerateAccessToken.mockReturnValue('access-token');

      const result = await authService.login('staff@example.com', 'correct-password', '10.0.0.10');

      expect(result).toEqual({
        accessToken: 'access-token',
        user: {
          id: 7,
          email: 'staff@example.com',
          role: 'staff',
          managerId: 2,
          departmentId: 5,
        },
      });
      expect(mockedGenerateAccessToken).toHaveBeenCalledWith({
        id: '7',
        role: 'staff',
        managerId: '2',
        departmentId: '5',
      });
    });

    it('should log failed login and reject wrong password', async () => {
      mockedPool.query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              user_id: 7,
              email: 'staff@example.com',
              password: 'hashed-password',
              role: 'staff',
              manager_id: null,
              department_id: null,
            },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: 7 }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] });
      mockedBcrypt.compare.mockResolvedValueOnce(false);

      await expect(authService.login('staff@example.com', 'wrong-password', '127.0.0.1')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Email atau password salah',
      });
    });
  });

  describe('forgotPassword', () => {
    it('should store reset token for existing user without exposing account existence', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: 12, email: 'reset@example.com' }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] });
      mockedGeneratePasswordResetToken.mockReturnValue('reset-token');

      await expect(authService.forgotPassword('reset@example.com')).resolves.toBeUndefined();

      expect(mockedGeneratePasswordResetToken).toHaveBeenCalledWith('12', 15);
      expect(authService.getLatestResetToken('reset@example.com')).toEqual({
        token: 'reset-token',
        expiresAt: expect.any(String),
      });
    });

    it('should return silently when email is unknown', async () => {
      mockedPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(authService.forgotPassword('missing@example.com')).resolves.toBeUndefined();
      expect(mockedGeneratePasswordResetToken).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reject invalid password reset tokens before database updates', async () => {
      mockedVerifyPasswordResetToken.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(authService.resetPassword('bad-token', 'new-password')).rejects.toMatchObject({
        statusCode: 400,
        message: 'Token tidak valid atau sudah kedaluwarsa',
      });
      expect(mockedPool.query).not.toHaveBeenCalled();
    });
  });
});