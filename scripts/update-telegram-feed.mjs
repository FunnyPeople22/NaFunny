/*
  NaFunny HUB 1.5 Stable Telegram Engine
  - Fetches public Telegram channel pages from t.me/s/<channel> without tokens.
  - Collects posts by Telegram message id and removes duplicated/near-duplicated cards.
  - Sorts by Telegram message id first, then by date.
  - Ignores Telegram emoji PNGs as post images.
  - Keeps real post images from telesco.pe / Telegram CDN when available.
  Output: feed/telegram-feed.json
*/

import fs from "node:fs/promises";

const CHANNELS = (process.env.TELEGRAM_CHANNELS || "NaFunny,TonNewbie")
  .split(",")
  .map(channel => channel.trim().replace(/^@/, ""))
  .filter(Boolean);

const LIMIT_PER_CHANNEL = Number(process.env.TELEGRAM_LIMIT_PER_CHANNEL || 2);
const OUT_FILE = process.env.TELEGRAM_FEED_OUT || "feed/telegram-feed.json";
const EXPECTED_MIN_POSTS = CHANNELS.length;


async function readExistingFeed() {
  try {
    const raw = await fs.readFile(OUT_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function comparableFeed(feed) {
  const { updatedAt, ...rest } = feed || {};
  return JSON.stringify(rest);
}

function mergeWithExistingPosts(nextFeed, existingFeed) {
  if (!existingFeed?.posts?.length) return nextFeed;

  const nextChannelsWithPosts = new Set(nextFeed.posts.map(post => post.channel));
  const mergedPosts = [...nextFeed.posts];

  for (const channel of CHANNELS) {
    if (nextChannelsWithPosts.has(channel)) continue;
    const fallbackPosts = existingFeed.posts
      .filter(post => post.channel === channel)
      .slice(0, LIMIT_PER_CHANNEL);

    if (fallbackPosts.length) {
      mergedPosts.push(...fallbackPosts);
      nextFeed.errors.push({
        channel,
        message: `Kept previous @${channel} posts because the current fetch returned no usable posts.`
      });
    }
  }

  nextFeed.posts = mergedPosts.sort((a, b) => {
    const ai = CHANNELS.indexOf(a.channel);
    const bi = CHANNELS.indexOf(b.channel);
    if (ai !== bi) return ai - bi;

    const aNum = Number((a.id || a.url || "").match(/\/(\d+)$/)?.[1] || 0);
    const bNum = Number((b.id || b.url || "").match(/\/(\d+)$/)?.[1] || 0);
    if (aNum !== bNum) return bNum - aNum;

    return new Date(b.date || 0) - new Date(a.date || 0);
  });

  return nextFeed;
}

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
  return String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function stripTags(html = "") {
  return decodeHtml(
    String(html)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/div>\s*<div/gi, "\n<div")
      .replace(/<\/p>/gi, "\n")
      .replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
        const cleanText = stripTags(text);
        const cleanHref = absoluteUrl(href);
        return cleanText && cleanHref && cleanText !== cleanHref ? `${cleanText} (${cleanHref})` : (cleanText || cleanHref);
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
  const cleaned = decodeHtml(url).replace(/\\/g, "").replace(/^['"]|['"]$/g, "").trim();
  if (!cleaned) return "";
  if (cleaned.startsWith("//")) return "https:" + cleaned;
  if (cleaned.startsWith("/")) return "https://t.me" + cleaned;
  return cleaned;
}

function isEmojiImage(url = "") {
  return /telegram\.org\/img\/emoji\//i.test(String(url)) || /\/emoji\//i.test(String(url));
}

function isRealPostImage(url = "") {
  if (!url || isEmojiImage(url)) return false;
  return (
    /telesco\.pe\/file\//i.test(url) ||
    /cdn\d*\.cdn-telegram\.org\//i.test(url) ||
    /\.telegram-cdn\.org\//i.test(url) ||
    /\.(jpg|jpeg|png|webp)(\?|$)/i.test(url)
  );
}

function normalizeTextForDedupe(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\([^)]*https?:\/\/[^)]*\)/g, "")
    .replace(/[@#][\wа-яё_]+/gi, "")
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .slice(0, 140);
}

function splitMessageBlocks(html) {
  const blocks = [];
  const regex = /<div class="tgme_widget_message\s[^>]*data-post="[^"]+"[\s\S]*?(?=<div class="tgme_widget_message\s[^>]*data-post="|<\/body>|$)/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    blocks.push(match[0]);
  }
  return blocks;
}

function findMessageText(block) {
  const match = block.match(/<div class="tgme_widget_message_text[^\"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div class="tgme_widget_message_footer|<div class="tgme_widget_message_bubble_tail|<\/div>)/);
  if (match?.[1]) return stripTags(match[1]);

  const alt = block.match(/<div class="tgme_widget_message_text[^\"]*"[^>]*>([\s\S]*?)<\/div>/);
  return stripTags(alt?.[1] || "");
}

function extractUrls(block) {
  const urls = [];
  const patterns = [
    /background-image:\s*url\('([^']+)'\)/gi,
    /background-image:\s*url\(&quot;([^&]+)&quot;\)/gi,
    /background-image:\s*url\(([^)]+)\)/gi,
    /<a[^>]+class="[^"]*tgme_widget_message_photo_wrap[^"]*"[^>]+href="([^"]+)"/gi,
    /<a[^>]+href="([^"]+)"[^>]*class="[^"]*tgme_widget_message_photo_wrap[^"]*"/gi,
    /<img[^>]+src="([^"]+)"/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(block)) !== null) {
      const url = absoluteUrl(match[1]);
      if (url) urls.push(url);
    }
  }

  return [...new Set(urls)];
}

