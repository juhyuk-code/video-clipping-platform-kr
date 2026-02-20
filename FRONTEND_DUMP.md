# Clip Platform KR - Complete Frontend Code Dump

## Project Overview
Korean two-sided marketplace: **Creators** (크리에이터) post campaigns, **Clippers** (클리퍼) make short-form clips (YouTube Shorts, TikTok, Instagram Reels), get paid via wallet/escrow.

## Tech Stack
- **Next.js 16.1.6** (App Router) + **React 19**
- **Tailwind v4** + **shadcn/ui** (manual setup, no CLI)
- **Prisma 5** + PostgreSQL
- **Auth.js v5 beta** (Kakao + Google login)
- **next-intl v4** (ko primary, en secondary)
- **Lucide React** icons
- All KRW (₩) currency, Korean-first UI
- **Pretendard** Korean web font

## Design Vibe
- Clean, minimal, monochrome (near-black primary on white)
- Light/dark mode via CSS variables
- shadcn/ui Card-based layouts
- Badge system for statuses (color-coded)
- Fixed sidebar + sticky header for authenticated pages
- Role-adaptive UI: creator vs clipper see different dashboards, nav items, and actions

## Three Campaign Types
- **PROJECT** (프로젝트형): Fixed pay per clip
- **REWARD** (리워드형): Pay-per-1000-views, open participation
- **HYBRID** (하이브리드형): Fixed base + view bonus

---

## File Tree

```
src/app/
├── layout.tsx                              # Root: returns {children}
├── globals.css                             # Tailwind v4 theme + CSS vars
├── [locale]/
│   ├── layout.tsx                          # NextIntlClientProvider
│   ├── page.tsx                            # Landing (hero, features, how-it-works, CTA)
│   ├── (auth)/
│   │   ├── login/page.tsx                  # Kakao + Google login
│   │   └── register/role/page.tsx          # Onboarding role + nickname
│   └── (platform)/
│       ├── layout.tsx                      # Auth guard + sidebar + header
│       ├── dashboard/
│       │   ├── page.tsx                    # Server: fetch dashboard data
│       │   └── dashboard-client.tsx        # Creator/Clipper dashboards
│       ├── campaigns/
│       │   ├── page.tsx                    # Server: fetch campaigns
│       │   ├── campaigns-client.tsx        # Creator list / Clipper marketplace
│       │   ├── new/page.tsx               # Campaign creation form
│       │   └── [id]/
│       │       ├── page.tsx
│       │       ├── campaign-detail-client.tsx
│       │       ├── campaign-actions.tsx
│       │       └── submissions/[subId]/
│       │           ├── page.tsx
│       │           └── submission-detail-client.tsx
│       ├── messages/
│       │   ├── page.tsx
│       │   └── messages-client.tsx         # Split-pane messaging
│       ├── my-submissions/page.tsx
│       ├── profile/[id]/page.tsx           # Public profile
│       ├── settings/page.tsx               # Full settings page
│       ├── wallet/page.tsx                 # Balance, deposit, transactions
│       ├── analytics/page.tsx
│       └── admin/page.tsx
src/components/
├── ui/ (button, badge, card, input, textarea, sheet)
├── layouts/ (platform-sidebar, platform-header)
├── charts/ (view-chart SVG, stats-grid)
├── messages/ (message-thread)
├── profile/ (profile-content: Summary/Full/Complete)
└── providers/ (session-provider)
src/contexts/
└── mode-context.tsx                        # Derives creator/clipper from session
src/messages/
├── ko.json                                 # Korean i18n
└── en.json
```

---

## package.json

```json
{
  "name": "clip-platform-kr",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "eslint",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@auth/prisma-adapter": "^1.6.0",
    "@prisma/client": "^5.22.0",
    "@tanstack/react-query": "^5.90.20",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.563.0",
    "next": "16.1.6",
    "next-auth": "^5.0.0-beta.30",
    "next-intl": "^4.8.2",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "tailwind-merge": "^3.4.0",
    "zod": "^4.3.6",
    "zustand": "^5.0.11"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "prisma": "^5.22.0",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## globals.css

```css
@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --font-sans: var(--font-pretendard), "Pretendard Variable", Pretendard,
    -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue",
    "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic",
    "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif;
}

:root {
  --radius: 0.625rem;
  --background: #ffffff;
  --foreground: #0a0a0a;
  --card: #ffffff;
  --card-foreground: #0a0a0a;
  --popover: #ffffff;
  --popover-foreground: #0a0a0a;
  --primary: #171717;
  --primary-foreground: #fafafa;
  --secondary: #f5f5f5;
  --secondary-foreground: #171717;
  --muted: #f5f5f5;
  --muted-foreground: #737373;
  --accent: #f5f5f5;
  --accent-foreground: #171717;
  --destructive: #ef4444;
  --destructive-foreground: #fafafa;
  --border: #e5e5e5;
  --input: #e5e5e5;
  --ring: #0a0a0a;
}

