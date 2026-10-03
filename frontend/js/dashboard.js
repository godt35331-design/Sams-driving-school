/**
 * mr sam_ Driving School - Learner Dashboard Controller
 * Tracks the 4-step process: Application -> Theory test -> Practical test -> Confirmation mail
 * Dynamically adjusts progress if Theory is already passed
 */

// 4 Progress Steps
let PROCESS_STEPS = [
  {
    step: 1,
    title: 'Application',
    shortDesc: 'Personal verification, provisional licence & candidate intake',
    status: 'completed',
    progress: 100,
    checkpoints: [
      { name: 'Application form submitted & personal identity verified', done: true },
      { name: 'UK Provisional Driving Licence check (valid last 4 digits)', done: true },
      { name: 'Single examiner declaration (no conflicting theory bookings)', done: true }
    ]
  },
  {
    step: 2,
    title: 'Theory Test',
    shortDesc: 'Highway Code, hazard perception coaching & theory test booking',
    status: 'current',
    progress: 65,
    checkpoints: [
      { name: 'Highway Code rules & UK road sign modules completed', done: true },
      { name: 'Hazard perception scoring test (44+ / 75 achieved)', done: true },
      { name: 'Examiner theory test preparation & mock verification', done: false },
      { name: 'Official Theory Test attendance & pass confirmation', done: false }
    ]
  },
  {
    step: 3,
    title: 'Practical Test',
    shortDesc: 'Dual-control driving tuition, manoeuvres & examiner test route',
    status: 'upcoming',
    progress: 0,
    checkpoints: [
      { name: 'Cockpit drill & vehicle safety questions ("Show Me, Tell Me")', done: false },
      { name: 'Roundabouts, complex junctions & priority management', done: false },
      { name: 'Independent driving & required test manoeuvres (parking)', done: false },
      { name: 'Practical Driving Examiner examination run', done: false }
    ]
  },
  {
    step: 4,
    title: 'Confirmation Mail',
    shortDesc: 'Official pass confirmation dispatch & examiner clearance email',
    status: 'locked',
    progress: 0,
    checkpoints: [
      { name: 'Examiner final examination validation', done: false },
      { name: 'Official confirmation email dispatched to applicant', done: false },
      { name: 'Full UK Driving Licence issuance notification', done: false }
    ]
  }
];

let currentUser = null;
let activeSelectedStep = 2;

document.addEventListener('DOMContentLoaded', async () => {
  await loadUserProfile();
  renderCandidateProfileBox();
  applyCandidateProcessFlow();
  renderProgressTracker();
  renderInstallmentPlan();
  initContactExaminerLinks();
  initSignOut();
});

// Load user from URL preview, localStorage, or live /api/auth/me
async function loadUserProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const previewData = urlParams.get('previewUser');

  if (previewData) {
    try {
      currentUser = JSON.parse(decodeURIComponent(previewData));
      showImpersonationNotice();
    } catch (e) {
      console.warn('Could not parse previewUser param:', e);
    }
  }

  if (!currentUser) {
    try {
      const raw = localStorage.getItem('mrsam_user');
      if (raw) {
        currentUser = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error loading stored user:', e);
    }
  }

  // Live refresh from MongoDB Atlas if token exists
  const token = localStorage.getItem('mrsam_token');
  if (token && !previewData) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          currentUser = data.user;
          localStorage.setItem('mrsam_user', JSON.stringify(currentUser));
        }
      }
    } catch (err) {
      console.warn('Live profile fetch failed, using cached session:', err);
    }
  }

  if (!currentUser) {
    currentUser = {
      name: 'Learner Driver',
      email: 'learner@example.co.uk',
      trackingNumber: 'SAM-UK-849201',
      licenceLast4: '8492',
      dob: '2002-05-14',
      theoryPassed: false,
      transmissionPreference: 'automatic',
      currentStep: 2,
      progress: 50,
      paymentPlan: {
        totalAmount: 350,
        currency: 'GBP',
        installmentCount: 3,
        installments: [
          { installmentNumber: 1, title: 'Installment 1 of 3 (Deposit)', amount: 150, dueDate: 'Due on Registration', status: 'paid' },
          { installmentNumber: 2, title: 'Installment 2 of 3 (Mid-way)', amount: 100, dueDate: 'Due at Lesson 5', status: 'pending' },
          { installmentNumber: 3, title: 'Installment 3 of 3 (Final)', amount: 100, dueDate: 'Due Before Practical Test', status: 'pending' }
        ]
      }
    };
  }

  // Update UI Elements
  const nameEl = document.getElementById('dashUserName');
  const avatarEl = document.getElementById('dashUserAvatar');
  const licenceDisplayEl = document.getElementById('licenceDisplay');
  const transDisplayEl = document.getElementById('dashTransmissionDisplay');
  const trackDisplayEl = document.getElementById('dashTrackingDisplay');

  if (nameEl) nameEl.textContent = currentUser.name;
  if (trackDisplayEl) trackDisplayEl.textContent = currentUser.trackingNumber || 'SAM-UK-849201';
  if (avatarEl) {
    const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    avatarEl.textContent = initials || 'L';
  }

  if (licenceDisplayEl) {
    const last4 = currentUser.licenceLast4 || '8492';
    licenceDisplayEl.textContent = last4;
  }

  if (transDisplayEl) {
    const isManual = (currentUser.transmissionPreference === 'manual');
    transDisplayEl.textContent = isManual ? 'Manual (Clutch)' : 'Automatic (2-Pedal)';
  }

  if (currentUser.currentStep) {
    activeSelectedStep = currentUser.currentStep;
  }
}

