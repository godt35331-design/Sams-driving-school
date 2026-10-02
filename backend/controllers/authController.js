const User = require('../models/User');
const { authLimiter } = require('../middleware/rateLimiter');

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, licenceLast4, adminKey } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email, and password.'
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 4 characters long.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please sign in.'
      });
    }

    // Security Guard: Public self-registration is closed.
    // Candidate accounts must be provisioned directly by administration via admin panel.
    const masterKey = process.env.ADMIN_SECRET_KEY;
    if (!masterKey || adminKey !== masterKey) {
      return res.status(403).json({
        success: false,
        message: 'Public candidate self-registration is closed. Student accounts are provisioned exclusively by administration.'
      });
    }

    const role = 'admin';

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: password, // Pre-save hook hashes with bcrypt
      licenceLast4: licenceLast4 ? licenceLast4.trim().toUpperCase() : '8492',
      role: role
    });

    const token = user.generateAuthToken();

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token: token,
      user: user.toCleanJSON()
    });
  } catch (err) {
    console.error('[Register Error]:', err);
    res.status(500).json({
      success: false,
      message: 'Server error creating account. Please try again.'
    });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter both email and password.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find user with password field explicitly selected
    const user = await User.findOne({ email: cleanEmail }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Compare bcrypt hash
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'This account is suspended. Please contact support.'
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Reset rate limiter hits on verified successful sign-in
    if (authLimiter && typeof authLimiter.reset === 'function') {
      authLimiter.reset(req);
    }

    const token = user.generateAuthToken();

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token: token,
      user: user.toCleanJSON()
    });
  } catch (err) {
    console.error('[Login Error]:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during sign in.'
    });
  }
};

// GET /api/auth/me (Protected)
exports.getMe = async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user.toCleanJSON()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PUT /api/auth/profile (Protected)
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, postcode, licenceLast4, transmissionPreference } = req.body;
    const user = req.user;

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (postcode !== undefined) user.postcode = postcode.trim().toUpperCase();
    if (licenceLast4) user.licenceLast4 = licenceLast4.trim().toUpperCase();
    if (transmissionPreference) user.transmissionPreference = transmissionPreference;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: user.toCleanJSON()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating profile.' });
  }
};
