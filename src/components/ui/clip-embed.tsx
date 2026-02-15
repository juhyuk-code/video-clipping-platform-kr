import { cn } from "@/lib/utils";

type EmbedProvider = "youtube" | "tiktok" | "instagram";

interface ClipEmbedInfo {
  provider: EmbedProvider;
  embedUrl: string;
  aspectRatio: "16 / 9" | "9 / 16";
}

function parseYouTubeEmbed(url: URL): ClipEmbedInfo | null {
  const host = url.hostname.toLowerCase();
  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (host.includes("youtube.com") || host.includes("youtube-nocookie.com")) {
    const pathParts = url.pathname.split("/").filter(Boolean);
    videoId =
      url.searchParams.get("v") ??
      (pathParts[0] === "shorts" ? pathParts[1] : null) ??
      (pathParts[0] === "embed" ? pathParts[1] : null) ??
      (pathParts[0] === "live" ? pathParts[1] : null);
  }

  if (!videoId || !/^[\w-]{6,}$/.test(videoId)) return null;
  const isShorts = url.pathname.includes("/shorts/");

  return {
    provider: "youtube",
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    aspectRatio: isShorts ? "9 / 16" : "16 / 9",
  };
}

function parseTikTokEmbed(url: URL): ClipEmbedInfo | null {
  if (!url.hostname.toLowerCase().includes("tiktok.com")) return null;
  const match = url.pathname.match(/\/video\/(\d+)/) ?? url.pathname.match(/\/embed\/v2\/(\d+)/);
  const videoId = match?.[1];
  if (!videoId) return null;

  return {
    provider: "tiktok",
    embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
    aspectRatio: "9 / 16",
  };
}

function parseInstagramEmbed(url: URL): ClipEmbedInfo | null {
  if (!url.hostname.toLowerCase().includes("instagram.com")) return null;
  const match = url.pathname.match(/\/(reel|p|tv)\/([A-Za-z0-9_-]+)/);
  if (!match) return null;
  const [, type, code] = match;

  return {
    provider: "instagram",
    embedUrl: `https://www.instagram.com/${type}/${code}/embed`,
    aspectRatio: "9 / 16",
  };
}

export function getClipEmbedInfo(clipUrl: string): ClipEmbedInfo | null {
  try {
    const url = new URL(clipUrl);
    return parseYouTubeEmbed(url) ?? parseTikTokEmbed(url) ?? parseInstagramEmbed(url);
  } catch {
    return null;
  }
}

interface ClipEmbedProps {
  clipUrl: string;
  title?: string;
  className?: string;
}

export function ClipEmbed({ clipUrl, title = "Clip Embed", className }: ClipEmbedProps) {
  const info = getClipEmbedInfo(clipUrl);
  if (!info) return null;

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-black", className)} style={{ aspectRatio: info.aspectRatio }}>
      <iframe
        src={info.embedUrl}
        title={title}
        className="h-full w-full"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

