/**
 * Sam's Driving School UK - Master Admin Controller
 * Full Operational Control Center for Chief Examiner / Admin
 * Securely communicates with MongoDB Atlas backend using JWT tokens
 */

let currentAdmin = null;
let allLearnersCache = [];
let allBookingsCache = [];
let allCoursesCache = [];
let allReviewsCache = [];

document.addEventListener('DOMContentLoaded', async () => {
  const isAuthorized = await verifyAdminSession();
  if (!isAuthorized) return;

  initTabNavigation();
  initSignOut();
  initLearnerHandlers();
  initBookingHandlers();
  initCourseHandlers();
  initReviewHandlers();

  // Load all initial data from MongoDB Atlas
  loadDashboardStats();
  loadLearners();
  loadBookings();
  loadCourses();
  loadReviews();

  document.getElementById('btnRefreshStats')?.addEventListener('click', () => {
    loadDashboardStats();
    loadLearners();
    loadBookings();
    loadCourses();
    loadReviews();
    showAdminToast('Refreshed', 'All platform data synchronized with MongoDB Atlas.');
  });
});

// Toast notification helper
function showAdminToast(title, message, isError = false) {
  const container = document.getElementById('adminToastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `admin-toast ${isError ? 'error' : ''}`;
  toast.innerHTML = `<strong>${title}</strong>: ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// 1. Session Verification & Link Guard
async function verifyAdminSession() {
  const token = localStorage.getItem('mrsam_token');
  const rawUser = localStorage.getItem('mrsam_user');

  if (!token || !rawUser) {
    window.location.replace('login.html?redirect=admin&error=unauthorized');
    return false;
  }

  try {
    const user = JSON.parse(rawUser);
    if (user.role !== 'admin') {
      window.location.replace('login.html?redirect=admin&error=unauthorized');
      return false;
    }

    // Verify token live with server
    const res = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      localStorage.removeItem('mrsam_token');
      localStorage.removeItem('mrsam_user');
      window.location.replace('login.html?redirect=admin&error=unauthorized');
      return false;
    }

    const data = await res.json();
    if (data.user.role !== 'admin') {
      window.location.replace('login.html?redirect=admin&error=unauthorized');
      return false;
    }

    currentAdmin = data.user;
    const nameEl = document.getElementById('adminNameDisplay');
    if (nameEl) nameEl.textContent = currentAdmin.name;

    return true;
  } catch (err) {
    window.location.replace('login.html?redirect=admin&error=unauthorized');
    return false;
  }
}

// 2. Tab Navigation
function initTabNavigation() {
  const tabButtons = document.querySelectorAll('.admin-tab-btn');
  const tabPanes = document.querySelectorAll('.admin-tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;

      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });
}

window.filterByStepFromOverview = function(stepNum) {
  const learnersTabBtn = document.querySelector('.admin-tab-btn[data-tab="tab-learners"]');
  if (learnersTabBtn) learnersTabBtn.click();
  const stepFilter = document.getElementById('learnerStepFilter');
  if (stepFilter) {
    stepFilter.value = String(stepNum);
    loadLearners();
  }
};

// 3. Load Overview Stats
async function loadDashboardStats() {
  try {
    const token = localStorage.getItem('mrsam_token');
    const res = await fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) return;
    const data = await res.json();
    const stats = data.stats;

    document.getElementById('statTotalLearners').textContent = stats.totalLearners;
    document.getElementById('statPassRate').textContent = `${stats.passRate}%`;
    document.getElementById('statTotalBookings').textContent = stats.totalBookings;
    document.getElementById('statRevenue').textContent = `£${stats.totalRevenue.toLocaleString()}`;

    // Pipeline Stage counts
    document.getElementById('countStep1').textContent = `${stats.stepBreakdown.step1} Learners`;
    document.getElementById('countStep2').textContent = `${stats.stepBreakdown.step2} Learners`;
    document.getElementById('countStep3').textContent = `${stats.stepBreakdown.step3} Learners`;
    document.getElementById('countStep4').textContent = `${stats.stepBreakdown.step4} Learners`;

    document.getElementById('tabCountLearners').textContent = stats.totalLearners;
    document.getElementById('tabCountBookings').textContent = stats.totalBookings;
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

// ============================================================
// 4. LEARNERS & CANDIDATES HANDLERS
// ============================================================
async function loadLearners() {
  const tableBody = document.getElementById('learnersTableBody');
  const search = document.getElementById('learnerSearchInput')?.value || '';
  const step = document.getElementById('learnerStepFilter')?.value || '';

  try {
    const token = localStorage.getItem('mrsam_token');
    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    if (step) queryParams.append('step', step);

    const res = await fetch(`/api/admin/learners?${queryParams.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) return;
    const data = await res.json();
    allLearnersCache = data.learners;

    // Optional frontend transmission filter
    const transFilter = document.getElementById('learnerTransFilter')?.value || '';
    let filteredLearners = allLearnersCache;
    if (transFilter) {
      filteredLearners = filteredLearners.filter(l => (l.transmissionPreference || 'automatic').toLowerCase() === transFilter.toLowerCase());
    }

    if (!filteredLearners || filteredLearners.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4" style="color: var(--admin-text-muted);">No candidate records found.</td></tr>`;
      return;
    }

    const stepLabels = {
      1: 'Step 1: Application',
      2: 'Step 2: Theory Prep',
      3: 'Step 3: Practical Tuition',
      4: 'Step 4: Confirmation'
    };

    tableBody.innerHTML = filteredLearners.map(l => {
      const isTheory = l.theoryPassed;
      const licenceText = l.licenceLast4 ? `****-${l.licenceLast4}` : '****-8492';
      const progressVal = l.progress !== undefined ? l.progress : (l.currentStep === 4 ? 100 : l.currentStep === 3 ? 75 : l.currentStep === 2 ? 50 : 25);
      const transText = l.transmissionPreference === 'manual' ? '🕹️ Manual' : '⚡ Auto';
      const cleanPhone = (l.phone || '').replace(/\s+/g, '');
      const waLink = cleanPhone ? `https://wa.me/${cleanPhone.replace('+', '')}?text=Hi%20${encodeURIComponent(l.name)},%20this%20is%20Sam%20from%20Sam's%20Driving%20School%20UK` : '#';

      // Stage label
      let currentStageName = `Step ${l.currentStep || 1}`;
      if (l.processFlow && Array.isArray(l.processFlow) && l.processFlow.length > 0) {
        const activeItem = l.processFlow.find(s => s.stepNumber === l.currentStep) || l.processFlow[0];
        if (activeItem) currentStageName = activeItem.title;
      } else {
        const stepLabels = {
          1: 'Step 1: Application & ID Check',
          2: 'Step 2: DVSA Theory Prep',
          3: 'Step 3: Practical Driving Lessons',
          4: 'Step 4: DVSA Pass & Clearance'
        };
        currentStageName = stepLabels[l.currentStep] || `Step ${l.currentStep || 1}`;
      }

      // Installment plan details
      const plan = l.paymentPlan || {};
      const installments = plan.installments || [];
      const totalCount = plan.installmentCount || (installments.length > 0 ? installments.length : 3);
      const totalAmount = plan.totalAmount !== undefined ? plan.totalAmount : (l.coursePackage && l.coursePackage.includes('£350') ? 350 : 350);
      const paidCount = installments.filter(inst => inst.status === 'paid').length;
      const sumPaid = installments.filter(inst => inst.status === 'paid').reduce((s, inst) => s + (Number(inst.amount) || 0), 0);
      const allPaid = (totalCount > 0 && paidCount >= totalCount);

      return `
        <tr>
          <td>
            <div class="candidate-cell">
              <strong>${escapeHtml(l.name)}</strong>
              <small>${escapeHtml(l.email)}</small>
              <div style="margin-top: 4px; display: flex; gap: 8px; font-size: 0.75rem;">
                ${l.phone ? `<a href="tel:${escapeHtml(l.phone)}" style="color: var(--admin-emerald); text-decoration: none;">📞 ${escapeHtml(l.phone)}</a>` : '<span style="color: var(--admin-text-muted);">No Phone</span>'}
                ${cleanPhone ? `<a href="${waLink}" target="_blank" style="color: #25d366; text-decoration: none;">💬 WhatsApp</a>` : ''}
              </div>
              ${l.address ? `<small style="color: #cbd5e1; font-size: 0.72rem; margin-top: 2px;">📍 ${escapeHtml(l.address)}</small>` : ''}
            </div>
          </td>
          <td>
            <span class="badge-status" style="background: rgba(16, 185, 129, 0.12); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-family: monospace; font-weight: 700; cursor: pointer; letter-spacing: 0.03em;" onclick="navigator.clipboard.writeText('${l.trackingNumber || ''}'); showAdminToast('Copied', 'Case Tracking number copied.');" title="Click to copy tracking number">
              ${escapeHtml(l.trackingNumber || 'SAM-UK-849201')} 📋
            </span>
          </td>
          <td>
            <div>
              <strong style="color: #ffffff; font-size: 0.82rem;">${escapeHtml(currentStageName)}</strong>
              <div class="table-prog-wrap" style="margin-top: 6px;">
                <div class="table-prog-track">
                  <div class="table-prog-fill" style="width: ${progressVal}%;"></div>
                </div>
                <span class="table-prog-text">${progressVal}%</span>
              </div>
            </div>
          </td>
          <td>
            <div>
              <span class="badge-status ${allPaid ? 'passed' : 'pending'}" style="font-size: 0.76rem; font-weight: 700;">
                ${allPaid ? '✓ Completed' : `${paidCount}/${totalCount} Parts Paid`}
              </span>
              <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 4px;">
                <strong>£${sumPaid}</strong> of <strong>£${totalAmount}</strong>
              </div>
              <small style="display: block; color: var(--admin-text-muted); font-size: 0.70rem; margin-top: 2px;">${escapeHtml(l.coursePackage || '10-Hr Starter (£350)')}</small>
            </div>
          </td>
          <td><span class="badge-status active">${transText}</span></td>
          <td>
            <span class="badge-status ${isTheory ? 'passed' : 'pending'}">
              ${isTheory ? '✓ Passed' : '⏳ Pending'}
            </span>
          </td>
          <td>
            <span class="badge-status ${l.status || 'active'}">${l.status || 'active'}</span>
          </td>
          <td>
            <div class="action-btn-group" style="flex-wrap: wrap;">
              <button class="btn-action-sm" onclick="openEditLearnerModal('${l._id}')" title="Edit candidate stage, details, and examiner notes">⚙️ Edit</button>
              <button class="btn-action-sm" onclick="sendCandidateWelcomeEmail('${l._id}', '${escapeHtml(l.name)}', '${escapeHtml(l.email)}')" title="Send official candidate intake email with credentials and tracking number" style="background: rgba(16, 185, 129, 0.15); border-color: var(--admin-emerald); color: var(--admin-emerald);">✉️ Resend Pass</button>
              <button class="btn-action-sm" onclick="openResetPasswordModal('${l._id}', '${escapeHtml(l.name)}')" title="Reset learner password">🔑 Pass</button>
              <button class="btn-action-sm" onclick="previewLearnerPortal('${l._id}')" title="Preview Learner Portal view for this student" style="background: rgba(139, 92, 246, 0.15); border-color: var(--admin-purple);">👁️ Portal</button>
              <button class="btn-action-sm btn-action-del" onclick="deleteLearner('${l._id}', '${escapeHtml(l.name)}')" title="Delete candidate">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error fetching learners:', err);
    tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4" style="color: var(--admin-rose);">Error connecting to MongoDB database.</td></tr>`;
  }
}

// Subtab Switcher for Modals
window.switchCreateSubtab = function(tabId) {
  const modal = document.getElementById('createCandidateModal');
  if (!modal) return;
  modal.querySelectorAll('.modal-subtab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subtab === tabId);
  });
  modal.querySelectorAll('.modal-subtab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });
};

window.switchEditSubtab = function(tabId) {
  const modal = document.getElementById('editCandidateModal');
  if (!modal) return;
  modal.querySelectorAll('.modal-subtab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subtab === tabId);
  });
  modal.querySelectorAll('.modal-subtab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });
};

// ============================================================
// PROCESS FLOW & INSTALLMENTS STATE FOR CREATE CANDIDATE
// ============================================================
let currentCreateFlow = [
  { stepId: 'step_app', stepNumber: 1, title: 'Step 1: Application & ID Verification', shortDesc: 'Candidate verification, licence check and intake', enabled: true, status: 'completed', progress: 100 },
  { stepId: 'step_theory', stepNumber: 2, title: 'Step 2: DVSA Theory Test Preparation', shortDesc: 'Highway Code, hazard perception coaching & mock test', enabled: true, status: 'current', progress: 50 },
  { stepId: 'step_practical', stepNumber: 3, title: 'Step 3: Practical Tuition & Test Coaching', shortDesc: 'Dual-control tuition, test route simulation & examiner drive', enabled: true, status: 'upcoming', progress: 0 },
  { stepId: 'step_confirmation', stepNumber: 4, title: 'Step 4: DVSA Pass & Confirmation Mail', shortDesc: 'Final examination clearance & pass confirmation dispatch', enabled: true, status: 'locked', progress: 0 }
];

let currentCreateInstallments = [
  { installmentNumber: 1, title: 'Installment 1 of 3 (Registration Deposit)', amount: 150, dueDate: 'Due on Registration', status: 'pending' },
  { installmentNumber: 2, title: 'Installment 2 of 3 (Mid-Course Tuition)', amount: 100, dueDate: 'Due at Lesson 5', status: 'pending' },
  { installmentNumber: 3, title: 'Installment 3 of 3 (Final Test Week)', amount: 100, dueDate: 'Due Before Practical Test', status: 'pending' }
];

window.initFlowEditor = function() {
  const container = document.getElementById('flowStepsEditorContainer');
  if (!container) return;
  container.innerHTML = currentCreateFlow.map((step, idx) => `
    <div class="step-flow-card" id="flowStepCard_${idx}" style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 12px 14px; margin-bottom: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: var(--admin-blue); color: #fff; font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 4px;">Step ${step.stepNumber}</span>
          <label style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #cbd5e1; cursor: pointer;">
            <input type="checkbox" id="flowStepEnabled_${idx}" ${step.enabled ? 'checked' : ''} onchange="currentCreateFlow[${idx}].enabled = this.checked;"> Active in Portal
          </label>
        </div>
        <select id="flowStepStatus_${idx}" class="admin-select" style="padding: 3px 8px; font-size: 0.76rem;" onchange="currentCreateFlow[${idx}].status = this.value;">
          <option value="completed" ${step.status === 'completed' ? 'selected' : ''}>✓ Completed / Passed</option>
          <option value="current" ${step.status === 'current' ? 'selected' : ''}>▶ Active Current Step</option>
          <option value="upcoming" ${step.status === 'upcoming' ? 'selected' : ''}>⏳ Upcoming</option>
          <option value="locked" ${step.status === 'locked' ? 'selected' : ''}>🔒 Locked</option>
          <option value="exempt" ${step.status === 'exempt' ? 'selected' : ''}>⭐ Exempt</option>
        </select>
      </div>
      <div class="form-row" style="margin-bottom: 0;">
        <div class="form-group" style="flex: 2; margin-bottom: 0;">
          <input type="text" id="flowStepTitle_${idx}" class="admin-input" value="${escapeHtml(step.title)}" placeholder="Step title" oninput="currentCreateFlow[${idx}].title = this.value;" style="font-size: 0.82rem;">
        </div>
        <div class="form-group" style="flex: 1; margin-bottom: 0; display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 0.75rem; color: var(--admin-text-muted);">Prog:</span>
          <input type="number" id="flowStepProg_${idx}" class="admin-input" min="0" max="100" value="${step.progress}" oninput="currentCreateFlow[${idx}].progress = parseInt(this.value, 10) || 0;" style="font-size: 0.82rem;">
          <span style="font-size: 0.75rem; color: var(--admin-text-muted);">%</span>
        </div>
      </div>
    </div>
  `).join('');
};

window.applyFlowPreset = function(type) {
  if (type === 'standard') {
    currentCreateFlow = [
      { stepId: 'step_app', stepNumber: 1, title: 'Step 1: Application & ID Verification', shortDesc: 'Candidate verification, licence check and intake', enabled: true, status: 'completed', progress: 100 },
      { stepId: 'step_theory', stepNumber: 2, title: 'Step 2: DVSA Theory Test Preparation', shortDesc: 'Highway Code, hazard perception coaching & mock test', enabled: true, status: 'current', progress: 50 },
      { stepId: 'step_practical', stepNumber: 3, title: 'Step 3: Practical Tuition & Test Coaching', shortDesc: 'Dual-control tuition, test route simulation & examiner drive', enabled: true, status: 'upcoming', progress: 0 },
      { stepId: 'step_confirmation', stepNumber: 4, title: 'Step 4: DVSA Pass & Confirmation Mail', shortDesc: 'Final examination clearance & pass confirmation dispatch', enabled: true, status: 'locked', progress: 0 }
    ];
    const theoryBox = document.getElementById('createFlowTheoryPassed');
    if (theoryBox) theoryBox.checked = false;
    const startStep = document.getElementById('createCandStartingStep');
    if (startStep) startStep.value = '2';
    const progVal = document.getElementById('createCandProgressPercent');
    if (progVal) progVal.value = '35';
  } else if (type === 'theory_passed') {
    currentCreateFlow = [
      { stepId: 'step_app', stepNumber: 1, title: 'Step 1: Application & ID Verification', shortDesc: 'Candidate verification, licence check and intake', enabled: true, status: 'completed', progress: 100 },
      { stepId: 'step_theory', stepNumber: 2, title: 'Step 2: DVSA Theory Test (Passed)', shortDesc: 'Official theory certificate validated', enabled: true, status: 'completed', progress: 100 },
      { stepId: 'step_practical', stepNumber: 3, title: 'Step 3: Practical Tuition & Test Coaching', shortDesc: 'Dual-control tuition, test route simulation & examiner drive', enabled: true, status: 'current', progress: 30 },
      { stepId: 'step_confirmation', stepNumber: 4, title: 'Step 4: DVSA Pass & Confirmation Mail', shortDesc: 'Final examination clearance & pass confirmation dispatch', enabled: true, status: 'locked', progress: 0 }
    ];
    const theoryBox = document.getElementById('createFlowTheoryPassed');
    if (theoryBox) theoryBox.checked = true;
    const startStep = document.getElementById('createCandStartingStep');
    if (startStep) startStep.value = '3';
    const progVal = document.getElementById('createCandProgressPercent');
    if (progVal) progVal.value = '55';
  } else if (type === 'retest') {
    currentCreateFlow = [
      { stepId: 'step_app', stepNumber: 1, title: 'Step 1: Fast-Track Registration', shortDesc: 'Intake and provisional check', enabled: true, status: 'completed', progress: 100 },
      { stepId: 'step_theory', stepNumber: 2, title: 'Step 2: DVSA Theory Test (Exempt)', shortDesc: 'Theory certificate valid and exempt', enabled: true, status: 'exempt', progress: 100 },
      { stepId: 'step_practical', stepNumber: 3, title: 'Step 3: Intensive Practical Refresher', shortDesc: 'Focus on fault correction & mock test routes', enabled: true, status: 'current', progress: 65 },
      { stepId: 'step_confirmation', stepNumber: 4, title: 'Step 4: DVSA Pass & Confirmation Mail', shortDesc: 'Final pass confirmation dispatch', enabled: true, status: 'locked', progress: 0 }
    ];
    const theoryBox = document.getElementById('createFlowTheoryPassed');
    if (theoryBox) theoryBox.checked = true;
    const startStep = document.getElementById('createCandStartingStep');
    if (startStep) startStep.value = '3';
    const progVal = document.getElementById('createCandProgressPercent');
    if (progVal) progVal.value = '70';
  }
  window.initFlowEditor();
};

window.onTheoryPassedToggle = function(checked) {
  if (checked) {
    applyFlowPreset('theory_passed');
  } else {
    applyFlowPreset('standard');
  }
};

window.highlightCurrentFlowStep = function(stepNum) {
  const num = parseInt(stepNum, 10);
  currentCreateFlow.forEach((step, idx) => {
    if (step.stepNumber < num) {
      step.status = 'completed';
      step.progress = 100;
    } else if (step.stepNumber === num) {
      step.status = 'current';
      if (step.progress === 0) step.progress = 30;
    } else {
      step.status = (idx === currentCreateFlow.length - 1) ? 'locked' : 'upcoming';
      step.progress = 0;
    }
  });
  window.initFlowEditor();
};

// Installment Calculator & Planner for Create Candidate
window.setInstallmentCount = function(count) {
  document.querySelectorAll('#instPillSelector .inst-pill-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.count, 10) === count);
  });
  const totalFee = parseFloat(document.getElementById('createTotalFee')?.value || 350) || 350;
  buildCreateInstallmentList(count, totalFee);
  renderInstallmentInputs();
  updateInstallmentSummary();
};

function buildCreateInstallmentList(count, totalFee) {
  const parts = [];
  const baseAmount = Math.floor(totalFee / count);
  const remainder = Math.round((totalFee - (baseAmount * count)) * 100) / 100;

  for (let i = 1; i <= count; i++) {
    const isFirst = (i === 1);
    const isLast = (i === count);
    const amount = isFirst ? (baseAmount + remainder) : baseAmount;
    let defDue = `Due at Lesson ${i * 4}`;
    if (isFirst) defDue = 'Due on Registration';
    else if (isLast) defDue = 'Due Before Practical Test';

    parts.push({
      installmentNumber: i,
      title: `Installment ${i} of ${count}${isFirst ? ' (Deposit)' : isLast ? ' (Final)' : ''}`,
      amount: amount,
      dueDate: defDue,
      status: 'pending'
    });
  }
  currentCreateInstallments = parts;
}

window.renderInstallmentInputs = function() {
  const container = document.getElementById('createInstallmentsList');
  if (!container) return;

  container.innerHTML = currentCreateInstallments.map((inst, idx) => `
    <div class="installment-card" style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 12px 14px; margin-bottom: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="color: #60a5fa; font-size: 0.84rem;">💳 Part ${inst.installmentNumber}: ${escapeHtml(inst.title)}</strong>
        <select class="admin-select" id="createInstStatus_${idx}" style="padding: 3px 8px; font-size: 0.76rem;" onchange="currentCreateInstallments[${idx}].status = this.value; updateInstallmentSummary();">
          <option value="pending" ${inst.status === 'pending' ? 'selected' : ''}>⏳ Pending / Due</option>
          <option value="paid" ${inst.status === 'paid' ? 'selected' : ''}>✓ Paid</option>
        </select>
      </div>
      <div class="form-row" style="margin-bottom: 0;">
        <div class="form-group" style="flex: 1; margin-bottom: 0;">
          <label style="font-size: 0.72rem; color: var(--admin-text-muted);">Amount (£)</label>
          <input type="number" id="createInstAmount_${idx}" class="admin-input" min="0" step="5" value="${inst.amount}" oninput="currentCreateInstallments[${idx}].amount = parseFloat(this.value) || 0; updateInstallmentSummary();" style="font-size: 0.85rem; font-weight: 700;">
        </div>
        <div class="form-group" style="flex: 2; margin-bottom: 0;">
          <label style="font-size: 0.72rem; color: var(--admin-text-muted);">Due Schedule / Milestone</label>
          <input type="text" id="createInstDue_${idx}" class="admin-input" value="${escapeHtml(inst.dueDate)}" placeholder="e.g. Due on Registration" oninput="currentCreateInstallments[${idx}].dueDate = this.value;" style="font-size: 0.82rem;">
        </div>
      </div>
    </div>
  `).join('');
};

window.recalculateInstallmentsFromTotal = function() {
  const total = parseFloat(document.getElementById('createTotalFee')?.value || 350) || 350;
  const count = currentCreateInstallments.length || 3;
  buildCreateInstallmentList(count, total);
  renderInstallmentInputs();
  updateInstallmentSummary();
};

window.extractFeeFromString = function(str) {
  if (!str) return 350;
  const match = str.match(/£\s*([\d,]+)/);
  if (match) {
    return parseFloat(match[1].replace(/,/g, '')) || 350;
  }
  const numMatch = str.match(/\b\d{2,5}\b/);
  if (numMatch) {
    return parseFloat(numMatch[0]) || 350;
  }
  return 350;
};

window.syncPackageFeeFromInput = function(val) {
  const fee = window.extractFeeFromString(val);
  const feeInput = document.getElementById('createTotalFee');
  if (feeInput) feeInput.value = fee;
  recalculateInstallmentsFromTotal();
};

window.selectCoursePackagePreset = function(val) {
  if (!val) return;
  const pkgInput = document.getElementById('createCandPackage');
  if (pkgInput) pkgInput.value = val;
  window.syncPackageFeeFromInput(val);
};

window.setCreateTestCentre = function(val) {
  const tcInput = document.getElementById('createCandTestCentre');
  if (tcInput) tcInput.value = val;
};

window.syncEditPackageFee = function(val) {
  const fee = window.extractFeeFromString(val);
  const feeInput = document.getElementById('editTotalFee');
  if (feeInput) feeInput.value = fee;
  window.recalculateEditInstallments();
};

window.syncPackageFeeToInstallments = function() {
  const pkgInput = document.getElementById('createCandPackage');
  if (!pkgInput) return;
  window.syncPackageFeeFromInput(pkgInput.value);
};

function updateInstallmentSummary() {
  const totalDisplay = document.getElementById('sumTotalDisplay');
  const paidDisplay = document.getElementById('sumPaidDisplay');
  const remDisplay = document.getElementById('sumRemainingDisplay');

  let total = 0;
  let paid = 0;

  currentCreateInstallments.forEach(inst => {
    const amt = Number(inst.amount) || 0;
    total += amt;
    if (inst.status === 'paid') paid += amt;
  });

  const remaining = Math.max(0, total - paid);

  if (totalDisplay) totalDisplay.textContent = `£${total.toFixed(2)}`;
  if (paidDisplay) paidDisplay.textContent = `£${paid.toFixed(2)}`;
  if (remDisplay) remDisplay.textContent = `£${remaining.toFixed(2)}`;
}

// ============================================================
// PROCESS FLOW & INSTALLMENTS STATE FOR EDIT CANDIDATE
// ============================================================
let currentEditFlow = [];
let currentEditInstallments = [];

window.initEditFlowEditor = function() {
  const container = document.getElementById('editFlowStepsContainer');
  if (!container) return;
  container.innerHTML = currentEditFlow.map((step, idx) => `
    <div class="step-flow-card" style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 12px 14px; margin-bottom: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: var(--admin-blue); color: #fff; font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 4px;">Step ${step.stepNumber}</span>
          <label style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #cbd5e1; cursor: pointer;">
            <input type="checkbox" ${step.enabled ? 'checked' : ''} onchange="currentEditFlow[${idx}].enabled = this.checked;"> Active in Portal
          </label>
        </div>
        <select class="admin-select" style="padding: 3px 8px; font-size: 0.76rem;" onchange="currentEditFlow[${idx}].status = this.value;">
          <option value="completed" ${step.status === 'completed' ? 'selected' : ''}>✓ Completed / Passed</option>
          <option value="current" ${step.status === 'current' ? 'selected' : ''}>▶ Active Current Step</option>
          <option value="upcoming" ${step.status === 'upcoming' ? 'selected' : ''}>⏳ Upcoming</option>
          <option value="locked" ${step.status === 'locked' ? 'selected' : ''}>🔒 Locked</option>
          <option value="exempt" ${step.status === 'exempt' ? 'selected' : ''}>⭐ Exempt</option>
        </select>
      </div>
      <div class="form-row" style="margin-bottom: 0;">
        <div class="form-group" style="flex: 2; margin-bottom: 0;">
          <input type="text" class="admin-input" value="${escapeHtml(step.title)}" placeholder="Step title" oninput="currentEditFlow[${idx}].title = this.value;" style="font-size: 0.82rem;">
        </div>
        <div class="form-group" style="flex: 1; margin-bottom: 0; display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 0.75rem; color: var(--admin-text-muted);">Prog:</span>
          <input type="number" class="admin-input" min="0" max="100" value="${step.progress}" oninput="currentEditFlow[${idx}].progress = parseInt(this.value, 10) || 0;" style="font-size: 0.82rem;">
          <span style="font-size: 0.75rem; color: var(--admin-text-muted);">%</span>
        </div>
      </div>
    </div>
  `).join('');
};

window.applyEditFlowPreset = function(type) {
  if (type === 'standard') {
    currentEditFlow = [
      { stepId: 'step_app', stepNumber: 1, title: 'Step 1: Application & ID Verification', shortDesc: 'Candidate verification, licence check and intake', enabled: true, status: 'completed', progress: 100 },
      { stepId: 'step_theory', stepNumber: 2, title: 'Step 2: DVSA Theory Test Preparation', shortDesc: 'Highway Code, hazard perception coaching & mock test', enabled: true, status: 'current', progress: 50 },
      { stepId: 'step_practical', stepNumber: 3, title: 'Step 3: Practical Tuition & Test Coaching', shortDesc: 'Dual-control tuition, test route simulation & examiner drive', enabled: true, status: 'upcoming', progress: 0 },
      { stepId: 'step_confirmation', stepNumber: 4, title: 'Step 4: DVSA Pass & Confirmation Mail', shortDesc: 'Final examination clearance & pass confirmation dispatch', enabled: true, status: 'locked', progress: 0 }
    ];
    document.getElementById('modalCandidateTheoryPassed').checked = false;
    document.getElementById('modalCandidateStep').value = '2';
    document.getElementById('modalCandidateProgress').value = '35';
  } else if (type === 'theory_passed') {
    currentEditFlow = [
      { stepId: 'step_app', stepNumber: 1, title: 'Step 1: Application & ID Verification', shortDesc: 'Candidate verification, licence check and intake', enabled: true, status: 'completed', progress: 100 },
      { stepId: 'step_theory', stepNumber: 2, title: 'Step 2: DVSA Theory Test (Passed)', shortDesc: 'Official theory certificate validated', enabled: true, status: 'completed', progress: 100 },
      { stepId: 'step_practical', stepNumber: 3, title: 'Step 3: Practical Tuition & Test Coaching', shortDesc: 'Dual-control tuition, test route simulation & examiner drive', enabled: true, status: 'current', progress: 30 },
      { stepId: 'step_confirmation', stepNumber: 4, title: 'Step 4: DVSA Pass & Confirmation Mail', shortDesc: 'Final examination clearance & pass confirmation dispatch', enabled: true, status: 'locked', progress: 0 }
    ];
    document.getElementById('modalCandidateTheoryPassed').checked = true;
    document.getElementById('modalCandidateStep').value = '3';
    document.getElementById('modalCandidateProgress').value = '55';
  } else if (type === 'retest') {
    currentEditFlow = [
      { stepId: 'step_app', stepNumber: 1, title: 'Step 1: Fast-Track Registration', shortDesc: 'Intake and provisional check', enabled: true, status: 'completed', progress: 100 },
      { stepId: 'step_theory', stepNumber: 2, title: 'Step 2: DVSA Theory Test (Exempt)', shortDesc: 'Theory certificate valid and exempt', enabled: true, status: 'exempt', progress: 100 },
      { stepId: 'step_practical', stepNumber: 3, title: 'Step 3: Intensive Practical Refresher', shortDesc: 'Focus on fault correction & mock test routes', enabled: true, status: 'current', progress: 65 },
      { stepId: 'step_confirmation', stepNumber: 4, title: 'Step 4: DVSA Pass & Confirmation Mail', shortDesc: 'Final pass confirmation dispatch', enabled: true, status: 'locked', progress: 0 }
    ];
    document.getElementById('modalCandidateTheoryPassed').checked = true;
    document.getElementById('modalCandidateStep').value = '3';
    document.getElementById('modalCandidateProgress').value = '70';
  }
  window.initEditFlowEditor();
};

window.onEditTheoryPassedToggle = function(checked) {
  if (checked) {
    applyEditFlowPreset('theory_passed');
  } else {
    applyEditFlowPreset('standard');
  }
};

window.setEditInstallmentCount = function(count) {
  document.querySelectorAll('#editInstPillSelector .inst-pill-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.count, 10) === count);
  });
  const totalFee = parseFloat(document.getElementById('editTotalFee')?.value || 350) || 350;
  buildEditInstallmentList(count, totalFee);
  renderEditInstallments();
  updateEditInstallmentSummary();
};

