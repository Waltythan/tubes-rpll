import bcrypt from 'bcrypt';
import pool from '../../services/db';
import { passwordResetService } from '../../services/passwordResetService';

jest.mock('../../services/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
  },
}));

const mockedPool = pool as unknown as {
  query: jest.Mock;
  connect: jest.Mock;
};

const mockedBcrypt = bcrypt as unknown as {
  hash: jest.Mock;
};

describe('passwordResetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestReset', () => {
    it('should return silently when email is unknown', async () => {
      mockedPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(passwordResetService.requestReset('missing@example.com')).resolves.toBeUndefined();
      expect(mockedPool.query).toHaveBeenCalledTimes(1);
    });

    it('should create pending request when user exists', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: 10 }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] });

      await expect(passwordResetService.requestReset('staff@example.com')).resolves.toBeUndefined();
      expect(mockedPool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('approveRequest', () => {
    it('should hash default password and approve pending request', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 5, user_id: 8, status: 'PENDING' }] })
          .mockResolvedValueOnce({ rowCount: 1, rows: [] })
          .mockResolvedValueOnce({ rowCount: 1, rows: [] })
          .mockResolvedValueOnce({}),
        release: jest.fn(),
      };

      mockedPool.connect.mockResolvedValueOnce(mockClient);
      mockedBcrypt.hash.mockResolvedValueOnce('hashed-password123');

      await expect(passwordResetService.approveRequest(5)).resolves.toEqual({ id: 5, status: 'APPROVED' });

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reject already processed requests', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 5, user_id: 8, status: 'APPROVED' }] })
          .mockResolvedValueOnce({}),
        release: jest.fn(),
      };

      mockedPool.connect.mockResolvedValueOnce(mockClient);

      await expect(passwordResetService.approveRequest(5)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Reset request sudah diproses',
      });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reject when linked user is missing', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 6, user_id: 999, status: 'PENDING' }] })
          .mockResolvedValueOnce({ rowCount: 0, rows: [] })
          .mockResolvedValueOnce({}),
        release: jest.fn(),
      };

      mockedPool.connect.mockResolvedValueOnce(mockClient);
      mockedBcrypt.hash.mockResolvedValueOnce('hashed-password123');

      await expect(passwordResetService.approveRequest(6)).rejects.toMatchObject({
        statusCode: 404,
        message: 'User tidak ditemukan untuk reset request ini',
      });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('rejectRequest', () => {
    it('should reject pending request', async () => {
      mockedPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 8 }] });

      await expect(passwordResetService.rejectRequest(8)).resolves.toEqual({ id: 8, status: 'REJECTED' });
    });

    it('should return not found for unknown request id', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(passwordResetService.rejectRequest(99)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Reset request tidak ditemukan',
      });
    });
  });
});
