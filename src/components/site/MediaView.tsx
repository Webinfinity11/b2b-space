/* eslint-disable @next/next/no-img-element -- user uploads */
import { videoEmbedUrl } from "@/lib/video";

/** Renders one company media item: image, uploaded video file, or YouTube/Vimeo embed. */
export function MediaView({ type, url, title, className = "" }: { type: "IMAGE" | "VIDEO"; url: string; title: string; className?: string }) {
  if (type === "IMAGE") return <img src={url} alt={title} className={`aspect-video w-full object-cover ${className}`} loading="lazy" />;
  if (url.startsWith("/files/")) {
    return <video src={url} controls preload="metadata" playsInline className={`aspect-video w-full bg-black ${className}`} title={title} />;
  }
  const embed = videoEmbedUrl(url);
  if (!embed) return null;
  return <iframe src={embed} title={title} className={`aspect-video w-full ${className}`} allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />;
}
