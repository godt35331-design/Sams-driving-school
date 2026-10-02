const Course = require('../models/Course');

// GET /api/courses
exports.getCourses = async (req, res) => {
  try {
    const { transmission } = req.query;
    const query = { active: true };
    if (transmission && transmission !== 'all') {
      query.transmission = { $in: [transmission, 'Both'] };
    }

    const courses = await Course.find(query).sort({ order: 1, createdAt: 1 });
    res.json({
      success: true,
      count: courses.length,
      courses
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving courses' });
  }
};

// GET /api/courses/:slug
exports.getCourseBySlug = async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving course' });
  }
};

// Admin Course CRUD
exports.createCourse = async (req, res) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
