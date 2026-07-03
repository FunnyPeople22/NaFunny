/*
  NaFunny HUB 1.4.1 Maintenance Feed UI
*/

(function () {
  const FEED_URL = "feed/telegram-feed.json";
  const CHANNEL_ORDER = ["NaFunny", "TonNewbie"];
  const MAX_PER_CHANNEL = 2;

  document.addEventListener("DOMContentLoaded", loadTelegramFeed);

  async function loadTelegramFeed() {
    const root = document.querySelector("#telegram-feed-list");
    if (!root) return;

    root.innerHTML = `
      <div class="telegram-feed-loading">
        <span></span>
        Loading Telegram Feed...
      </div>
    `;

    try {
      const response = await fetch(`${FEED_URL}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const posts = normalizePosts(data.posts || []);
      const grouped = groupPosts(posts);
      const updatedAt = renderUpdatedAt(data.updatedAt);

      root.innerHTML = updatedAt + CHANNEL_ORDER.map(channel => renderChannelBlock(channel, grouped[channel] || [])).join("");

      if (!posts.length) {
        root.innerHTML = renderEmpty(data.errors);
      }
    } catch (error) {
      console.error("Telegram Feed error:", error);
      root.innerHTML = `
        <div class="telegram-feed-empty">
          Не удалось загрузить Telegram Feed. Проверь файл <b>feed/telegram-feed.json</b>.
        </div>
      `;
    }
  }

  function normalizePosts(posts) {
    return posts
      .filter(Boolean)
      .map(post => ({
        channel: cleanChannel(post.channel || post.channelTitle || ""),
        channelTitle: post.channelTitle || cleanChannel(post.channel || ""),
        channelIcon: post.channelIcon || (cleanChannel(post.channel) === "TonNewbie" ? "💎" : "🎮"),
        channelDescription: post.channelDescription || "",
        text: String(post.text || "").trim(),
        date: post.date || "",
        url: post.url || "#",
        image: isEmojiImage(post.image || "") ? "" : (post.image || ""),
        views: post.views || "",
        error: Boolean(post.error)
      }))
      .filter(post => post.text || post.image);
  }

  function cleanChannel(value) {
    return String(value).replace(/^@/, "").trim();
  }

  function groupPosts(posts) {
    const grouped = {};
    for (const channel of CHANNEL_ORDER) grouped[channel] = [];

    for (const post of posts) {
      const channel = CHANNEL_ORDER.find(name => name.toLowerCase() === post.channel.toLowerCase()) || post.channel;
      if (!grouped[channel]) grouped[channel] = [];
      if (grouped[channel].length < MAX_PER_CHANNEL) grouped[channel].push(post);
    }

    return grouped;
  }


  function renderUpdatedAt(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const formatted = date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });

    return `<div class="telegram-feed-updated">🟢 Feed updated: ${escapeHtml(formatted)}</div>`;
  }

  function isEmojiImage(url) {
    return /telegram\.org\/img\/emoji\//i.test(String(url || ""));
  }

  function renderChannelBlock(channel, posts) {
    const meta = channel === "TonNewbie"
      ? { icon: "💎", title: "TonNewbie", subtitle: "TON / GRAM & crypto news" }
      : { icon: "🎮", title: "NaFunny", subtitle: "Streams & community updates" };

    const cards = posts.length
      ? posts.map(renderPostCard).join("")
      : `<article class="telegram-post-card telegram-post-placeholder">
           <div class="telegram-post-text">Посты @${meta.title} пока не загрузились. Запусти GitHub Actions → Update Telegram Feed.</div>
         </article>`;

    return `
      <div class="telegram-channel-block telegram-channel-${escapeAttr(channel.toLowerCase())}">
        <div class="telegram-channel-head">
          <span class="telegram-channel-icon">${meta.icon}</span>
          <div>
            <strong>@${meta.title}</strong>
            <small>${meta.subtitle}</small>
          </div>
        </div>
        <div class="telegram-channel-posts">
          ${cards}
        </div>
      </div>
    `;
  }

  function renderPostCard(post) {
    const date = formatDate(post.date);
    const image = post.image
      ? `<a href="${escapeAttr(post.url)}" target="_blank" rel="noopener noreferrer">
           <img class="telegram-post-image" src="${escapeAttr(post.image)}" alt="">
         </a>`
      : "";

    const views = post.views ? `<span class="telegram-post-views">👁 ${escapeHtml(post.views)}</span>` : "";
    const text = trimText(post.text, 560);

    return `
      <article class="telegram-post-card${post.error ? " telegram-post-error" : ""}">
        ${image}
        <div class="telegram-post-text">${escapeHtml(text)}</div>
        <div class="telegram-post-footer">
          <span class="telegram-post-date">${escapeHtml(date)}</span>
          ${views}
          <a class="telegram-post-link" href="${escapeAttr(post.url)}" target="_blank" rel="noopener noreferrer">
            Open in Telegram
          </a>
        </div>
      </article>
    `;
  }

  function renderEmpty(errors) {
    const list = Array.isArray(errors) && errors.length
      ? `<br><small>${errors.map(err => `@${escapeHtml(err.channel)}: ${escapeHtml(err.message)}`).join("<br>")}</small>`
      : "";

    return `
      <div class="telegram-feed-empty">
        Telegram Feed пока пуст. Запусти GitHub Actions → Update Telegram Feed.
        ${list}
      </div>
    `;
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function trimText(value, max) {
    const text = String(value || "")
      .replace(/\((https?:\/\/t\.me\/[^)]+)\)/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (text.length <= max) return text;
    return text.slice(0, max).trim() + "…";
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }
})();
