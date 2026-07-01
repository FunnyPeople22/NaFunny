const toast = document.getElementById('toast');
function showToast(text = 'Copied') {
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1500);
}

document.querySelectorAll('.wallet .copy').forEach((button) => {
  button.addEventListener('click', async () => {
    const address = button.closest('.wallet').dataset.address;
    try {
      await navigator.clipboard.writeText(address);
      showToast('Address copied');
      button.textContent = 'Copied';
      setTimeout(() => (button.textContent = 'Copy'), 1200);
    } catch (e) {
      showToast('Copy manually');
    }
  });
});

const modal = document.getElementById('qrModal');
const qrImage = document.getElementById('qrImage');
document.querySelectorAll('.wallet .qr').forEach((button) => {
  button.addEventListener('click', () => {
    qrImage.src = button.dataset.qr;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  });
});
document.querySelector('.qr-close').addEventListener('click', closeQr);
modal.addEventListener('click', (e) => { if (e.target === modal) closeQr(); });
function closeQr() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

const navLinks = document.querySelectorAll('.bottom-nav a');
const sections = [...navLinks].map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
    }
  });
}, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
sections.forEach(section => observer.observe(section));
