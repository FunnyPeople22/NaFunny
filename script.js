const toast = document.getElementById('toast');
document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const value = button.dataset.copy;
    try {
      await navigator.clipboard.writeText(value);
      button.textContent = 'Copied';
      toast.classList.add('show');
      setTimeout(() => { button.textContent = 'Copy'; toast.classList.remove('show'); }, 1400);
    } catch (e) {
      const area = document.createElement('textarea');
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
      button.textContent = 'Copied';
      setTimeout(() => button.textContent = 'Copy', 1400);
    }
  });
});