function buildEditInstallmentList(count, totalFee) {
  const parts = [];
  const baseAmount = Math.floor(totalFee / count);
  const remainder = Math.round((totalFee - (baseAmount * count)) * 100) / 100;

  for (let i = 1; i <= count; i++) {
    const isFirst = (i === 1);
    const isLast = (i === count);
    const amount = isFirst ? (baseAmount + remainder) : baseAmount;
    let defDue = `Due at Lesson ${i * 4}`;
    if (isFirst) defDue = 'Due on Registration';
    else if (isLast) defDue = 'Due Before Practical Test';

    parts.push({
      installmentNumber: i,
      title: `Installment ${i} of ${count}${isFirst ? ' (Deposit)' : isLast ? ' (Final)' : ''}`,
      amount: amount,
      dueDate: defDue,
      status: 'pending'
    });
  }
  currentEditInstallments = parts;
}

window.renderEditInstallments = function() {
  const container = document.getElementById('editInstallmentsList');
  if (!container) return;

  container.innerHTML = currentEditInstallments.map((inst, idx) => `
    <div class="installment-card" style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 12px 14px; margin-bottom: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="color: #60a5fa; font-size: 0.84rem;">💳 Part ${inst.installmentNumber}: ${escapeHtml(inst.title)}</strong>
        <select class="admin-select" style="padding: 3px 8px; font-size: 0.76rem;" onchange="currentEditInstallments[${idx}].status = this.value; updateEditInstallmentSummary();">
          <option value="pending" ${inst.status === 'pending' ? 'selected' : ''}>⏳ Pending / Due</option>
          <option value="paid" ${inst.status === 'paid' ? 'selected' : ''}>✓ Paid</option>
        </select>
      </div>
      <div class="form-row" style="margin-bottom: 0;">
        <div class="form-group" style="flex: 1; margin-bottom: 0;">
          <label style="font-size: 0.72rem; color: var(--admin-text-muted);">Amount (£)</label>
          <input type="number" class="admin-input" min="0" step="5" value="${inst.amount}" oninput="currentEditInstallments[${idx}].amount = parseFloat(this.value) || 0; updateEditInstallmentSummary();" style="font-size: 0.85rem; font-weight: 700;">
        </div>
        <div class="form-group" style="flex: 2; margin-bottom: 0;">
          <label style="font-size: 0.72rem; color: var(--admin-text-muted);">Due Schedule / Milestone</label>
          <input type="text" class="admin-input" value="${escapeHtml(inst.dueDate)}" placeholder="e.g. Due on Registration" oninput="currentEditInstallments[${idx}].dueDate = this.value;" style="font-size: 0.82rem;">
        </div>
      </div>
    </div>
  `).join('');
};

