import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/** Root for uploaded files. On Railway point UPLOAD_DIR to a volume (e.g. /data/uploads). */
export function storageRoot() {
  return process.env.UPLOAD_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), "storage");
}

type Kind = { mime: string; ext: string; magic: (b: Buffer) => boolean };

const KINDS: Record<string, Kind> = {
  "image/jpeg": { mime: "image/jpeg", ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { mime: "image/png", ext: "png", magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": { mime: "image/webp", ext: "webp", magic: (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
  "application/pdf": { mime: "application/pdf", ext: "pdf", magic: (b) => b.toString("ascii", 0, 5) === "%PDF-" },
  // MP4 / MOV: ISO base media "ftyp" box at offset 4. WebM: EBML header.
  "video/mp4": { mime: "video/mp4", ext: "mp4", magic: (b) => b.toString("ascii", 4, 8) === "ftyp" },
  "video/quicktime": { mime: "video/quicktime", ext: "mov", magic: (b) => b.toString("ascii", 4, 8) === "ftyp" },
  "video/webm": { mime: "video/webm", ext: "webm", magic: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
};

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const DOCUMENT_TYPES = [...IMAGE_TYPES, "application/pdf"];
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const VIDEO_MAX_MB = 50;

export class UploadError extends Error {
  constructor(public code: "type" | "size") {
    super(code);
  }
}

export type StoredFile = { key: string; url: string | null; fileName: string; mimeType: string; sizeBytes: number };

/**
 * Validates (declared type + magic bytes + size) and stores a file.
 * visibility "public" → served at /files/<key>; "private" → only through authorized handlers.
 */
export async function storeFile(
  file: File,
  opts: { visibility: "public" | "private"; folder: string; allowed: string[]; maxMb: number },
): Promise<StoredFile> {
  const kind = KINDS[file.type];
  if (!kind || !opts.allowed.includes(file.type)) throw new UploadError("type");
  if (file.size > opts.maxMb * 1024 * 1024) throw new UploadError("size");
  const buf = Buffer.from(await file.arrayBuffer());
  if (!kind.magic(buf)) throw new UploadError("type");

  const key = `${opts.folder}/${randomUUID()}.${kind.ext}`;
  const full = path.join(/* turbopackIgnore: true */ storageRoot(), opts.visibility, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buf);
  return {
    key,
    url: opts.visibility === "public" ? `/files/${key}` : null,
    fileName: file.name.slice(0, 200),
    mimeType: kind.mime,
    sizeBytes: file.size,
  };
}

/** Reads a stored file; rejects path traversal. */
export async function readStoredFile(visibility: "public" | "private", key: string) {
  const base = path.join(/* turbopackIgnore: true */ storageRoot(), visibility);
  const full = path.resolve(base, key);
  if (!full.startsWith(path.resolve(base) + path.sep)) return null;
  try {
    return await readFile(full);
  } catch {
    return null;
  }
}

export async function deletePublicFile(url: string | null | undefined) {
  if (!url?.startsWith("/files/")) return;
  const base = path.resolve(storageRoot(), "public");
  const full = path.resolve(base, url.slice("/files/".length));
  if (!full.startsWith(base + path.sep)) return;
  await unlink(full).catch(() => {});
}

export function mimeForKey(key: string) {
  const ext = key.split(".").pop();
  return Object.values(KINDS).find((k) => k.ext === ext)?.mime ?? "application/octet-stream";
}

/** Non-empty File entries from a FormData field. */
export function filesFrom(formData: FormData, name: string): File[] {
  return formData.getAll(name).filter((v): v is File => v instanceof File && v.size > 0);
}
