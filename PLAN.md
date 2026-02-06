# 클립 플랫폼 (Clip Platform KR) - Technical Plan

A two-sided marketplace connecting **creators** (크리에이터) with **clippers** (클리퍼) in the Korean content ecosystem.

---

## 1. Product Vision

Korean creators dominate global platforms — YouTube, TikTok, AfreecaTV — but no dedicated Korean marketplace exists for connecting them with skilled clippers who can turn long-form content into viral short-form clips (Shorts, Reels, TikTok).

**Two user types:**
- **Creators**: YouTubers, streamers who produce long-form content and want clips made
- **Clippers**: Editors who specialize in extracting and editing short-form clips

---

## 2. Core Features

### 2.1 Creator Features

| Feature | Description |
|---------|-------------|
| Content Submission | Link YouTube/AfreecaTV/Twitch videos by URL; specify clipping guidelines, target platforms, clip length |
| Project Management | Create "clipping projects" with deadlines, budgets, briefs; two types: **Open Request (공개 의뢰)** and **Direct Assignment (직접 의뢰)** |
| Clip Review | Review submitted clips with inline player; approve / reject / request revisions |
| Payments | Set per-clip or per-project budget; revenue sharing option; view payment history |
| Analytics | Dashboard showing clip performance (views, engagement); clipper comparison; ROI tracking |
| Profile | Public profile with channel stats (via YouTube API), content category |

### 2.2 Clipper Features

| Feature | Description |
|---------|-------------|
| Discovery | Browse open projects with filters (category, budget, deadline, platform, creator rating) |
| Applications | Apply with pitch, proposed approach, portfolio samples |
| Workspace | Access source material, timestamp marking, upload completed clips, track revisions |
| Portfolio | Public portfolio with view counts, skill tags (gaming, beauty, tech, mukbang, etc.) |
| Reputation | Rating system (1-5 stars), tier system (Bronze → Platinum), "Verified Clipper" badge |
| Earnings | Dashboard for pending/escrowed/settled earnings; withdrawal to Korean bank account |

### 2.3 Marketplace & Matching

**Pricing Models:**
- **Fixed Price (고정가)**: Creator sets total budget
- **Per-Clip (클립당 가격)**: Price per delivered clip
- **Revenue Share (수익 분배)**: Percentage of clip ad revenue
- **Bid (입찰)**: Clippers propose their price

### 2.4 Workflow

```
Creator submits video (URL)
    → Creates project brief (guidelines, budget, deadline, platform)
    → Published to marketplace OR sent as direct assignment
    → Clippers apply → Creator selects clipper
    → Payment held in escrow (에스크로)
    → Clipper creates clips → Submits for review
    → Creator approves → Funds released to clipper
    → Creator publishes clip → Analytics tracking begins
```

### 2.5 Communication & Notifications

- Per-project messaging threads with file attachments
- In-app + email + KakaoTalk Alim Talk notifications
- Optional auto-translation (Korean ↔ English) for international clippers

---

## 3. Technical Architecture

### 3.1 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 15+ (App Router) | SSR for Naver SEO, dominant in Korean dev ecosystem |
| **UI** | Tailwind CSS + shadcn/ui | Rapid development, consistent design system |
| **i18n** | next-intl | First-class App Router support, Korean locale handling |
| **State** | Zustand (client) + TanStack Query (server) | Lightweight, performant |
| **Auth** | Auth.js (NextAuth) v5 | Built-in Kakao, Naver, Google providers |
| **Database** | PostgreSQL via Supabase | Managed, real-time subscriptions, APAC region |
| **ORM** | Prisma | Type-safe, migration management |
| **Payments** | Toss Payments | Korean market standard; escrow, payouts, KakaoPay/NaverPay |
| **Storage** | AWS S3 (ap-northeast-2 Seoul) | Video/file storage |
| **CDN** | AWS CloudFront | Low-latency delivery in Korea |
| **Video Processing** | AWS MediaConvert | HLS transcoding, thumbnails |
| **Deployment** | Vercel (app) + AWS (infra) | Edge network + Seoul region infrastructure |

### 3.2 Project Structure

```
video-clipping-platform-kr/
├── src/
│   ├── app/
│   │   ├── [locale]/                 # i18n routing (ko, en)
│   │   │   ├── (auth)/              # login, register
│   │   │   ├── (platform)/          # authenticated pages
│   │   │   │   ├── dashboard/
│   │   │   │   ├── projects/
│   │   │   │   │   └── [id]/
│   │   │   │   ├── marketplace/
│   │   │   │   ├── messages/
│   │   │   │   ├── analytics/
│   │   │   │   ├── settings/
│   │   │   │   └── admin/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx              # landing page
│   │   └── api/
│   │       └── v1/
│   │           ├── auth/
│   │           ├── users/
│   │           ├── projects/
│   │           ├── marketplace/
│   │           ├── payments/
│   │           ├── uploads/
│   │           └── notifications/
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── features/                 # domain-specific components
│   │   └── layouts/
│   ├── lib/
│   │   ├── db/                       # Prisma client singleton
│   │   ├── api/                      # API client utilities
│   │   ├── auth/                     # Auth.js config
│   │   ├── payments/                 # Toss Payments utilities
│   │   ├── storage/                  # S3 presigned URL generation
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── validations/              # Zod schemas
│   ├── messages/
│   │   ├── ko.json
│   │   └── en.json
│   └── i18n/
│       ├── config.ts
│       └── request.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
│   ├── images/
│   └── fonts/                        # Pretendard (Korean web font)
├── middleware.ts                      # locale detection + auth
├── next.config.ts
├── tailwind.config.ts
├── docker-compose.yml                # local dev (PostgreSQL, MinIO)
├── .env.example
└── README.md
```

