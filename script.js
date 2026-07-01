const toast = document.getElementById('toast');
document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const value = button.getAttribute('data-copy');
    try {
      await navigator.clipboard.writeText(value);
      button.textContent = 'Copied';
      toast.classList.add('show');
      setTimeout(() => {
        button.textContent = 'Copy';
        toast.classList.remove('show');
      }, 1400);
    } catch (e) {
      button.textContent = 'Select';
      alert(value);
    }
  });
});
