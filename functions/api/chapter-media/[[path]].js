export async function onRequestGet(context) {
  if (!context.env.CHAPTER_AUDIO) return new Response("Kho audio chưa được kết nối.", { status: 503 });
  const path = Array.isArray(context.params.path) ? context.params.path.join("/") : String(context.params.path || "");
  if (!path.startsWith("chapters/")) return new Response("Not found", { status: 404 });
  const object = await context.env.CHAPTER_AUDIO.get(path, { range: context.request.headers });
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  if (object.range) {
    const offset = object.range.offset || 0;
    const length = object.range.length || object.size;
    headers.set("content-range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set("content-length", String(length));
    return new Response(object.body, { status: 206, headers });
  }
  headers.set("content-length", String(object.size));
  return new Response(object.body, { headers });
}
