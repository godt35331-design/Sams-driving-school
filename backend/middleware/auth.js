const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - JWT verification middleware
exports.protect = async (req, res, next) => {
  let token = null;

  // Check Authorization Bearer header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please sign in to continue.'
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'mrsam_driving_jwt_fallback_secret_key_2026';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The account associated with this session no longer exists.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'This account has been suspended. Please contact the administrator.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth Middleware] Invalid token:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Session expired or invalid. Please sign in again.'
    });
  }
};

// Require Admin role middleware
exports.requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Administrator credentials required to access this resource.'
    });
  }
  next();
};

// Optional auth (attaches user if present, doesn't fail if not)
exports.optionalAuth = async (req, res, next) => {
  let token = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'];
  }

  if (token) {
    try {
      const secret = process.env.JWT_SECRET || 'mrsam_driving_jwt_fallback_secret_key_2026';
      const decoded = jwt.verify(token, secret);
      req.user = await User.findById(decoded.id);
    } catch (e) {}
  }
  next();
};

// NoSQL injection sanitizer for request inputs
exports.sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};