function showImpersonationNotice() {
  const banner = document.createElement('div');
  banner.style.cssText = 'background: #4f46e5; color: #ffffff; text-align: center; padding: 8px 16px; font-size: 0.82rem; font-weight: 700; position: sticky; top: 0; z-index: 9999; display: flex; justify-content: space-between; align-items: center;';
  banner.innerHTML = `
    <span>👁️ Admin Preview Mode: Viewing portal as candidate ${currentUser?.name || 'Learner'} (${currentUser?.trackingNumber || 'Assigned'})</span>
    <button onclick="window.close()" style="background: rgba(255,255,255,0.2); border: none; color: #fff; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">Close Preview</button>
  `;
  document.body.prepend(banner);
}

// Build or adapt process steps from Admin configured processFlow
function applyCandidateProcessFlow() {
  if (currentUser && currentUser.processFlow && Array.isArray(currentUser.processFlow) && currentUser.processFlow.length > 0) {
    // Dynamically replace default steps with custom steps set by Admin
    const defaultCheckpointsMap = {
      1: [
        { name: 'Application form submitted & personal identity verified', done: true },
        { name: 'UK Provisional Driving Licence check (valid last 4 digits)', done: true },
        { name: 'Candidate intake & lesson package recorded', done: true }
      ],
      2: [
        { name: 'Highway Code rules & UK road sign modules completed', done: currentUser.theoryPassed },
        { name: 'Hazard perception scoring test (44+ / 75 achieved)', done: currentUser.theoryPassed },
        { name: 'Examiner theory test preparation & mock verification', done: currentUser.theoryPassed },
        { name: 'Official Theory Test attendance & pass confirmation', done: currentUser.theoryPassed }
      ],
      3: [
        { name: 'Cockpit drill & vehicle safety questions ("Show Me, Tell Me")', done: false },
        { name: 'Roundabouts, complex junctions & priority management', done: false },
        { name: 'Independent driving & required test manoeuvres (parking)', done: false },
        { name: 'Practical Driving Examiner examination run', done: false }
      ],
      4: [
        { name: 'Examiner final examination validation', done: false },
        { name: 'Official confirmation email dispatched to applicant', done: false },
        { name: 'Full UK Driving Licence issuance notification', done: false }
      ]
    };

    PROCESS_STEPS = currentUser.processFlow
      .filter(step => step.enabled !== false)
      .map(step => {
        const stepNum = step.stepNumber;
        const isDone = (step.status === 'completed' || step.status === 'exempt');
        const checkpoints = defaultCheckpointsMap[stepNum] || [
          { name: `${step.title} verification cleared`, done: isDone }
        ];

        if (isDone) {
          checkpoints.forEach(c => c.done = true);
        }

        return {
          step: stepNum,
          title: step.title,
          shortDesc: step.shortDesc || '',
          status: step.status || 'upcoming',
          progress: step.progress !== undefined ? step.progress : (isDone ? 100 : 0),
          checkpoints
        };
      });
  } else if (currentUser && currentUser.theoryPassed) {
    // Fallback: If Theory is passed, update standard step 2
    if (PROCESS_STEPS[1]) {
      PROCESS_STEPS[1].status = 'completed';
      PROCESS_STEPS[1].progress = 100;
      PROCESS_STEPS[1].checkpoints.forEach(c => c.done = true);
    }
    if (PROCESS_STEPS[2] && currentUser.currentStep === 2) {
      PROCESS_STEPS[2].status = 'current';
      PROCESS_STEPS[2].progress = 30;
      activeSelectedStep = 3;
    }
  }

  // Ensure activeSelectedStep is within available steps
  if (currentUser.currentStep) {
    activeSelectedStep = currentUser.currentStep;
  }
}