window.recalculateEditInstallments = function() {
  const total = parseFloat(document.getElementById('editTotalFee')?.value || 350) || 350;
  const count = currentEditInstallments.length || 3;
  buildEditInstallmentList(count, total);
  renderEditInstallments();
  updateEditInstallmentSummary();
};

function updateEditInstallmentSummary() {
  const totalDisplay = document.getElementById('editSumTotalDisplay');
  const paidDisplay = document.getElementById('editSumPaidDisplay');
  const remDisplay = document.getElementById('editSumRemainingDisplay');

  let total = 0;
  let paid = 0;

  currentEditInstallments.forEach(inst => {
    const amt = Number(inst.amount) || 0;
    total += amt;
    if (inst.status === 'paid') paid += amt;
  });

  const remaining = Math.max(0, total - paid);

  if (totalDisplay) totalDisplay.textContent = `£${total.toFixed(2)}`;
  if (paidDisplay) paidDisplay.textContent = `£${paid.toFixed(2)}`;
  if (remDisplay) remDisplay.textContent = `£${remaining.toFixed(2)}`;
}

function initLearnerHandlers() {
  const searchInput = document.getElementById('learnerSearchInput');
  const stepFilter = document.getElementById('learnerStepFilter');
  const transFilter = document.getElementById('learnerTransFilter');

  let timeout = null;
  searchInput?.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(loadLearners, 300);
  });

  stepFilter?.addEventListener('change', loadLearners);
  transFilter?.addEventListener('change', loadLearners);

  // Edit Candidate Form
  const editModal = document.getElementById('editCandidateModal');
  const closeBtn = document.getElementById('modalCloseBtn');
  const cancelBtn = document.getElementById('btnCancelModal');
  const backdrop = document.getElementById('modalBackdrop');
  const editForm = document.getElementById('editCandidateForm');

  const closeEditModal = () => editModal.classList.remove('open');
  closeBtn?.addEventListener('click', closeEditModal);
  cancelBtn?.addEventListener('click', closeEditModal);
  backdrop?.addEventListener('click', closeEditModal);

  editForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('modalCandidateId').value;
    const name = document.getElementById('modalCandidateName').value;
    const dob = document.getElementById('modalCandidateDob').value;
    const phone = document.getElementById('modalCandidatePhone').value;
    const address = document.getElementById('modalCandidateAddress').value;
    const licenceLast4 = document.getElementById('modalCandidateLicence').value;
    const status = document.getElementById('modalCandidateStatus').value;
    const currentStep = document.getElementById('modalCandidateStep').value;
    const progress = document.getElementById('modalCandidateProgress').value;
    const transmissionPreference = document.getElementById('modalCandidateTransmission').value;
    const practicalHistory = document.getElementById('modalCandidatePractical').value;
    const coursePackage = document.getElementById('modalCandidatePackage').value;
    const testCentre = document.getElementById('modalCandidateTestCentre').value;
    const targetTestDate = document.getElementById('modalCandidateTargetDate').value;
    const theoryPassed = document.getElementById('modalCandidateTheoryPassed').checked;
    const instructorNotes = document.getElementById('modalCandidateNotes').value;

    const totalFee = parseFloat(document.getElementById('editTotalFee').value || 350) || 350;
    const paymentNotes = document.getElementById('editPaymentNotes').value;

    const token = localStorage.getItem('mrsam_token');
    const submitBtn = document.getElementById('btnSaveCandidate');
    submitBtn.textContent = 'Saving...';

    try {
      const res = await fetch(`/api/admin/learners/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          dob,
          phone,
          address,
          licenceLast4,
          status,
          transmissionPreference,
          practicalHistory,
          coursePackage,
          testCentre,
          targetTestDate,
          currentStep: parseInt(currentStep, 10),
          progress: parseInt(progress, 10),
          theoryPassed,
          theoryStatus: theoryPassed ? 'passed' : 'not_passed',
          instructorNotes,
          processFlow: currentEditFlow,
          paymentPlan: {
            totalAmount: totalFee,
            currency: 'GBP',
            installmentCount: currentEditInstallments.length,
            notes: paymentNotes,
            installments: currentEditInstallments
          }
        })
      });

      submitBtn.textContent = 'Save Candidate & Update Plan';

      if (res.ok) {
        showAdminToast('Profile Saved', `Candidate ${name} updated successfully.`);
        closeEditModal();
        loadLearners();
        loadDashboardStats();
      } else {
        showAdminToast('Save Failed', 'Server rejected profile update.', true);
      }
    } catch (err) {
      submitBtn.textContent = 'Save Candidate & Update Plan';
      showAdminToast('Save Failed', 'Could not reach backend.', true);
    }
  });

  // Create Candidate Form
  const createForm = document.getElementById('createCandidateForm');
  createForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('createCandName').value.trim();
    const email = document.getElementById('createCandEmail').value.trim();
    const trackingNumber = document.getElementById('createCandTracking').value.trim();
    const password = document.getElementById('createCandPassword').value.trim();
    const dob = document.getElementById('createCandDob').value;
    const phone = document.getElementById('createCandPhone').value.trim();
    const address = document.getElementById('createCandAddress').value.trim();
    const licenceLast4 = document.getElementById('createCandLicence').value.trim();
    const transmissionPreference = document.getElementById('createCandTransmission').value;
    const experienceLevel = document.getElementById('createCandExperience').value;
    const coursePackage = document.getElementById('createCandPackage').value;
    const testCentre = document.getElementById('createCandTestCentre').value;
    const targetTestDate = document.getElementById('createCandTargetDate').value.trim();

    const currentStep = document.getElementById('createCandStartingStep').value;
    const progress = document.getElementById('createCandProgressPercent').value;
    const theoryPassed = document.getElementById('createFlowTheoryPassed').checked;
    const sendEmail = document.getElementById('createCandSendEmail')?.checked ?? true;

    const totalFee = parseFloat(document.getElementById('createTotalFee').value || 350) || 350;
    const paymentNotes = document.getElementById('createPaymentNotes').value.trim();

    const token = localStorage.getItem('mrsam_token');
    const submitBtn = document.getElementById('btnSubmitCreateCandidate');
    submitBtn.textContent = 'Registering & Dispatching...';

    try {
      const res = await fetch('/api/admin/learners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          email,
          trackingNumber,
          password,
          dob,
          phone,
          address,
          licenceLast4,
          transmissionPreference,
          experienceLevel,
          coursePackage,
          testCentre,
          targetTestDate,
          currentStep: parseInt(currentStep, 10),
          progress: parseInt(progress, 10),
          theoryPassed,
          theoryStatus: theoryPassed ? 'passed' : 'not_passed',
          sendEmail,
          processFlow: currentCreateFlow,
          paymentPlan: {
            totalAmount: totalFee,
            currency: 'GBP',
            installmentCount: currentCreateInstallments.length,
            notes: paymentNotes,
            installments: currentCreateInstallments
          }
        })
      });

      const data = await res.json();
      submitBtn.textContent = 'Register Candidate & Dispatch Plan';

      if (res.ok && data.success) {
        const assignedTrack = data.credentials?.trackingNumber || trackingNumber || 'Assigned';
        const emailNotice = sendEmail ? ' Welcome email with credentials and tracking number dispatched.' : '';
        showAdminToast('Candidate Registered', `Successfully created ${name}. Case: ${assignedTrack}.${emailNotice}`);
        closeCreateCandidateModal();
        createForm.reset();
        loadLearners();
        loadDashboardStats();
      } else {
        showAdminToast('Registration Failed', data.message || 'Error creating candidate.', true);
      }
    } catch (err) {
      submitBtn.textContent = 'Register Candidate & Dispatch Plan';
      showAdminToast('Connection Error', 'Unable to reach server.', true);
    }
  });

  // Reset Password Form
  const resetPassForm = document.getElementById('resetPasswordForm');
  resetPassForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('resetPassCandidateId').value;
    const newPassword = document.getElementById('resetPassNewPassword').value;
    const token = localStorage.getItem('mrsam_token');
    const submitBtn = document.getElementById('btnSubmitResetPass');

    submitBtn.textContent = 'Updating...';

    try {
      const res = await fetch(`/api/admin/learners/${id}/reset-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });

      const data = await res.json();
      submitBtn.textContent = 'Update Password';

      if (res.ok && data.success) {
        showAdminToast('Password Reset', data.message || 'Password successfully updated.');
        closeResetPasswordModal();
        resetPassForm.reset();
      } else {
        showAdminToast('Reset Failed', data.message || 'Error updating password.', true);
      }
    } catch (err) {
      submitBtn.textContent = 'Update Password';
      showAdminToast('Connection Error', 'Could not reach server.', true);
    }
  });
}

