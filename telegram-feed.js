/*
  NaFunny HUB 1.3 Stable Final — Dual Telegram Feed
  Renders 2 posts from @NaFunny + 2 posts from @TonNewbie from feed/telegram-feed.json
*/

(function () {
  const FEED_URL = "feed/telegram-feed.json";
  const CHANNEL_ORDER = ["NaFunny", "TonNewbie"];
  const MAX_PER_CHANNEL = 2;

  document.addEventListener("DOMContentLoaded", loadTelegramFeed);

  async function loadTelegramFeed() {
    const root = document.querySelector("#telegram-feed-list");
    if (!root) return;

    root.innerHTML = `<div class="telegram-feed-loading"><span></span>Loading Telegram Feed...</div>`;

    try {
      const response = await fetch(`${FEED_URL}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const posts = normalizePosts(data.posts || []);
      const grouped = groupPosts(posts);

      root.innerHTML = CHANNEL_ORDER
        .map((channel) => renderChannelBlock(channel, grouped[channel] || []))
        .join("");

      root.dataset.updatedAt = data.updatedAt || "";
    } catch (error) {
      console.error("Telegram Feed error:", error);
      root.innerHTML = `
        <div class="telegram-feed-empty">
          Не удалось загрузить Telegram Feed. Проверь файл feed/telegram-feed.json.
        </div>
      `;
    }
  }

  function normalizePosts(posts) {
    return posts
      .filter(Boolean)
      .map((post) => {
        const channel = normalizeChannel(post.channel || post.channelTitle || "");
        return {
          id: post.id || post.url || `${channel}-${Math.random()}`,
          channel,
          channelTitle: displayChannel(channel),
          text: decodeHtml(String(post.text || "").trim()),
          date: post.date || "",
          url: post.url || `https://t.me/${channel}`,
          image: post.image || "",
          views: post.views || "",
          error: Boolean(post.error),
        };
      })
      .filter((post) => CHANNEL_ORDER.includes(post.channel))
      .filter((post) => post.text || post.image);
  }

  function normalizeChannel(value) {
    const clean = String(value).replace(/^@/, "").trim().toLowerCase();
    if (clean === "tonnewbie") return "TonNewbie";
    return "NaFunny";
  }

  function displayChannel(channel) {
    return channel === "TonNewbie" ? "TonNewbie" : "NaFunny";
  }

  function groupPosts(posts) {
    const grouped = Object.fromEntries(CHANNEL_ORDER.map((channel) => [channel, []]));
    const seen = new Set();

    for (const post of posts) {
      const key = `${post.channel}:${post.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (grouped[post.channel].length < MAX_PER_CHANNEL) grouped[post.channel].push(post);
    }

    return grouped;
  }

  function renderChannelBlock(channel, posts) {
    const icon = channel === "TonNewbie" ? "💎" : "🎮";
    const title = displayChannel(channel);

    const cards = posts.length
      ? posts.map(renderPostCard).join("")
      : `<article class="telegram-post-card telegram-post-placeholder">
           <div class="telegram-post-text">Запусти GitHub Actions → Update Telegram Feed, чтобы подтянуть 2 поста @${title}.</div>
           <div class="telegram-post-footer"><span></span><a class="telegram-post-link" href="https://t.me/${title}" target="_blank" rel="noopener noreferrer">Open Channel</a></div>
         </article>`;

    return `
      <section class="telegram-channel-block telegram-channel-${channel.toLowerCase()}">
        <div class="telegram-channel-head">
          <span class="telegram-channel-icon">${icon}</span>
          <div>
            <strong>@${title}</strong>
            <small>Latest 2 posts</small>
          </div>
        </div>
        <div class="telegram-channel-posts">${cards}</div>
      </section>
    `;
  }

  function renderPostCard(post) {
    const date = formatDate(post.date);
    const views = post.views ? `<span class="telegram-post-views">👁 ${escapeHtml(post.views)}</span>` : "";
    const image = post.image
      ? `<a href="${escapeAttr(post.url)}" target="_blank" rel="noopener noreferrer"><img class="telegram-post-image" src="${escapeAttr(post.image)}" alt=""></a>`
      : "";

    return `
      <article class="telegram-post-card${post.error ? " telegram-post-error" : ""}">
        ${image}
        <div class="telegram-post-text">${escapeHtml(trimText(post.text, 460))}</div>
        <div class="telegram-post-footer">
          <span class="telegram-post-date">${escapeHtml(date)} ${views}</span>
          <a class="telegram-post-link" href="${escapeAttr(post.url)}" target="_blank" rel="noopener noreferrer">Open in Telegram</a>
        </div>
      </article>
    `;
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function trimText(value, max) {
    const text = String(value || "").replace(/\n{3,}/g, "\n\n").trim();
    if (text.length <= max) return text;
    return text.slice(0, max).trim() + "…";
  }

  function decodeHtml(value) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
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
