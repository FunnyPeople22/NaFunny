/*
  NaFunny HUB 1.4 Ultimate Feed
  Fetches latest public posts from t.me/s/<channel> without tokens.
  Output: feed/telegram-feed.json
*/

import fs from "node:fs/promises";

const CHANNELS = (process.env.TELEGRAM_CHANNELS || "NaFunny,TonNewbie")
  .split(",")
  .map(channel => channel.trim().replace(/^@/, ""))
  .filter(Boolean);

const LIMIT_PER_CHANNEL = Number(process.env.TELEGRAM_LIMIT_PER_CHANNEL || 2);
const OUT_FILE = process.env.TELEGRAM_FEED_OUT || "feed/telegram-feed.json";

const CHANNEL_META = {
  NaFunny: {
    title: "NaFunny",
    icon: "🎮",
    description: "Streams, community and creator updates"
  },
  TonNewbie: {
    title: "TonNewbie",
    icon: "💎",
    description: "TON / GRAM, crypto news and market notes"
  }
};

function decodeHtml(value = "") {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function stripTags(html = "") {
  return decodeHtml(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/div>\s*<div/gi, "\n<div")
      .replace(/<\/p>/gi, "\n")
      .replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
        const clean = stripTags(text);
        return clean ? `${clean} (${href})` : href;
      })
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function absoluteUrl(url = "") {
  if (!url) return "";
  const cleaned = decodeHtml(url).replace(/\\/g, "");
  if (cleaned.startsWith("//")) return "https:" + cleaned;
  if (cleaned.startsWith("/")) return "https://t.me" + cleaned;
  return cleaned;
}

function splitMessageBlocks(html) {
  const blocks = [];
  const marker = '<div class="tgme_widget_message ';
  let index = 0;

  while (true) {
    const start = html.indexOf(marker, index);
    if (start === -1) break;

    const next = html.indexOf(marker, start + marker.length);
    const end = next === -1 ? html.length : next;
    blocks.push(html.slice(start, end));
    index = end;
  }

  return blocks;
}

function findMessageText(block) {
  const match = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div class="tgme_widget_message_footer|<div class="tgme_widget_message_bubble_tail|<\/div>)/);
  if (match?.[1]) return stripTags(match[1]);

  const alt = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  return stripTags(alt?.[1] || "");
}

function findImage(block) {
  const patterns = [
    /background-image:url\('([^']+)'\)/i,
    /background-image:url\(&quot;([^&]+)&quot;\)/i,
    /background-image:\s*url\(([^)]+)\)/i,
    /<img[^>]+src="([^"]+)"/i
  ];

  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (match?.[1]) {
      return absoluteUrl(match[1].replace(/^['"]|['"]$/g, ""));
    }
  }

  return "";
}

function findViews(block) {
  const match = block.match(/<span class="tgme_widget_message_views">([\s\S]*?)<\/span>/);
  return stripTags(match?.[1] || "");
}

function findDate(block) {
  const match = block.match(/<time datetime="([^"]+)"/);
  return match?.[1] || "";
}

function findPostId(block) {
  const match = block.match(/data-post="([^"]+)"/);
  return match?.[1] || "";
}

function normalizePosts(posts, channel) {
  const seen = new Set();

  return posts
    .filter(post => post && (post.text || post.image))
    .filter(post => {
      const key = post.url || `${channel}:${post.text.slice(0, 80)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, LIMIT_PER_CHANNEL);
}

async function fetchChannel(channel) {
  const url = `https://t.me/s/${channel}`;
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; NaFunnyHUB/1.4; +https://funnypeople22.github.io/NaFunny/)",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });

  if (!response.ok) {
    throw new Error(`@${channel}: HTTP ${response.status}`);
  }

  const html = await response.text();
  const blocks = splitMessageBlocks(html);

  const posts = blocks
    .map(block => {
      const postId = findPostId(block);
      const text = findMessageText(block);
      const image = findImage(block);
      const date = findDate(block);
      const views = findViews(block);
      const meta = CHANNEL_META[channel] || { title: channel, icon: "📢", description: "" };

      return {
        channel,
        channelTitle: meta.title,
        channelIcon: meta.icon,
        channelDescription: meta.description,
        text,
        image,
        date,
        views,
        url: postId ? `https://t.me/${postId}` : `https://t.me/${channel}`
      };
    })
    .reverse();

  return normalizePosts(posts, channel);
}

const output = {
  version: "1.4",
  updatedAt: new Date().toISOString(),
  source: "t.me/s public channel pages",
  limitPerChannel: LIMIT_PER_CHANNEL,
  channels: CHANNELS,
  posts: [],
  errors: []
};

for (const channel of CHANNELS) {
  try {
    const posts = await fetchChannel(channel);
    output.posts.push(...posts);

    if (!posts.length) {
      output.errors.push({
        channel,
        message: `No public posts found for @${channel}. Check whether the channel is public and available at https://t.me/s/${channel}`
      });
    }
  } catch (error) {
    output.errors.push({
      channel,
      message: error.message
    });
  }
}

output.posts.sort((a, b) => {
  const ai = CHANNELS.indexOf(a.channel);
  const bi = CHANNELS.indexOf(b.channel);
  if (ai !== bi) return ai - bi;
  return new Date(b.date || 0) - new Date(a.date || 0);
});

await fs.mkdir(OUT_FILE.split("/").slice(0, -1).join("/") || ".", { recursive: true });
await fs.writeFile(OUT_FILE, JSON.stringify(output, null, 2), "utf8");

console.log(`Saved ${output.posts.length} posts to ${OUT_FILE}`);
if (output.errors.length) {
  console.log("Warnings:", JSON.stringify(output.errors, null, 2));
}
