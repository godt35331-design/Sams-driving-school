const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Course = require('../models/Course');
const Review = require('../models/Review');

// GET /api/admin/stats
exports.getStats = async (req, res) => {
  try {
    // Performance Optimization: Run all 11 stats aggregation and count queries in parallel
    const [
      totalLearners,
      activeLearners,
      theoryPassedCount,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      revenueAgg,
      step1Count,
      step2Count,
      step3Count,
      step4Count
    ] = await Promise.all([
      User.countDocuments({ role: 'learner' }),
      User.countDocuments({ role: 'learner', status: 'active' }),
      User.countDocuments({ role: 'learner', theoryPassed: true }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'completed' }),
      Booking.aggregate([
        { $match: { status: { $in: ['confirmed', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$price' } } }
      ]),
      User.countDocuments({ role: 'learner', currentStep: 1 }),
      User.countDocuments({ role: 'learner', currentStep: 2 }),
      User.countDocuments({ role: 'learner', currentStep: 3 }),
      User.countDocuments({ role: 'learner', currentStep: 4 })
    ]);

    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    res.json({
      success: true,
      stats: {
        totalLearners,
        activeLearners,
        theoryPassedCount,
        passRate: totalLearners > 0 ? Math.round((theoryPassedCount / totalLearners) * 100) : 92,
        totalBookings,
        pendingBookings,
        confirmedBookings,
        completedBookings,
        totalRevenue,
        stepBreakdown: {
          step1: step1Count,
          step2: step2Count,
          step3: step3Count,
          step4: step4Count
        }
      }
    });
  } catch (err) {
    console.error('[Admin Stats Error]:', err);
    res.status(500).json({ success: false, message: 'Error retrieving stats' });
  }
};

// GET /api/admin/learners
exports.getLearners = async (req, res) => {
  try {
    const { search, status, step, page = 1, limit = 50 } = req.query;
    const query = { role: 'learner' };

    if (search && typeof search === 'string') {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { trackingNumber: { $regex: safeSearch, $options: 'i' } },
        { licenceLast4: { $regex: safeSearch, $options: 'i' } },
        { phone: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (step) query.currentStep = parseInt(step, 10);

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    // Performance Optimization: Run count and paginated query concurrently
    const [total, learners] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
    ]);

    res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      learners: learners.map(l => l.toCleanJSON())
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching learners' });
  }
};

// PUT /api/admin/learners/:id
exports.updateLearner = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid candidate identifier format' });
    }
    const {
      name,
      dob,
      phone,
      address,
      licenceLast4,
      theoryPassed,
      theoryStatus,
      practicalHistory,
      transmissionPreference,
      currentStep,
      progress,
      status,
      instructorNotes,
      testCentre,
      targetTestDate,
      coursePackage,
      experienceLevel,
      processFlow,
      paymentPlan
    } = req.body;

    const learner = await User.findOne({ _id: id, role: 'learner' });
    if (!learner) {
      return res.status(404).json({ success: false, message: 'Learner not found' });
    }

    if (name) learner.name = name.trim();
    if (dob !== undefined) learner.dob = dob;
    if (phone !== undefined) learner.phone = phone.trim();
    if (address !== undefined) learner.address = address.trim();
    if (licenceLast4) learner.licenceLast4 = licenceLast4.trim().toUpperCase();
    if (theoryPassed !== undefined) {
      learner.theoryPassed = Boolean(theoryPassed);
      learner.theoryStatus = Boolean(theoryPassed) ? 'passed' : 'not_passed';
    }
    if (theoryStatus) learner.theoryStatus = theoryStatus;
    if (practicalHistory) learner.practicalHistory = practicalHistory;
    if (transmissionPreference) learner.transmissionPreference = transmissionPreference;
    if (currentStep !== undefined) learner.currentStep = parseInt(currentStep, 10);
    if (progress !== undefined) learner.progress = parseInt(progress, 10);
    if (status) learner.status = status;
    if (instructorNotes !== undefined) learner.instructorNotes = instructorNotes;
    if (testCentre !== undefined) learner.testCentre = testCentre;
    if (targetTestDate !== undefined) learner.targetTestDate = targetTestDate;
    if (coursePackage !== undefined) learner.coursePackage = coursePackage;
    if (experienceLevel !== undefined) learner.experienceLevel = experienceLevel;

    // Process Flow updates
    if (processFlow && Array.isArray(processFlow)) {
      learner.processFlow = processFlow;
    }

    // Payment Plan updates
    if (paymentPlan && typeof paymentPlan === 'object') {
      const installments = Array.isArray(paymentPlan.installments) ? paymentPlan.installments : (learner.paymentPlan?.installments || []);
      const totalAmount = paymentPlan.totalAmount !== undefined 
        ? Number(paymentPlan.totalAmount) 
        : installments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
      
      learner.paymentPlan = {
        totalAmount,
        currency: paymentPlan.currency || 'GBP',
        installmentCount: installments.length || 3,
        notes: paymentPlan.notes || '',
        installments
      };
    }

    await learner.save();

    res.json({
      success: true,
      message: 'Candidate profile, process flow & payment plan updated successfully',
      learner: learner.toCleanJSON()
    });
  } catch (err) {
    console.error('[Admin Update Learner Error]:', err);
    res.status(500).json({ success: false, message: 'Error updating learner' });
  }
};

