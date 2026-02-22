export const REQUIRED_YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
] as const;

const SCOPE_ALIASES: Record<string, (typeof REQUIRED_YOUTUBE_SCOPES)[number]> = {
  "youtube.readonly": "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.readonly": "https://www.googleapis.com/auth/youtube.readonly",
  "yt-analytics.readonly": "https://www.googleapis.com/auth/yt-analytics.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly": "https://www.googleapis.com/auth/yt-analytics.readonly",
};

function normalizeScope(scope: string): (typeof REQUIRED_YOUTUBE_SCOPES)[number] | null {
  const trimmed = scope.trim();
  if (!trimmed) return null;
  return SCOPE_ALIASES[trimmed] ?? null;
}

export function parseGrantedScopes(scope?: string | null): Set<string> {
  if (!scope) return new Set();

  const tokens = scope
    .split(/[,\s]+/)
    .map((token) => normalizeScope(token))
    .filter((token): token is (typeof REQUIRED_YOUTUBE_SCOPES)[number] => token !== null);

  return new Set(tokens);
}

export function getYouTubeScopeStatus(scope?: string | null): { ready: boolean; missing: string[] } {
  const granted = parseGrantedScopes(scope);
  const missing = REQUIRED_YOUTUBE_SCOPES.filter((required) => !granted.has(required));

  return {
    ready: missing.length === 0,
    missing,
  };
}