.dark {
  --background: #0a0a0a;
  --foreground: #fafafa;
  --card: #0a0a0a;
  --card-foreground: #fafafa;
  --popover: #0a0a0a;
  --popover-foreground: #fafafa;
  --primary: #fafafa;
  --primary-foreground: #171717;
  --secondary: #262626;
  --secondary-foreground: #fafafa;
  --muted: #262626;
  --muted-foreground: #a3a3a3;
  --accent: #262626;
  --accent-foreground: #fafafa;
  --destructive: #7f1d1d;
  --destructive-foreground: #fafafa;
  --border: #262626;
  --input: #262626;
  --ring: #d4d4d4;
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

---

## Prisma Schema (prisma/schema.prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Auth.js Models ──────────────────────────────────────────────

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ─── Core Models ─────────────────────────────────────────────────

enum UserRole {
  CREATOR
  CLIPPER
  BOTH
  ADMIN
}

enum Language {
  KO
  EN
}

model User {
  id                         String    @id @default(cuid())
  name                       String?
  nickname                   String?   @unique
  email                      String?   @unique
  emailVerified              DateTime?
  image                      String?
  role                       UserRole  @default(CLIPPER)
  bio                        String?   @db.Text
  preferredLanguage          Language  @default(KO)
  businessRegistrationNumber String?
  isBusinessVerified         Boolean   @default(false)
  createdAt                  DateTime  @default(now())
  updatedAt                  DateTime  @updatedAt
  deletedAt                  DateTime?

  accounts          Account[]
  sessions          Session[]
  creatorProfile    CreatorProfile?
  clipperProfile    ClipperProfile?
  socialConnections SocialConnection[]

  projectsAsCreator Project[]     @relation("ProjectCreator")
  projectsAsClipper Project[]     @relation("ProjectClipper")
  applications      Application[]
  clips             Clip[]
  paymentsMade      Payment[]     @relation("PaymentPayer")
  paymentsReceived  Payment[]     @relation("PaymentPayee")
  reviewsGiven      Review[]      @relation("ReviewReviewer")
  reviewsReceived   Review[]      @relation("ReviewReviewee")
  messagesSent      Message[]
  notifications     Notification[]

  campaignsCreated  Campaign[]           @relation("CampaignCreator")
  submissions       CampaignSubmission[] @relation("SubmissionClipper")
  wallet            Wallet?
}

model CreatorProfile {
  id                    String   @id @default(cuid())
  userId                String   @unique
  youtubeChannelId      String?
  youtubeChannelName    String?
  subscriberCount       Int?
  contentCategories     String[]
  averageVideoViews     Int?
  preferredClipStyle    String?
  defaultClipGuidelines String?  @db.Text
  twitchUrl             String?
  afreecaTvUrl          String?
  chzzkUrl              String?
  averageRating         Float?
  totalProjectsPosted   Int      @default(0)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum ClipperTier {
  BRONZE
  SILVER
  GOLD
  PLATINUM
}

model ClipperProfile {
  id                     String     @id @default(cuid())
  userId                 String     @unique
  specializations        String[]
  editingTools           String[]
  languages              String[]
  tier                   ClipperTier @default(BRONZE)
  isVerified             Boolean    @default(false)
  averageRating          Float?
  totalProjectsCompleted Int        @default(0)
  totalEarnings          Decimal?   @db.Decimal(12, 0)
  createdAt              DateTime   @default(now())
  updatedAt              DateTime   @updatedAt

  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  portfolioItems PortfolioItem[]
}

model PortfolioItem {
  id               String   @id @default(cuid())
  clipperProfileId String
  title            String
  description      String?  @db.Text
  videoUrl         String
  thumbnailUrl     String?
  platform         String
  viewCount        Int?
  createdAt        DateTime @default(now())

  clipperProfile ClipperProfile @relation(fields: [clipperProfileId], references: [id], onDelete: Cascade)
}

// ─── Campaign System ────────────────────────────────────────────

enum CampaignType {
  PROJECT
  REWARD
  HYBRID
}

enum CampaignStatus {
  DRAFT
  ACTIVE
  PAUSED
  COMPLETED
  CANCELLED
}

model Campaign {
  id               String         @id @default(cuid())
  creatorId        String
  title            String
  description      String         @db.Text
  guidelines       String         @db.Text
  type             CampaignType
  status           CampaignStatus @default(DRAFT)
  contentCategory  String?
  sourceVideoUrl   String?
  sourceVideoTitle String?
  targetPlatforms  String[]

  totalBudget      Decimal?  @db.Decimal(12, 0)
  fixedPayPerClip  Decimal?  @db.Decimal(12, 0)
  cprRate          Decimal?  @db.Decimal(10, 2)
  viewBonusRate    Decimal?  @db.Decimal(10, 2)
  maxParticipants  Int?
  maxClipsPerUser  Int       @default(1)
  minViewThreshold Int       @default(0)

  startDate   DateTime?
  endDate     DateTime?
  deadline    DateTime

  participantCount      Int     @default(0)
  submissionCount       Int     @default(0)
  approvedCount         Int     @default(0)
  totalViewsAcrossClips Int     @default(0)
  totalSpent            Decimal @default(0) @db.Decimal(12, 0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  creator     User                 @relation("CampaignCreator", fields: [creatorId], references: [id])
  submissions CampaignSubmission[]

  @@index([status, type])
  @@index([creatorId])
  @@index([status, contentCategory])
}

enum SubmissionStatus {
  APPLIED
  JOINED
  SUBMITTED
  IN_REVIEW
  APPROVED
  REVISION_REQ
  REJECTED
  PAID
}

model CampaignSubmission {
  id          String           @id @default(cuid())
  campaignId  String
  clipperId   String
  status      SubmissionStatus @default(APPLIED)

  pitch            String?   @db.Text
  proposedPrice    Decimal?  @db.Decimal(12, 0)

  clipTitle        String?
  clipUrl          String?
  clipFileUrl      String?
  thumbnailUrl     String?
  targetPlatform   String?
  submittedAt      DateTime?

  revisionNotes    String?   @db.Text
  revisionCount    Int       @default(0)
  reviewedAt       DateTime?

  latestViewCount  Int       @default(0)
  lastSnapshotAt   DateTime?

  fixedAmount      Decimal?  @db.Decimal(12, 0)
  rewardAmount     Decimal?  @db.Decimal(12, 0)
  totalPaid        Decimal   @default(0) @db.Decimal(12, 0)
  paidAt           DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  campaign     Campaign       @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  clipper      User           @relation("SubmissionClipper", fields: [clipperId], references: [id])
  snapshots    ViewSnapshot[]
  socialVideos SocialVideo[]
  fraudCheck   FraudCheck?

  @@unique([campaignId, clipperId])
  @@index([campaignId, status])
  @@index([clipperId])
}

// ─── Social Connections ─────────────────────────────────────────

enum SocialProvider {
  YOUTUBE
  INSTAGRAM
  TIKTOK
  TWITTER
}

model SocialConnection {
  id                String         @id @default(cuid())
  userId            String
  provider          SocialProvider
  providerAccountId String
  accessToken       String         @db.Text
  refreshToken      String?        @db.Text
  tokenExpiresAt    DateTime?
  scope             String?
  username          String?
  displayName       String?
  profileUrl        String?
  followerCount     Int?
  channelName       String?
  connectedAt       DateTime       @default(now())
  lastSyncedAt      DateTime?
  updatedAt         DateTime       @updatedAt

  user   User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  videos SocialVideo[]

  @@unique([userId, provider])
  @@unique([provider, providerAccountId])
  @@index([userId])
}

model SocialVideo {
  id                 String   @id @default(cuid())
  socialConnectionId String
  platformVideoId    String
  submissionId       String?
  url                String
  title              String?
  description        String?  @db.Text
  thumbnailUrl       String?
  viewCount          Int      @default(0)
  likeCount          Int      @default(0)
  commentCount       Int      @default(0)
  shareCount         Int      @default(0)
  publishedAt        DateTime?
  lastSyncedAt       DateTime @default(now())
  createdAt          DateTime @default(now())

  socialConnection SocialConnection    @relation(fields: [socialConnectionId], references: [id], onDelete: Cascade)
  submission       CampaignSubmission? @relation(fields: [submissionId], references: [id], onDelete: SetNull)

  @@unique([socialConnectionId, platformVideoId])
  @@index([submissionId])
  @@index([socialConnectionId, lastSyncedAt])
}

// ─── View Snapshots ─────────────────────────────────────────────

enum ViewSnapshotSource {
  MANUAL
  YOUTUBE_API
  INSTAGRAM_API
  TIKTOK_API
}

model ViewSnapshot {
  id            String              @id @default(cuid())
  submissionId  String
  viewCount     Int
  likeCount     Int?
  commentCount  Int?
  shareCount    Int?
  delta         Int                 @default(0)
  source        ViewSnapshotSource  @default(MANUAL)
  socialVideoId String?
  capturedAt    DateTime            @default(now())

  submission CampaignSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)

  @@index([submissionId, capturedAt])
}

// ─── Fraud Detection ────────────────────────────────────────────

enum FraudStatus {
  CLEAN
  SUSPICIOUS
  FLAGGED
  BLOCKED
}

model FraudCheck {
  id           String      @id @default(cuid())
  submissionId String      @unique
  status       FraudStatus @default(CLEAN)
  score        Int         @default(0)
  reasons      String[]
  checkedAt    DateTime    @default(now())
  resolvedAt   DateTime?
  resolvedBy   String?

  submission CampaignSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
}

// ─── Wallet & Escrow ────────────────────────────────────────────

model Wallet {
  id             String   @id @default(cuid())
  userId         String   @unique
  balance        Decimal  @default(0) @db.Decimal(12, 0)
  escrowHeld     Decimal  @default(0) @db.Decimal(12, 0)
  totalDeposited Decimal  @default(0) @db.Decimal(12, 0)
  totalWithdrawn Decimal  @default(0) @db.Decimal(12, 0)
  totalEarned    Decimal  @default(0) @db.Decimal(12, 0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user         User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions WalletTransaction[]
}

enum TransactionType {
  DEPOSIT
  WITHDRAWAL
  ESCROW_HOLD
  ESCROW_RELEASE
  REWARD_PAYOUT
  PLATFORM_FEE
  REFUND
}

enum TransactionStatus {
  PENDING
  COMPLETED
  FAILED
  CANCELLED
}

model WalletTransaction {
  id            String            @id @default(cuid())
  walletId      String
  type          TransactionType
  status        TransactionStatus @default(PENDING)
  amount        Decimal           @db.Decimal(12, 0)
  balanceBefore Decimal           @db.Decimal(12, 0)
  balanceAfter  Decimal           @db.Decimal(12, 0)
  description   String
  referenceId   String?
  referenceType String?
  createdAt     DateTime          @default(now())

  wallet Wallet @relation(fields: [walletId], references: [id], onDelete: Cascade)

  @@index([walletId, createdAt])
  @@index([referenceId])
}

// ─── Legacy Project/Marketplace Models (kept for reference) ─────

enum ProjectStatus {
  DRAFT
  OPEN
  ASSIGNED
  IN_PROGRESS
  IN_REVIEW
  REVISION_REQUESTED
  COMPLETED
  CANCELLED
  DISPUTED
}

enum ProjectType {
  OPEN_REQUEST
  DIRECT_ASSIGNMENT
}

enum PricingModel {
  FIXED
  PER_CLIP
  REVENUE_SHARE
  BID
}

model Project {
  id                     String        @id @default(cuid())
  creatorId              String
  assignedClipperId      String?
  title                  String
  description            String        @db.Text
  brief                  String        @db.Text
  status                 ProjectStatus @default(DRAFT)
  type                   ProjectType   @default(OPEN_REQUEST)
  sourceVideoUrl         String?
  sourceVideoTitle       String?
  targetPlatforms        String[]
  pricingModel           PricingModel  @default(FIXED)
  budgetAmount           Decimal?      @db.Decimal(12, 0)
  revenueSharePercentage Float?
  maxClipsRequested      Int?
  maxRevisionRounds      Int           @default(2)
  currentRevisionRound   Int           @default(0)
  deadline               DateTime
  contentCategory        String?
  requiredTier           ClipperTier?
  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt

  creator        User          @relation("ProjectCreator", fields: [creatorId], references: [id])
  assignedClipper User?        @relation("ProjectClipper", fields: [assignedClipperId], references: [id])
  applications   Application[]
  clips          Clip[]
  payments       Payment[]
  reviews        Review[]
  messages       Message[]

  @@index([status, contentCategory])
  @@index([creatorId])
  @@index([assignedClipperId])
}

enum ApplicationStatus {
  PENDING
  ACCEPTED
  REJECTED
  WITHDRAWN
}

model Application {
  id                    String            @id @default(cuid())
  projectId             String
  clipperId             String
  status                ApplicationStatus @default(PENDING)
  pitch                 String            @db.Text
  proposedPrice         Decimal?          @db.Decimal(12, 0)
  estimatedDeliveryDays Int
  portfolioSamples      String[]
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  clipper User    @relation(fields: [clipperId], references: [id])

  @@unique([projectId, clipperId])
  @@index([projectId, status])
}

enum ClipStatus {
  SUBMITTED
  APPROVED
  REVISION_REQUESTED
  REJECTED
}

model Clip {
  id              String     @id @default(cuid())
  projectId       String
  clipperId       String
  title           String
  description     String?    @db.Text
  videoFileUrl    String
  thumbnailUrl    String?
  durationSeconds Int?
  targetPlatform  String
  status          ClipStatus @default(SUBMITTED)
  revisionNotes   String?    @db.Text
  publishedUrl    String?
  viewCount       Int?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  clipper User    @relation(fields: [clipperId], references: [id])

  @@index([projectId])
}

enum PaymentStatus {
  PENDING
  ESCROWED
  RELEASED
  REFUNDED
  DISPUTED
}

model Payment {
  id              String        @id @default(cuid())
  projectId       String
  payerId         String
  payeeId         String
  amount          Decimal       @db.Decimal(12, 0)
  platformFee     Decimal       @db.Decimal(12, 0)
  netPayeeAmount  Decimal       @db.Decimal(12, 0)
  status          PaymentStatus @default(PENDING)
  tossPaymentKey  String?
  tossOrderId     String?       @unique
  paidAt          DateTime?
  releasedAt      DateTime?
  refundedAt      DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  project Project @relation(fields: [projectId], references: [id])
  payer   User    @relation("PaymentPayer", fields: [payerId], references: [id])
  payee   User    @relation("PaymentPayee", fields: [payeeId], references: [id])

  @@index([projectId])
}

model Review {
  id         String   @id @default(cuid())
  projectId  String
  reviewerId String
  revieweeId String
  rating     Int
  comment    String?  @db.Text
  createdAt  DateTime @default(now())

  project  Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  reviewer User    @relation("ReviewReviewer", fields: [reviewerId], references: [id])
  reviewee User    @relation("ReviewReviewee", fields: [revieweeId], references: [id])

  @@unique([projectId, reviewerId])
}

model Message {
  id             String   @id @default(cuid())
  projectId      String
  senderId       String
  content        String   @db.Text
  attachmentUrls String[]
  isRead         Boolean  @default(false)
  createdAt      DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  sender  User    @relation(fields: [senderId], references: [id])

  @@index([projectId, createdAt])
}

enum NotificationType {
  PROJECT_APPLICATION
  PROJECT_ASSIGNED
  CLIP_SUBMITTED
  CLIP_APPROVED
  REVISION_REQUESTED
  PAYMENT_RECEIVED
  MESSAGE_RECEIVED
  REVIEW_RECEIVED
  CAMPAIGN_SUBMISSION
  CAMPAIGN_APPROVED
  CAMPAIGN_REJECTED
  WALLET_DEPOSIT
  WALLET_PAYOUT
  SYSTEM
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  type      NotificationType
  title     String
  body      String           @db.Text
  linkUrl   String?
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
}
```

---

## Root Layout (src/app/layout.tsx)

```tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

---

## Locale Layout (src/app/[locale]/layout.tsx)

```tsx
import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "클립 플랫폼 | Clip Platform",
  description:
    "크리에이터와 클리퍼를 연결하는 플랫폼. 롱폼 콘텐츠를 바이럴 숏폼 클립으로.",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = (await import(`@/messages/${locale}.json`)).default;

  return (
    <html lang={locale}>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

---

## Landing Page (src/app/[locale]/page.tsx)

```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  ShoppingBag, Shield, Play, BarChart3, ArrowRight, Video, Scissors, CheckCircle, Wallet,
} from "lucide-react";

export default function LandingPage() {
  const t = useTranslations("landing");
  const tc = useTranslations("common");

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <span className="text-xl font-bold">{tc("appName")}</span>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link href="/login"><Button variant="ghost">{tc("login")}</Button></Link>
            <Link href="/login"><Button>{tc("register")}</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto flex flex-col items-center gap-8 px-4 py-24 text-center md:py-32">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl whitespace-pre-line">
          {t("hero.title")}
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">{t("hero.subtitle")}</p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link href="/login">
            <Button size="lg" className="gap-2"><Video className="h-5 w-5" />{t("hero.ctaCreator")}</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="gap-2"><Scissors className="h-5 w-5" />{t("hero.ctaClipper")}</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/50 py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">{t("features.title")}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShoppingBag, title: t("features.marketplace.title"), description: t("features.marketplace.description") },
              { icon: Shield, title: t("features.escrow.title"), description: t("features.escrow.description") },
              { icon: Play, title: t("features.review.title"), description: t("features.review.description") },
              { icon: BarChart3, title: t("features.analytics.title"), description: t("features.analytics.description") },
            ].map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <feature.icon className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent><CardDescription>{feature.description}</CardDescription></CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">{t("howItWorks.title")}</h2>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { step: 1, icon: Video, title: t("howItWorks.step1.title"), description: t("howItWorks.step1.description") },
              { step: 2, icon: Scissors, title: t("howItWorks.step2.title"), description: t("howItWorks.step2.description") },
              { step: 3, icon: CheckCircle, title: t("howItWorks.step3.title"), description: t("howItWorks.step3.description") },
              { step: 4, icon: Wallet, title: t("howItWorks.step4.title"), description: t("howItWorks.step4.description") },
            ].map((item, index) => (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <item.icon className="h-7 w-7" />
                  </div>
                  <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent-foreground text-xs font-bold text-accent">
                    {item.step}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                {index < 3 && <ArrowRight className="mt-4 hidden h-5 w-5 text-muted-foreground md:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary py-24 text-primary-foreground">
        <div className="container mx-auto flex flex-col items-center gap-6 px-4 text-center">
          <h2 className="text-3xl font-bold">{t("cta.title")}</h2>
          <p className="max-w-xl text-primary-foreground/80">{t("cta.subtitle")}</p>
          <Link href="/login">
            <Button size="lg" variant="secondary" className="gap-2">{t("cta.button")}<ArrowRight className="h-5 w-5" /></Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">{t("footer.copyright")}</p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">{t("footer.terms")}</a>
            <a href="#" className="hover:text-foreground">{t("footer.privacy")}</a>
            <a href="#" className="hover:text-foreground">{t("footer.support")}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

---

## Login Page (src/app/[locale]/(auth)/login/page.tsx)

```tsx
"use client";

import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// KakaoIcon, GoogleIcon SVGs omitted for brevity — custom inline SVGs

export default function LoginPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold">{tc("appName")}</Link>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t("loginTitle")}</CardTitle>
            <CardDescription>{t("loginSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              className="w-full gap-3 bg-[#FEE500] text-[#191919] hover:bg-[#FEE500]/90"
              size="lg"
              onClick={() => signIn("kakao", { callbackUrl: "/dashboard" })}
            >
              <KakaoIcon />
              {t("continueWithKakao")}
            </Button>
            <Button
              variant="outline"
              className="w-full gap-3"
              size="lg"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            >
              <GoogleIcon />
              {t("continueWithGoogle")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## Platform Layout (src/app/[locale]/(platform)/layout.tsx)

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PlatformSidebar } from "@/components/layouts/platform-sidebar";
import { PlatformHeader } from "@/components/layouts/platform-header";
import { ModeProvider } from "@/contexts/mode-context";
import { SessionProvider } from "@/components/providers/session-provider";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { nickname: true },
  });

  if (!user?.nickname) redirect("/register/role");

  return (
    <SessionProvider>
      <ModeProvider>
        <div className="flex min-h-screen">
          <PlatformSidebar />
          <div className="flex flex-1 flex-col pl-64">
            <PlatformHeader />
            <main className="flex-1">
              <div className="container mx-auto p-6">{children}</div>
            </main>
          </div>
        </div>
      </ModeProvider>
    </SessionProvider>
  );
}
```

---

## Mode Context (src/contexts/mode-context.tsx)

```tsx
"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSession } from "next-auth/react";

type Mode = "creator" | "clipper";

interface ModeContextType {
  mode: Mode;
}

const ModeContext = createContext<ModeContextType>({ mode: "creator" });

export function ModeProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const mode: Mode = role === "CLIPPER" ? "clipper" : "creator";

  return (
    <ModeContext.Provider value={{ mode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
```

---

## Platform Sidebar (src/components/layouts/platform-sidebar.tsx)

```tsx
"use client";

import { useTranslations } from "next-intl";
import { useSession, signOut } from "next-auth/react";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useMode } from "@/contexts/mode-context";
import {
  LayoutDashboard, MessageSquare, BarChart3, Settings, LogOut, Scissors,
  Megaphone, Wallet, ClipboardList, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const creatorNav = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "myCampaigns", href: "/campaigns", icon: Megaphone },
  { key: "wallet", href: "/wallet", icon: Wallet },
  { key: "messages", href: "/messages", icon: MessageSquare },
  { key: "analytics", href: "/analytics", icon: BarChart3 },
  { key: "settings", href: "/settings", icon: Settings },
];

const clipperNav = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "browseCampaigns", href: "/campaigns", icon: Search },
  { key: "mySubmissions", href: "/my-submissions", icon: ClipboardList },
  { key: "wallet", href: "/wallet", icon: Wallet },
  { key: "messages", href: "/messages", icon: MessageSquare },
  { key: "settings", href: "/settings", icon: Settings },
];

export function PlatformSidebar() {
  const tc = useTranslations("common");
  const pathname = usePathname();
  const { mode } = useMode();
  const { data: session } = useSession();
  const navItems = mode === "creator" ? creatorNav : clipperNav;

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Scissors className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">{tc("appName")}</span>
      </div>

      {/* Role Indicator */}
      <div className="border-b px-3 py-3">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium bg-accent">
          <div className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white",
            mode === "creator" ? "bg-violet-600" : "bg-emerald-600"
          )}>
            {mode === "creator" ? "C" : "P"}
          </div>
          <span>{mode === "creator" ? "크리에이터" : "클리퍼"}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.key} href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}>
              <item.icon className="h-5 w-5" />
              {/* Korean labels for nav items */}
            </Link>
          );
        })}
      </nav>

      {/* User Card + Logout at bottom */}
      <div className="border-t p-3 space-y-2">
        {/* User avatar with initials, name, email */}
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="h-5 w-5" />{tc("logout")}
        </Button>
      </div>
    </aside>
  );
}
```

---

## Platform Header (src/components/layouts/platform-header.tsx)

```tsx
"use client";
// Notifications dropdown (bell icon with unread count)
// Avatar dropdown (profile, settings, logout)
// Language switcher (ko/en)
// All positioned sticky top-0 right-aligned
// Fetches /api/v1/notifications?unread=true on mount
```

*(Full code is ~174 lines — includes notification panel, avatar menu, mark-all-read)*

---

## Dashboard (src/app/[locale]/(platform)/dashboard/dashboard-client.tsx)

```tsx
"use client";
// Role-adaptive: CreatorDashboard vs ClipperDashboard
// Creator: StatCards (active campaigns, completed, wallet balance, escrow held)
//          + recent campaigns list with type badges & status
// Clipper: StatCards (participating, approved clips, total earned, wallet)
//          + recent submissions list with view counts & payments
// Uses useMode() to switch, formatKRW() for currency
```

*(Full code is ~277 lines)*

---

## Campaigns List (src/app/[locale]/(platform)/campaigns/campaigns-client.tsx)

```tsx
"use client";
// Creator view: "내 캠페인" list with create button, status badges
// Clipper view: Marketplace grid with:
//   - Search bar
//   - Type filters (PROJECT/REWARD/HYBRID)
//   - Category filters (gaming, beauty, tech, mukbang, etc.)
//   - Card grid with title, description, platforms, pricing, deadline
// Uses Badge system for type/status coloring
```

*(Full code is ~283 lines)*

---

## Campaign Detail (src/app/[locale]/(platform)/campaigns/[id]/campaign-detail-client.tsx)

```tsx
"use client";
// Creator view: stats (participants, submissions, approved, budget)
//   + description + guidelines cards
//   + submission review cards with approve/reject/revision-request actions
// Clipper view: reward info, deadline, participate action
// Sidebar: pricing details, target platforms, campaign actions
```

*(Full code is ~527 lines)*

---

## Submission Detail (src/app/[locale]/(platform)/campaigns/[id]/submissions/[subId]/submission-detail-client.tsx)

```tsx
"use client";
// MOST COMPLEX PAGE — campaign-type-aware submission detail
// Creator view: Full clipper hero section with:
//   - Avatar, name, bio, tier badge, verified badge
//   - 8-stat grid (rating, approval rate, completed campaigns, reviews, total views, avg views, activity duration, active campaigns)
//   - Skills tags (specializations, editing tools, languages)
//   - Social connections (YouTube, Instagram, TikTok, X)
//   - Portfolio preview (3 items with thumbnails)
// Both views:
//   - Application content (pitch message, proposed price, dates)
//   - Submitted clip card with external link
//   - Performance analytics: SVG line chart (view-chart.tsx), stats grid
//   - Earnings breakdown: varies by campaign type
//     - PROJECT: fixed amount
//     - REWARD: views ÷ 1000 × CPR rate with progress bar
//     - HYBRID: fixed + view bonus with itemized breakdown
//   - Revision notes (yellow warning card)
//   - Payment settlement card (green)
//   - Review actions (approve/reject/revision-request with notes)
// Sidebar:
//   - Reward structure card
//   - Earnings summary (REWARD/HYBRID)
//   - Timeline (applied → submitted → reviewed → paid)
```

*(Full code is ~1059 lines)*

---

## Settings (src/app/[locale]/(platform)/settings/page.tsx)

```tsx
"use client";
// Profile card (avatar, nickname, role, join date)
// Base profile form (email readonly, nickname with availability check, bio, language)
// Login accounts (Kakao/Google connected status)
// Social platform connections (YouTube, Instagram, TikTok, X) with connect/sync/disconnect
// Creator profile: content categories (tag selector), clip styles, guidelines, platform links
// Clipper profile: specializations, editing tools, languages (all tag selectors), stats
// Notification settings (email, KakaoTalk toggles)
```

*(Full code is ~812 lines)*

---

## Wallet (src/app/[locale]/(platform)/wallet/page.tsx)

```tsx
"use client";
// 4 balance cards: Available, Escrow Held, Total Deposited, Total Earned
// Deposit form with quick-amount buttons (₩10K, ₩50K, ₩100K, ₩500K)
// Transaction history: icon-coded (deposit=green, withdrawal=red, escrow=yellow)
```

*(Full code is ~248 lines)*

---

## Messages (src/app/[locale]/(platform)/messages/messages-client.tsx)

```tsx
"use client";
// Split-pane: conversation list (left 1/3) + message thread (right 2/3)
// Conversation items: project title, other user, last message, unread badge
// Thread: real-time message bubbles with send input
```

*(Full code is ~119 lines)*

---

## Custom SVG Chart (src/components/charts/view-chart.tsx)

```tsx
"use client";
// Zero-dependency SVG line chart for view tracking
// Features: area gradient fill, data point dots, Y-axis labels (만/천 format), X-axis dates
// Handles: empty state, single data point, multiple points
// Uses CSS custom properties for theming (hsl(var(--primary)))
```

*(Full code is ~183 lines)*

---

## Stats Grid (src/components/charts/stats-grid.tsx)

```tsx
// Simple responsive grid of stat cards
// Each: label, value, optional sub-text, optional color
// Configurable columns (2/3/4)
```

*(Full code is ~34 lines)*

---

## Profile Content (src/components/profile/profile-content.tsx)

```tsx
"use client";
// Three variants:
// 1. ProfileSummary — compact card for sidebar embeds
// 2. ProfileFull — expanded view for Sheet panels
// 3. ProfileComplete — comprehensive deep-dive with full stats, portfolio, social connections
// Role-adaptive: shows different sections for Creator vs Clipper
// Clipper: rating, tier, verified badge, specializations, portfolio items, view counts
// Creator: channel info, subscriber count, content categories, platform links
```

*(Full code is ~869 lines)*

---

## Korean i18n (src/messages/ko.json)

```json
{
  "common": {
    "appName": "클립 플랫폼",
    "login": "로그인",
    "register": "회원가입",
    "logout": "로그아웃",
    "dashboard": "대시보드",
    "save": "저장",
    "cancel": "취소",
    "creator": "크리에이터",
    "clipper": "클리퍼"
  },
  "landing": {
    "hero": {
      "title": "크리에이터와 클리퍼를\n연결하는 플랫폼",
      "subtitle": "롱폼 콘텐츠를 바이럴 숏폼 클립으로 만들어 보세요."
    }
  },
  "campaigns": {
    "type": {
      "PROJECT": "프로젝트형",
      "REWARD": "리워드형",
      "HYBRID": "하이브리드형"
    }
  },
  "wallet": {
    "title": "지갑",
    "balance": "잔액",
    "escrowHeld": "에스크로 보유"
  }
}
```

*(Full file is ~312 lines with all keys)*

---

## API Routes Summary (23+ endpoints)

```
POST/GET /api/auth/[...nextauth]                     # Auth.js
GET/PUT  /api/v1/users/me                             # Current user profile
GET      /api/v1/users/[id]                           # Public profile
GET      /api/v1/users/check-nickname                 # Nickname availability

POST/GET /api/v1/campaigns                            # Create / list campaigns
GET/PUT  /api/v1/campaigns/[id]                       # Campaign CRUD + status
POST/GET /api/v1/campaigns/[id]/submissions           # Submit / list
PUT      /api/v1/campaigns/[id]/submissions/[subId]   # Review (approve/reject/revision)

GET      /api/v1/marketplace                          # Search active campaigns

GET/POST /api/v1/wallet                               # Wallet balance + create
POST     /api/v1/wallet/deposit                       # Deposit funds

POST     /api/v1/payments/initiate                    # Start escrow
POST     /api/v1/payments/confirm                     # Toss confirmation
POST     /api/v1/payments/release                     # Release escrow
POST     /api/v1/payments/webhooks/toss               # Toss webhook

GET/POST /api/v1/social/connect/[provider]            # Social OAuth initiate
GET      /api/v1/social/callback/[provider]           # Social OAuth callback
GET/DEL  /api/v1/social/connections/[provider]        # List/disconnect
POST     /api/v1/social/sync/[provider]               # Sync data

GET      /api/v1/notifications                        # List notifications
PUT      /api/v1/notifications/[id]/read              # Mark as read

POST     /api/v1/uploads/presign                      # S3 presigned URL
```

---

## Build Status

✅ Builds cleanly (`prisma generate && next build`)
✅ Auth working (Kakao + Google)
✅ Full campaign CRUD + submission workflow
✅ Wallet system with escrow
✅ Social OAuth connections (YouTube, Instagram, TikTok, X)
✅ View snapshot tracking + SVG charts
✅ In-app notifications
✅ Per-project messaging
✅ i18n (Korean primary, English secondary)