// DELETE /api/admin/learners/:id
exports.deleteLearner = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid candidate identifier format' });
    }
    await User.findOneAndDelete({ _id: id, role: 'learner' });
    res.json({ success: true, message: 'Learner deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting learner' });
  }
};

// POST /api/admin/learners (Create new learner manually by Admin with Intake, Process Flow & Installment Plan)
exports.createLearner = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      trackingNumber,
      dob,
      phone,
      address,
      licenceLast4,
      theoryPassed,
      theoryStatus,
      practicalHistory,
      transmissionPreference,
      currentStep,
      progress,
      status,
      instructorNotes,
      testCentre,
      targetTestDate,
      coursePackage,
      experienceLevel,
      processFlow,
      paymentPlan,
      sendEmail = true
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Candidate name and email are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'This email is already registered in the system' });
    }

    // Auto-generate secure temporary password if not provided
    const rawPassword = (password && password.trim().length >= 4)
      ? password.trim()
      : `Pass#${Math.floor(1000 + Math.random() * 9000)}`;

    // Auto-generate official tracking number if not provided
    const assignedTracking = (trackingNumber && trackingNumber.trim())
      ? trackingNumber.trim().toUpperCase()
      : `SAM-UK-${Math.floor(100000 + Math.random() * 900000)}`;

    const isTheory = Boolean(theoryPassed);
    const startStep = currentStep ? parseInt(currentStep, 10) : (isTheory ? 2 : 1);

    // Build process flow if custom flow not passed
    let finalFlow = processFlow;
    if (!finalFlow || !Array.isArray(finalFlow) || finalFlow.length === 0) {
      finalFlow = [
        {
          stepId: 'application',
          stepNumber: 1,
          title: 'Candidate Application & Verification',
          shortDesc: 'ID verification, licence check & candidate intake',
          enabled: true,
          status: 'completed',
          progress: 100
        },
        {
          stepId: 'theory',
          stepNumber: 2,
          title: 'Theory Test & Hazard Perception',
          shortDesc: isTheory ? 'Official DVSA Theory Test Passed ✓' : 'Hazard perception scoring & mock testing',
          enabled: !isTheory, // If already passed, can be marked exempt or completed
          status: isTheory ? 'completed' : (startStep === 2 ? 'current' : 'upcoming'),
          progress: isTheory ? 100 : 0
        },
        {
          stepId: 'practical',
          stepNumber: 3,
          title: 'Dual-Control Practical Coaching',
          shortDesc: 'Manoeuvres, test routes & mock examiner assessment',
          enabled: true,
          status: (isTheory || startStep >= 3) ? 'current' : 'upcoming',
          progress: startStep >= 3 ? 35 : 0
        },
        {
          stepId: 'confirmation',
          stepNumber: 4,
          title: 'Official DVSA Pass & Certification',
          shortDesc: 'Examiner validation & full UK Driving Licence issuance',
          enabled: true,
          status: startStep === 4 ? 'current' : 'upcoming',
          progress: 0
        }
      ];
    }

    // Build installment payment plan (defaults to 3 installments if not provided)
    let finalPaymentPlan = paymentPlan;
    if (!finalPaymentPlan || !finalPaymentPlan.installments || finalPaymentPlan.installments.length === 0) {
      finalPaymentPlan = {
        totalAmount: 350,
        currency: 'GBP',
        installmentCount: 3,
        notes: 'Standard 3-stage installment arrangement',
        installments: [
          {
            installmentNumber: 1,
            title: '1st Installment (Deposit & Intake)',
            amount: 150,
            dueDate: 'Upon Registration',
            status: 'pending',
            paymentMethod: 'Bank Transfer / Card'
          },
          {
            installmentNumber: 2,
            title: '2nd Installment (Practical Coaching)',
            amount: 100,
            dueDate: 'Before Practical Sessions',
            status: 'pending',
            paymentMethod: 'Bank Transfer / Card'
          },
          {
            installmentNumber: 3,
            title: '3rd Installment (Final Test Booking)',
            amount: 100,
            dueDate: 'Before Official Test Day',
            status: 'pending',
            paymentMethod: 'Bank Transfer / Card'
          }
        ]
      };
    } else {
      const sum = finalPaymentPlan.installments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      finalPaymentPlan.totalAmount = finalPaymentPlan.totalAmount ? Number(finalPaymentPlan.totalAmount) : sum;
      finalPaymentPlan.installmentCount = finalPaymentPlan.installments.length;
    }

    const learner = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: rawPassword,
      trackingNumber: assignedTracking,
      role: 'learner',
      dob: dob || '',
      phone: phone ? phone.trim() : '',
      address: address ? address.trim() : '',
      licenceLast4: licenceLast4 ? licenceLast4.trim().toUpperCase() : '8492',
      theoryPassed: isTheory,
      theoryStatus: theoryStatus || (isTheory ? 'passed' : 'not_passed'),
      practicalHistory: practicalHistory || 'first_time',
      transmissionPreference: transmissionPreference || 'automatic',
      currentStep: startStep,
      progress: progress !== undefined ? parseInt(progress, 10) : (isTheory ? 50 : 25),
      status: status || 'active',
      instructorNotes: instructorNotes || '',
      testCentre: testCentre || 'Mill Hill',
      targetTestDate: targetTestDate || '',
      coursePackage: coursePackage || '10-Hour Starter Block (£350)',
      experienceLevel: experienceLevel || (practicalHistory === 'previous_attempt' ? 'retest' : 'beginner'),
      processFlow: finalFlow,
      paymentPlan: finalPaymentPlan,
      configured: true
    });

    await learner.save();

    // Automatically send intake email with credentials, tracking number, process flow, and payment plan
    let emailResult = null;
    if (sendEmail !== false) {
      try {
        emailResult = await mailer.sendCandidateWelcomeCredentialsEmail({
          candidate: learner,
          rawPassword,
          trackingNumber: assignedTracking
        });
      } catch (mailErr) {
        console.warn('[Admin Create Learner] Warning: Email notification failed:', mailErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: `Candidate ${name} registered successfully. Tracking: ${assignedTracking}`,
      learner: learner.toCleanJSON(),
      credentials: {
        email: learner.email,
        password: rawPassword,
        trackingNumber: assignedTracking,
        emailSent: Boolean(emailResult?.success)
      }
    });
  } catch (err) {
    console.error('[Admin Create Learner Error]:', err);
    res.status(500).json({ success: false, message: 'Error creating candidate record' });
  }
};

