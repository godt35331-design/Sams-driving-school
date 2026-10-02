const express = require('express');
const router = express.Router();

const { protect, requireAdmin, optionalAuth, sanitizeInput } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');
const candidateController = require('../controllers/candidateController');
const bookingController = require('../controllers/bookingController');
const courseController = require('../controllers/courseController');
const reviewController = require('../controllers/reviewController');
const adminController = require('../controllers/adminController');

// Global input sanitizer for NoSQL injection prevention
router.use(sanitizeInput);

// ==========================================
// 1. Authentication Routes (JWT + bcrypt + Rate Limiter)
// ==========================================
router.post('/auth/register', authController.register);
router.post('/auth/login', authLimiter, authController.login);
router.get('/auth/me', protect, authController.getMe);
router.put('/auth/profile', protect, authController.updateProfile);

// ==========================================
// 2. Candidate Onboarding & Email Dispatch
// ==========================================
router.post('/candidate/onboard', optionalAuth, candidateController.onboardCandidate);

// ==========================================
// 3. Courses & Reviews (Public)
// ==========================================
router.get('/courses', courseController.getCourses);
router.get('/courses/:slug', courseController.getCourseBySlug);
router.get('/reviews', reviewController.getReviews);

// ==========================================
// 4. Learner Bookings
// ==========================================
router.post('/bookings', optionalAuth, bookingController.createBooking);
router.get('/bookings/my', protect, bookingController.getMyBookings);

// ==========================================
// 5. Protected Admin Routes (JWT + requireAdmin)
//    Guarded against URL guessing and privilege escalation
// ==========================================
router.get('/admin/stats', protect, requireAdmin, adminController.getStats);

// Learner Management
router.get('/admin/learners', protect, requireAdmin, adminController.getLearners);
router.post('/admin/learners', protect, requireAdmin, adminController.createLearner);
router.put('/admin/learners/:id', protect, requireAdmin, adminController.updateLearner);
router.put('/admin/learners/:id/reset-password', protect, requireAdmin, adminController.resetLearnerPassword);
router.post('/admin/learners/:id/send-email', protect, requireAdmin, adminController.sendCandidateEmail);
router.delete('/admin/learners/:id', protect, requireAdmin, adminController.deleteLearner);

// Bookings Management
router.get('/admin/bookings', protect, requireAdmin, adminController.getBookings);
router.post('/admin/bookings', protect, requireAdmin, adminController.createBooking);
router.put('/admin/bookings/:id', protect, requireAdmin, adminController.updateBooking);
router.delete('/admin/bookings/:id', protect, requireAdmin, adminController.deleteBooking);

// Courses & Reviews Management
router.post('/admin/courses', protect, requireAdmin, courseController.createCourse);
router.put('/admin/courses/:id', protect, requireAdmin, courseController.updateCourse);
router.delete('/admin/courses/:id', protect, requireAdmin, courseController.deleteCourse);

router.post('/admin/reviews', protect, requireAdmin, reviewController.createReview);
router.put('/admin/reviews/:id', protect, requireAdmin, reviewController.updateReview);
router.delete('/admin/reviews/:id', protect, requireAdmin, reviewController.deleteReview);

module.exports = router;
