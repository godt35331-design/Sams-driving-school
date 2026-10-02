const Review = require('../models/Review');

// GET /api/reviews
exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ verified: true }).sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      count: reviews.length,
      reviews
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving reviews' });
  }
};

// Admin Review CRUD
exports.createReview = async (req, res) => {
  try {
    const review = await Review.create(req.body);
    res.status(201).json({ success: true, review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
