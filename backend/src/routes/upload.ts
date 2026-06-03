import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { rateLimit } from 'express-rate-limit';
import upload from '../middleware/multer.js';
import attachUser from '../middleware/attachUser.js';
import requireRole from '../middleware/requireRole.js';
import { handleUpload } from '../controllers/uploadController.js';

const router = Router();

// Stricter rate limit on upload: 10 uploads per 15 minutes per IP
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many uploads from this IP. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Protect with requireAuth -> attachUser -> requireRole -> upload -> handleUpload
router.post(
  '/',
  requireAuth(),
  attachUser,
  requireRole(['student', 'educator', 'admin']),
  uploadLimiter,
  upload.single('file'),
  handleUpload
);

export default router;
