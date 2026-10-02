const User = require('../models/User');
const { sendCandidateConfirmationEmail } = require('../services/mailer');

// POST /api/candidate/onboard
exports.onboardCandidate = async (req, res) => {
  try {
    const {
      name,
      email,
      dob,
      phone,
      address,
      licenceLast4,
      theoryStatus,
      theoryPassed,
      practicalHistory,
      transmissionPreference
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const isTheoryPassed = Boolean(theoryPassed || theoryStatus === 'passed');
    const validTransmission = (transmissionPreference === 'manual' || transmissionPreference === 'automatic')
      ? transmissionPreference
      : 'automatic';

    let user = await User.findOne({ email: cleanEmail });

    if (user) {
      // Security Check: Only the authenticated owner or admin can update an existing account
      if (!req.user || (req.user.email !== cleanEmail && req.user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          message: 'An account with this email already exists. Please sign in to access your profile.'
        });
      }

      // Update existing record for authenticated owner
      user.name = name.trim();
      user.dob = dob || user.dob || 'N/A';
      if (phone) user.phone = phone.trim();
      if (address) user.address = address.trim();
      user.licenceLast4 = licenceLast4 ? licenceLast4.trim().toUpperCase() : user.licenceLast4 || '8492';
      user.theoryStatus = isTheoryPassed ? 'passed' : 'not_passed';
      user.theoryPassed = isTheoryPassed;
      user.practicalHistory = practicalHistory || user.practicalHistory || 'first_time';
      user.transmissionPreference = validTransmission;
      user.currentStep = isTheoryPassed ? 3 : 2;
      user.progress = isTheoryPassed ? 65 : 35;
      await user.save();
    } else {
      // Create new candidate user (with a secure temporary password if not set)
      const randomPass = `Learner#${Math.floor(1000 + Math.random() * 9000)}`;
      user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password: randomPass,
        dob: dob || 'N/A',
        phone: phone ? phone.trim() : '',
        address: address ? address.trim() : '',
        licenceLast4: licenceLast4 ? licenceLast4.trim().toUpperCase() : '8492',
        theoryStatus: isTheoryPassed ? 'passed' : 'not_passed',
        theoryPassed: isTheoryPassed,
        practicalHistory: practicalHistory || 'first_time',
        transmissionPreference: validTransmission,
        currentStep: isTheoryPassed ? 3 : 2,
        progress: isTheoryPassed ? 65 : 35,
        role: 'learner'
      });
    }

    // Generate JWT token for auto-session
    const token = user.generateAuthToken();

    // Trigger automated email dispatch
    const mailResult = await sendCandidateConfirmationEmail({
      name: user.name,
      email: user.email,
      dob: user.dob,
      phone: user.phone,
      address: user.address,
      licenceLast4: user.licenceLast4,
      theoryPassed: user.theoryPassed,
      practicalHistory: user.practicalHistory,
      transmissionPreference: user.transmissionPreference
    });

    res.status(200).json({
      success: true,
      message: 'Candidate intake processed successfully and confirmation email dispatched.',
      token: token,
      user: user.toCleanJSON(),
      mail: mailResult
    });
  } catch (err) {
    console.error('[Candidate Onboarding Error]:', err);
    res.status(500).json({
      success: false,
      message: 'Server error processing candidate information.'
    });
  }
};
