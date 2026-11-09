import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { mimeForKey, readStoredFile } from "@/lib/storage";

/** Private verification documents: company owners and platform admins only. Admin access is audited. */
export async function GET(_req: Request, ctx: RouteContext<"/api/verification-documents/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const doc = await db.verificationDocument.findUnique({ where: { id } });
  if (!doc) return new Response("Not found", { status: 404 });

  const isAdmin = user.platformRole === "ADMIN";
  if (!isAdmin) {
    const member = await db.companyMember.findUnique({ where: { companyId_userId: { companyId: doc.companyId, userId: user.id } } });
    if (!member || member.status !== "ACTIVE" || member.role !== "OWNER") return new Response("Not found", { status: 404 });
  } else {
    await audit({ actorId: user.id, action: "company.document_viewed", entityType: "Company", entityId: doc.companyId, metadata: { documentId: doc.id } });
  }

  const data = await readStoredFile("private", doc.storageKey);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": mimeForKey(doc.storageKey),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // Chrome refuses to render PDFs inside a sandboxed document, so the sandbox CSP is image-only.
      ...(mimeForKey(doc.storageKey).endsWith("pdf") ? {} : { "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" }),
    },
  });
}