// Render the step-by-step progress tracker
function renderProgressTracker() {
  const levelsContainer = document.getElementById('levelsGrid');
  const fillBar = document.getElementById('masterProgressFill');
  const percentText = document.getElementById('masterPercentText');
  const criteriaContainer = document.getElementById('levelCriteriaWrap');

  if (!levelsContainer) return;

  // Calculate overall progress across steps
  const totalSteps = PROCESS_STEPS.length || 4;
  let overallPercent = 0;
  PROCESS_STEPS.forEach(s => {
    if (s.status === 'completed' || s.status === 'exempt') overallPercent += (100 / totalSteps);
    else if (s.status === 'current') overallPercent += (s.progress / totalSteps);
  });
  overallPercent = Math.round(overallPercent);

  if (fillBar) fillBar.style.width = `${overallPercent}%`;
  if (percentText) percentText.textContent = `${overallPercent}% Complete`;

  // Render Step Cards
  levelsContainer.innerHTML = '';
  PROCESS_STEPS.forEach(s => {
    const isCurrent = (s.step === activeSelectedStep);
    const node = document.createElement('div');
    node.className = `level-node ${s.status} ${isCurrent ? 'current' : ''}`;
    node.setAttribute('data-step-num', s.step);

    let statusText = 'UPCOMING';
    if (s.status === 'completed') statusText = '✓ PASSED';
    else if (s.status === 'exempt') statusText = '✓ EXEMPT';
    else if (s.status === 'current') statusText = 'IN PROGRESS';
    else if (s.status === 'locked') statusText = 'LOCKED';

    node.innerHTML = `
      <div class="level-node-top">
        <span class="level-num-badge">STEP 0${s.step}</span>
        <span class="level-status-pill">${statusText}</span>
      </div>
      <h4 class="level-node-title">${s.title}</h4>
      <p class="level-node-desc">${s.shortDesc}</p>
      <div class="level-progress-mini">
        <div class="level-progress-mini-bar" style="width: ${s.progress}%;"></div>
      </div>
    `;

    node.addEventListener('click', () => {
      activeSelectedStep = s.step;
      renderProgressTracker();
    });

    levelsContainer.appendChild(node);
  });

  // Render Active Step Checkpoints Drawer
  const selectedStepData = PROCESS_STEPS.find(s => s.step === activeSelectedStep) || PROCESS_STEPS[0];
  if (criteriaContainer && selectedStepData) {
    criteriaContainer.innerHTML = `
      <div class="level-criteria-box">
        <div class="criteria-title">
          <span>STEP ${selectedStepData.step}: ${selectedStepData.title.toUpperCase()} &mdash; STATUS CHECKLIST</span>
          <span>${selectedStepData.progress}% Progress</span>
        </div>
        <ul class="criteria-checklist">
          ${selectedStepData.checkpoints.map(c => `
            <li class="criteria-item ${c.done ? 'done' : ''}">
              <span class="criteria-check">${c.done ? '✓' : ''}</span>
              <span>${c.name}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }
}

