/** Files of a campaign: the attachments list, or the single legacy file. */
export function campaignFiles(r: { fileUrl: string | null; fileName: string | null; attachments?: unknown }): { url: string; name: string }[] {
  const list = Array.isArray(r.attachments) ? (r.attachments as { url?: unknown; name?: unknown }[]).filter((a) => typeof a?.url === "string") : [];
  if (list.length) return list.map((a) => ({ url: String(a.url), name: String(a.name ?? "file") }));
  return r.fileUrl ? [{ url: r.fileUrl, name: r.fileName ?? "file" }] : [];
}