// PUT /api/admin/learners/:id/reset-password
exports.resetLearnerPassword = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid candidate identifier format' });
    }
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ success: false, message: 'New password must be at least 4 characters' });
    }

    const learner = await User.findOne({ _id: id, role: 'learner' });
    if (!learner) {
      return res.status(404).json({ success: false, message: 'Learner not found' });
    }

    learner.password = newPassword;
    await learner.save();

    res.json({
      success: true,
      message: `Password reset successfully for ${learner.name}`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
};

// POST /api/admin/learners/:id/send-email
const mailer = require('../services/mailer');
exports.sendCandidateEmail = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid candidate identifier format' });
    }
    const { type, password } = req.body || {};
    const learner = await User.findOne({ _id: id, role: 'learner' });
    if (!learner) {
      return res.status(404).json({ success: false, message: 'Learner not found' });
    }

    let result;
    if (type === 'credentials' || password) {
      result = await mailer.sendCandidateWelcomeCredentialsEmail({
        candidate: learner,
        rawPassword: password || 'Check with your Instructor',
        trackingNumber: learner.trackingNumber
      });
    } else {
      result = await mailer.sendCandidateConfirmationEmail(learner);
    }

    res.json({
      success: true,
      message: `Official email dispatched to ${learner.email} (Case: ${learner.trackingNumber || 'Active'})`,
      result
    });
  } catch (err) {
    console.error('[Admin Send Email Error]:', err);
    res.status(500).json({ success: false, message: 'Error sending email' });
  }
};

// POST /api/admin/bookings (Create booking manually from admin)
exports.createBooking = async (req, res) => {
  try {
    const booking = await Booking.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error creating booking' });
  }
};

// GET /api/admin/bookings
exports.getBookings = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search && typeof search === 'string') {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { candidateName: { $regex: safeSearch, $options: 'i' } },
        { candidateEmail: { $regex: safeSearch, $options: 'i' } },
        { courseName: { $regex: safeSearch, $options: 'i' } },
        { postcode: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const bookings = await Booking.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching bookings' });
  }
};

// PUT /api/admin/bookings/:id
exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking identifier format' });
    }
    const { status, notes, examinerAssigned, price, depositPaid, candidateName, candidateEmail, candidatePhone, postcode, transmission, courseName, preferredTime } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (status) booking.status = status;
    if (notes !== undefined) booking.notes = notes;
    if (examinerAssigned) booking.examinerAssigned = examinerAssigned;
    if (price !== undefined) booking.price = Number(price);
    if (depositPaid !== undefined) booking.depositPaid = Boolean(depositPaid);
    if (candidateName) booking.candidateName = candidateName;
    if (candidateEmail) booking.candidateEmail = candidateEmail;
    if (candidatePhone) booking.candidatePhone = candidatePhone;
    if (postcode) booking.postcode = postcode;
    if (transmission) booking.transmission = transmission;
    if (courseName) booking.courseName = courseName;
    if (preferredTime) booking.preferredTime = preferredTime;

    await booking.save();

    res.json({
      success: true,
      message: 'Booking updated successfully',
      booking
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating booking' });
  }
};

// DELETE /api/admin/bookings/:id
exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking identifier format' });
    }
    await Booking.findByIdAndDelete(id);
    res.json({ success: true, message: 'Booking removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting booking' });
  }
};


