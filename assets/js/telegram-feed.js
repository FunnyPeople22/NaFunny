(function () {
  const root = document.querySelector('[data-telegram-feed]');
  if (!root) return;

  const feedUrl = root.getAttribute('data-feed-url') || 'feed/telegram-feed.json';
  const maxPosts = Number(root.getAttribute('data-max-posts') || 6);

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function render(feed) {
    const posts = Array.isArray(feed.posts) ? feed.posts.slice(0, maxPosts) : [];
    const channel = feed.channel || 'NaFunny';

    root.innerHTML = `
      <div class="tg-feed-head">
        <div>
          <p class="tg-feed-kicker">LIVE TELEGRAM FEED</p>
          <h2>Latest from @${escapeHtml(channel)}</h2>
        </div>
        <a class="tg-feed-main-link" href="https://t.me/${escapeHtml(channel)}" target="_blank" rel="noopener">Open Channel</a>
      </div>
      <div class="tg-feed-grid">
        ${posts.map((post) => `
          <article class="tg-post-card">
            <div class="tg-post-meta">
              <span>@${escapeHtml(post.channel || channel)}</span>
              <span>${escapeHtml(formatDate(post.date))}</span>
            </div>
            <p>${escapeHtml(post.text).replace(/\n/g, '<br>')}</p>
            <div class="tg-post-actions">
              <span>${post.views ? `👁 ${escapeHtml(post.views)}` : '⚡ NaFunny HUB'}</span>
              <a href="${escapeHtml(post.url)}" target="_blank" rel="noopener">Open in Telegram</a>
            </div>
          </article>
        `).join('')}
      </div>
      <p class="tg-feed-updated">Updated: ${escapeHtml(formatDate(feed.updatedAt)) || 'GitHub Actions'}</p>
    `;
  }

  async function loadFeed() {
    try {
      root.innerHTML = '<div class="tg-feed-loading">Loading Telegram Feed...</div>';
      const response = await fetch(`${feedUrl}?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Feed request failed');
      render(await response.json());
    } catch (error) {
      root.innerHTML = `
        <div class="tg-feed-error">
          <h2>Telegram Feed</h2>
          <p>Feed is not available yet. Run GitHub Actions or check feed/telegram-feed.json.</p>
        </div>
      `;
    }
  }

  loadFeed();
})();
