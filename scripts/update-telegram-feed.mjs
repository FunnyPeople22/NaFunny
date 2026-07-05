/*
  NaFunny HUB Telegram Feed Engine 2.0
  - Fetches public Telegram channel pages from t.me/s/<channel> without tokens.
  - Uses cache-busting URLs, no-store fetch options, and retries.
  - Selects newest posts by Telegram message id, not HTML order.
  - Keeps previous channel posts if Telegram returns empty or older cached pages.
  - Ignores Telegram emoji PNGs and keeps real post images.
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
const FETCH_ATTEMPTS = Number(process.env.TELEGRAM_FETCH_ATTEMPTS || 3);
const FETCH_RETRY_DELAY_MS = Number(process.env.TELEGRAM_FETCH_RETRY_DELAY_MS || 1500);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

function maxPostNumberForChannel(feed, channel) {
  return Math.max(
    0,
    ...(feed?.posts || [])
      .filter(post => post.channel === channel)
      .map(post => post.postNumber || postNumber(post.id || post.url || "") || 0)
  );
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

  nextFeed.posts = sortOutputPosts(mergedPosts);
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
  const cleaned = decodeHtml(url).replace(/\\/g, "").replace(/^[']|[']$/g, "").replace(/^[\"]|[\"]$/g, "").trim();
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
    if (!existing || String(post.text || "").length > String(existing.text || "").length || (!existing.image && post.image)) {
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

  return unique.map(({ postNumber: _postNumber, dedupeKey: _dedupeKey, ...post }) => post);
}

function buildFetchUrls(channel, attempt) {
  const stamp = `${Date.now()}-${process.pid}-${attempt}`;
  return [
    `https://t.me/s/${channel}?_=${stamp}`,
    `https://t.me/s/${channel}?before=999999999&_=${stamp}`,
    `https://t.me/s/${channel}`
  ];
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "follow",
    headers: {
      "user-agent": `Mozilla/5.0 (compatible; NaFunnyHUB/2.0; +https://funnypeople22.github.io/NaFunny/) ${Date.now()}`,
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9,ru;q=0.8",
      "cache-control": "no-cache, no-store, must-revalidate, max-age=0",
      "pragma": "no-cache",
      "expires": "0"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
}

async function fetchChannel(channel, existingFeed) {
  const existingMax = maxPostNumberForChannel(existingFeed, channel);
  let best = { posts: [], maxFound: 0, scanned: 0, url: "" };
  const fetchErrors = [];

  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    for (const url of buildFetchUrls(channel, attempt)) {
      try {
        const html = await fetchHtml(url);
        const blocks = splitMessageBlocks(html);
        const posts = blocks.map(block => createPost(block, channel));
        const maxFound = Math.max(0, ...posts.map(post => post.postNumber || 0));
        const normalized = normalizePosts(posts, channel);
        const ids = posts
          .map(post => post.id)
          .filter(Boolean)
          .sort((a, b) => postNumber(b) - postNumber(a));

        console.log(`@${channel}: attempt ${attempt}, scanned ${blocks.length} blocks, max id ${maxFound || "none"}, url ${url}`);
        console.log(`@${channel}: found ids ${ids.slice(0, 8).join(", ") || "none"}`);
        console.log(`@${channel}: candidate selected ${normalized.map(post => post.id).join(", ") || "none"}`);

        if (maxFound > best.maxFound || normalized.length > best.posts.length) {
          best = { posts: normalized, maxFound, scanned: blocks.length, url };
        }

        if (normalized.length >= LIMIT_PER_CHANNEL && maxFound >= existingMax) {
          return normalized;
        }
      } catch (error) {
        fetchErrors.push(error.message);
        console.log(`@${channel}: attempt ${attempt} failed: ${error.message}`);
      }
    }

    if (attempt < FETCH_ATTEMPTS) await sleep(FETCH_RETRY_DELAY_MS * attempt);
  }

  if (best.posts.length && best.maxFound >= existingMax) {
    console.log(`@${channel}: using best attempt from ${best.url}`);
    return best.posts;
  }

  if (best.posts.length && best.maxFound < existingMax) {
    throw new Error(`@${channel}: Telegram returned an older cached page. Existing max id ${existingMax}, fetched max id ${best.maxFound}. Keeping existing posts.`);
  }

  throw new Error(fetchErrors.length ? fetchErrors.join(" | ") : `@${channel}: no usable public posts found`);
}

function sortOutputPosts(posts) {
  return posts.sort((a, b) => {
    const ai = CHANNELS.indexOf(a.channel);
    const bi = CHANNELS.indexOf(b.channel);
    if (ai !== bi) return ai - bi;

    const aNum = Number((a.id || a.url || "").match(/\/(\d+)$/)?.[1] || 0);
    const bNum = Number((b.id || b.url || "").match(/\/(\d+)$/)?.[1] || 0);
    if (aNum !== bNum) return bNum - aNum;

    return new Date(b.date || 0) - new Date(a.date || 0);
  });
}

const existingFeed = await readExistingFeed();

const output = {
  version: "2.0-feed-engine",
  updatedAt: new Date().toISOString(),
  source: "t.me/s public channel pages",
  limitPerChannel: LIMIT_PER_CHANNEL,
  channels: CHANNELS,
  posts: [],
  errors: []
};

for (const channel of CHANNELS) {
  try {
    const posts = await fetchChannel(channel, existingFeed);
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

output.posts = sortOutputPosts(output.posts);
mergeWithExistingPosts(output, existingFeed);

if (output.posts.length < EXPECTED_MIN_POSTS && existingFeed?.posts?.length) {
  console.log(`Safety stop: current fetch produced only ${output.posts.length} posts. Keeping existing ${OUT_FILE}.`);
  if (output.errors.length) console.log("Warnings:", JSON.stringify(output.errors, null, 2));
  process.exit(0);
}

if (existingFeed && comparableFeed(output) === comparableFeed(existingFeed)) {
  console.log(`No real feed changes detected. ${OUT_FILE} was not rewritten.`);
  if (output.errors.length) console.log("Warnings:", JSON.stringify(output.errors, null, 2));
  process.exit(0);
}

await fs.mkdir(OUT_FILE.split("/").slice(0, -1).join("/") || ".", { recursive: true });
await fs.writeFile(OUT_FILE, JSON.stringify(output, null, 2) + "\n", "utf8");

console.log(`Saved ${output.posts.length} posts to ${OUT_FILE}`);
if (output.errors.length) {
  console.log("Warnings:", JSON.stringify(output.errors, null, 2));
}