function findImage(block) {
  return extractUrls(block).find(isRealPostImage) || "";
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

function postNumber(postId = "") {
  const match = String(postId).match(/\/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function createPost(block, channel) {
  const postId = findPostId(block);
  const meta = CHANNEL_META[channel] || { title: channel, icon: "📢", description: "" };

  return {
    id: postId || `${channel}/${Date.now()}`,
    channel,
    channelTitle: meta.title,
    channelIcon: meta.icon,
    channelDescription: meta.description,
    text: findMessageText(block),
    image: findImage(block),
    date: findDate(block),
    views: findViews(block),
    url: postId ? `https://t.me/${postId}` : `https://t.me/${channel}`,
    postNumber: postNumber(postId),
    dedupeKey: ""
  };
}

function normalizePosts(posts, channel) {
  const byId = new Map();

  for (const post of posts) {
    if (!post || (!post.text && !post.image)) continue;
    const idKey = post.id || post.url || `${channel}:${post.postNumber}`;
    const existing = byId.get(idKey);
    if (!existing || String(post.text || "").length > String(existing.text || "").length) {
      byId.set(idKey, post);
    }
  }

  const sorted = [...byId.values()].sort((a, b) => {
    const byMessageId = (b.postNumber || 0) - (a.postNumber || 0);
    if (byMessageId) return byMessageId;
    return new Date(b.date || 0) - new Date(a.date || 0);
  });

  const unique = [];
  const seenText = new Set();

  for (const post of sorted) {
    const dedupeKey = normalizeTextForDedupe(post.text || "");
    if (dedupeKey && seenText.has(dedupeKey)) {
      console.log(`@${channel}: skipped near-duplicate post ${post.id}`);
      continue;
    }
    if (dedupeKey) seenText.add(dedupeKey);
    unique.push(post);
    if (unique.length >= LIMIT_PER_CHANNEL) break;
  }

  return unique.map(({ postNumber, dedupeKey, ...post }) => post);
}

async function fetchChannel(channel) {
  const url = `https://t.me/s/${channel}?before=999999999`;
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; NaFunnyHUB/1.5; +https://funnypeople22.github.io/NaFunny/)",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "cache-control": "no-cache",
      "pragma": "no-cache"
    }
  });

  if (!response.ok) {
    throw new Error(`@${channel}: HTTP ${response.status}`);
  }

  const html = await response.text();
  const blocks = splitMessageBlocks(html);
  const posts = blocks.map(block => createPost(block, channel));
  const normalized = normalizePosts(posts, channel);

  console.log(`@${channel}: scanned ${blocks.length} message blocks`);
  console.log(`@${channel}: selected ${normalized.map(post => post.id).join(", ") || "none"}`);

  return normalized;
}

const output = {
  version: "1.5-stable",
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
    console.log(`@${channel}: saved ${posts.length} posts`);

    if (!posts.length) {
      output.errors.push({
        channel,
        message: `No public posts found for @${channel}. Check whether the channel is public and available at https://t.me/s/${channel}`
      });
    }
  } catch (error) {
    output.errors.push({ channel, message: error.message });
    console.log(`@${channel}: ${error.message}`);
  }
}

output.posts.sort((a, b) => {
  const ai = CHANNELS.indexOf(a.channel);
  const bi = CHANNELS.indexOf(b.channel);
  if (ai !== bi) return ai - bi;

  const aNum = Number((a.id || a.url || "").match(/\/(\d+)$/)?.[1] || 0);
  const bNum = Number((b.id || b.url || "").match(/\/(\d+)$/)?.[1] || 0);
  if (aNum !== bNum) return bNum - aNum;

  return new Date(b.date || 0) - new Date(a.date || 0);
});

const existingFeed = await readExistingFeed();
mergeWithExistingPosts(output, existingFeed);

if (output.posts.length < EXPECTED_MIN_POSTS && existingFeed?.posts?.length) {
  console.log(`Safety stop: current fetch produced only ${output.posts.length} posts. Keeping existing ${OUT_FILE}.`);
  if (output.errors.length) console.log("Warnings:", JSON.stringify(output.errors, null, 2));
  process.exit(0);
}

if (existingFeed && comparableFeed(output) === comparableFeed(existingFeed)) {
  console.log(`No real feed changes detected. ${OUT_FILE} was not rewritten.`);
  process.exit(0);
}

await fs.mkdir(OUT_FILE.split("/").slice(0, -1).join("/") || ".", { recursive: true });
await fs.writeFile(OUT_FILE, JSON.stringify(output, null, 2) + "\n", "utf8");

console.log(`Saved ${output.posts.length} posts to ${OUT_FILE}`);
if (output.errors.length) {
  console.log("Warnings:", JSON.stringify(output.errors, null, 2));
}
