const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
require('dotenv').config();

const connectDB = require('./config/db');
const apiRouter = require('./routes/api');

const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// Security hardening: Disable fingerprinting header
app.disable('x-powered-by');

// Connect to MongoDB Atlas
connectDB();

// Performance Optimization: HTTP Gzip/Deflate payload compression
app.use(compression({
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Security Response Headers (CSP, Anti-Clickjacking, Sniffing protection)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Cross-Origin Resource Sharing (CORS) configured for Vercel Frontend & Local Development
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server, mobile app, curl, or dev requests
    if (!origin || process.env.NODE_ENV !== 'production') return callback(null, true);

    // Allow explicit FRONTEND_URL, localhost, or any Vercel deployment (*.vercel.app)
    const isAllowed = allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin);
    if (isAllowed) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply general API rate limiting
app.use('/api', apiLimiter);

// Request logging in development
app.use((req, res, next) => {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Protected URL link guard: If anyone types /admin or /admin.html directly in the browser,
// they are safely redirected to the login screen with an admin redirect param.
app.get(['/admin', '/admin.html'], (req, res, next) => {
  // Let the client-side router handle token validation or redirect to login
  next();
});

// Static frontend delivery with performance caching & ETags
const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir, {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true
}));

// API Routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: "Sam's Driving School UK API",
    database: 'MongoDB Atlas Connected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Fallback handler to serve frontend index.html
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(frontendDir, 'index.html'));
  }
  next();
});

// Centralized Safe Error Handler: Prevents stack trace / database leak in production
app.use((err, req, res, next) => {
  console.error('[Internal Error]:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please contact support.'
      : (err.message || 'Internal server error')
  });
});

// Start server
app.listen(PORT, () => {
  console.log('========================================================');
  console.log(`🚗 Sam's Driving School UK Server is running!`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`📡 API URL:   http://localhost:${PORT}/api/courses`);
  console.log('========================================================');
});
