import { mimeForKey, readStoredFile } from "@/lib/storage";

/** Serves public uploads (logos, media, videos, offer attachments). Supports Range for video seeking. */
export async function GET(req: Request, ctx: RouteContext<"/files/[...key]">) {
  const { key } = await ctx.params;
  const path = key.join("/");
  if (!/^[\w-]+(\/[\w-]+)*\.(jpg|png|webp|pdf|mp4|webm|mov)$/.test(path)) return new Response("Not found", { status: 404 });
  const data = await readStoredFile("public", path);
  if (!data) return new Response("Not found", { status: 404 });

  const mime = mimeForKey(path);
  const headers: Record<string, string> = {
    "Content-Type": mime,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
    // Images get a sandbox CSP; PDFs and videos must stay renderable by the browser.
    ...(mime.startsWith("image/") ? { "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" } : {}),
  };

  const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range) {
    const size = data.length;
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    if (!range[1]) end = size - 1;
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    return new Response(new Uint8Array(data.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(new Uint8Array(data), { headers: { ...headers, "Content-Length": String(data.length) } });
}
