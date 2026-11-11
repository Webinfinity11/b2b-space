import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { addCompanyImageAction, addCompanyVideoAction, deleteCompanyMediaAction } from "@/actions/company";
import { requireCompany } from "@/lib/authz";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/Card";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/Form";
import { MediaView } from "@/components/site/MediaView";

export const metadata: Metadata = { title: ka.media.title };

const MEDIA_LIMIT = 30;

export default async function MediaPage() {
  const { membership } = await requireCompany("company.edit");
  const media = await db.companyMedia.findMany({ where: { companyId: membership.companyId }, orderBy: { sortOrder: "asc" } });

  return (
    <>
      <PageHeader title={ka.media.title} text={ka.media.text} action={<span className="text-sm text-muted">{ka.media.count(media.length, MEDIA_LIMIT)}</span>} />
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title={ka.media.addImage} text={ka.media.imagesHint} />
          <CardBody>
            <ActionForm action={addCompanyImageAction} resetOnSuccess className="space-y-3">
              <input type="hidden" name="companyId" value={membership.companyId} />
              <Field label={ka.media.addImage} name="images">
                <Input name="images" type="file" multiple accept="image/jpeg,image/png,image/webp" className="pt-2" />
              </Field>
              <Field label={ka.media.caption} name="caption" optional>
                <Input name="caption" maxLength={200} />
              </Field>
              <SubmitButton>{ka.common.upload}</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={ka.media.addVideo} text={ka.media.videoHint} />
          <CardBody>
            <ActionForm action={addCompanyVideoAction} resetOnSuccess className="space-y-3">
              <input type="hidden" name="companyId" value={membership.companyId} />
              <Field label={ka.media.videoLink} name="videoUrl" optional hint={ka.media.videoLinkHint}>
                <Input name="videoUrl" placeholder="https://www.youtube.com/watch?v=..." />
              </Field>
              <Field label={ka.media.videoFile} name="videoFiles" optional hint={ka.media.videoFileHint}>
                <Input name="videoFiles" type="file" multiple accept="video/mp4,video/webm,video/quicktime" className="pt-2" />
              </Field>
              <Field label={ka.media.caption} name="videoCaption" optional>
                <Input name="videoCaption" maxLength={200} />
              </Field>
              <SubmitButton>{ka.common.add}</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
      {media.length === 0 ? (
        <EmptyState text={ka.media.empty} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((m) => (
            <Card key={m.id} className="overflow-hidden">
              <MediaView type={m.type} url={m.url} title={m.caption ?? ka.media.title} />
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <span className="truncate text-sm text-muted">{m.caption ?? ka.common.none}</span>
                <form action={deleteCompanyMediaAction}>
                  <input type="hidden" name="mediaId" value={m.id} />
                  <Button type="submit" size="sm" variant="ghost" className="text-danger">{ka.common.delete}</Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
