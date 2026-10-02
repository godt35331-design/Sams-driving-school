const Booking = require('../models/Booking');
const User = require('../models/User');

// POST /api/bookings (Create booking)
exports.createBooking = async (req, res) => {
  try {
    const {
      candidateName,
      candidateEmail,
      candidatePhone,
      postcode,
      courseId,
      courseName,
      transmission,
      experience,
      preferredDates,
      preferredTime,
      price,
      notes
    } = req.body;

    if (!candidateName || !candidateEmail || !courseName) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and course selection are required to book.'
      });
    }

    const cleanEmail = candidateEmail.trim().toLowerCase();
    const userId = req.user ? req.user._id : null;

    const booking = await Booking.create({
      userId: userId,
      candidateName: candidateName.trim(),
      candidateEmail: cleanEmail,
      candidatePhone: candidatePhone ? candidatePhone.trim() : '',
      postcode: postcode ? postcode.trim().toUpperCase() : '',
      courseId: courseId || null,
      courseName: courseName,
      transmission: transmission || 'Manual',
      experience: experience || 'beginner',
      preferredDates: Array.isArray(preferredDates) ? preferredDates : (preferredDates ? [preferredDates] : []),
      preferredTime: preferredTime || 'Flexible',
      price: Number(price) || 0,
      notes: notes ? notes.trim() : ''
    });

    res.status(201).json({
      success: true,
      message: 'Booking submitted successfully! Our examiner will verify your schedule.',
      booking: booking
    });
  } catch (err) {
    console.error('[Create Booking Error]:', err);
    res.status(500).json({
      success: false,
      message: 'Error submitting booking.'
    });
  }
};

// GET /api/bookings/my (Get current user bookings)
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      $or: [
        { userId: req.user._id },
        { candidateEmail: req.user.email }
      ]
    }).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      count: bookings.length,
      bookings: bookings
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving bookings.' });
  }
};
