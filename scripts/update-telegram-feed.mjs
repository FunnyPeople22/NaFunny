import fs from "node:fs/promises";

const channels = (process.env.TELEGRAM_CHANNELS || "NaFunny,TonNewbie")
  .split(",")
  .map(x => x.trim().replace(/^@/, ""))
  .filter(Boolean);

const limitPerChannel = Number(process.env.TELEGRAM_LIMIT_PER_CHANNEL || 2);
const outFile = process.env.TELEGRAM_FEED_OUT || "feed/telegram-feed.json";

function stripTags(html = "") {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function absUrl(url) {
  if (!url) return "";
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return "https://t.me" + url;
  return url;
}

async function fetchChannel(channel) {
  const url = `https://t.me/s/${channel}`;
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 NaFunnyHUB/1.3"
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch @${channel}: ${res.status}`);
  }

  const html = await res.text();
  const blocks = html.match(/<div class="tgme_widget_message\b[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g) || [];

  const posts = [];

  for (const block of blocks) {
    const postMatch = block.match(/data-post="([^"]+)"/);
    if (!postMatch) continue;

    const postId = postMatch[1];
    const messageUrl = `https://t.me/${postId}`;

    const textMatch = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const text = stripTags(textMatch?.[1] || "");

    const timeMatch = block.match(/<time datetime="([^"]+)"/);
    const date = timeMatch?.[1] || "";

    const imgMatch =
      block.match(/background-image:url\('([^']+)'\)/) ||
      block.match(/background-image:url\(&quot;([^&]+)&quot;\)/) ||
      block.match(/<img[^>]+src="([^"]+)"/);

    const image = absUrl(imgMatch?.[1] || "");

    if (!text && !image) continue;

    posts.push({
      channel,
      channelTitle: channel === "TonNewbie" ? "TonNewbie" : "NaFunny",
      text,
      date,
      url: messageUrl,
      image
    });
  }

  return posts.slice(-limitPerChannel).reverse();
}

const result = {
  updatedAt: new Date().toISOString(),
  channels,
  limitPerChannel,
  posts: []
};

for (const channel of channels) {
  try {
    const posts = await fetchChannel(channel);
    result.posts.push(...posts);
  } catch (error) {
    result.posts.push({
      channel,
      channelTitle: channel,
      text: `Не удалось обновить @${channel}: ${error.message}`,
      date: new Date().toISOString(),
      url: `https://t.me/${channel}`,
      image: "",
      error: true
    });
  }
}

await fs.mkdir(outFile.split("/").slice(0, -1).join("/") || ".", { recursive: true });
await fs.writeFile(outFile, JSON.stringify(result, null, 2), "utf8");

console.log(`Saved ${result.posts.length} posts to ${outFile}`);
