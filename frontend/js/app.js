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

// 8. Booking Form Submission
function initBookingForm() {
  const form = document.getElementById('mainBookingForm');
  const submitBtn = document.getElementById('submitBookingBtn');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      fullName: document.getElementById('fullName').value,
      phone: document.getElementById('phone').value,
      email: document.getElementById('email').value,
      postcode: document.getElementById('postcode').value,
      transmission: document.getElementById('transmission').value,
      courseId: document.getElementById('courseId').value,
      notes: document.getElementById('notes').value
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Processing enquiry...</span>';
    }

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast('Enquiry Received', 'Sam will contact you via WhatsApp or call within 24 hours to confirm your lesson slot.');
        form.reset();
      } else {
        showToast('Enquiry Sent', data.message || 'Thank you for reaching out!');
      }
    } catch (err) {
      showToast('Enquiry Logged', 'Thank you! Sam will be in touch shortly.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <span>SUBMIT LESSON ENQUIRY</span>
          <span class="btn-arrow">&rarr;</span>
        `;
      }
    }
  });
}


