"use client";

import { Button } from "@/components/ui/button";
import type {
  CreatorPlatformFilterKey,
  CreatorQueueKey,
  CreatorSortKey,
} from "@/lib/campaigns/submission-dashboard";

interface SubmissionQueueTabsProps {
  selectedQueue: CreatorQueueKey;
  selectedSort: CreatorSortKey;
  selectedPlatform: CreatorPlatformFilterKey;
  queueCounts: Record<CreatorQueueKey, number>;
  onQueueChange: (queue: CreatorQueueKey) => void;
  onSortChange: (sort: CreatorSortKey) => void;
  onPlatformChange: (platform: CreatorPlatformFilterKey) => void;
  labels: {
    queueApplied: string;
    queueJoined: string;
    queueReview: string;
    queueClosed: string;
    sortLabel: string;
    sortLatest: string;
    sortViews: string;
    sortPayout: string;
    platformLabel: string;
    platformAll: string;
    platformYouTube: string;
    platformInstagram: string;
    platformTikTok: string;
  };
}

const QUEUE_ORDER: CreatorQueueKey[] = ["applied", "joined", "review", "closed"];

export function SubmissionQueueTabs({
  selectedQueue,
  selectedSort,
  selectedPlatform,
  queueCounts,
  onQueueChange,
  onSortChange,
  onPlatformChange,
  labels,
}: SubmissionQueueTabsProps) {
  const queueLabels: Record<CreatorQueueKey, string> = {
    applied: labels.queueApplied,
    joined: labels.queueJoined,
    review: labels.queueReview,
    closed: labels.queueClosed,
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {QUEUE_ORDER.map((queue) => {
          const active = queue === selectedQueue;
          return (
            <Button
              key={queue}
              type="button"
              variant={active ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => onQueueChange(queue)}
            >
              <span>{queueLabels[queue]}</span>
              <span className="rounded-md bg-background/80 px-1.5 py-0.5 text-xs text-foreground">
                {queueCounts[queue]}
              </span>
            </Button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="text-muted-foreground">{labels.sortLabel}</label>
        <select
          value={selectedSort}
          onChange={(event) => onSortChange(event.target.value as CreatorSortKey)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="latest">{labels.sortLatest}</option>
          <option value="views">{labels.sortViews}</option>
          <option value="payout">{labels.sortPayout}</option>
        </select>

        <label className="ml-2 text-muted-foreground">{labels.platformLabel}</label>
        <select
          value={selectedPlatform}
          onChange={(event) => onPlatformChange(event.target.value as CreatorPlatformFilterKey)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">{labels.platformAll}</option>
          <option value="youtube">{labels.platformYouTube}</option>
          <option value="instagram">{labels.platformInstagram}</option>
          <option value="tiktok">{labels.platformTikTok}</option>
        </select>
      </div>
    </div>
  );
}