window.openEditLearnerModal = function(id) {
  const learner = allLearnersCache.find(l => l._id === id);
  if (!learner) return;

  document.getElementById('modalCandidateId').value = learner._id;
  document.getElementById('modalCandidateTracking').value = learner.trackingNumber || 'SAM-UK-849201';
  document.getElementById('modalCandidateEmail').value = learner.email || '';
  document.getElementById('modalCandidateName').value = learner.name || '';
  document.getElementById('modalCandidateDob').value = learner.dob && learner.dob !== 'N/A' ? learner.dob : '';
  document.getElementById('modalCandidatePhone').value = learner.phone || '';
  document.getElementById('modalCandidateAddress').value = learner.address || '';
  document.getElementById('modalCandidateLicence').value = learner.licenceLast4 || '8492';
  document.getElementById('modalCandidateStatus').value = learner.status || 'active';
  document.getElementById('modalCandidateStep').value = learner.currentStep || 1;
  document.getElementById('modalCandidateProgress').value = learner.progress !== undefined ? learner.progress : 25;
  document.getElementById('modalCandidateTransmission').value = learner.transmissionPreference || 'automatic';
  document.getElementById('modalCandidatePractical').value = learner.experienceLevel || learner.practicalHistory || 'beginner';
  document.getElementById('modalCandidatePackage').value = learner.coursePackage || '10-Hour Starter Block (£350)';
  document.getElementById('modalCandidateTestCentre').value = learner.testCentre || 'Mill Hill';
  document.getElementById('modalCandidateTargetDate').value = learner.targetTestDate || '';
  document.getElementById('modalCandidateNotes').value = learner.instructorNotes || '';

  const theoryPassedCheck = document.getElementById('modalCandidateTheoryPassed');
  if (theoryPassedCheck) theoryPassedCheck.checked = Boolean(learner.theoryPassed);

  // Initialize Edit Process Flow
  if (learner.processFlow && Array.isArray(learner.processFlow) && learner.processFlow.length > 0) {
    currentEditFlow = JSON.parse(JSON.stringify(learner.processFlow));
  } else {
    currentEditFlow = [
      { stepId: 'step_app', stepNumber: 1, title: 'Step 1: Application & ID Verification', shortDesc: 'Candidate verification, licence check and intake', enabled: true, status: 'completed', progress: 100 },
      { stepId: 'step_theory', stepNumber: 2, title: 'Step 2: DVSA Theory Test Preparation', shortDesc: 'Highway Code, hazard perception coaching & mock test', enabled: true, status: learner.theoryPassed ? 'completed' : 'current', progress: learner.theoryPassed ? 100 : 50 },
      { stepId: 'step_practical', stepNumber: 3, title: 'Step 3: Practical Tuition & Test Coaching', shortDesc: 'Dual-control tuition, test route simulation & examiner drive', enabled: true, status: learner.theoryPassed ? 'current' : 'upcoming', progress: 0 },
      { stepId: 'step_confirmation', stepNumber: 4, title: 'Step 4: DVSA Pass & Confirmation Mail', shortDesc: 'Final examination clearance & pass confirmation dispatch', enabled: true, status: 'locked', progress: 0 }
    ];
  }
  window.initEditFlowEditor();

  // Initialize Edit Installments
  const plan = learner.paymentPlan || {};
  const totalAmount = plan.totalAmount || 350;
  document.getElementById('editTotalFee').value = totalAmount;
  document.getElementById('editPaymentNotes').value = plan.notes || '';

  if (plan.installments && Array.isArray(plan.installments) && plan.installments.length > 0) {
    currentEditInstallments = JSON.parse(JSON.stringify(plan.installments));
  } else {
    buildEditInstallmentList(plan.installmentCount || 3, totalAmount);
  }

  // Set active pill count button
  const instCount = currentEditInstallments.length || 3;
  document.querySelectorAll('#editInstPillSelector .inst-pill-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.count, 10) === instCount);
  });

  window.renderEditInstallments();
  updateEditInstallmentSummary();

  // Switch to first subtab
  switchEditSubtab('edit-pane-intake');

  document.getElementById('modalCandidateSub').textContent = `Editing record for ${learner.email} (${learner.trackingNumber || 'Assigned'})`;
  document.getElementById('editCandidateModal').classList.add('open');
};

