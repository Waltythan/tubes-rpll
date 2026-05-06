import multer, { StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { ApiError } from './apiError';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed MIME types for images
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Configure storage
const storage: StorageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_random_originalname
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const filename = `${timestamp}_${randomStr}_${basename}${ext}`;
    cb(null, filename);
  }
});

// File filter to validate image files
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `Only image files are allowed. Received: ${file.mimetype}`));
  }
};

// Create multer instance
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

export const ALLOWED_IMAGE_MIMES = ALLOWED_MIME_TYPES;
export const MAX_UPLOAD_SIZE = MAX_FILE_SIZE;
export const UPLOADS_DIR = uploadsDir;
