/**
 * mr sam_ Driving School - Client Logic & Interactions
 * Features: Roll-down menus, hero carousel, mobile drawer, interactive search, backend booking
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initDropdowns();
  initMobileDrawer();
  initSearchModal();
  initHeroCarousel();
  initServicesScroll();
  loadReviews();
  initBookingForm();
});

// Toast notification helper
function showToast(title, message, isError = false) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  if (isError) toast.style.borderLeftColor = '#ef4444';

  toast.innerHTML = `
    <div class="toast-icon">${isError ? '⚠️' : '✅'}</div>
    <div class="toast-content">
      <h5>${title}</h5>
      <p>${message}</p>
    </div>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// 1. Header scroll effect (Optimized with requestAnimationFrame & passive listener)
function initHeader() {
  const header = document.getElementById('mainHeader');
  if (!header) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (window.scrollY > 40) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// 2. Roll-Down Dropdown Menus (Mouse hover & touch click roll-down)
function initDropdowns() {
  const dropdownItems = document.querySelectorAll('.nav-dropdown-item');

  dropdownItems.forEach(item => {
    const btn = item.querySelector('.nav-link-btn');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = item.classList.contains('open');
      dropdownItems.forEach(d => d.classList.remove('open'));
      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });

  // Close when clicking outside
  document.addEventListener('click', () => {
    dropdownItems.forEach(d => d.classList.remove('open'));
  });
}

// 3. Mobile Fullscreen Roll-Down Drawer
function initMobileDrawer() {
  const menuToggle = document.getElementById('menuToggleBtn');
  const drawer = document.getElementById('mobileDrawer');
  const closeBtn = document.getElementById('drawerCloseBtn');

  if (!drawer) return;

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      drawer.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

  drawer.querySelectorAll('[data-close-drawer]').forEach(link => {
    link.addEventListener('click', closeDrawer);
  });
}

// 4. Search Modal
function initSearchModal() {
  const trigger = document.getElementById('searchTriggerBtn');
  const modal = document.getElementById('searchModal');
  const backdrop = document.getElementById('searchBackdrop');
  const closeBtn = document.getElementById('searchCloseBtn');
  const input = document.getElementById('siteSearchInput');

  if (!modal) return;

  function openSearch() {
    modal.classList.add('active');
    setTimeout(() => { if (input) input.focus(); }, 100);
  }

  function closeSearch() {
    modal.classList.remove('active');
  }

  if (trigger) trigger.addEventListener('click', openSearch);
  if (backdrop) backdrop.addEventListener('click', closeSearch);
  if (closeBtn) closeBtn.addEventListener('click', closeSearch);

  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const term = e.target.getAttribute('data-search-tag');
      if (input) input.value = term;
      closeSearch();
      // Scroll to relevant section
      if (term === 'Theory') {
        const el = document.getElementById('theory-prep');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else if (term === 'Manual' || term === 'Automatic') {
        const el = document.getElementById('what-we-do');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else {
        const el = document.getElementById('booking');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

// 5. Hero Carousel & Bottom Bar
const HERO_SLIDES = [
  {
    kicker: "TEST PREPARATION & TUITION",
    title: "Struggling to pass your theory or practical test?",
    subtext: "Expert 1-on-1 coaching, mock test simulations, and proven guidance to help you pass with confidence."
  },
  {
    kicker: "PRACTICAL & THEORY",
    title: "Calm Mastery",
    subtext: "Dual-controlled tuition, comprehensive hazard perception & road confidence"
  },
  {
    kicker: "TEST SUCCESS",
    title: "First-Time Freedom",
    subtext: "Official DVSA test route simulations with an industry-leading 92% pass rate"
  }
];

let currentSlide = 0;

function initHeroCarousel() {
  const titleEl = document.getElementById('heroTitle');
  const kickerEl = document.getElementById('heroKicker');
  const subtextEl = document.getElementById('heroSubtext');
  const tabs = document.querySelectorAll('.hero-tab');
  const prevBtn = document.getElementById('prevHeroBtn');
  const nextBtn = document.getElementById('nextHeroBtn');

  function updateSlide(index) {
    currentSlide = (index + HERO_SLIDES.length) % HERO_SLIDES.length;
    const slide = HERO_SLIDES[currentSlide];

    if (titleEl && kickerEl && subtextEl) {
      titleEl.style.opacity = '0';
      titleEl.style.transform = 'translateY(10px)';
      titleEl.style.transition = 'all 0.25s ease';

      setTimeout(() => {
        kickerEl.textContent = slide.kicker;
        titleEl.textContent = slide.title;
        subtextEl.textContent = slide.subtext;

        titleEl.style.opacity = '1';
        titleEl.style.transform = 'translateY(0)';
      }, 250);
    }

    tabs.forEach((tab, i) => {
      tab.classList.toggle('active', i === currentSlide);
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-slide'), 10);
      updateSlide(idx);
    });
  });

  if (prevBtn) prevBtn.addEventListener('click', () => updateSlide(currentSlide - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => updateSlide(currentSlide + 1));
}

// 6. Services Slider Arrows
function initServicesScroll() {
  const track = document.getElementById('servicesTrack');
  const prevBtn = document.getElementById('servicePrevBtn');
  const nextBtn = document.getElementById('serviceNextBtn');

  if (!track) return;

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      track.scrollBy({ left: -320, behavior: 'smooth' });
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      track.scrollBy({ left: 320, behavior: 'smooth' });
    });
  }
}

// 7. Load Reviews
const FALLBACK_REVIEWS = [
  {
    name: "Sarah Jenkins",
    location: "North London",
    result: "Passed 1st Time (2 minors)",
    date: "September 2026",
    comment: "Sam's Driving School UK is exceptional. His calm demeanor and reference points for parallel parking are infallible. Passed first time!"
  },
  {
    name: "Tariq Al-Mansoor",
    location: "Mill Hill",
    result: "Passed 1st Time (Zero faults)",
    date: "August 2026",
    comment: "A clean sheet zero minors! His mock tests made the actual test feel effortless. Outstanding punctuality every week."
  },
  {
    name: "Chloe Davies",
    location: "Barnet",
    result: "Passed 1st Time",
    date: "July 2026",
    comment: "Completed the intensive course with Sam. His patience on roundabouts made everything click immediately."
  }
];

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function loadReviews() {
  const container = document.getElementById('reviewsGrid');
  if (!container) return;

  let reviews = FALLBACK_REVIEWS;
  try {
    const res = await fetch('/api/reviews');
    if (res.ok) {
      const json = await res.json();
      if (json.reviews && json.reviews.length > 0) reviews = json.reviews;
      else if (json.data && json.data.length > 0) reviews = json.data;
    }
  } catch (e) {
    // Fallback used
  }

  container.innerHTML = reviews.map(rev => {
    const hasPhoto = Boolean(rev.avatar && rev.avatar.trim());
    const initials = rev.initials || (rev.name ? rev.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'S');
    const avatarHtml = hasPhoto
      ? `<img src="${escapeHtml(rev.avatar)}" alt="${escapeHtml(rev.name)}" class="rpc-avatar-img" loading="lazy" decoding="async" onerror="this.onerror=null; this.outerHTML='<div class=\\'rpc-avatar-circle\\'>${initials}</div>';">`
      : `<div class="rpc-avatar-circle">${initials}</div>`;

    return `
      <div class="review-pass-card">
        <div class="rpc-top">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${avatarHtml}
            <div>
              <div class="rpc-name">${escapeHtml(rev.name)}</div>
              <div class="rpc-date">📍 ${escapeHtml(rev.testCentre || rev.location || 'London')} &bull; ${escapeHtml(rev.date || '2026')}</div>
            </div>
          </div>
          <div style="color: #f59e0b; font-size: 0.85rem; letter-spacing: 1px;">★★★★★</div>
        </div>
        <span class="rpc-badge">🏆 ${escapeHtml(rev.passType || rev.result || '1st Time Pass')}</span>
        <p class="rpc-quote">"${escapeHtml(rev.comment)}"</p>
      </div>
    `;
  }).join('');
}

// 8. Guided 3-step Appointment Booking Form (emailed to Sam via /api/appointments)
function initBookingForm() {
  const form = document.getElementById('appointmentForm');
  if (!form) return;

  const steps = form.querySelectorAll('.booking-step');
  const stepperItems = document.querySelectorAll('.stepper-item');
  const pathItems = document.querySelectorAll('.booking-path-item');
  const successPanel = document.getElementById('bookingSuccess');
  const statusEl = document.getElementById('bookingStatus');
  const submitBtn = document.getElementById('bookingSubmitBtn');
  const dateInput = document.getElementById('bkDate');
  const card = form.closest('.booking-card');

  let currentStep = 1;
  let maxReached = 1;

  // No dates in the past
  if (dateInput) {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    dateInput.min = today.toISOString().slice(0, 10);
  }

  const val = (name) => {
    const el = form.elements[name];
    if (!el) return '';
    return (el.value || '').trim();
  };

  const serviceLabel = () => {
    const checked = form.querySelector('input[name="service"]:checked');
    return checked ? checked.closest('.service-option').querySelector('strong').textContent : '';
  };

  function setError(name, message) {
    const errEl = form.querySelector(`[data-error-for="${name}"]`);
    if (errEl) errEl.textContent = message || '';
    const input = form.elements[name];
    if (input && input.classList) input.classList.toggle('invalid', Boolean(message));
  }

  function validateStep(step) {
    let ok = true;
    const fail = (name, msg) => { setError(name, msg); ok = false; };

    if (step === 1) {
      setError('service'); setError('preferredDate');
      if (!form.querySelector('input[name="service"]:checked')) fail('service', 'Please choose what you would like to book.');
      const d = val('preferredDate');
      if (d && dateInput && d < dateInput.min) fail('preferredDate', 'Please choose a date from today onwards.');
    }

    if (step === 2) {
      ['fullName', 'email', 'phone', 'address', 'postcode'].forEach(n => setError(n));
      if (val('fullName').length < 2) fail('fullName', 'Please enter your full name.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val('email'))) fail('email', 'Please enter a valid email address.');
      if (val('phone').replace(/\D/g, '').length < 10) fail('phone', 'Please enter a valid phone number.');
      if (val('address').length < 3) fail('address', 'Please enter your address.');
      if (!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(val('postcode'))) fail('postcode', 'Please enter a valid UK postcode, e.g. B15 2TT.');
    }

    if (step === 3) {
      const errEl = form.querySelector('[data-error-for="consent"]');
      const consent = document.getElementById('bkConsent');
      if (errEl) errEl.textContent = '';
      if (!consent.checked) {
        if (errEl) errEl.textContent = 'Please tick the box so Sam can contact you.';
        ok = false;
      }
    }

    if (!ok) {
      const firstBad = form.querySelector(`.booking-step[data-step="${step}"] .invalid`);
      if (firstBad) firstBad.focus();
    }
    return ok;
  }

  function renderReview() {
    const row = (k, v) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`;
    const dateText = val('preferredDate')
      ? new Date(val('preferredDate') + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
      : 'Flexible';
    const transmission = (form.querySelector('input[name="transmission"]:checked') || {}).value || 'Not sure yet';

    document.getElementById('reviewAppointment').innerHTML =
      row('Service', serviceLabel()) +
      row('Transmission', transmission) +
      row('Date', dateText) +
      row('Time', val('preferredTime') || 'Flexible');

    document.getElementById('reviewDetails').innerHTML =
      row('Name', val('fullName')) +
      row('Email', val('email')) +
      row('Phone', val('phone')) +
      row('Address', [val('address'), val('town'), val('postcode').toUpperCase()].filter(Boolean).join(', '));
  }

  function goTo(step, { scroll = true } = {}) {
    currentStep = step;
    maxReached = Math.max(maxReached, step);
    if (step === 3) renderReview();

    steps.forEach(s => s.classList.toggle('active', Number(s.dataset.step) === step));

    stepperItems.forEach(item => {
      const n = Number(item.dataset.gotoStep);
      item.classList.toggle('active', n === step);
      item.classList.toggle('done', n < step);
      item.disabled = n > maxReached;
    });

    pathItems.forEach(item => {
      const n = Number(item.dataset.pathStep);
      item.classList.toggle('active', n === step);
      item.classList.toggle('done', n < step);
    });

    if (statusEl) statusEl.textContent = '';
    if (scroll && card) {
      const top = card.getBoundingClientRect().top + window.scrollY - 100;
      if (Math.abs(window.scrollY - top) > 120) window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  // Next / Back buttons
  form.querySelectorAll('[data-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateStep(currentStep)) goTo(currentStep + 1);
    });
  });
  form.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => goTo(currentStep - 1));
  });

  // Stepper + "Edit" links: jump back freely, jump forward only through validation
  document.querySelectorAll('#booking [data-goto-step]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = Number(btn.dataset.gotoStep);
      if (target === currentStep) return;
      if (target < currentStep) return goTo(target);
      for (let s = currentStep; s < target; s++) {
        if (!validateStep(s)) return goTo(s, { scroll: false });
      }
      goTo(target);
    });
  });

  // Clear an error as soon as the visitor fixes the field
  form.addEventListener('input', (e) => {
    if (e.target.name) setError(e.target.name);
  });
  form.addEventListener('change', (e) => {
    if (e.target.name === 'service') setError('service');
    if (e.target.id === 'bkConsent') {
      const errEl = form.querySelector('[data-error-for="consent"]');
      if (errEl) errEl.textContent = '';
    }
  });

  // "Book This" buttons anywhere on the page pre-select the service
  document.querySelectorAll('[data-book-service]').forEach(link => {
    link.addEventListener('click', () => {
      const radio = form.querySelector(`input[name="service"][value="${link.dataset.bookService}"]`);
      if (radio) {
        radio.checked = true;
        setError('service');
      }
      if (!successPanel.hidden) resetForm();
      goTo(1, { scroll: false });
    });
  });

  function resetForm() {
    form.reset();
    form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
    form.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
    successPanel.hidden = true;
    form.hidden = false;
    document.querySelector('.booking-stepper').hidden = false;
    maxReached = 1;
  }

  document.getElementById('bookAnotherBtn').addEventListener('click', () => {
    resetForm();
    goTo(1);
  });

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentStep !== 3) {
      if (validateStep(currentStep)) goTo(currentStep + 1);
      return;
    }
    for (let s = 1; s <= 3; s++) {
      if (!validateStep(s)) return goTo(s, { scroll: false });
    }

    const payload = {
      service: (form.querySelector('input[name="service"]:checked') || {}).value,
      transmission: (form.querySelector('input[name="transmission"]:checked') || {}).value,
      preferredDate: val('preferredDate'),
      preferredTime: val('preferredTime'),
      fullName: val('fullName'),
      email: val('email'),
      phone: val('phone'),
      address: val('address'),
      town: val('town'),
      postcode: val('postcode'),
      message: val('message'),
      website: val('website')
    };

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Sending…';
    statusEl.textContent = '';

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        document.getElementById('successName').textContent = payload.fullName.split(' ')[0];
        document.getElementById('successService').textContent = serviceLabel();
        document.getElementById('successRef').textContent = data.reference || '';
        document.getElementById('successEmail').textContent = payload.email;
        document.getElementById('successEmailNote').hidden = !data.confirmationSent;
        form.hidden = true;
        document.querySelector('.booking-stepper').hidden = true;
        successPanel.hidden = false;
        pathItems.forEach(item => {
          const n = Number(item.dataset.pathStep);
          item.classList.toggle('done', n < 4);
          item.classList.toggle('active', n === 4);
        });
        if (data.simulated) console.warn('[Booking] Gmail is not configured yet — the booking was logged in the server console instead of emailed.');
      } else {
        statusEl.textContent = data.message || 'Something went wrong. Please try again, or call / WhatsApp 07473 958802.';
      }
    } catch (err) {
      statusEl.textContent = 'We could not reach the server. Please check your connection, or call / WhatsApp 07473 958802.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Send booking request <span>&rarr;</span>';
    }
  });

  goTo(1, { scroll: false });
}