window.generateTrackingNumber = function() {
  const rand = Math.floor(100000 + Math.random() * 900000);
  const input = document.getElementById('createCandTracking');
  if (input) input.value = `SAM-UK-${rand}`;
};

window.generateCandidatePassword = function() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
  const input = document.getElementById('createCandPassword');
  if (input) input.value = `Pass-${rand}#`;
};

window.openCreateLearnerModal = function() {
  window.generateTrackingNumber();
  window.generateCandidatePassword();
  window.applyFlowPreset('standard');
  window.setInstallmentCount(3);
  window.switchCreateSubtab('create-pane-intake');
  document.getElementById('createCandidateModal').classList.add('open');
};

window.sendCandidateWelcomeEmail = async function(id, name, email) {
  const token = localStorage.getItem('mrsam_token');
  const customPass = prompt(`Send credentials & case tracking email to ${name} (${email})?\nEnter candidate initial password to include in email (or leave blank to send standard notification):`, 'LearnerPass#2026');
  if (customPass === null) return;

  try {
    const res = await fetch(`/api/admin/learners/${id}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        type: 'credentials',
        password: customPass.trim()
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showAdminToast('Email Dispatched', `Credentials and case tracking email sent to ${email}.`);
    } else {
      showAdminToast('Dispatch Failed', data.message || 'Error sending email.', true);
    }
  } catch (err) {
    showAdminToast('Network Error', 'Could not reach backend.', true);
  }
};

window.closeCreateCandidateModal = function() {
  document.getElementById('createCandidateModal').classList.remove('open');
};

window.openResetPasswordModal = function(id, name) {
  document.getElementById('resetPassCandidateId').value = id;
  document.getElementById('resetPassModalSub').textContent = `Set new login password for ${name}`;
  document.getElementById('resetPasswordModal').classList.add('open');
};

window.closeResetPasswordModal = function() {
  document.getElementById('resetPasswordModal').classList.remove('open');
};

window.sendCandidateEmail = async function(id, name, email) {
  if (!confirm(`Dispatch candidate registration confirmation email to ${email}?`)) return;

  try {
    const token = localStorage.getItem('mrsam_token');
    showAdminToast('Dispatching Mail', `Sending email package to ${email}...`);

    const res = await fetch(`/api/admin/learners/${id}/send-email`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showAdminToast('Email Sent Successfully', `Confirmation email delivered to ${email}.`);
    } else {
      showAdminToast('Dispatch Notice', data.message || 'Simulation logged to server console.', true);
    }
  } catch (err) {
    showAdminToast('Email Error', 'Could not reach mail service.', true);
  }
};

window.previewLearnerPortal = function(id) {
  const learner = allLearnersCache.find(l => l._id === id);
  if (!learner) return;

  // Set impersonation session temporarily in a new tab session
  window.open(`dashboard.html?previewUser=${encodeURIComponent(JSON.stringify(learner))}`, '_blank');
};

window.deleteLearner = async function(id, name) {
  if (!confirm(`Are you sure you want to permanently delete candidate ${name}? This action cannot be undone.`)) return;

  try {
    const token = localStorage.getItem('mrsam_token');
    const res = await fetch(`/api/admin/learners/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      showAdminToast('Learner Deleted', `${name} has been removed.`);
      loadLearners();
      loadDashboardStats();
    }
  } catch (err) {
    showAdminToast('Delete Error', 'Could not delete learner.', true);
  }
};

