"use server";

import { revalidatePath } from "next/cache";
import { ka } from "@/i18n/ka";
import { ForbiddenError, assertUser, getActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { fail, type FormState } from "@/lib/forms";
import { notify } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { visibleConversations } from "@/lib/scope";
import { DOCUMENT_TYPES, UploadError, filesFrom, storeFile } from "@/lib/storage";

/** Loads a conversation the current user may access, or throws. */
async function assertConversationAccess(conversationId: string) {
  const user = await assertUser();
  const m = await getActiveMembership(user.id);
  const conversation = await db.conversation.findFirst({
    where: { AND: [{ id: conversationId }, visibleConversations(user.id, m)] },
    include: { participants: true },
  });
  if (!conversation) throw new ForbiddenError();
  return { user, conversation };
}

export async function sendMessageAction(_: FormState, formData: FormData): Promise<FormState> {
  const { user, conversation } = await assertConversationAccess(String(formData.get("conversationId")));
  if (!rateLimit(`msg:${user.id}`, 60, 60_000)) return fail(ka.auth.tooManyAttempts, formData);

  const body = String(formData.get("body") ?? "").trim().slice(0, 5000);
  const [file] = filesFrom(formData, "file");
  if (!body && !file) return fail(ka.chat.emptyMessage, formData);

  // Who am I in this conversation? A participant, or a colleague acting for a participating company.
  const m = await getActiveMembership(user.id);
  const self = conversation.participants.find((p) => p.userId === user.id);
  const companyParty = conversation.participants.find((p) => p.companyId && p.companyId === m?.companyId);
  const side = self?.side ?? companyParty?.side;
  if (!side) throw new ForbiddenError();

  let stored = null;
  if (file) {
    try {
      stored = await storeFile(file, { visibility: "private", folder: `chat/${conversation.id}`, allowed: DOCUMENT_TYPES, maxMb: 10 });
    } catch (e) {
      if (e instanceof UploadError) return fail(e.code === "size" ? ka.validation.fileSize(10) : ka.validation.fileType, formData);
      throw e;
    }
  }

  await db.$transaction([
    db.message.create({
      data: {
        conversationId: conversation.id,
        senderId: user.id,
        kind: stored ? "FILE" : "TEXT",
        body,
        fileUrl: stored?.key,
        fileName: stored?.fileName,
        fileMime: stored?.mimeType,
        fileSize: stored?.sizeBytes,
      },
    }),
    db.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } }),
    // A colleague (not yet a participant) replying on behalf of the company joins the conversation.
    db.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId: conversation.id, userId: user.id } },
      update: { lastReadAt: new Date() },
      create: {
        conversationId: conversation.id,
        userId: user.id,
        companyId: companyParty?.companyId ?? null,
        side,
        identityRevealed: companyParty?.identityRevealed ?? true,
        lastReadAt: new Date(),
      },
    }),
  ]);

  // Notify other participants only when they have nothing unread yet, to avoid a flood.
  const others = conversation.participants.filter((p) => p.userId !== user.id);
  const toNotify: string[] = [];
  for (const p of others) {
    const unread = await db.notification.count({ where: { userId: p.userId, type: "NEW_MESSAGE", readAt: null, link: `/app/conversations/${conversation.id}` } });
    if (unread === 0) toNotify.push(p.userId);
  }
  await notify(toNotify, { type: "NEW_MESSAGE", title: ka.chat.newMessageNotification(conversation.subject), link: `/app/conversations/${conversation.id}` });

  revalidatePath(`/app/conversations/${conversation.id}`);
  return { ok: true };
}

export async function markConversationReadAction(conversationId: string) {
  const user = await assertUser();
  await db.conversationParticipant.updateMany({ where: { conversationId, userId: user.id }, data: { lastReadAt: new Date() } });
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null, link: `/app/conversations/${conversationId}` },
    data: { readAt: new Date() },
  });
}
