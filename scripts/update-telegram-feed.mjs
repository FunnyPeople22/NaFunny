import { writeFile, mkdir } from 'node:fs/promises';

const CHANNEL = process.env.TELEGRAM_CHANNEL || 'NaFunny';
const LIMIT = Number(process.env.TELEGRAM_LIMIT || 6);
const OUT_FILE = process.env.TELEGRAM_FEED_OUT || 'feed/telegram-feed.json';

const url = `https://t.me/s/${CHANNEL}`;

function stripTags(html = '') {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function pick(regex, text) {
  const match = text.match(regex);
  return match ? match[1] : '';
}

function parsePosts(html) {
  const blocks = html.split('<div class="tgme_widget_message ').slice(1);

  return blocks.map((block) => {
    const postIdFull = pick(/data-post="([^"]+)"/, block);
    const postNumber = postIdFull.includes('/') ? postIdFull.split('/').pop() : '';
    const link = postNumber ? `https://t.me/${CHANNEL}/${postNumber}` : `https://t.me/${CHANNEL}`;
    const textHtml = pick(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/, block);
    const text = stripTags(textHtml);
    const datetime = pick(/<time datetime="([^"]+)"/, block);
    const views = stripTags(pick(/<span class="tgme_widget_message_views">([\s\S]*?)<\/span>/, block));

    return {
      id: postIdFull || link,
      channel: CHANNEL,
      text,
      date: datetime,
      views,
      url: link
    };
  })
  .filter((post) => post.text && post.url)
  .slice(-LIMIT)
  .reverse();
}

async function main() {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 NaFunnyHubFeedBot/1.3'
    }
  });

  if (!res.ok) {
    throw new Error(`Telegram fetch failed: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const posts = parsePosts(html);

  const feed = {
    version: '1.3.0',
    source: url,
    channel: CHANNEL,
    updatedAt: new Date().toISOString(),
    posts
  };

  await mkdir(OUT_FILE.split('/').slice(0, -1).join('/'), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(feed, null, 2)}\n`, 'utf8');

  console.log(`Saved ${posts.length} posts from @${CHANNEL} to ${OUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
