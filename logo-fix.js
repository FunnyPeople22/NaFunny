/* =========================================================
   NaFunny HUB 1.2.1 Logo Animation Fix JS
   Locks logo gradient after theme changes and prevents fallback flash
   ========================================================= */

(function () {
  const logoSelectors = [
    '.nafunny-logo',
    '.logo-nafunny',
    '.hero-logo-text',
    '.hero-title',
    '.brand-title',
    '.main-logo',
    '.logo-text'
  ];

  const themeGradients = {
    blue: {
      gradient: 'linear-gradient(90deg, #7eeaff 0%, #10c8ff 48%, #d8fbff 100%)',
      glow: 'rgba(20, 210, 255, 0.72)',
      shadow: 'rgba(115, 235, 255, 0.38)'
    },
    purple: {
      gradient: 'linear-gradient(90deg, #ffd6ff 0%, #e777ff 42%, #b867ff 72%, #fff1ff 100%)',
      glow: 'rgba(218, 103, 255, 0.78)',
      shadow: 'rgba(255, 152, 255, 0.42)'
    },
    storm: {
      gradient: 'linear-gradient(90deg, #f3fbff 0%, #c9d8e8 46%, #ffffff 100%)',
      glow: 'rgba(210, 232, 255, 0.62)',
      shadow: 'rgba(165, 205, 255, 0.32)'
    }
  };

  function detectTheme() {
    const root = document.documentElement;
    const body = document.body;
    const attrTheme = root.dataset.theme || body.dataset.theme;

    if (attrTheme && themeGradients[attrTheme]) return attrTheme;

    const className = `${root.className} ${body.className}`.toLowerCase();
    if (className.includes('purple')) return 'purple';
    if (className.includes('storm')) return 'storm';
    return 'blue';
  }

  function lockLogoTheme() {
    const theme = detectTheme();
    const preset = themeGradients[theme] || themeGradients.blue;
    const logos = document.querySelectorAll(logoSelectors.join(','));

    document.documentElement.style.setProperty('--nafunny-logo-gradient', preset.gradient);
    document.documentElement.style.setProperty('--nafunny-logo-glow', preset.glow);
    document.documentElement.style.setProperty('--nafunny-logo-shadow', preset.shadow);

    logos.forEach((logo) => {
      logo.classList.add('logo-animating');

      logo.style.setProperty('color', 'transparent', 'important');
      logo.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
      logo.style.setProperty('background-image', 'var(--nafunny-logo-gradient)', 'important');
      logo.style.setProperty('background-size', '100% 100%', 'important');
      logo.style.setProperty('background-position', '50% 50%', 'important');
      logo.style.setProperty('background-repeat', 'no-repeat', 'important');
      logo.style.setProperty('-webkit-background-clip', 'text', 'important');
      logo.style.setProperty('background-clip', 'text', 'important');
      logo.style.setProperty('overflow', 'visible', 'important');
      logo.style.setProperty('padding-right', '0.18em', 'important');
      logo.style.setProperty('padding-bottom', '0.12em', 'important');
    });
  }

  window.nafunnyLockLogoTheme = lockLogoTheme;

  document.addEventListener('DOMContentLoaded', lockLogoTheme);
  window.addEventListener('load', lockLogoTheme);

  const observer = new MutationObserver(lockLogoTheme);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });

  document.addEventListener('click', function (event) {
    const target = event.target.closest('[data-theme], .theme-btn, .theme-button, button');
    if (!target) return;
    requestAnimationFrame(lockLogoTheme);
    setTimeout(lockLogoTheme, 80);
    setTimeout(lockLogoTheme, 220);
  });
})();
