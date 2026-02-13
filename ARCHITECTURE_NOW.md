# Architecture Snapshot (Now)

Date: 2026-02-13  
Repo: `juhyuk-code/video-clipping-platform-kr`  
Branch analyzed: `main` (`origin/main`)

## 1) Canonical User Flows

### Creator flow (current canonical path)
1. Login via Auth.js social provider (currently Kakao/Google in UI).
2. First-time user completes onboarding (`role + nickname`) at `/register/role`.
3. Creator creates a campaign (starts as `DRAFT`) via `POST /api/v1/campaigns`.
4. Creator activates campaign (`DRAFT -> ACTIVE`) via `PUT /api/v1/campaigns/[id]`.
5. Activation can hold campaign budget in creator wallet escrow (`ESCROW_HOLD` transaction).
6. Creator receives submissions from clippers (`APPLIED` or `JOINED` depending on campaign type).
7. Creator reviews a submitted clip in campaign submission detail:
   - `APPROVED`
   - `REVISION_REQ`
   - `REJECTED`
8. On approval for `PROJECT/HYBRID`, payout logic executes:
   - Escrow reduced on creator wallet.
   - Clipper wallet credited.
   - Campaign counters incremented.
9. Creator tracks campaign performance and spend in campaign detail/dashboard/profile pages.

Primary files:
- `/Users/juhyukbak/Documents/New project/src/app/api/v1/campaigns/route.ts`
- `/Users/juhyukbak/Documents/New project/src/app/api/v1/campaigns/[id]/route.ts`
- `/Users/juhyukbak/Documents/New project/src/app/api/v1/campaigns/[id]/submissions/[subId]/route.ts`
- `/Users/juhyukbak/Documents/New project/src/app/[locale]/(platform)/campaigns/new/page.tsx`
- `/Users/juhyukbak/Documents/New project/src/app/[locale]/(platform)/campaigns/[id]/campaign-detail-client.tsx`

### Clipper flow (current canonical path)
1. Login and onboarding (same as creator).
2. Discover active campaigns in `/campaigns`.
3. Join/apply:
   - `REWARD` campaigns: direct `JOINED`.
   - `PROJECT/HYBRID`: `APPLIED` with pitch (and optional proposed price).
4. Submit clip (`clipTitle`, `clipUrl`/`clipFileUrl`, `targetPlatform`) -> `SUBMITTED`.
5. Receive creator decision:
   - Approved (potential immediate wallet credit depending on type)
   - Revision requested
   - Rejected
6. Track submission status and earnings in:
   - `/my-submissions`
   - submission detail page
   - `/wallet`

Primary files:
- `/Users/juhyukbak/Documents/New project/src/app/api/v1/campaigns/[id]/submissions/route.ts`
- `/Users/juhyukbak/Documents/New project/src/app/api/v1/campaigns/[id]/submissions/[subId]/route.ts`
- `/Users/juhyukbak/Documents/New project/src/app/[locale]/(platform)/my-submissions/page.tsx`
- `/Users/juhyukbak/Documents/New project/src/app/[locale]/(platform)/wallet/page.tsx`

### Cross-cutting flow: Profile and trust layer
1. User updates public profile in `/settings` (base + creator/clipper role-specific fields).
2. User connects social accounts (YouTube/Instagram/TikTok) via OAuth connect routes.
3. Platform syncs profile/video metadata for trust/performance display.
4. Public profile and submission review surfaces consume this data.

Primary files:
- `/Users/juhyukbak/Documents/New project/src/app/[locale]/(platform)/settings/page.tsx`
- `/Users/juhyukbak/Documents/New project/src/app/api/v1/social/connect/[provider]/route.ts`
- `/Users/juhyukbak/Documents/New project/src/app/api/v1/social/callback/[provider]/route.ts`
- `/Users/juhyukbak/Documents/New project/src/app/api/v1/social/sync/[provider]/route.ts`
- `/Users/juhyukbak/Documents/New project/src/app/[locale]/(platform)/profile/[id]/page.tsx`