// ============================================================
// 5. BOOKINGS HANDLERS
// ============================================================
async function loadBookings() {
  const tableBody = document.getElementById('bookingsTableBody');
  const status = document.getElementById('bookingStatusFilter')?.value || '';
  const search = document.getElementById('bookingSearchInput')?.value || '';

  try {
    const token = localStorage.getItem('mrsam_token');
    const queryParams = new URLSearchParams();
    if (status) queryParams.append('status', status);
    if (search) queryParams.append('search', search);

    const res = await fetch(`/api/admin/bookings?${queryParams.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) return;
    const data = await res.json();
    allBookingsCache = data.bookings;

    if (!allBookingsCache || allBookingsCache.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4" style="color: var(--admin-text-muted);">No booking requests found.</td></tr>`;
      return;
    }

    tableBody.innerHTML = allBookingsCache.map(b => {
      const cleanPhone = (b.candidatePhone || '').replace(/\s+/g, '');
      const waLink = cleanPhone ? `https://wa.me/${cleanPhone.replace('+', '')}?text=Hi%20${encodeURIComponent(b.candidateName)},%20this%20is%20Sam%20from%20Sam's%20Driving%20School%20UK%20regarding%20your%20lesson%20booking` : '#';

      return `
        <tr>
          <td>
            <div class="candidate-cell">
              <strong>${escapeHtml(b.candidateName)}</strong>
              <small>${escapeHtml(b.candidateEmail)}</small>
              <div style="margin-top: 4px; display: flex; gap: 8px; font-size: 0.75rem;">
                ${b.candidatePhone ? `<a href="tel:${escapeHtml(b.candidatePhone)}" style="color: var(--admin-emerald); text-decoration: none;">📞 ${escapeHtml(b.candidatePhone)}</a>` : ''}
                ${cleanPhone ? `<a href="${waLink}" target="_blank" style="color: #25d366; text-decoration: none;">💬 WhatsApp</a>` : ''}
              </div>
            </div>
          </td>
          <td>
            <strong>${escapeHtml(b.courseName || 'Lesson Package')}</strong>
            ${b.examinerAssigned ? `<small style="display: block; color: var(--admin-text-sub); font-size: 0.72rem;">Instructor: ${escapeHtml(b.examinerAssigned)}</small>` : ''}
          </td>
          <td><span class="badge-status active">${b.transmission || 'Manual'}</span></td>
          <td>${b.preferredTime || 'Flexible'}</td>
          <td><code>${b.postcode || 'N/A'}</code></td>
          <td><strong style="color: var(--admin-emerald);">£${b.price || 0}</strong></td>
          <td>
            <select class="admin-select" onchange="updateBookingStatus('${b._id}', this.value)" style="padding: 4px 8px; font-size: 0.78rem;">
              <option value="pending" ${b.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="confirmed" ${b.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="completed" ${b.status === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="cancelled" ${b.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
          <td>
            <div class="action-btn-group">
              <button class="btn-action-sm" onclick="openEditBookingModal('${b._id}')">Edit</button>
              <button class="btn-action-sm btn-action-del" onclick="deleteBooking('${b._id}')">Remove</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error fetching bookings:', err);
  }
}

function initBookingHandlers() {
  const statusFilter = document.getElementById('bookingStatusFilter');
  const searchInput = document.getElementById('bookingSearchInput');

  statusFilter?.addEventListener('change', loadBookings);
  searchInput?.addEventListener('input', () => {
    setTimeout(loadBookings, 300);
  });

  const form = document.getElementById('bookingForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('bookingModalId').value;
    const candidateName = document.getElementById('bookingFormName').value.trim();
    const candidateEmail = document.getElementById('bookingFormEmail').value.trim();
    const candidatePhone = document.getElementById('bookingFormPhone').value.trim();
    const postcode = document.getElementById('bookingFormPostcode').value.trim();
    const courseName = document.getElementById('bookingFormCourse').value.trim();
    const transmission = document.getElementById('bookingFormTransmission').value;
    const price = Number(document.getElementById('bookingFormPrice').value || 0);
    const status = document.getElementById('bookingFormStatus').value;
    const examinerAssigned = document.getElementById('bookingFormExaminer').value.trim();
    const notes = document.getElementById('bookingFormNotes').value.trim();

    const token = localStorage.getItem('mrsam_token');
    const submitBtn = document.getElementById('btnSubmitBooking');
    submitBtn.textContent = 'Saving...';

    const url = id ? `/api/admin/bookings/${id}` : '/api/admin/bookings';
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          candidateName,
          candidateEmail,
          candidatePhone,
          postcode,
          courseName,
          transmission,
          price,
          status,
          examinerAssigned,
          notes
        })
      });

      const data = await res.json();
      submitBtn.textContent = 'Save Booking';

      if (res.ok && data.success) {
        showAdminToast('Booking Saved', id ? 'Booking updated successfully.' : 'New booking created.');
        closeBookingModal();
        loadBookings();
        loadDashboardStats();
      } else {
        showAdminToast('Save Error', data.message || 'Could not save booking.', true);
      }
    } catch (err) {
      submitBtn.textContent = 'Save Booking';
      showAdminToast('Error', 'Could not reach server.', true);
    }
  });
}

window.openCreateBookingModal = function() {
  document.getElementById('bookingModalId').value = '';
  document.getElementById('bookingModalTitle').textContent = 'Create New Lesson Booking';
  document.getElementById('bookingModalSub').textContent = 'Manually add candidate lesson enquiry';
  document.getElementById('bookingForm').reset();
  document.getElementById('bookingModal').classList.add('open');
};

window.openEditBookingModal = function(id) {
  const booking = allBookingsCache.find(b => b._id === id);
  if (!booking) return;

  document.getElementById('bookingModalId').value = booking._id;
  document.getElementById('bookingModalTitle').textContent = 'Edit Lesson Booking';
  document.getElementById('bookingModalSub').textContent = `Manage booking for ${booking.candidateName}`;
  document.getElementById('bookingFormName').value = booking.candidateName || '';
  document.getElementById('bookingFormEmail').value = booking.candidateEmail || '';
  document.getElementById('bookingFormPhone').value = booking.candidatePhone || '';
  document.getElementById('bookingFormPostcode').value = booking.postcode || '';
  document.getElementById('bookingFormCourse').value = booking.courseName || '';
  document.getElementById('bookingFormTransmission').value = booking.transmission || 'Automatic';
  document.getElementById('bookingFormPrice').value = booking.price || 0;
  document.getElementById('bookingFormStatus').value = booking.status || 'pending';
  document.getElementById('bookingFormExaminer').value = booking.examinerAssigned || '';
  document.getElementById('bookingFormNotes').value = booking.notes || '';

  document.getElementById('bookingModal').classList.add('open');
};

window.closeBookingModal = function() {
  document.getElementById('bookingModal').classList.remove('open');
};

window.updateBookingStatus = async function(id, newStatus) {
  try {
    const token = localStorage.getItem('mrsam_token');
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      showAdminToast('Booking Updated', `Booking status changed to ${newStatus}.`);
      loadDashboardStats();
    }
  } catch (err) {
    showAdminToast('Update Error', 'Could not update booking status.', true);
  }
};

window.deleteBooking = async function(id) {
  if (!confirm('Are you sure you want to remove this booking record?')) return;
  try {
    const token = localStorage.getItem('mrsam_token');
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      showAdminToast('Booking Removed', 'Booking deleted successfully.');
      loadBookings();
      loadDashboardStats();
    }
  } catch (err) {
    showAdminToast('Delete Error', 'Could not delete booking.', true);
  }
};

// ============================================================
// 6. COURSES & PRICING HANDLERS
// ============================================================
async function loadCourses() {
  const grid = document.getElementById('coursesAdminGrid');
  if (!grid) return;

  try {
    const res = await fetch('/api/courses');
    const data = await res.json();
    allCoursesCache = data.courses || [];

    grid.innerHTML = allCoursesCache.map(c => `
      <div class="course-admin-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <span class="badge-status active">${escapeHtml(c.badge || 'Course')}</span>
          <div class="action-btn-group">
            <button class="btn-action-sm" onclick="openEditCourseModal('${c._id}')">Edit</button>
            <button class="btn-action-sm btn-action-del" onclick="deleteCourse('${c._id}', '${escapeHtml(c.title)}')">Delete</button>
          </div>
        </div>
        <h3 style="margin: 0 0 6px 0; font-size: 1.15rem; color: #fff;">${escapeHtml(c.title)}</h3>
        <span class="course-price-badge">£${c.price} <small style="font-size: 0.8rem; color: var(--admin-text-muted);">/ ${escapeHtml(c.duration || '')}</small></span>
        <p style="font-size: 0.85rem; color: var(--admin-text-sub); margin-bottom: 12px; margin-top: 8px;">${escapeHtml(c.description || '')}</p>
        <ul style="padding-left: 20px; font-size: 0.82rem; color: #cbd5e1;">
          ${(c.features || []).map(f => `<li>${escapeHtml(f)}</li>`).join('')}
        </ul>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading courses:', err);
  }
}

function initCourseHandlers() {
  const form = document.getElementById('courseForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('courseModalId').value;
    const title = document.getElementById('courseFormTitle').value.trim();
    const slug = document.getElementById('courseFormSlug').value.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const price = Number(document.getElementById('courseFormPrice').value);
    const duration = document.getElementById('courseFormDuration').value.trim();
    const transmission = document.getElementById('courseFormTransmission').value;
    const badge = document.getElementById('courseFormBadge').value.trim();
    const description = document.getElementById('courseFormDescription').value.trim();
    const featuresRaw = document.getElementById('courseFormFeatures').value;
    const features = featuresRaw.split('\n').map(s => s.trim()).filter(Boolean);

    const token = localStorage.getItem('mrsam_token');
    const submitBtn = document.getElementById('btnSubmitCourse');
    submitBtn.textContent = 'Saving...';

    const url = id ? `/api/admin/courses/${id}` : '/api/admin/courses';
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          slug,
          price,
          duration,
          transmission,
          badge,
          description,
          features
        })
      });

      const data = await res.json();
      submitBtn.textContent = 'Save Course';

      if (res.ok && data.success) {
        showAdminToast('Course Saved', `Course "${title}" updated.`);
        closeCourseModal();
        loadCourses();
      } else {
        showAdminToast('Save Failed', data.message || 'Error saving course.', true);
      }
    } catch (err) {
      submitBtn.textContent = 'Save Course';
      showAdminToast('Error', 'Could not reach server.', true);
    }
  });
}

