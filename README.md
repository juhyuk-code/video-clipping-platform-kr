# 클립 플랫폼 (Clip Platform KR)

A two-sided marketplace connecting **creators** (크리에이터) with **clippers** (클리퍼) in the Korean content ecosystem. Creators post long-form videos; clippers turn them into viral short-form clips for YouTube Shorts, TikTok, and Instagram Reels.

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS + shadcn/ui
- **Auth**: Auth.js v5 (Kakao, Naver, Google)
- **Database**: PostgreSQL (Supabase) + Prisma ORM
- **Payments**: Toss Payments (escrow, KakaoPay, NaverPay)
- **Storage**: AWS S3 + CloudFront
- **i18n**: next-intl (Korean primary, English secondary)
- **Deployment**: Vercel + AWS (ap-northeast-2 Seoul)

## Documentation

- [Technical Plan](./PLAN.md) — Full architecture, database schema, MVP scope, and roadmap