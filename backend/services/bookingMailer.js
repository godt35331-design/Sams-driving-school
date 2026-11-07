/**
 * Booking Form Mailer (Gmail / Google Workspace)
 * Emails every appointment request from the website booking form to the owner's inbox.
 *
 * Required .env values:
 *   GMAIL_USER          - the Gmail / Google Workspace address that sends the email
 *   GMAIL_APP_PASSWORD  - a 16-character Google "App Password" (NOT your normal password)
 *   BOOKING_TO_EMAIL    - where bookings are delivered (defaults to GMAIL_USER)
 */

const nodemailer = require('nodemailer');

let cachedTransporter = null;

function isConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function getTransporter() {
  if (!isConfigured()) return null;
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        // App passwords are often copied with spaces ("abcd efgh ijkl mnop")
        pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '')
      }
    });
  }
  return cachedTransporter;
}

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildRows(booking) {
  return [
    ['Service requested', booking.serviceLabel],
    ['Transmission', booking.transmission],
    ['Preferred date', booking.preferredDate || 'Flexible'],
    ['Preferred time', booking.preferredTime || 'Flexible'],
    ['Full name', booking.fullName],
    ['Email', booking.email],
    ['Phone', booking.phone],
    ['Address', [booking.address, booking.town, booking.postcode].filter(Boolean).join(', ')],
    ['Message', booking.message || '—']
  ];
}