// Render dynamic Installment Tuition Payment Plan Card
function renderInstallmentPlan() {
  const container = document.getElementById('dashInstallmentsContainer');
  const badgeEl = document.getElementById('dashPlanStatusBadge');
  const progressTextEl = document.getElementById('dashPaymentProgressText');
  const progressFillEl = document.getElementById('dashPaymentProgressFill');

  if (!container) return;

  const plan = currentUser?.paymentPlan || {};
  const installments = plan.installments && plan.installments.length > 0 
    ? plan.installments 
    : [
        { installmentNumber: 1, title: 'Installment 1 of 3 (Deposit)', amount: 150, dueDate: 'Due on Registration', status: 'paid' },
        { installmentNumber: 2, title: 'Installment 2 of 3 (Mid-way)', amount: 100, dueDate: 'Due at Lesson 5', status: 'pending' },
        { installmentNumber: 3, title: 'Installment 3 of 3 (Final)', amount: 100, dueDate: 'Due Before Practical Test', status: 'pending' }
      ];

  const totalFee = plan.totalAmount !== undefined 
    ? Number(plan.totalAmount) 
    : installments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);

  const paidAmount = installments
    .filter(inst => inst.status === 'paid')
    .reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);

  const percent = totalFee > 0 ? Math.min(100, Math.round((paidAmount / totalFee) * 100)) : 0;
  const count = plan.installmentCount || installments.length;

  if (badgeEl) {
    badgeEl.textContent = `${count}-STAGE PLAN`;
  }

  if (progressTextEl) {
    progressTextEl.textContent = `£${paidAmount.toFixed(2)} of £${totalFee.toFixed(2)} (${percent}%)`;
  }

  if (progressFillEl) {
    progressFillEl.style.width = `${percent}%`;
  }

  container.innerHTML = installments.map(inst => {
    const isPaid = (inst.status === 'paid');
    return `
      <div class="dash-inst-row ${isPaid ? 'paid' : ''}">
        <div>
          <div style="font-weight: 700; font-size: 0.86rem; color: var(--dash-text-primary);">
            ${inst.title || `Installment ${inst.installmentNumber}`}
          </div>
          <div style="font-size: 0.74rem; color: var(--dash-text-muted); margin-top: 2px;">
            📅 ${inst.dueDate || 'Scheduled installment'}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <strong style="font-size: 0.95rem; font-family: monospace; color: var(--dash-text-primary);">
            £${Number(inst.amount || 0).toFixed(2)}
          </strong>
          <span class="${isPaid ? 'dash-inst-badge-paid' : 'dash-inst-badge-pending'}">
            ${isPaid ? '✓ Paid' : '⏳ Due'}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// Generate pre-populated WhatsApp & Email links
function initContactExaminerLinks() {
  const name = currentUser?.name || 'Learner';
  const track = currentUser?.trackingNumber || 'Assigned';
  const dob = currentUser?.dob || 'Not specified';
  const phone = currentUser?.phone || 'Not specified';
  const address = currentUser?.address || 'Not specified';
  const licence = currentUser?.licenceLast4 || '8492';
  const trans = currentUser?.transmissionPreference === 'manual' ? 'Manual (Clutch & Stick)' : 'Automatic (2-Pedal)';
  const theory = currentUser?.theoryPassed ? 'Passed' : 'Need Preparation';

  const waText = encodeURIComponent(
    `Hello Examiner, my name is ${name} (Case: ${track}, DOB: ${dob}, Tel: ${phone}, Address: ${address}, Licence: ****-${licence}).\nVehicle: ${trans}\nTheory Status: ${theory}.\nI would like to confirm my candidate details and schedule my driving lessons and test appointment.`
  );
  const waUrl = `https://wa.me/447473958802?text=${waText}`;

  const mailSubject = encodeURIComponent(`Candidate Test Booking & Info - ${name} (${track})`);
  const mailBody = encodeURIComponent(
    `Hello Examiner,\n\nCandidate Information:\n- Full Legal Name: ${name}\n- Case Tracking #: ${track}\n- Contact Phone: ${phone}\n- Pickup Address: ${address}\n- Date of Birth: ${dob}\n- Driving Licence (Last 4): ****-${licence}\n- Vehicle Transmission: ${trans}\n- Theory Test Status: ${theory}\n\nI have accessed my candidate portal and would like to coordinate my driving tuition schedule.\n\nBest regards,\n${name}`
  );
  const mailUrl = `mailto:examiner@mrsamdrivingschool.co.uk?subject=${mailSubject}&body=${mailBody}`;

  document.querySelectorAll('.btn-examiner-wa').forEach(el => el.href = waUrl);
  document.querySelectorAll('.btn-examiner-mail').forEach(el => el.href = mailUrl);
}

// Sign out
function initSignOut() {
  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      localStorage.removeItem('mrsam_token');
      localStorage.removeItem('mrsam_user');
      window.location.href = 'login.html';
    });
  }
}

