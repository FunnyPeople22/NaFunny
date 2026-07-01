const toast = document.getElementById('toast');
function showToast(text) {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove('show'), 1400);
}

document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const value = button.getAttribute('data-copy');
    try {
      await navigator.clipboard.writeText(value);
      showToast('Address copied');
      button.textContent = 'Copied';
      setTimeout(() => button.textContent = 'Copy', 1000);
    } catch (error) {
      const area = document.createElement('textarea');
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
      showToast('Address copied');
    }
  });
});