## 2) Source-of-Truth Domain Model (Keep / De-prioritize)

### Keep as canonical (active product engine)
- `User`, `CreatorProfile`, `ClipperProfile`
- `Campaign`
- `CampaignSubmission`
- `Wallet`, `WalletTransaction`
- `SocialConnection`, `SocialVideo`
- `Notification`

Why: these models power current UI/navigation, campaign lifecycle, payouts, and profile trust signals.

Primary schema file:
- `/Users/juhyukbak/Documents/New project/prisma/schema.prisma`

### Keep but mark as legacy compatibility layer
- `Project`, `Application`, `Clip`, `Payment`, `Review`, `Message`

Why: still used by messaging endpoints and some older API paths/UI assumptions, but product direction has shifted to campaign-first.

Primary legacy endpoints:
- `/Users/juhyukbak/Documents/New project/src/app/api/v1/projects/route.ts`
- `/Users/juhyukbak/Documents/New project/src/app/api/v1/projects/[id]/messages/route.ts`

### Explicit platform direction (inference from current code + commits)
- Product has moved from “project marketplace” to “campaign engine + performance-informed payouts.”
- Profile and submission detail are now treated as conversion/trust surfaces, not secondary pages.

## 3) Immediate Stabilization Checklist (Prioritized)

### P0 (blockers / correctness / security)
1. Add authorization guard for admin page.
   - Current admin UI fetches global stats without admin role check.
   - File: `/Users/juhyukbak/Documents/New project/src/app/[locale]/(platform)/admin/page.tsx`
2. Resolve provider mismatch for X/Twitter.
   - Settings offers X connect, but backend valid provider list excludes it.
   - Files:
   - `/Users/juhyukbak/Documents/New project/src/app/[locale]/(platform)/settings/page.tsx`
   - `/Users/juhyukbak/Documents/New project/src/lib/social/providers.ts`
3. Apply the role-retirement migration across all environments.
   - `BOTH` has been removed from app behavior and Prisma schema.
   - Migration backfills legacy `BOTH` rows to `CREATOR` before enum replacement.
   - Files:
   - `/Users/juhyukbak/Documents/New project/prisma/schema.prisma`
   - `/Users/juhyukbak/Documents/New project/prisma/migrations/20260214002000_remove_both_user_role/migration.sql`

### P1 (product consistency / technical debt)
1. Canonicalize to campaign routes in notifications/links.
   - Legacy `/projects/*` links still exist in project endpoints and message system.
   - Files:
   - `/Users/juhyukbak/Documents/New project/src/app/api/v1/projects/[id]/messages/route.ts`
   - `/Users/juhyukbak/Documents/New project/src/components/messages/message-thread.tsx`
2. Decide strategy for legacy project stack:
   - keep and support, or migrate/remove.
   - Affects APIs, sidebar mental model, and maintenance cost.
3. Persist Prisma migrations in repo.
   - No migrations directory currently committed; schema evolution reproducibility risk.
   - Files:
   - `/Users/juhyukbak/Documents/New project/prisma/schema.prisma`
   - `/Users/juhyukbak/Documents/New project/prisma/seed.ts`

### P2 (operational hardening / scale readiness)
1. Replace mock upload behavior with real presigned S3 flow.
   - File: `/Users/juhyukbak/Documents/New project/src/lib/storage/s3.ts`
2. Replace simulated wallet deposit with real payment-backed flow.
   - File: `/Users/juhyukbak/Documents/New project/src/app/api/v1/wallet/deposit/route.ts`
3. Add webhook signature verification and robust payout reconciliation.
   - File: `/Users/juhyukbak/Documents/New project/src/app/api/v1/payments/webhooks/toss/route.ts`
4. Add automated tests for campaign submission review/payout transitions.
   - No test files currently present.

## Short “Now” Decision

If you want to move fast without churn:
1. Treat campaign stack as product core.
2. Freeze legacy project stack except for break/fix.
3. Execute P0 checklist before shipping more surface area.
