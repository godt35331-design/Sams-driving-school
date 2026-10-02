const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    candidateName: {
      type: String,
      required: [true, 'Candidate name is required'],
      trim: true
    },
    candidateEmail: {
      type: String,
      required: [true, 'Candidate email is required'],
      trim: true,
      lowercase: true
    },
    candidatePhone: {
      type: String,
      default: ''
    },
    postcode: {
      type: String,
      default: ''
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: false
    },
    courseName: {
      type: String,
      required: [true, 'Course name is required']
    },
    transmission: {
      type: String,
      enum: ['Manual', 'Automatic'],
      default: 'Manual'
    },
    experience: {
      type: String,
      default: 'beginner'
    },
    preferredDates: {
      type: [String],
      default: []
    },
    preferredTime: {
      type: String,
      default: 'Flexible'
    },
    price: {
      type: Number,
      default: 0
    },
    depositPaid: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
      default: 'pending'
    },
    examinerAssigned: {
      type: String,
      default: 'Mr Sam (Grade A ADI)'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// High-Frequency Query Index: Covers admin booking status filtering and chronological sorting
BookingSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', BookingSchema);
