/* NaFunny HUB 1.2.5 Logo Lightning FX
   Safe JS overlay. It does not change the logo text itself. */
(function () {
  const SELECTORS = [
    '.nafunny-logo',
    '.hero-title',
    '.logo-text',
    '.brand-title',
    '.hero-logo',
    '[data-logo="nafunny"]'
  ];

  function looksLikeNaFunny(el) {
    if (!el || el.dataset.nafunnyFxReady === '1') return false;
    const text = (el.textContent || '').replace(/\s+/g, '').toLowerCase();
    return text === 'nafunny' || text.includes('nafunny');
  }

  function buildLightning() {
    const layer = document.createElement('span');
    layer.className = 'nafunny-logo-lightning';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = `
      <svg viewBox="0 0 420 120" preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id="nafunnyBoltGradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
            <stop offset=".35" stop-color="#ffffff" stop-opacity=".88"/>
            <stop offset=".55" stop-color="#76f8ff" stop-opacity="1"/>
            <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path class="nafunny-logo-bolt-main" d="M10 72 L58 70 L88 48 L126 56 L158 32 L204 54 L245 40 L282 62 L328 42 L410 44" fill="none" stroke="url(#nafunnyBoltGradient)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path class="nafunny-logo-bolt-small" d="M82 78 L101 62 L94 62 L115 42" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <path class="nafunny-logo-bolt-small" d="M300 75 L318 58 L310 58 L335 32" fill="none" stroke="#84f8ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="animation-delay:.13s"/>
      </svg>`;
    return layer;
  }

  function wrapLogo(el) {
    if (!looksLikeNaFunny(el)) return;

    el.dataset.nafunnyFxReady = '1';
    el.classList.add('nafunny-logo-fx-target');

    const wrap = document.createElement('span');
    wrap.className = 'nafunny-logo-fx-wrap';

    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
    wrap.appendChild(buildLightning());

    const sheen = document.createElement('span');
    sheen.className = 'nafunny-logo-sheen';
    sheen.setAttribute('aria-hidden', 'true');
    wrap.appendChild(sheen);
  }

  function init() {
    const found = new Set();
    SELECTORS.forEach(sel => document.querySelectorAll(sel).forEach(el => found.add(el)));
    document.querySelectorAll('h1, .hero h1, .hero *').forEach(el => {
      if (looksLikeNaFunny(el)) found.add(el);
    });
    found.forEach(wrapLogo);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('load', init);
  setTimeout(init, 700);
})();