function buildHtml(booking, reference) {
  const rows = buildRows(booking)
    .map(([label, value]) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #eeeeef;color:#71717a;font-size:13px;width:38%;vertical-align:top;">${esc(label)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eeeeef;color:#121316;font-size:14px;font-weight:600;white-space:pre-wrap;">${esc(value)}</td>
      </tr>`)
    .join('');

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:24px 12px;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:6px;overflow:hidden;">
    <div style="background:#121316;padding:22px 26px;">
      <div style="color:#ffffff;font-size:20px;font-weight:800;">sam's<span style="color:#059669;">_</span> UK</div>
      <div style="color:#a1a1aa;font-size:11px;letter-spacing:0.12em;margin-top:6px;">NEW APPOINTMENT REQUEST · ${esc(reference)}</div>
    </div>
    <div style="padding:22px 26px 6px;">
      <p style="margin:0 0 14px;color:#121316;font-size:15px;">
        <strong>${esc(booking.fullName)}</strong> has requested <strong>${esc(booking.serviceLabel)}</strong>.
      </p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #eeeeef;">${rows}</table>
      <p style="margin:18px 0 22px;color:#71717a;font-size:12px;">
        Hit <em>Reply</em> to answer ${esc(booking.fullName)} directly at ${esc(booking.email)}.
      </p>
    </div>
  </div>
</body></html>`;
}

function buildText(booking, reference) {
  return [
    `New appointment request (${reference})`,
    '',
    ...buildRows(booking).map(([label, value]) => `${label}: ${value}`)
  ].join('\n');
}

/**
 * Sends the booking to the owner's inbox.
 * Returns { sent: true } on success, or { sent: false, simulated: true } when Gmail is not configured yet.
 */
async function sendBookingToOwner(booking, reference) {
  const transporter = getTransporter();
  const subject = `New booking: ${booking.serviceLabel} — ${booking.fullName}`;

  if (!transporter) {
    console.warn('\n[Booking Mailer] Gmail is NOT configured (set GMAIL_USER and GMAIL_APP_PASSWORD in .env).');
    console.warn('[Booking Mailer] The booking below was NOT emailed:\n');
    console.warn(buildText(booking, reference) + '\n');
    return { sent: false, simulated: true };
  }

  await transporter.sendMail({
    from: `"Sam's Driving School Website" <${process.env.GMAIL_USER}>`,
    to: process.env.BOOKING_TO_EMAIL || process.env.GMAIL_USER,
    replyTo: `"${booking.fullName.replace(/"/g, '')}" <${booking.email}>`,
    subject,
    text: buildText(booking, reference),
    html: buildHtml(booking, reference)
  });

  return { sent: true };
}

// ---------------------------------------------------------------------------
// Automatic "thank you" reply to the customer
// ---------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');

const STAMP_PATH = path.join(__dirname, '../../frontend/assets/images/sam-stamp.jpg');
const BUSINESS_PHONE = '07473 958802';
const BUSINESS_WHATSAPP = 'https://wa.me/447473958802';

function buildCustomerHtml(booking, reference, hasStamp) {
  const firstName = booking.fullName.split(' ')[0];
  const rows = [
    ['Service', booking.serviceLabel],
    ['Transmission', booking.transmission],
    ['Preferred date', booking.preferredDate || 'Flexible'],
    ['Preferred time', booking.preferredTime || 'Flexible'],
    ['Reference', reference]
  ].map(([label, value]) => `
      <tr>
        <td style="padding:9px 14px;border-bottom:1px solid #eeeeef;color:#71717a;font-size:13px;width:40%;">${esc(label)}</td>
        <td style="padding:9px 14px;border-bottom:1px solid #eeeeef;color:#121316;font-size:14px;font-weight:600;">${esc(value)}</td>
      </tr>`).join('');

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:24px 12px;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:6px;overflow:hidden;">
    <div style="background:#121316;padding:22px 26px;">
      <div style="color:#ffffff;font-size:20px;font-weight:800;">sam's<span style="color:#059669;">_</span> UK</div>
      <div style="color:#a1a1aa;font-size:11px;letter-spacing:0.12em;margin-top:6px;">BOOKING REQUEST RECEIVED</div>
    </div>
    <div style="padding:26px 26px 8px;color:#121316;line-height:1.6;">
      <p style="margin:0 0 12px;font-size:17px;font-weight:700;">Thank you, ${esc(firstName)}!</p>
      <p style="margin:0 0 12px;font-size:14px;color:#3f3f46;">
        We've received your booking request for <strong>${esc(booking.serviceLabel)}</strong>.
        Sam will get back to you within <strong>24 hours</strong> by phone, WhatsApp or email to confirm your appointment.
      </p>
      <p style="margin:0 0 18px;font-size:14px;color:#3f3f46;">Here's a copy of what you sent:</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #eeeeef;">${rows}</table>
      <p style="margin:20px 0 6px;font-size:14px;color:#3f3f46;">
        Need to change something or can't wait? Just reply to this email, call
        <a href="tel:${BUSINESS_PHONE.replace(/\s/g, '')}" style="color:#121316;font-weight:700;">${BUSINESS_PHONE}</a>
        or <a href="${BUSINESS_WHATSAPP}" style="color:#059669;font-weight:700;">message us on WhatsApp</a>.
      </p>
      <p style="margin:18px 0 0;font-size:14px;color:#3f3f46;">Kind regards,<br><strong>Sam's Driving School</strong></p>
    </div>
    ${hasStamp ? `
    <div style="text-align:center;padding:18px 26px 6px;">
      <img src="cid:sam-stamp" alt="Sam Driving School, Birmingham" width="220" style="max-width:220px;height:auto;border-radius:6px;">
    </div>` : ''}
    <div style="padding:16px 26px 22px;text-align:center;font-size:11px;color:#a1a1aa;">
      You're receiving this because you submitted a booking request on our website.
      If this wasn't you, please ignore this email.
    </div>
  </div>
</body></html>`;
}

function buildCustomerText(booking, reference) {
  return [
    `Thank you, ${booking.fullName.split(' ')[0]}!`,
    '',
    `We've received your booking request for ${booking.serviceLabel}.`,
    'Sam will get back to you within 24 hours by phone, WhatsApp or email to confirm your appointment.',
    '',
    `Service: ${booking.serviceLabel}`,
    `Transmission: ${booking.transmission}`,
    `Preferred date: ${booking.preferredDate || 'Flexible'}`,
    `Preferred time: ${booking.preferredTime || 'Flexible'}`,
    `Reference: ${reference}`,
    '',
    `Need to change something? Reply to this email, call ${BUSINESS_PHONE} or WhatsApp ${BUSINESS_WHATSAPP}.`,
    '',
    "Kind regards,",
    "Sam's Driving School"
  ].join('\n');
}

/**
 * Sends the automatic thank-you email to the customer.
 * Never throws — a failed auto-reply must not fail the booking itself.
 */
async function sendCustomerConfirmation(booking, reference) {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(`[Booking Mailer] (not configured) Auto-reply to ${booking.email} was NOT sent.`);
    return { sent: false, simulated: true };
  }

  const hasStamp = fs.existsSync(STAMP_PATH);
  try {
    await transporter.sendMail({
      from: `"Sam's Driving School" <${process.env.GMAIL_USER}>`,
      to: booking.email,
      replyTo: process.env.BOOKING_TO_EMAIL || process.env.GMAIL_USER,
      subject: `Thanks ${booking.fullName.split(' ')[0]} — we've received your booking request (${reference})`,
      text: buildCustomerText(booking, reference),
      html: buildCustomerHtml(booking, reference, hasStamp),
      attachments: hasStamp
        ? [{ filename: 'sam-driving-school.jpg', path: STAMP_PATH, cid: 'sam-stamp' }]
        : []
    });
    return { sent: true };
  } catch (err) {
    console.error(`[Booking Mailer] Auto-reply to ${booking.email} failed:`, err.message);
    return { sent: false };
  }
}

module.exports = { sendBookingToOwner, sendCustomerConfirmation, isConfigured };