// ==========================================================================
// CANDIDATE PROFILE & INTAKE RECORD BOX
// ==========================================================================
function renderCandidateProfileBox() {
  if (!currentUser) return;

  // Header badges & tracking
  const statusBadge = document.getElementById('profileStatusBadge');
  if (statusBadge) {
    const st = (currentUser.status || 'active').toLowerCase();
    statusBadge.textContent = `${st.toUpperCase()} CANDIDATE`;
    if (st === 'completed') {
      statusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      statusBadge.style.color = '#059669';
    } else if (st === 'paused') {
      statusBadge.style.background = 'rgba(245, 158, 11, 0.2)';
      statusBadge.style.color = '#d97706';
    } else {
      statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
      statusBadge.style.color = '#059669';
    }
  }

  const profileBoxName = document.getElementById('profileBoxName');
  if (profileBoxName && currentUser.name) {
    profileBoxName.textContent = `${currentUser.name} - Registration Record`;
  }

  const trackNum = currentUser.trackingNumber || 'SAM-UK-849201';
  const trackEl = document.getElementById('dashTrackingDisplay');
  if (trackEl) trackEl.textContent = trackNum;

  // Grid fields
  const nameEl = document.getElementById('infoCandidateName');
  if (nameEl) nameEl.textContent = currentUser.name || 'Not Specified';

  const emailEl = document.getElementById('infoCandidateEmail');
  if (emailEl) emailEl.textContent = currentUser.email || 'Not Specified';

  const phoneEl = document.getElementById('infoCandidatePhone');
  if (phoneEl) {
    const phone = currentUser.phone || '07473 958802';
    phoneEl.innerHTML = `<a href="tel:${phone.replace(/\s+/g, '')}" style="color: inherit; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">📞 ${escapeHtml(phone)}</a>`;
  }

  const dobEl = document.getElementById('infoCandidateDob');
  if (dobEl) dobEl.textContent = formatDobDate(currentUser.dob);

  const addrEl = document.getElementById('infoCandidateAddress');
  if (addrEl) addrEl.textContent = currentUser.address || '12 Watford Way, London NW4';

  const licEl = document.getElementById('licenceDisplay');
  if (licEl) licEl.textContent = currentUser.licenceLast4 || '8492';

  const transEl = document.getElementById('dashTransmissionDisplay');
  if (transEl) {
    const isManual = (currentUser.transmissionPreference === 'manual');
    transEl.textContent = isManual ? '🕹️ Manual (Clutch & 5-Speed Stick)' : '⚡ Automatic (2-Pedal Modern Hybrid)';
  }

  const pkgEl = document.getElementById('infoCandidatePackage');
  if (pkgEl) pkgEl.textContent = currentUser.coursePackage || '10-Hour Starter Block (£350)';

  const centreEl = document.getElementById('infoCandidateTestCentre');
  if (centreEl) {
    const centre = currentUser.testCentre || 'Birmingham (South Yardley)';
    centreEl.textContent = centre.toLowerCase().includes('centre') ? centre : `${centre} Test Centre`;
  }

  const dateEl = document.getElementById('infoCandidateTargetDate');
  if (dateEl) dateEl.textContent = currentUser.targetTestDate || 'Pending / Scheduling in Progress';

  const expEl = document.getElementById('infoCandidateExperience');
  if (expEl) {
    const exp = currentUser.experienceLevel || currentUser.practicalHistory || 'beginner';
    const expMap = {
      beginner: '🔰 Complete Beginner (Never Driven Before)',
      retest: '🔄 Retest / Refresher Lessons & Test Routes',
      intermediate: '🚗 Intermediate / Part-Trained Driver'
    };
    expEl.textContent = expMap[exp] || exp;
  }

  const theoryEl = document.getElementById('infoCandidateTheory');
  if (theoryEl) {
    if (currentUser.theoryPassed) {
      theoryEl.innerHTML = '<span style="color: #059669; font-weight: 800;">✓ Theory Passed &amp; Verified</span>';
    } else {
      theoryEl.innerHTML = '<span style="color: #d97706; font-weight: 700;">⏳ In Preparation / Mock Test Stage</span>';
    }
  }

  const instEl = document.getElementById('infoCandidateInstructor');
  if (instEl) instEl.textContent = currentUser.instructor || "Mr Sam (DVSA Grade A ADI - Top 6% UK)";

  // Guidance notes
  const notesWrap = document.getElementById('profileNotesWrap');
  const notesContent = document.getElementById('infoCandidateNotes');
  if (notesWrap && notesContent) {
    if (currentUser.instructorNotes && currentUser.instructorNotes.trim()) {
      notesWrap.style.display = 'block';
      notesContent.textContent = currentUser.instructorNotes;
    } else {
      notesWrap.style.display = 'none';
    }
  }
}

function formatDobDate(dobStr) {
  if (!dobStr || dobStr === 'N/A') return 'Not Specified';
  try {
    const d = new Date(dobStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  } catch (e) {}
  return dobStr;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.copyCandidateTrackingNumber = function() {
  const trackNum = currentUser?.trackingNumber || document.getElementById('dashTrackingDisplay')?.textContent || 'SAM-UK-849201';
  navigator.clipboard.writeText(trackNum).then(() => {
    const trackEl = document.getElementById('dashTrackingDisplay');
    if (trackEl) {
      const originalText = trackEl.textContent;
      trackEl.textContent = 'COPIED! ✓';
      setTimeout(() => { trackEl.textContent = originalText; }, 1800);
    }
  }).catch(e => console.warn('Copy error:', e));
};


