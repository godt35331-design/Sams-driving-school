/**
 * Sam's Driving School UK - Environment & API Configuration
 * Supports Split Hosting: Vercel (Frontend) + Render (Backend)
 */
(function () {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  /**
   * INSTRUCTIONS FOR HOSTING:
   * Option A (Recommended): Leave empty (''). When deploying to Vercel, the included
   *          'vercel.json' will automatically proxy all '/api' requests to your Render backend!
   * Option B: Paste your Render Web Service URL below (e.g. 'https://sams-backend.onrender.com').
   */
  const CONFIGURED_RENDER_URL = '';

  window.RENDER_BACKEND_URL =
    window.RENDER_BACKEND_URL ||
    localStorage.getItem('mrsam_backend_url') ||
    CONFIGURED_RENDER_URL ||
    '';

  // When a remote backend is specified and we are not running locally,
  // transparently route all relative '/api' fetch calls to the Render backend.
  if (window.RENDER_BACKEND_URL && !isLocal) {
    const backendBase = window.RENDER_BACKEND_URL.replace(/\/+$/, '');
    const originalFetch = window.fetch;

    window.fetch = function (resource, init) {
      if (typeof resource === 'string' && resource.startsWith('/api')) {
        return originalFetch(backendBase + resource, init);
      }
      return originalFetch(resource, init);
    };

    console.log(`[API Config] Connected to remote Render backend: ${backendBase}`);
  }
})();
