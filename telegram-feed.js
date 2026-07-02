async function loadTelegramFeed() {
  const root = document.querySelector("#telegram-feed-list");
  if (!root) return;

  try {
    const response = await fetch("feed/telegram-feed.json?ts=" + Date.now());
    const data = await response.json();
    const posts = Array.isArray(data.posts) ? data.posts : [];

    root.innerHTML = posts.map(post => {
      const date = post.date ? new Date(post.date).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }) : "";

      const image = post.image
        ? `<img class="telegram-post-image" src="${post.image}" alt="">`
        : "";

      return `
        <article class="telegram-post-card">
          <div class="telegram-post-channel">📢 @${post.channelTitle || post.channel}</div>
          ${image}
          <div class="telegram-post-text">${escapeHtml(post.text || "")}</div>
          <div class="telegram-post-footer">
            <span class="telegram-post-date">${date}</span>
            <a class="telegram-post-link" href="${post.url}" target="_blank" rel="noopener">Open in Telegram</a>
          </div>
        </article>
      `;
    }).join("");
  } catch (error) {
    root.innerHTML = `<div class="telegram-post-card">Не удалось загрузить Telegram Feed.</div>`;
    console.error(error);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", loadTelegramFeed);