### 3.3 Database Schema

**Core Entities:**

```
User
├── id, email, name, nickname
├── role: CREATOR | CLIPPER | BOTH | ADMIN
├── kakaoId?, naverId?, googleId?
├── preferredLanguage: KO | EN
├── businessRegistrationNumber?
└── bankAccount? (encrypted)

CreatorProfile (1:1 with User)
├── youtubeChannelId, subscriberCount
├── contentCategories[]
└── defaultClipGuidelines

ClipperProfile (1:1 with User)
├── specializations[] (gaming, beauty, tech...)
├── tier: BRONZE | SILVER | GOLD | PLATINUM
├── isVerified, averageRating
└── → PortfolioItem[]

Project
├── creatorId → User
├── assignedClipperId? → User
├── title, description, brief
├── status: DRAFT | OPEN | ASSIGNED | IN_PROGRESS | IN_REVIEW |
│           REVISION_REQUESTED | COMPLETED | CANCELLED | DISPUTED
├── type: OPEN_REQUEST | DIRECT_ASSIGNMENT
├── sourceVideoUrl (YouTube/Twitch URL)
├── targetPlatforms[] (YOUTUBE_SHORTS, TIKTOK, INSTAGRAM_REELS)
├── pricingModel: FIXED | PER_CLIP | REVENUE_SHARE | BID
├── budgetAmount (KRW), revenueSharePercentage?
├── maxRevisionRounds (default: 2)
└── deadline

Application
├── projectId → Project, clipperId → User
├── status: PENDING | ACCEPTED | REJECTED | WITHDRAWN
├── pitch, proposedPrice?, estimatedDeliveryDays
└── portfolioSamples[]

Clip
├── projectId → Project, clipperId → User
├── title, videoFileUrl, thumbnailUrl
├── status: SUBMITTED | APPROVED | REVISION_REQUESTED | REJECTED
├── targetPlatform, durationSeconds
└── publishedUrl?, viewCount?

Payment
├── projectId → Project
├── payerId → User (creator), payeeId → User (clipper)
├── amount, platformFee, netPayeeAmount (all KRW)
├── status: PENDING | ESCROWED | RELEASED | REFUNDED | DISPUTED
└── tossPaymentKey, tossOrderId

Review
├── projectId → Project (unique per project)
├── reviewerId → User, revieweeId → User
├── rating (1-5), comment
└── createdAt

Message
├── projectId → Project, senderId → User
├── content, attachmentUrls[]
└── isRead

Notification
├── userId → User
├── type: PROJECT_APPLICATION | CLIP_SUBMITTED | PAYMENT_RECEIVED | ...
├── title, body, linkUrl
└── isRead
```

### 3.4 API Endpoints

```
POST/GET    /api/v1/auth/[...nextauth]    # Auth.js handlers
GET/PUT     /api/v1/users/me              # Current user profile
GET         /api/v1/users/:id             # Public profile

POST/GET    /api/v1/projects              # Create / list projects
GET/PUT/DEL /api/v1/projects/:id          # Project CRUD
POST/GET    /api/v1/projects/:id/applications  # Apply / list applications
PUT         /api/v1/projects/:id/applications/:appId  # Accept/reject
POST/GET    /api/v1/projects/:id/clips    # Submit / list clips
PUT         /api/v1/projects/:id/clips/:clipId  # Approve/reject/revision
POST/GET    /api/v1/projects/:id/messages # Send / list messages
POST        /api/v1/projects/:id/review   # Submit review

GET         /api/v1/marketplace           # Search open projects (filters)

POST        /api/v1/payments/initiate     # Start escrow payment
POST        /api/v1/payments/confirm      # Toss payment confirmation
POST        /api/v1/payments/webhooks/toss # Toss webhook receiver

POST        /api/v1/uploads/presign       # Get S3 presigned URL
PUT         /api/v1/uploads/:id/complete  # Mark upload as done

GET         /api/v1/notifications         # List notifications
PUT         /api/v1/notifications/:id/read # Mark as read
```

### 3.5 Authentication

**Required Providers (Korean market):**
1. **Kakao Login** — Most-used messaging app in Korea, essential
2. **Naver Login** — Dominant search engine, widely used for auth
3. **Google Login** — Important for YouTube-connected creators

