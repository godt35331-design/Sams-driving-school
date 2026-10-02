const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Reviewer name is required'],
      trim: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 5
    },
    passType: {
      type: String,
      default: '1st Time Pass'
    },
    testCentre: {
      type: String,
      default: 'Mill Hill'
    },
    comment: {
      type: String,
      required: [true, 'Review text is required']
    },
    initials: {
      type: String,
      default: ''
    },
    minors: {
      type: Number,
      default: 0
    },
    verified: {
      type: Boolean,
      default: true
    },
    avatar: {
      type: String,
      default: ''
    },
    date: {
      type: String,
      default: () => new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    }
  },
  {
    timestamps: true
  }
);

// High-Frequency Query Index: Covers public verified reviews sorted by newest
ReviewSchema.index({ verified: 1, createdAt: -1 });

module.exports = mongoose.model('Review', ReviewSchema);
