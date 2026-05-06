import crypto from 'crypto';
import pool from '../../services/db';
import { attendanceService } from '../../services/attendanceService';
import { isOfficeIp } from '../../utils/ipCheck';

jest.mock('../../services/db', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
  },
}));

jest.mock('../../utils/ipCheck', () => ({
  __esModule: true,
  isOfficeIp: jest.fn(),
}));

const mockedPool = pool as unknown as { connect: jest.Mock };
const mockedIsOfficeIp = isOfficeIp as jest.MockedFunction<typeof isOfficeIp>;

describe('attendanceService', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedPool.connect.mockResolvedValue(mockClient as any);
  });

  describe('generateQrToken', () => {
    it('should reject invalid user ids', async () => {
      await expect(attendanceService.generateQrToken(Number.NaN)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid user id',
      });
    });

    it('should revoke old tokens and create a new QR token', async () => {
      const randomBytesSpy = jest.spyOn(crypto, 'randomBytes') as unknown as jest.SpyInstance<Buffer, [number]>;
      randomBytesSpy.mockReturnValue(Buffer.alloc(24, 0x11));
      mockClient.query.mockResolvedValue({});

      const result = await attendanceService.generateQrToken(14);

      expect(result.qrToken).toBe('11'.repeat(24));
      expect(result.qrUrl).toContain('/attendance/confirm?token=');
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(2, 'UPDATE qr_tokens SET revoked = TRUE WHERE user_id = $1 AND used = FALSE', [14]);
      expect(mockClient.query).toHaveBeenNthCalledWith(
        3,
        'INSERT INTO qr_tokens (user_id, token, expires_at, revoked, used, "createdAt", "updatedAt") VALUES ($1, $2, $3, FALSE, FALSE, NOW(), NOW())',
        [14, '11'.repeat(24), expect.any(String)]
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(4, 'COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      randomBytesSpy.mockRestore();
    });
  });

  describe('checkIn', () => {
    it('should reject check-in from a non-office IP address', async () => {
      mockedIsOfficeIp.mockReturnValue(false);

      await expect(
        attendanceService.checkIn({
          userId: 14,
          qrToken: 'token',
          clientIp: '8.8.8.8',
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Check-in only allowed from office network',
      });
      expect(mockedPool.connect).not.toHaveBeenCalled();
    });

    it('should prevent duplicate attendance for the same day', async () => {
      mockedIsOfficeIp.mockReturnValue(true);
      mockClient.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              token: 'token',
              user_id: 14,
              expires_at: new Date(Date.now() + 60_000).toISOString(),
              used: false,
              revoked: false,
            },
          ],
        })
        .mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505' }))
        .mockResolvedValueOnce({});

      await expect(
        attendanceService.checkIn({
          userId: 14,
          qrToken: 'token',
          clientIp: '192.168.1.10',
          now: new Date('2026-05-06T01:00:00.000Z'),
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Anda sudah melakukan check-in hari ini.',
      });
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});