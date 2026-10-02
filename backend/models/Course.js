const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    badge: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    price: {
      type: Number,
      required: [true, 'Price is required']
    },
    duration: {
      type: String,
      default: ''
    },
    hours: {
      type: Number,
      default: 0
    },
    transmission: {
      type: String,
      enum: ['Manual', 'Automatic', 'Both'],
      default: 'Both'
    },
    features: {
      type: [String],
      default: []
    },
    isPopular: {
      type: Boolean,
      default: false
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    active: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Course', CourseSchema);
