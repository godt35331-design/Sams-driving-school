/**
 * Public appointment booking form → emailed to the owner via Gmail.
 */

const { sendBookingToOwner, sendCustomerConfirmation, isConfigured } = require('../services/bookingMailer');

// Keep in sync with the service options in frontend/index.html (#booking form)
const SERVICES = {
  'manual-lessons': 'Manual Driving Lessons',
  'automatic-lessons': 'Automatic Driving Lessons',
  'intensive-course': 'Intensive Driving Course',
  'theory-coaching': 'Theory Test Coaching',
  'mock-test': 'Mock Driving Test',
  'test-car-hire': 'Car Hire for Practical Test',
  'complete-package': 'Complete Learner Package',
  'refresher': 'Refresher / Pass Plus Lessons'
};

const TRANSMISSIONS = ['Manual', 'Automatic', 'Not sure yet'];
const TIMES = ['Morning (8am – 12pm)', 'Afternoon (12pm – 4pm)', 'Evening (4pm – 7pm)', 'Flexible'];

const clean = (value, max) => String(value == null ? '' : value).replace(/[\r\n]+/g, ' ').trim().slice(0, max);

exports.createAppointment = async (req, res) => {
  const body = req.body || {};

  // Honeypot: real visitors never see or fill this field
  if (body.website) {
    return res.json({ success: true, reference: 'SDS-OK' });
  }

  const booking = {
    service: clean(body.service, 40),
    transmission: clean(body.transmission, 20),
    preferredDate: clean(body.preferredDate, 10),
    preferredTime: clean(body.preferredTime, 40),
    fullName: clean(body.fullName, 80),
    email: clean(body.email, 120).toLowerCase(),
    phone: clean(body.phone, 25),
    address: clean(body.address, 150),
    town: clean(body.town, 60),
    postcode: clean(body.postcode, 10).toUpperCase(),
    message: String(body.message == null ? '' : body.message).trim().slice(0, 1000)
  };

  const errors = [];
  if (!SERVICES[booking.service]) errors.push('Please choose what you would like to book.');
  if (booking.transmission && !TRANSMISSIONS.includes(booking.transmission)) errors.push('Please choose a valid transmission.');
  if (booking.preferredTime && !TIMES.includes(booking.preferredTime)) errors.push('Please choose a valid time.');
  if (booking.preferredDate && !/^\d{4}-\d{2}-\d{2}$/.test(booking.preferredDate)) errors.push('Please choose a valid date.');
  if (booking.fullName.length < 2) errors.push('Please enter your full name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(booking.email)) errors.push('Please enter a valid email address.');
  if (booking.phone.replace(/\D/g, '').length < 10) errors.push('Please enter a valid phone number.');
  if (booking.address.length < 3) errors.push('Please enter your address.');
  if (!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/.test(booking.postcode)) errors.push('Please enter a valid UK postcode.');

  if (errors.length) {
    return res.status(400).json({ success: false, message: errors[0], errors });
  }

  booking.serviceLabel = SERVICES[booking.service];
  booking.transmission = booking.transmission || 'Not sure yet';

  const reference = 'SDS-' + Date.now().toString(36).toUpperCase().slice(-6);

  if (!isConfigured() && process.env.NODE_ENV === 'production') {
    console.error('[Appointments] Gmail not configured in production — booking could not be emailed.');
    return res.status(503).json({
      success: false,
      message: 'Online booking is temporarily unavailable. Please call or WhatsApp us on 07473 958802.'
    });
  }

  try {
    const result = await sendBookingToOwner(booking, reference);
    // Only thank the customer once the booking has actually reached the owner
    const reply = await sendCustomerConfirmation(booking, reference);
    return res.json({
      success: true,
      reference,
      simulated: Boolean(result.simulated),
      confirmationSent: Boolean(reply.sent)
    });
  } catch (err) {
    console.error('[Appointments] Failed to send booking email:', err.message);
    return res.status(502).json({
      success: false,
      message: 'We could not send your request right now. Please try again, or call / WhatsApp us on 07473 958802.'
    });
  }
};
