import { NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError } from "@/lib/api/helpers";
import { buildAuthorizationUrl, isValidProvider } from "@/lib/social/providers";
import { randomBytes } from "crypto";

function sanitizeReturnTo(returnTo: string | null): string {
  if (!returnTo) return "/settings";
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return "/settings";
  return returnTo;
}

// GET /api/v1/social/connect/:provider — Redirect to OAuth provider
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const user = await requireAuth();
  if (!user) return apiError("Unauthorized", 401);

  if (!isValidProvider(provider)) {
    return apiError("Invalid provider. Must be youtube, instagram, or tiktok", 400);
  }

  const returnTo = sanitizeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const source = request.nextUrl.searchParams.get("source");

  // Generate state token with userId embedded for verification on callback
  const statePayload = JSON.stringify({
    userId: user.id,
    nonce: randomBytes(16).toString("hex"),
    returnTo,
    source: source === "campaign" || source === "settings" ? source : undefined,
  });
  const state = Buffer.from(statePayload).toString("base64url");

  const authUrl = buildAuthorizationUrl(provider, state);
  if (!authUrl) {
    return apiError(`${provider} is not configured. Missing environment variables.`, 400);
  }

  return NextResponse.redirect(authUrl);
}
