import { NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError } from "@/lib/api/helpers";
import { buildAuthorizationUrl, isValidProvider } from "@/lib/social/providers";
import { randomBytes } from "crypto";

// GET /api/v1/social/connect/:provider — Redirect to OAuth provider
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  if (!isValidProvider(provider)) {
    return apiError("Invalid provider. Must be youtube, instagram, or tiktok", 400);
  }

  // Generate state token with userId embedded for verification on callback
  const statePayload = JSON.stringify({ userId: user.id, nonce: randomBytes(16).toString("hex") });
  const state = Buffer.from(statePayload).toString("base64url");

  const authUrl = buildAuthorizationUrl(provider, state);
  if (!authUrl) {
    return apiError(`${provider} is not configured. Missing environment variables.`, 400);
  }

  return NextResponse.redirect(authUrl);
}
