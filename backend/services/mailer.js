/**
 * mr sam_ Driving School - Automated Email Service
 * Sends confirmation emails to newly registered candidates.
 * Supports production custom domain SMTP and local development simulation.
 */

const nodemailer = require('nodemailer');

// 1. Configure SMTP Transporter (Uses your custom domain SMTP credentials from .env)
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass && host !== 'mail.yourdomain.com' && !host.includes('yourdomain.com')) {
    return nodemailer.createTransport({
      host: host,
      port: parseInt(port, 10),
      secure: port == 465, // true for 465, false for other ports
      auth: {
        user: user,
        pass: pass
      }
    });
  }

  return null; // Local simulation mode if SMTP is not configured yet
}

// 2. Email HTML Template
// YOU CAN FREELY EDIT OR REPLACE THIS HTML WITH YOUR CUSTOM FORMAT LATER!
function getCandidateConfirmationTemplate(candidate) {
  const name = candidate.name || 'Candidate';
  const dob = candidate.dob || 'N/A';
  const phone = candidate.phone || 'N/A';
  const address = candidate.address || 'N/A';
  const licence = candidate.licenceLast4 ? `****-${candidate.licenceLast4}` : '****-8492';
  const theoryStatus = candidate.theoryPassed ? 'Passed' : 'Pending / Needs Preparation';
  const practicalHistory = candidate.practicalHistory === 'previous_attempt' ? 'Refresher / Retest' : 'First-time Candidate';
  const transmission = candidate.transmissionPreference === 'manual' ? 'Manual (Clutch & Gears)' : 'Automatic (2-Pedal)';
  const submissionDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Candidate Registration Confirmation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f5f7; margin: 0; padding: 30px 15px; color: #1e293b; }
    .email-card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
    .email-header { background: #121316; padding: 24px 30px; text-align: left; }
    .brand-logo { font-size: 20px; font-weight: 800; color: #ffffff; text-decoration: none; }
    .brand-logo span { color: #10b981; }
    .email-body { padding: 32px 30px; line-height: 1.6; }
    .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .intro-text { font-size: 14px; color: #475569; margin-bottom: 24px; }
    .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px; }
    .summary-title { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
    .summary-row:last-child { border-bottom: none; }
    .summary-label { color: #64748b; font-weight: 500; }
    .summary-value { color: #0f172a; font-weight: 700; }
    .next-step-box { background: #ecfdf5; border-left: 4px solid #059669; padding: 16px; border-radius: 6px; font-size: 13px; color: #065f46; margin-bottom: 24px; }
    .btn-action { display: inline-block; background: #121316; color: #ffffff !important; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 13px; margin-top: 6px; }
    .email-footer { background: #f8fafc; padding: 18px 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="email-card">
    <div class="email-header">
      <a href="#" class="brand-logo">Sam's Driving School UK</a>
    </div>
    <div class="email-body">
      <div class="greeting">Hello ${name},</div>
      <p class="intro-text">
        Thank you for submitting your candidate registration requirements. Your details have been received and logged into our learner scheduling system.
      </p>

      <div class="summary-box">
        <div class="summary-title">Registered Candidate Summary</div>
        <div class="summary-row"><span class="summary-label">Candidate Name:</span><span class="summary-value">${name}</span></div>
        <div class="summary-row"><span class="summary-label">Contact Phone:</span><span class="summary-value">${phone}</span></div>
        <div class="summary-row"><span class="summary-label">Pickup Address:</span><span class="summary-value">${address}</span></div>
        <div class="summary-row"><span class="summary-label">Date of Birth:</span><span class="summary-value">${dob}</span></div>
        <div class="summary-row"><span class="summary-label">Provisional Licence:</span><span class="summary-value">${licence}</span></div>
        <div class="summary-row"><span class="summary-label">Vehicle Transmission:</span><span class="summary-value">${transmission}</span></div>
        <div class="summary-row"><span class="summary-label">Theory Test Status:</span><span class="summary-value">${theoryStatus}</span></div>
        <div class="summary-row"><span class="summary-label">Practical History:</span><span class="summary-value">${practicalHistory}</span></div>
        <div class="summary-row"><span class="summary-label">Registration Date:</span><span class="summary-value">${submissionDate}</span></div>
      </div>

      <div class="next-step-box">
        <strong>Next Step &bull; Schedule With Your Examiner:</strong><br>
        Please message your examiner directly via WhatsApp or email to verify your provisional licence and coordinate your first lesson/test session slot.
      </div>

      <center>
        <a href="https://wa.me/447700900543?text=Hello%20Examiner,%20my%20name%20is%20${encodeURIComponent(name)}.%20I%20have%20submitted%20my%20registration%20and%20would%20like%20to%20confirm%20my%20schedule." class="btn-action" target="_blank">
          Message Examiner on WhatsApp
        </a>
      </center>
    </div>
    <div class="email-footer">
      &copy; 2026 Sam's Driving School UK &bull; Candidate Portal &bull; All Rights Reserved.
    </div>
  </div>
</body>
</html>
  `;
}

// 3. Main Dispatch Function
async function sendCandidateConfirmationEmail(candidate) {
  const recipientEmail = candidate.email;
  if (!recipientEmail) {
    console.warn('[Mailer] Cannot send confirmation email: No email provided.');
    return { success: false, message: 'No recipient email' };
  }

  const transporter = createTransporter();
  const senderEmail = process.env.FROM_EMAIL || 'contact@samsondrivingschool.com';
  const htmlContent = getCandidateConfirmationTemplate(candidate);

  const mailOptions = {
    from: `"Sam's Driving School UK" <${senderEmail}>`,
    to: recipientEmail,
    subject: `Candidate Registration & Booking Confirmation - ${candidate.name || 'Learner'}`,
    html: htmlContent
  };

  // If live SMTP credentials are configured in .env, send via nodemailer
  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Mailer] Live email sent successfully to ${recipientEmail}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId, live: true };
    } catch (err) {
      console.error(`[Mailer] Error sending live email to ${recipientEmail}:`, err);
      return { success: false, error: err.message, live: true };
    }
  }

  // Otherwise, run in clean development simulation mode (logged to console)
  console.log('---------------------------------------------------------');
  console.log(`✉️ [Simulated Email Dispatch - Awaiting Custom Domain SMTP]`);
  console.log(`To: ${recipientEmail}`);
  console.log(`Subject: ${mailOptions.subject}`);
  console.log(`Candidate Name: ${candidate.name}`);
  console.log(`Date of Birth: ${candidate.dob}`);
  console.log(`Licence Last 4: ${candidate.licenceLast4}`);
  console.log(`Theory Status: ${candidate.theoryPassed ? 'Passed' : 'Pending'}`);
  console.log(`[Status: Ready to send automatically once domain SMTP is configured in .env]`);
  console.log('---------------------------------------------------------');

  return { success: true, simulated: true };
}

// 4. Welcome Credentials & Tracking Email Template
function getCandidateWelcomeCredentialsTemplate({ candidate, rawPassword, trackingNumber }) {
  const name = candidate.name || 'Candidate';
  const email = candidate.email;
  const pass = rawPassword || 'LearnerPass#2026';
  const tracking = trackingNumber || candidate.trackingNumber || 'SAM-UK-PENDING';
  const phone = candidate.phone || 'N/A';
  const address = candidate.address || 'N/A';
  const transmission = candidate.transmissionPreference === 'manual' ? 'Manual Gearbox' : 'Automatic Hybrid';
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Candidate Registration & Tracking Details</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 30px 15px; color: #1e293b; }
    .email-card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06); }
    .email-header { background: #0b0c0e; padding: 26px 32px; border-bottom: 3px solid #10b981; }
    .brand-logo { font-size: 22px; font-weight: 800; color: #ffffff; text-decoration: none; letter-spacing: -0.02em; }
    .brand-logo span { color: #10b981; }
    .email-body { padding: 32px 32px; line-height: 1.6; }
    .greeting { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .intro-text { font-size: 14.5px; color: #475569; margin-bottom: 24px; }
    
    /* Highlight Credential Box */
    .cred-box { background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 22px; margin-bottom: 24px; }
    .cred-title { font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .cred-item { margin-bottom: 12px; }
    .cred-item:last-child { margin-bottom: 0; }
    .cred-label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; display: block; }
    .cred-value { font-size: 16px; font-weight: 700; color: #0f172a; font-family: monospace; background: #ffffff; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-block; word-break: break-all; }
    .cred-tracking { color: #059669; font-size: 18px; font-weight: 800; border: 1px solid #a7f3d0; background: #ecfdf5; }
    
    /* Details Summary */
    .summary-box { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13.5px; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
    .summary-row:last-child { border-bottom: none; }
    .summary-lbl { color: #6b7280; font-weight: 500; }
    .summary-val { color: #111827; font-weight: 600; }

    .btn-login { display: inline-block; background: #0f172a; color: #ffffff !important; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.03em; margin: 12px 0 24px; text-align: center; }
    .notice-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 6px; font-size: 13px; color: #1e40af; line-height: 1.5; margin-bottom: 20px; }
    .email-footer { background: #f8fafc; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="email-card">
    <div class="email-header">
      <div class="brand-logo">Sam's<span>_</span> UK <span style="font-size: 13px; font-weight: 400; opacity: 0.8; margin-left: 8px;">Candidate Portal</span></div>
    </div>
    <div class="email-body">
      <div class="greeting">Hello ${name},</div>
      <p class="intro-text">
        You have been officially enrolled by the administration. An active candidate record has been configured for you. Below are your secure login credentials and unique Case Tracking Number:
      </p>

      <div class="cred-box">
        <div class="cred-title">🔑 YOUR ACCESS CREDENTIALS &amp; CASE TRACKING</div>
        
        <div class="cred-item">
          <span class="cred-label">Official Case Tracking Number:</span>
          <span class="cred-value cred-tracking">${tracking}</span>
        </div>

        <div class="cred-item" style="margin-top: 10px;">
          <span class="cred-label">Login Email:</span>
          <span class="cred-value">${email}</span>
        </div>

        <div class="cred-item" style="margin-top: 10px;">
          <span class="cred-label">Initial Password:</span>
          <span class="cred-value">${pass}</span>
        </div>
      </div>

      <center>
        <a href="${(process.env.FRONTEND_URL || 'https://samsondrivingschool.com').replace(/\/+$/, '')}/login.html" class="btn-login" target="_blank">
          Sign In to Candidate Portal &rarr;
        </a>
      </center>

      <div class="notice-box">
        <strong>Case Tracking Guidance:</strong> Keep your Tracking Number (<strong>${tracking}</strong>) safe. You can use it whenever you contact your examiner or reference your driving training and DVSA test appointments.
      </div>

      <div class="summary-box">
        <div style="font-weight: 700; color: #374151; margin-bottom: 8px; font-size: 12px; text-transform: uppercase;">Candidate Profile On File:</div>
        <div class="summary-row"><span class="summary-lbl">Contact Phone:</span><span class="summary-val">${phone}</span></div>
        <div class="summary-row"><span class="summary-lbl">Pickup Address:</span><span class="summary-val">${address}</span></div>
        <div class="summary-row"><span class="summary-lbl">Vehicle:</span><span class="summary-val">${transmission}</span></div>
        <div class="summary-row"><span class="summary-lbl">Registered On:</span><span class="summary-val">${dateStr}</span></div>
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
        Need assistance or want to confirm test availability directly? Message Examiner Sam directly via WhatsApp at <a href="https://wa.me/${process.env.WHATSAPP_NUMBER || '447700900543'}" style="color: #059669; font-weight: 600;">${process.env.PHONE_NUMBER || '+44 7700 900543'}</a> or email <a href="mailto:${process.env.EMAIL || 'contact@samsondrivingschool.com'}" style="color: #059669; font-weight: 600;">${process.env.EMAIL || 'contact@samsondrivingschool.com'}</a>.
      </p>
    </div>
    <div class="email-footer">
      &copy; 2026 Sam's Driving School UK &bull; Official DVSA ADI Tuition &bull; samsondrivingschool.com &bull; All Rights Reserved.
    </div>
  </div>
</body>
</html>
  `;
}

// 5. Dispatch Welcome Credentials Email
async function sendCandidateWelcomeCredentialsEmail({ candidate, rawPassword, trackingNumber }) {
  const recipientEmail = candidate.email;
  if (!recipientEmail) {
    return { success: false, message: 'No recipient email' };
  }

  const tracking = trackingNumber || candidate.trackingNumber || 'SAM-UK-PENDING';
  const transporter = createTransporter();
  const senderEmail = process.env.FROM_EMAIL || 'contact@samsondrivingschool.com';
  const htmlContent = getCandidateWelcomeCredentialsTemplate({ candidate, rawPassword, trackingNumber: tracking });

  const mailOptions = {
    from: `"Sam's Driving School UK" <${senderEmail}>`,
    to: recipientEmail,
    subject: `Your Candidate Credentials & Case Tracking Number [${tracking}] - Sam's Driving School UK`,
    html: htmlContent
  };

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Mailer] Live welcome email sent to ${recipientEmail} with tracking ${tracking}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId, live: true, trackingNumber: tracking };
    } catch (err) {
      console.error(`[Mailer] Error sending live welcome email to ${recipientEmail}:`, err);
      return { success: false, error: err.message, live: true, trackingNumber: tracking };
    }
  }

  console.log('---------------------------------------------------------');
  console.log(`✉️ [Candidate Welcome Email - Credentials & Tracking Number]`);
  console.log(`To: ${recipientEmail}`);
  console.log(`Subject: ${mailOptions.subject}`);
  console.log(`Candidate Name: ${candidate.name}`);
  console.log(`Tracking Number: ${tracking}`);
  console.log(`Initial Password: ${rawPassword}`);
  console.log(`[Status: Ready to deliver live once custom domain SMTP is set in .env]`);
  console.log('---------------------------------------------------------');

  return { success: true, simulated: true, trackingNumber: tracking };
}

module.exports = {
  sendCandidateConfirmationEmail,
  getCandidateConfirmationTemplate,
  sendCandidateWelcomeCredentialsEmail,
  getCandidateWelcomeCredentialsTemplate
};