window.openCreateCourseModal = function() {
  document.getElementById('courseModalId').value = '';
  document.getElementById('courseModalTitle').textContent = 'Add Tuition Package';
  document.getElementById('courseModalSub').textContent = 'Create a new driving lesson offering';
  document.getElementById('courseForm').reset();
  document.getElementById('courseModal').classList.add('open');
};

window.openEditCourseModal = function(id) {
  const course = allCoursesCache.find(c => c._id === id);
  if (!course) return;

  document.getElementById('courseModalId').value = course._id;
  document.getElementById('courseModalTitle').textContent = 'Edit Tuition Package';
  document.getElementById('courseModalSub').textContent = `Updating package: ${course.title}`;
  document.getElementById('courseFormTitle').value = course.title || '';
  document.getElementById('courseFormSlug').value = course.slug || '';
  document.getElementById('courseFormPrice').value = course.price || 0;
  document.getElementById('courseFormDuration').value = course.duration || '';
  document.getElementById('courseFormTransmission').value = course.transmission || 'Both';
  document.getElementById('courseFormBadge').value = course.badge || '';
  document.getElementById('courseFormDescription').value = course.description || '';
  document.getElementById('courseFormFeatures').value = (course.features || []).join('\n');

  document.getElementById('courseModal').classList.add('open');
};

