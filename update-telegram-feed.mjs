import fs from "node:fs/promises";

const channels = (process.env.TELEGRAM_CHANNELS || "NaFunny,TonNewbie")
  .split(",")
  .map((value) => value.trim().replace(/^@/, ""))
  .filter(Boolean);

const limitPerChannel = Number(process.env.TELEGRAM_LIMIT_PER_CHANNEL || 2);
const outFile = process.env.TELEGRAM_FEED_OUT || "feed/telegram-feed.json";

const namedEntities = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
};

function decodeHtml(value = "") {
  return String(value)
    .replace(/&#(x?[0-9a-fA-F]+);/g, (_, code) => {
      const base = code.toLowerCase().startsWith("x") ? 16 : 10;
      const number = parseInt(code.replace(/^x/i, ""), base);
      return Number.isFinite(number) ? String.fromCodePoint(number) : _;
    })
    .replace(/&([a-zA-Z]+);/g, (_, name) => namedEntities[name] ?? _);
}

function stripTags(html = "") {
  return decodeHtml(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function absoluteTelegramUrl(url = "") {
  const clean = decodeHtml(url).trim();
  if (!clean) return "";
  if (clean.startsWith("//")) return `https:${clean}`;
  if (clean.startsWith("/")) return `https://t.me${clean}`;
  return clean;
}

function channelTitle(channel) {
  return channel.toLowerCase() === "tonnewbie" ? "TonNewbie" : "NaFunny";
}

function extractMessages(html) {
  const parts = html.split(/<div class="tgme_widget_message\b/).slice(1);
  return parts.map((part) => `<div class="tgme_widget_message${part}`);
}

function extractImage(block) {
  const background = block.match(/background-image:url\(['"]?([^'"\)]+)['"]?\)/i);
  if (background?.[1]) return absoluteTelegramUrl(background[1]);

  const img = block.match(/<img[^>]+src="([^"]+)"/i);
  if (img?.[1]) return absoluteTelegramUrl(img[1]);

  return "";
}

async function fetchChannel(channel) {
  const url = `https://t.me/s/${channel}`;
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 NaFunnyHUB/1.3 Stable Final",
      "accept-language": "ru,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch @${channel}: HTTP ${response.status}`);
  }

  const html = await response.text();
  const blocks = extractMessages(html);
  const posts = [];

  for (const block of blocks) {
    const postMatch = block.match(/data-post="([^"]+)"/);
    if (!postMatch?.[1]) continue;

    const id = postMatch[1];
    const postChannel = id.split("/")[0] || channel;
    const textMatch = block.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/i);
    const text = stripTags(textMatch?.[1] || "");
    const dateMatch = block.match(/<time datetime="([^"]+)"/i);
    const viewsMatch = block.match(/<span class="tgme_widget_message_views">([^<]+)<\/span>/i);
    const image = extractImage(block);

    if (!text && !image) continue;

    posts.push({
      id,
      channel: postChannel,
      channelTitle: channelTitle(postChannel),
      text,
      date: dateMatch?.[1] || "",
      views: stripTags(viewsMatch?.[1] || ""),
      url: `https://t.me/${id}`,
      image,
    });
  }

  // t.me/s usually returns the newest posts first. Keep the first N unique messages.
  const unique = [];
  const seen = new Set();
  for (const post of posts) {
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    unique.push(post);
    if (unique.length >= limitPerChannel) break;
  }

  return unique;
}

const result = {
  version: "1.3.0-stable-final",
  updatedAt: new Date().toISOString(),
  channels,
  limitPerChannel,
  posts: [],
};

for (const channel of channels) {
  try {
    const posts = await fetchChannel(channel);
    result.posts.push(...posts);
  } catch (error) {
    console.error(error);
    result.posts.push({
      id: `${channel}/error`,
      channel,
      channelTitle: channelTitle(channel),
      text: `Не удалось обновить @${channel}: ${error.message}`,
      date: new Date().toISOString(),
      views: "",
      url: `https://t.me/${channel}`,
      image: "",
      error: true,
    });
  }
}

await fs.mkdir(outFile.split("/").slice(0, -1).join("/") || ".", { recursive: true });
await fs.writeFile(outFile, JSON.stringify(result, null, 2), "utf8");

console.log(`Saved ${result.posts.length} posts to ${outFile}`);