**Flow:** OAuth 2.0 → Auth.js callback → JWT session → Role selection on first login

### 3.6 Payment Flow (Toss Payments)

```
1. Creator selects clipper → Backend initiates Toss Payment (escrow)
2. Creator completes payment via Toss Widget (card, bank transfer, KakaoPay, etc.)
3. Funds held in escrow by Toss Payments
4. Clipper submits clips → Creator approves
5. Backend calls Toss API to release escrow → Funds settle to clipper bank account
6. Platform commission (10-15%) deducted before payout
```

**Tax compliance:** 세금계산서 (B2B), 원천징수 3.3% (freelancer withholding)

### 3.7 Video Handling Strategy

- **YouTube-sourced content**: Store URL + metadata only (YouTube Data API v3). No downloading — compliant with YouTube ToS.
- **Clip deliverables**: Presigned S3 upload → MediaConvert transcoding → CloudFront delivery
- **Storage lifecycle**: Raw → Glacier after 90 days → Delete after 1 year

### 3.8 Korean Localization

- Primary language: Korean (ko-KR), secondary: English (en)
- Currency: KRW (₩)
- Date format: 2026년 2월 6일
- Font: Pretendard (Korean web font)
- Social login: Kakao + Naver (mandatory for Korean market)
- Payment: Toss Payments with KakaoPay, NaverPay, TossPay
- Compliance: PIPA (개인정보보호법)
- Notifications: KakaoTalk Alim Talk

---

## 4. MVP Scope (Phase 1)

### Phase 1A: Foundation
- [x] Repository setup
- [ ] Next.js 15 App Router + Prisma + Supabase + Tailwind + shadcn/ui
- [ ] Auth system: Kakao + Naver + Google via Auth.js
- [ ] i18n setup with next-intl (ko/en)
- [ ] User registration with role selection
- [ ] Basic user profile CRUD
- [ ] Database schema + initial migration

### Phase 1B: Core Marketplace
- [ ] Creator: create project (title, brief, budget, deadline, YouTube URL)
- [ ] Marketplace listing page with search and filters
- [ ] Clipper: browse projects, submit applications
- [ ] Creator: review applications, select clipper
- [ ] Project status management (state machine)
- [ ] In-project messaging (basic text)

### Phase 1C: Clip Delivery & Payment
- [ ] File upload via S3 presigned URLs
- [ ] Video player for clip review
- [ ] Approve / reject / request-revision workflow
- [ ] Toss Payments: escrow on clipper selection, release on approval
- [ ] Notification system (in-app + email)

### Phase 1D: Polish & Launch
- [ ] Basic analytics dashboard
- [ ] Review/rating system
- [ ] Landing page (Korean)
- [ ] Error handling, loading states, empty states
- [ ] Basic admin panel

### MVP Explicitly Excludes
- Direct video uploads from creators (YouTube URL only)
- Video transcoding pipeline
- Revenue share payment model
- AI features
- Mobile app
- Real-time chat
- Clipper tier system

---

## 5. Post-MVP Roadmap

### V1.5
- Creator video uploads with transcoding (S3 + MediaConvert + CloudFront HLS)
- File attachments in messages
- KakaoTalk Alim Talk notifications
- Clipper portfolio pages and public profiles
- Advanced marketplace search (full-text)
- Business verification (NTS API)
- Clipper tier system
- Naver SEO optimization

### V2
- Revenue share model with YouTube Analytics API
- Bid/auction pricing
- Advanced analytics (per-clip performance, ROI)
- YouTube publishing integration
- Batch project creation
- Dispute resolution workflow
- Referral system

### V3
- Native mobile app (React Native)
- AI-assisted clipping (highlight detection)
- AfreecaTV / Twitch platform expansion
- International expansion (Japan)
- MCN (Multi-Channel Network) features

---

## 6. Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| YouTube ToS compliance | Never download videos; URL references only |
| Toss Payments escrow complexity | Start with simple escrow; engage Toss support early |
| Video storage costs at scale | Lifecycle policies; size limits; on-demand transcoding |
| Korean data privacy (PIPA) | Legal counsel; encryption at rest; explicit consent; deletion workflows |
| Two-sided marketplace cold start | Manual outreach to mid-tier creators; free initial projects; MCN partnerships |

---

## 7. Deployment

| Component | Service | Region |
|-----------|---------|--------|
| Next.js App | Vercel | Edge (global, APAC PoPs) |
| Database | Supabase (PostgreSQL) | ap-northeast-1 |
| File Storage | AWS S3 | ap-northeast-2 (Seoul) |
| CDN | AWS CloudFront | Global (Seoul edge) |
| Video Processing | AWS MediaConvert | ap-northeast-2 |
| Queue | AWS SQS | ap-northeast-2 |
| Email | AWS SES | ap-northeast-2 |
| Monitoring | Vercel Analytics + Sentry | — |
| CI/CD | GitHub Actions | — |

**Environments:** development (Docker Compose) → staging (Toss test mode) → production
