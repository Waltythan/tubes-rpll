import pool from './db';
import { ApiError } from '../utils/apiError';

export const uploadImageService = {
  async createUploadRecord(params: {
    userId: number;
    filename: string;
    url: string;
    mimeType: string;
    fileSize?: number;
  }) {
    try {
      const result = await pool.query(
        `INSERT INTO uploaded_images (user_id, filename, url, mime_type, file_size)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, filename, url, mime_type, file_size, created_at`,
        [params.userId, params.filename, params.url, params.mimeType, params.fileSize || null]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating upload record:', error);
      throw new ApiError(500, 'Failed to save upload record to database');
    }
  },

  async getRecentUploads(userId: number, limit: number = 20) {
    try {
      const result = await pool.query(
        `SELECT id, user_id, filename, url, mime_type, file_size, created_at
         FROM uploaded_images
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching recent uploads:', error);
      throw new ApiError(500, 'Failed to fetch recent uploads');
    }
  },

  async deleteUpload(uploadId: number, userId: number) {
    try {
      // First, check if upload belongs to user
      const checkResult = await pool.query(
        `SELECT id, filename FROM uploaded_images WHERE id = $1 AND user_id = $2`,
        [uploadId, userId]
      );

      if (checkResult.rowCount === 0) {
        throw new ApiError(404, 'Upload not found or unauthorized');
      }

      // Delete from database
      await pool.query(`DELETE FROM uploaded_images WHERE id = $1`, [uploadId]);

      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Error deleting upload:', error);
      throw new ApiError(500, 'Failed to delete upload');
    }
  }
};