window.closeCourseModal = function() {
  document.getElementById('courseModal').classList.remove('open');
};

window.deleteCourse = async function(id, title) {
  if (!confirm(`Are you sure you want to remove package "${title}"?`)) return;

  try {
    const token = localStorage.getItem('mrsam_token');
    const res = await fetch(`/api/admin/courses/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      showAdminToast('Course Deleted', `Package "${title}" removed.`);
      loadCourses();
    }
  } catch (err) {
    showAdminToast('Delete Error', 'Could not remove course.', true);
  }
};

// ============================================================
// 7. REVIEWS & TESTIMONIALS HANDLERS
// ============================================================
async function loadReviews() {
  const grid = document.getElementById('reviewsAdminGrid');
  if (!grid) return;

  try {
    const res = await fetch('/api/reviews');
    const data = await res.json();
    allReviewsCache = data.reviews || [];

    grid.innerHTML = allReviewsCache.map(r => {
      const hasPhoto = Boolean(r.avatar && r.avatar.trim());
      const initials = r.initials || (r.name ? r.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : 'S');
      const avatarEl = hasPhoto
        ? `<img src="${escapeHtml(r.avatar)}" alt="${escapeHtml(r.name)}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid var(--admin-emerald); flex-shrink: 0;" onerror="this.onerror=null; this.outerHTML='<div style=\\'width: 42px; height: 42px; border-radius: 50%; background: rgba(59, 130, 246, 0.15); color: #60a5fa; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; border: 1.5px solid rgba(59, 130, 246, 0.3); flex-shrink: 0;\\'>${initials}</div>';">`
        : `<div style="width: 42px; height: 42px; border-radius: 50%; background: rgba(59, 130, 246, 0.15); color: #60a5fa; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; border: 1.5px solid rgba(59, 130, 246, 0.3); flex-shrink: 0;">${initials}</div>`;

      return `
        <div class="review-admin-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              ${avatarEl}
              <div>
                <strong style="color: #fff; font-size: 1rem;">${escapeHtml(r.name)}</strong>
                <div style="color: #fbbf24; font-size: 0.88rem; margin-top: 2px;">${'★'.repeat(r.rating || 5)}</div>
              </div>
            </div>
            <div class="action-btn-group">
              <button class="btn-action-sm" onclick="openEditReviewModal('${r._id}')">Edit</button>
              <button class="btn-action-sm btn-action-del" onclick="deleteReview('${r._id}', '${escapeHtml(r.name)}')">Delete</button>
            </div>
          </div>
          <span class="badge-status active" style="margin-bottom: 10px; display: inline-block;">${escapeHtml(r.passType || '1st Time Pass')} &bull; ${escapeHtml(r.testCentre || 'Mill Hill')}</span>
          <p style="font-size: 0.88rem; color: var(--admin-text-sub); line-height: 1.5; margin: 0;">"${escapeHtml(r.comment)}"</p>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading reviews:', err);
  }
}

function initReviewHandlers() {
  const form = document.getElementById('reviewForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('reviewModalId').value;
    const name = document.getElementById('reviewFormName').value.trim();
    const rating = Number(document.getElementById('reviewFormRating').value || 5);
    const passType = document.getElementById('reviewFormPassType').value.trim();
    const testCentre = document.getElementById('reviewFormTestCentre').value.trim();
    const avatar = document.getElementById('reviewFormAvatar')?.value.trim() || '';
    const comment = document.getElementById('reviewFormComment').value.trim();

    const token = localStorage.getItem('mrsam_token');
    const submitBtn = document.getElementById('btnSubmitReview');
    submitBtn.textContent = 'Saving...';

    const url = id ? `/api/admin/reviews/${id}` : '/api/admin/reviews';
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          rating,
          passType,
          testCentre,
          avatar, // Optional reviewer profile picture
          comment,
          verified: true
        })
      });

      const data = await res.json();
      submitBtn.textContent = 'Save Review';

      if (res.ok && data.success) {
        showAdminToast('Review Saved', `Review by ${name} saved.`);
        closeReviewModal();
        loadReviews();
      } else {
        showAdminToast('Save Error', data.message || 'Error saving review.', true);
      }
    } catch (err) {
      submitBtn.textContent = 'Save Review';
      showAdminToast('Error', 'Could not reach server.', true);
    }
  });
}

// Avatar preview helpers for Review Modal
window.setReviewAvatarPreview = function(url) {
  const input = document.getElementById('reviewFormAvatar');
  const img = document.getElementById('reviewAvatarPreviewImg');
  const placeholder = document.getElementById('reviewAvatarPlaceholder');
  const clearBtn = document.getElementById('btnClearReviewAvatar');

  if (input) input.value = url || '';
  if (url && url.trim()) {
    if (img) {
      img.src = url.trim();
      img.style.display = 'block';
    }
    if (placeholder) placeholder.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'inline-block';
  } else {
    window.clearReviewAvatar();
  }
};

window.onReviewAvatarUrlChange = function(url) {
  window.setReviewAvatarPreview(url);
};

window.clearReviewAvatar = function() {
  const input = document.getElementById('reviewFormAvatar');
  const fileInput = document.getElementById('reviewFormAvatarFile');
  const img = document.getElementById('reviewAvatarPreviewImg');
  const placeholder = document.getElementById('reviewAvatarPlaceholder');
  const clearBtn = document.getElementById('btnClearReviewAvatar');

  if (input) input.value = '';
  if (fileInput) fileInput.value = '';
  if (img) {
    img.src = '';
    img.style.display = 'none';
  }
  if (placeholder) placeholder.style.display = 'block';
  if (clearBtn) clearBtn.style.display = 'none';
};

window.handleReviewAvatarFile = function(fileInput) {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;

  // Compress & resize image to max 240x240 for optimal performance and storage
  const reader = new FileReader();
  reader.onload = function(e) {
    const rawDataUrl = e.target.result;
    const tempImg = new Image();
    tempImg.onload = function() {
      const canvas = document.createElement('canvas');
      const maxDim = 240;
      let width = tempImg.width;
      let height = tempImg.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(tempImg, 0, 0, width, height);

      const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      window.setReviewAvatarPreview(optimizedDataUrl);
    };
    tempImg.src = rawDataUrl;
  };
  reader.readAsDataURL(file);
};

window.openCreateReviewModal = function() {
  document.getElementById('reviewModalId').value = '';
  document.getElementById('reviewModalTitle').textContent = 'Add Student Review';
  document.getElementById('reviewModalSub').textContent = 'Create a new verified testimonial';
  document.getElementById('reviewForm').reset();
  window.clearReviewAvatar();
  document.getElementById('reviewModal').classList.add('open');
};

window.openEditReviewModal = function(id) {
  const review = allReviewsCache.find(r => r._id === id);
  if (!review) return;

  document.getElementById('reviewModalId').value = review._id;
  document.getElementById('reviewModalTitle').textContent = 'Edit Student Review';
  document.getElementById('reviewModalSub').textContent = `Updating review from ${review.name}`;
  document.getElementById('reviewFormName').value = review.name || '';
  document.getElementById('reviewFormRating').value = review.rating || 5;
  document.getElementById('reviewFormPassType').value = review.passType || '';
  document.getElementById('reviewFormTestCentre').value = review.testCentre || '';
  document.getElementById('reviewFormComment').value = review.comment || '';

  if (review.avatar && review.avatar.trim()) {
    window.setReviewAvatarPreview(review.avatar);
  } else {
    window.clearReviewAvatar();
  }

  document.getElementById('reviewModal').classList.add('open');
};

window.closeReviewModal = function() {
  document.getElementById('reviewModal').classList.remove('open');
};

window.deleteReview = async function(id, name) {
  if (!confirm(`Are you sure you want to remove the review from ${name}?`)) return;

  try {
    const token = localStorage.getItem('mrsam_token');
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      showAdminToast('Review Removed', `Review from ${name} deleted.`);
      loadReviews();
    }
  } catch (err) {
    showAdminToast('Delete Error', 'Could not delete review.', true);
  }
};

// ============================================================
// 8. SIGN OUT
// ============================================================
function initSignOut() {
  const btn = document.getElementById('adminSignOutBtn');
  btn?.addEventListener('click', () => {
    localStorage.removeItem('mrsam_token');
    localStorage.removeItem('mrsam_user');
    window.location.replace('login.html');
  });
}

// Helper: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
