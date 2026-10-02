/**
 * mr sam_ Driving School - Candidate Welcome & Fast-Launch Controller
 * Displays animated personalized welcome screen with real-time candidate name variable,
 * streams loading progress, pre-loads all dashboard information in the background,
 * and seamlessly transitions to the candidate portal with fading animation.
 */

document.addEventListener('DOMContentLoaded', async () => {
  await initWelcomeLaunchScreen();
});

async function initWelcomeLaunchScreen() {
  const token = localStorage.getItem('mrsam_token');
  let currentUser = null;

  // 1. Read existing cached user immediately so name displays with zero lag
  try {
    const raw = localStorage.getItem('mrsam_user');
    if (raw) {
      currentUser = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Could not read cached user in welcome screen:', e);
  }

  // If completely unauthenticated, redirect to login
  if (!token && !currentUser) {
    window.location.href = 'login.html';
    return;
  }

  // Populate immediate UI from cached data
  updateWelcomeUI(currentUser);

  // 2. Concurrently fetch fresh live profile from MongoDB Atlas to ensure everything is up to date
  let profilePromise = Promise.resolve();
  if (token) {
    profilePromise = fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.user) {
          currentUser = data.user;
          currentUser.configured = true;
          localStorage.setItem('mrsam_user', JSON.stringify(currentUser));
          updateWelcomeUI(currentUser);
        }
      })
      .catch(err => {
        console.warn('Background dashboard pre-load notice:', err);
      });
  }

  // 3. Run the streamlined loading progress animation
  await runLoadingStreamline(currentUser, profilePromise);
}

function updateWelcomeUI(user) {
  if (!user) return;

  const nameEl = document.getElementById('welcomeUserName');
  const trackingEl = document.getElementById('previewTracking');
  const centreEl = document.getElementById('previewTestCentre');
  const pkgEl = document.getElementById('previewPackage');

  if (nameEl && user.name) {
    nameEl.textContent = user.name;
  }

  if (trackingEl && user.trackingNumber) {
    trackingEl.textContent = user.trackingNumber;
  }

  if (centreEl && user.testCentre) {
    centreEl.textContent = user.testCentre.toLowerCase().includes('centre') 
      ? user.testCentre 
      : `${user.testCentre} Test Centre`;
  }

  if (pkgEl && user.coursePackage) {
    pkgEl.textContent = user.coursePackage;
  }
}

function runLoadingStreamline(user, profilePromise) {
  return new Promise(resolve => {
    const fillEl = document.getElementById('streamlineFill');
    const percentEl = document.getElementById('streamlinePercent');
    const statusEl = document.getElementById('streamlineStatus');
    const container = document.getElementById('welcomeCardContainer');

    let currentPercent = 0;
    const targetDuration = 2400; // ~2.4 seconds total animation
    const intervalTime = 40;
    const totalSteps = targetDuration / intervalTime;
    const increment = 100 / totalSteps;

    const interval = setInterval(() => {
      currentPercent += increment;

      if (currentPercent >= 100) {
        currentPercent = 100;
        clearInterval(interval);

        if (fillEl) fillEl.style.width = '100%';
        if (percentEl) percentEl.textContent = '100%';
        if (statusEl) statusEl.textContent = 'Ready! Launching Candidate Portal...';

        // Wait for background profile fetch to resolve, then fade out and open dashboard
        profilePromise.finally(() => {
          // Record welcome seen for this candidate
          if (user && (user.id || user._id)) {
            const uid = user.id || user._id;
            localStorage.setItem('mrsam_welcome_seen_' + uid, 'true');
          }

          setTimeout(() => {
            // Trigger smooth fading animation
            if (container) {
              container.classList.add('fading-out');
            }

            setTimeout(() => {
              window.location.href = 'dashboard.html';
              resolve();
            }, 550);
          }, 350);
        });

      } else {
        const rounded = Math.floor(currentPercent);
        if (fillEl) fillEl.style.width = `${rounded}%`;
        if (percentEl) percentEl.textContent = `${rounded}%`;

        // Update dynamic status stage
        if (statusEl) {
          if (rounded < 25) {
            statusEl.textContent = 'Verifying candidate credentials...';
          } else if (rounded < 55) {
            const tc = user?.testCentre ? user.testCentre : 'DVSA Test Centre';
            statusEl.textContent = `Configuring ${tc}...`;
          } else if (rounded < 85) {
            statusEl.textContent = 'Pre-loading personal syllabus & dashboard...';
          } else {
            statusEl.textContent = 'Finalizing portal initialization...';
          }
        }
      }
    }, intervalTime);
  });
}
