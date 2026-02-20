// OAuth configuration for social platform connections (YouTube, Instagram, TikTok)
// Separate from Auth.js login providers — these are for data access, not authentication.

export type SocialProviderType = "youtube" | "instagram" | "tiktok";

interface OAuthConfig {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
}

const PROVIDERS: Record<SocialProviderType, OAuthConfig> = {
  youtube: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
    ],
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
  },
  instagram: {
    authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: ["instagram_basic", "instagram_manage_insights", "pages_show_list", "pages_read_engagement"],
    clientIdEnv: "INSTAGRAM_APP_ID",
    clientSecretEnv: "INSTAGRAM_APP_SECRET",
  },
  tiktok: {
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: ["user.info.basic", "video.list"],
    clientIdEnv: "TIKTOK_CLIENT_KEY",
    clientSecretEnv: "TIKTOK_CLIENT_SECRET",
  },
};

interface TokenPayload {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

function getBaseUrl(): string {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

function getCallbackUrl(provider: SocialProviderType): string {
  return `${getBaseUrl()}/api/v1/social/callback/${provider}`;
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function getProviderConfig(provider: SocialProviderType) {
  const config = PROVIDERS[provider];
  if (!config) return null;

  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];

  if (!clientId || !clientSecret) return null;

  return { ...config, clientId, clientSecret };
}

export function buildAuthorizationUrl(provider: SocialProviderType, state: string): string | null {
  const config = getProviderConfig(provider);
  if (!config) return null;

  const params = new URLSearchParams();
  const callbackUrl = getCallbackUrl(provider);

  if (provider === "youtube") {
    params.set("client_id", config.clientId);
    params.set("redirect_uri", callbackUrl);
    params.set("response_type", "code");
    params.set("scope", config.scopes.join(" "));
    params.set("access_type", "offline");
    params.set("prompt", "consent");
    params.set("include_granted_scopes", "true");
    params.set("state", state);
    return `${config.authUrl}?${params.toString()}`;
  }

  if (provider === "instagram") {
    params.set("client_id", config.clientId);
    params.set("redirect_uri", callbackUrl);
    params.set("response_type", "code");
    params.set("scope", config.scopes.join(","));
    params.set("state", state);
    return `${config.authUrl}?${params.toString()}`;
  }

  if (provider === "tiktok") {
    params.set("client_key", config.clientId);
    params.set("redirect_uri", callbackUrl);
    params.set("response_type", "code");
    params.set("scope", config.scopes.join(","));
    params.set("state", state);
    return `${config.authUrl}?${params.toString()}`;
  }

  return null;
}

async function exchangeInstagramForLongLivedToken(
  shortLivedToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; expiresAt?: Date } | null> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: clientId,
    client_secret: clientSecret,
    fb_exchange_token: shortLivedToken,
  });

  const res = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?${params.toString()}`);
  const data = await safeJson<{ access_token?: string; expires_in?: number }>(res);
  if (!res.ok || !data?.access_token) return null;

  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
  };
}

export async function exchangeCodeForTokens(provider: SocialProviderType, code: string): Promise<TokenPayload | null> {
  const config = getProviderConfig(provider);
  if (!config) return null;

  const callbackUrl = getCallbackUrl(provider);

  if (provider === "youtube") {
    const res = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
    });
    const data = await safeJson<{ access_token?: string; refresh_token?: string; expires_in?: number; scope?: string }>(res);
    if (!res.ok || !data?.access_token) return null;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scope: data.scope,
    };
  }

  if (provider === "instagram") {
    const res = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
    });
    const data = await safeJson<{ access_token?: string; expires_in?: number }>(res);
    if (!res.ok || !data?.access_token) return null;

    const longLived = await exchangeInstagramForLongLivedToken(data.access_token, config.clientId, config.clientSecret);
    if (longLived) {
      return {
        accessToken: longLived.accessToken,
        expiresAt: longLived.expiresAt,
      };
    }

    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  }

  if (provider === "tiktok") {
    const res = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_key: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
    });
    const data = await safeJson<{
      data?: { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string };
    }>(res);
    if (!res.ok || !data?.data?.access_token) return null;
    return {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token,
      expiresAt: data.data.expires_in ? new Date(Date.now() + data.data.expires_in * 1000) : undefined,
      scope: data.data.scope,
    };
  }

  return null;
}

export async function refreshAccessToken(
  provider: SocialProviderType,
  params: { refreshToken?: string | null; accessToken?: string | null }
): Promise<TokenPayload | null> {
  const config = getProviderConfig(provider);
  if (!config) return null;

  if (provider === "youtube") {
    if (!params.refreshToken) return null;

    const res = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: params.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const data = await safeJson<{ access_token?: string; expires_in?: number; scope?: string }>(res);
    if (!res.ok || !data?.access_token) return null;

    return {
      accessToken: data.access_token,
      refreshToken: params.refreshToken ?? undefined,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scope: data.scope,
    };
  }

  if (provider === "instagram") {
    if (!params.accessToken) return null;

    const refreshed = await exchangeInstagramForLongLivedToken(params.accessToken, config.clientId, config.clientSecret);
    if (!refreshed) return null;

    return {
      accessToken: refreshed.accessToken,
      expiresAt: refreshed.expiresAt,
    };
  }

  if (provider === "tiktok") {
    if (!params.refreshToken) return null;

    const res = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "refresh_token",
        refresh_token: params.refreshToken,
      }),
    });

    const data = await safeJson<{
      data?: { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string };
    }>(res);
    if (!res.ok || !data?.data?.access_token) return null;

    return {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token,
      expiresAt: data.data.expires_in ? new Date(Date.now() + data.data.expires_in * 1000) : undefined,
      scope: data.data.scope,
    };
  }

  return null;
}

// Fetch profile info from each provider's API
export async function fetchSocialProfile(
  provider: SocialProviderType,
  accessToken: string
): Promise<{
  providerAccountId: string;
  username?: string;
  displayName?: string;
  profileUrl?: string;
  followerCount?: number;
  channelName?: string;
} | null> {
  if (provider === "youtube") {
    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await safeJson<{
      items?: Array<{
        id: string;
        snippet: { customUrl?: string; title: string };
        statistics: { subscriberCount?: string };
      }>;
    }>(res);
    const channel = data?.items?.[0];
    if (!channel) return null;
    return {
      providerAccountId: channel.id,
      username: channel.snippet.customUrl?.replace("@", ""),
      displayName: channel.snippet.title,
      profileUrl: `https://youtube.com/${channel.snippet.customUrl || `channel/${channel.id}`}`,
      followerCount: parseInt(channel.statistics.subscriberCount || "0", 10),
      channelName: channel.snippet.title,
    };
  }

  if (provider === "instagram") {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account{id,username,name,followers_count}&access_token=${encodeURIComponent(accessToken)}`
    );
    const data = await safeJson<{
      data?: Array<{ instagram_business_account?: { id: string; username?: string; name?: string; followers_count?: number } }>;
    }>(res);

    const igAccount = data?.data?.find((page) => page.instagram_business_account)?.instagram_business_account;
    if (!igAccount?.id) return null;

    return {
      providerAccountId: igAccount.id,
      username: igAccount.username,
      displayName: igAccount.name || igAccount.username,
      profileUrl: igAccount.username ? `https://instagram.com/${igAccount.username}` : undefined,
      followerCount: igAccount.followers_count,
    };
  }

  if (provider === "tiktok") {
    const res = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count,profile_deep_link",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await safeJson<{
      data?: {
        user?: {
          open_id: string;
          display_name?: string;
          profile_deep_link?: string;
          follower_count?: number;
        };
      };
    }>(res);
    const user = data?.data?.user;
    if (!user) return null;
    return {
      providerAccountId: user.open_id,
      displayName: user.display_name,
      profileUrl: user.profile_deep_link,
      followerCount: user.follower_count,
    };
  }

  return null;
}

