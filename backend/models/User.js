const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Candidate name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [4, 'Password must be at least 4 characters long'],
      select: false // Do not return password by default in queries
    },
    role: {
      type: String,
      enum: ['learner', 'admin'],
      default: 'learner'
    },
    trackingNumber: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true
    },
    dob: {
      type: String,
      default: 'N/A'
    },
    licenceLast4: {
      type: String,
      default: '8492',
      maxlength: [10, 'Licence code segment too long']
    },
    theoryStatus: {
      type: String,
      enum: ['passed', 'not_passed'],
      default: 'not_passed'
    },
    theoryPassed: {
      type: Boolean,
      default: false
    },
    practicalHistory: {
      type: String,
      enum: ['first_time', 'previous_attempt'],
      default: 'first_time'
    },
    currentStep: {
      type: Number,
      min: 1,
      max: 4,
      default: 1
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 25
    },
    phone: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    postcode: {
      type: String,
      default: ''
    },
    transmissionPreference: {
      type: String,
      enum: ['manual', 'automatic', 'undecided'],
      default: 'undecided'
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'completed'],
      default: 'active'
    },
    instructorNotes: {
      type: String,
      default: ''
    },
    testCentre: {
      type: String,
      default: 'Mill Hill'
    },
    targetTestDate: {
      type: String,
      default: ''
    },
    coursePackage: {
      type: String,
      default: '10-Hour Starter Block (£350)'
    },
    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'retest', 'undecided'],
      default: 'beginner'
    },
    // Admin Customizable Process Flow
    processFlow: [
      {
        stepId: { type: String },
        stepNumber: { type: Number },
        title: { type: String },
        shortDesc: { type: String, default: '' },
        enabled: { type: Boolean, default: true },
        status: { type: String, enum: ['completed', 'current', 'upcoming', 'locked'], default: 'upcoming' },
        progress: { type: Number, default: 0 }
      }
    ],
    // Admin Customizable Installment Payment Plan (e.g. 3 installments)
    paymentPlan: {
      totalAmount: { type: Number, default: 0 },
      currency: { type: String, default: 'GBP' },
      installmentCount: { type: Number, default: 3 },
      notes: { type: String, default: '' },
      installments: [
        {
          installmentNumber: { type: Number },
          title: { type: String, default: '' },
          amount: { type: Number, default: 0 },
          dueDate: { type: String, default: '' },
          status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
          paidAt: { type: Date },
          paymentMethod: { type: String, default: 'Bank Transfer / Card' }
        }
      ]
    },
    lastLoginAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// High-Frequency Query Index: Covers admin learner listings, pipeline step filtering, and chronological sorting
UserSchema.index({ role: 1, currentStep: 1, createdAt: -1 });

// Auto-generate tracking number for learners & encrypt password
UserSchema.pre('save', async function () {
  if (this.role === 'learner' && !this.trackingNumber) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    this.trackingNumber = `SAM-UK-${randomDigits}`;
  }
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare candidate password with stored hash
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token for session management
UserSchema.methods.generateAuthToken = function () {
  const secret = process.env.JWT_SECRET || 'mrsam_driving_jwt_fallback_secret_key_2026';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      role: this.role,
      name: this.name
    },
    secret,
    { expiresIn }
  );
};

// Safe JSON serialization
UserSchema.methods.toCleanJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
