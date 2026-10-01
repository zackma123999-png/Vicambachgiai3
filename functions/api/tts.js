// Neural Vietnamese text-to-speech for the chapter reader.
// Needs the GOOGLE_TTS_API_KEY secret (Cloud Text-to-Speech API) in Cloudflare Pages.
// Responses are cached by text, so each paragraph is synthesised only once.

const VOICES = {
  female: "vi-VN-Neural2-A",
  male: "vi-VN-Neural2-D",
};
const MAX_CHARS = 1500;

const json = (data, status) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get("origin") || "";
  try {
    if (new URL(origin).host !== new URL(request.url).host) return json({ error: "forbidden" }, 403);
  } catch (_) {
    return json({ error: "forbidden" }, 403);
  }
  if (!env.GOOGLE_TTS_API_KEY) return json({ error: "not_configured" }, 503);

  let payload;
  try { payload = await request.json(); } catch (_) { return json({ error: "bad_request" }, 400); }
  const text = String((payload && payload.text) || "").replace(/\s+/g, " ").trim();
  const voice = VOICES[payload && payload.voice] || VOICES.female;
  if (!text || text.length > MAX_CHARS) return json({ error: "bad_text" }, 400);

  const cacheKey = new Request("https://tts.cache.local/" + (await sha256(voice + "|" + text)));
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const res = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize?key=" + encodeURIComponent(env.GOOGLE_TTS_API_KEY), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: "vi-VN", name: voice },
      audioConfig: { audioEncoding: "MP3", speakingRate: 1 },
    }),
  });
  if (!res.ok) return json({ error: "upstream" }, 502);
  const data = await res.json();
  if (!data.audioContent) return json({ error: "upstream" }, 502);

  const bytes = Uint8Array.from(atob(data.audioContent), (c) => c.charCodeAt(0));
  const out = new Response(bytes, {
    headers: { "content-type": "audio/mpeg", "cache-control": "public, max-age=31536000, immutable" },
  });
  context.waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}