// Fetch videos from each provider's API
export async function fetchSocialVideos(
  provider: SocialProviderType,
  accessToken: string,
  providerAccountId: string,
  maxResults = 20
): Promise<Array<{
  platformVideoId: string;
  url: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  publishedAt?: Date;
}>> {
  if (provider === "youtube") {
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${providerAccountId}&order=date&maxResults=${maxResults}&type=video`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const searchData = await safeJson<{ items?: Array<{ id?: { videoId?: string } }> }>(searchRes);
    const videoIds = (searchData?.items ?? []).map((v) => v.id?.videoId).filter((id): id is string => Boolean(id));
    if (videoIds.length === 0) return [];

    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(",")}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const statsData = await safeJson<{
      items?: Array<{
        id: string;
        snippet: { title: string; description?: string; thumbnails?: { high?: { url?: string } }; publishedAt?: string };
        statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
      }>;
    }>(statsRes);

    return (statsData?.items || []).map((v) => ({
      platformVideoId: v.id,
      url: `https://youtube.com/watch?v=${v.id}`,
      title: v.snippet.title,
      description: v.snippet.description?.slice(0, 500),
      thumbnailUrl: v.snippet.thumbnails?.high?.url,
      viewCount: parseInt(v.statistics.viewCount || "0", 10),
      likeCount: parseInt(v.statistics.likeCount || "0", 10),
      commentCount: parseInt(v.statistics.commentCount || "0", 10),
      shareCount: 0,
      publishedAt: v.snippet.publishedAt ? new Date(v.snippet.publishedAt) : undefined,
    }));
  }

  if (provider === "instagram") {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${providerAccountId}/media?fields=id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count&limit=${maxResults}&access_token=${encodeURIComponent(accessToken)}`
    );
    const data = await safeJson<{
      data?: Array<{
        id: string;
        caption?: string;
        permalink?: string;
        thumbnail_url?: string;
        media_url?: string;
        like_count?: number;
        comments_count?: number;
        timestamp?: string;
      }>;
    }>(res);

    return (data?.data || [])
      .filter((m) => Boolean(m.permalink))
      .map((m) => ({
        platformVideoId: m.id,
        url: m.permalink!,
        title: m.caption?.slice(0, 100),
        description: m.caption?.slice(0, 500),
        thumbnailUrl: m.thumbnail_url || m.media_url,
        viewCount: 0,
        likeCount: m.like_count || 0,
        commentCount: m.comments_count || 0,
        shareCount: 0,
        publishedAt: m.timestamp ? new Date(m.timestamp) : undefined,
      }));
  }

  if (provider === "tiktok") {
    const res = await fetch(
      "https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,share_url,view_count,like_count,comment_count,share_count,create_time",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ max_count: maxResults }),
      }
    );
    const data = await safeJson<{
      data?: {
        videos?: Array<{
          id: string;
          title?: string;
          cover_image_url?: string;
          share_url?: string;
          view_count?: number;
          like_count?: number;
          comment_count?: number;
          share_count?: number;
          create_time?: number;
        }>;
      };
    }>(res);

    return (data?.data?.videos || [])
      .filter((v) => Boolean(v.share_url))
      .map((v) => ({
        platformVideoId: v.id,
        url: v.share_url!,
        title: v.title,
        thumbnailUrl: v.cover_image_url,
        viewCount: v.view_count || 0,
        likeCount: v.like_count || 0,
        commentCount: v.comment_count || 0,
        shareCount: v.share_count || 0,
        publishedAt: v.create_time ? new Date(v.create_time * 1000) : undefined,
      }));
  }

  return [];
}

export const VALID_PROVIDERS: SocialProviderType[] = ["youtube", "instagram", "tiktok"];

export function isValidProvider(p: string): p is SocialProviderType {
  return VALID_PROVIDERS.includes(p as SocialProviderType);
}
