import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { jwtAuth } from '../middleware/auth';
import { uploadMiddleware, UPLOADS_DIR } from '../utils/multerConfig';
import { uploadImageService } from '../services/uploadImageService';
import { sendResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { parseWithSchema, positiveIntSchema } from '../utils/requestValidation';
import { extractClientIp } from '../utils/ipCheck';

const router = express.Router();

// POST /upload/image - Upload a single image
router.post(
  '/image',
  jwtAuth,
  uploadMiddleware.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as any;
      const userId = parseWithSchema(positiveIntSchema, authReq.user?.id);

      // Validate file was uploaded
      if (!req.file) {
        throw new ApiError(400, 'No file uploaded');
      }

      // Create upload record in database
      const uploadRecord = await uploadImageService.createUploadRecord({
        userId,
        filename: req.file.filename,
        url: `/uploads/${req.file.filename}`,
        mimeType: req.file.mimetype,
        fileSize: req.file.size
      });

      sendResponse(res, 201, 'Image uploaded successfully', {
        id: uploadRecord.id,
        url: `${process.env.API_BASE_URL || 'http://localhost:5000'}/uploads/${req.file.filename}`,
        filename: req.file.filename,
        uploadedAt: uploadRecord.created_at
      });
    } catch (error) {
      // Clean up uploaded file if database save failed
      if (req.file) {
        const filePath = path.join(UPLOADS_DIR, req.file.filename);
        fs.unlink(filePath, (err) => {
          if (err) console.error('Failed to delete temp file:', err);
        });
      }
      next(error);
    }
  }
);

// GET /upload/recent - Get recently uploaded images for the user
router.get('/recent', jwtAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as any;
    const userId = parseWithSchema(positiveIntSchema, authReq.user?.id);
    
    // Allow limit parameter (1-50)
    const limit = Math.min(Math.max(parseInt(String(req.query.limit) || '20'), 1), 50);

    const uploads = await uploadImageService.getRecentUploads(userId, limit);

    const formattedUploads = uploads.map((upload) => ({
      id: upload.id,
      url: `${process.env.API_BASE_URL || 'http://localhost:5000'}/uploads/${upload.filename}`,
      filename: upload.filename,
      mimeType: upload.mime_type,
      fileSize: upload.file_size,
      uploadedAt: upload.created_at
    }));

    sendResponse(res, 200, 'Recent uploads retrieved', formattedUploads);
  } catch (error) {
    next(error);
  }
});

// DELETE /upload/:uploadId - Delete a specific upload
router.delete('/:uploadId', jwtAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as any;
    const userId = parseWithSchema(positiveIntSchema, authReq.user?.id);
    const uploadId = parseWithSchema(positiveIntSchema, req.params.uploadId);

    await uploadImageService.deleteUpload(uploadId, userId);

    sendResponse(res, 200, 'Upload deleted successfully', { id: uploadId });
  } catch (error) {
    next(error);
  }
});

// Serve uploaded files statically
router.use('/uploads', express.static(UPLOADS_DIR));

export default router;
