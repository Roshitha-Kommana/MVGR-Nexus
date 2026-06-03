import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
// Route imports
import usersRouter from './routes/users.js';
import uploadRouter from './routes/upload.js';
import materialsRouter from './routes/materials.js';
import ratingsRouter from './routes/ratings.js';
import commentsRouter from './routes/comments.js';
import bookmarksRouter from './routes/bookmarks.js';
import reportsRouter from './routes/reports.js';
import notificationsRouter from './routes/notifications.js';
import adminRouter from './routes/admin.js';
import miscRouter from './routes/misc.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security and CORS config
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Build allowed origins list from env + hardcoded production URL
const allowedOrigins = [
  'http://localhost:5173', // Vite dev server
  'http://localhost:3000',
  'https://mvgrnexus.vercel.app', // Production frontend
  ...(process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(',').map((o) => o.trim())
    : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Rate Limiter: 1000 requests per 15 minutes per IP (relaxed from 100 to support active browsing/development)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

// Route mapping
app.use('/api/users', usersRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/materials', ratingsRouter); // Ratings upsert mounts as POST /api/materials/:id/rate
app.use('/api', commentsRouter);         // Threaded comment routes mount on /api directly
app.use('/api/bookmarks', bookmarksRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api', miscRouter);              // Autocomplete, regulations and public stats mount on /api

// Server health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', time: new Date() });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    message: 'An unexpected error occurred on the server.'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 MVGR Material Hub Backend running on port ${PORT}`);
});
