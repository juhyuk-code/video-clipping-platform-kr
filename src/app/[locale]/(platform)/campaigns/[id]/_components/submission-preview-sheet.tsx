"use client";

import { ExternalLink } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { ClipEmbed, getClipEmbedInfo } from "@/components/ui/clip-embed";
import type { CreatorSubmissionCardVM } from "@/lib/campaigns/submission-dashboard";

interface SubmissionPreviewSheetProps {
  open: boolean;
  onClose: () => void;
  submission: CreatorSubmissionCardVM | null;
  title: string;
  noClipTitle: string;
  noClipDescription: string;
  openOriginalLabel: string;
  unsupportedEmbedDescription: string;
}

export function SubmissionPreviewSheet({
  open,
  onClose,
  submission,
  title,
  noClipTitle,
  noClipDescription,
  openOriginalLabel,
  unsupportedEmbedDescription,
}: SubmissionPreviewSheetProps) {
  const clipUrl = submission?.clipUrl ?? null;
  const embedInfo = clipUrl ? getClipEmbedInfo(clipUrl) : null;

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-4 p-4 sm:p-5">
        {submission ? (
          <>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {submission.clipTitle ?? "Untitled clip"}
              </p>
              <p className="text-xs text-muted-foreground">
                {submission.clipper.nickname ?? submission.clipper.name ?? "Unknown clipper"}
              </p>
            </div>

            {!clipUrl && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{noClipTitle}</p>
                <p className="mt-1">{noClipDescription}</p>
              </div>
            )}

            {clipUrl && embedInfo && (
              <ClipEmbed
                clipUrl={clipUrl}
                title={submission.clipTitle ?? "Submission clip"}
                className="max-w-full"
              />
            )}

            {clipUrl && !embedInfo && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                {unsupportedEmbedDescription}
              </div>
            )}

            {clipUrl && (
              <a
                href={clipUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                {openOriginalLabel}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {noClipDescription}
          </div>
        )}
      </div>
    </Sheet>
  );
}
