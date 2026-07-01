const toast = document.getElementById("toast");

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const id = button.getAttribute("data-copy");
    const address = document.getElementById(id).innerText.trim();

    try {
      await navigator.clipboard.writeText(address);
      button.classList.add("copied");
      const oldText = button.textContent;
      button.textContent = "COPIED";
      showToast("Адрес скопирован ✅");

      setTimeout(() => {
        button.classList.remove("copied");
        button.textContent = oldText;
      }, 1300);
    } catch (error) {
      showToast("Не удалось скопировать. Выдели адрес вручную.");
    }
  });
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}
