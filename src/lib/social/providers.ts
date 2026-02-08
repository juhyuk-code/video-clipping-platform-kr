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
    scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
  },
  instagram: {
    authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: ["instagram_basic", "instagram_manage_insights", "pages_show_list"],
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

function getBaseUrl(): string {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

function getCallbackUrl(provider: SocialProviderType): string {
  return `${getBaseUrl()}/api/v1/social/callback/${provider}`;
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

export async function exchangeCodeForTokens(
  provider: SocialProviderType,
  code: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
} | null> {
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
    const data = await res.json();
    if (!data.access_token) return null;
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
    const data = await res.json();
    if (!data.access_token) return null;
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
    const data = await res.json();
    if (!data.data?.access_token) return null;
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
    const data = await res.json();
    const channel = data.items?.[0];
    if (!channel) return null;
    return {
      providerAccountId: channel.id,
      username: channel.snippet.customUrl?.replace("@", ""),
      displayName: channel.snippet.title,
      profileUrl: `https://youtube.com/${channel.snippet.customUrl || `channel/${channel.id}`}`,
      followerCount: parseInt(channel.statistics.subscriberCount || "0"),
      channelName: channel.snippet.title,
    };
  }

  if (provider === "instagram") {
    // Get Instagram account via Facebook pages
    const res = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account{id,username,name,followers_count,profile_picture_url}&access_token=${accessToken}`
    );
    const data = await res.json();
    const igAccount = data.data?.[0]?.instagram_business_account;
    if (!igAccount) {
      // Try personal Instagram via basic display
      const meRes = await fetch(
        `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
      );
      const meData = await meRes.json();
      if (!meData.id) return null;
      return {
        providerAccountId: meData.id,
        username: meData.username,
        displayName: meData.username,
        profileUrl: `https://instagram.com/${meData.username}`,
      };
    }
    return {
      providerAccountId: igAccount.id,
      username: igAccount.username,
      displayName: igAccount.name,
      profileUrl: `https://instagram.com/${igAccount.username}`,
      followerCount: igAccount.followers_count,
    };
  }

  if (provider === "tiktok") {
    const res = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count,profile_deep_link",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    const user = data.data?.user;
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
    // Get recent uploads
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${providerAccountId}&order=date&maxResults=${maxResults}&type=video`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const searchData = await searchRes.json();
    const videoIds = searchData.items?.map((v: { id: { videoId: string } }) => v.id.videoId) || [];
    if (videoIds.length === 0) return [];

    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(",")}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const statsData = await statsRes.json();

    return (statsData.items || []).map((v: {
      id: string;
      snippet: { title: string; description: string; thumbnails: { high: { url: string } }; publishedAt: string };
      statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
    }) => ({
      platformVideoId: v.id,
      url: `https://youtube.com/watch?v=${v.id}`,
      title: v.snippet.title,
      description: v.snippet.description?.slice(0, 500),
      thumbnailUrl: v.snippet.thumbnails?.high?.url,
      viewCount: parseInt(v.statistics.viewCount || "0"),
      likeCount: parseInt(v.statistics.likeCount || "0"),
      commentCount: parseInt(v.statistics.commentCount || "0"),
      shareCount: 0,
      publishedAt: new Date(v.snippet.publishedAt),
    }));
  }

  if (provider === "instagram") {
    const res = await fetch(
      `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count&limit=${maxResults}&access_token=${accessToken}`
    );
    const data = await res.json();
    return (data.data || []).map((m: {
      id: string;
      caption?: string;
      permalink: string;
      thumbnail_url?: string;
      media_url?: string;
      like_count?: number;
      comments_count?: number;
      timestamp: string;
    }) => ({
      platformVideoId: m.id,
      url: m.permalink,
      title: m.caption?.slice(0, 100),
      description: m.caption?.slice(0, 500),
      thumbnailUrl: m.thumbnail_url || m.media_url,
      viewCount: 0, // Instagram basic doesn't expose views
      likeCount: m.like_count || 0,
      commentCount: m.comments_count || 0,
      shareCount: 0,
      publishedAt: new Date(m.timestamp),
    }));
  }

  if (provider === "tiktok") {
    const res = await fetch(
      `https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,share_url,view_count,like_count,comment_count,share_count,create_time`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ max_count: maxResults }),
      }
    );
    const data = await res.json();
    return (data.data?.videos || []).map((v: {
      id: string;
      title?: string;
      cover_image_url?: string;
      share_url: string;
      view_count?: number;
      like_count?: number;
      comment_count?: number;
      share_count?: number;
      create_time?: number;
    }) => ({
      platformVideoId: v.id,
      url: v.share_url,
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
