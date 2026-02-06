import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create sample creators
  const creator1 = await prisma.user.upsert({
    where: { email: "creator1@example.com" },
    update: {},
    create: {
      email: "creator1@example.com",
      name: "김창작",
      nickname: "게임왕",
      role: "CREATOR",
      image: null,
      bio: "게임 전문 유튜버입니다. 다양한 게임 리뷰와 플레이 영상을 업로드합니다.",
      preferredLanguage: "KO",
      creatorProfile: {
        create: {
          youtubeChannelName: "게임왕 TV",
          subscriberCount: 150000,
          contentCategories: ["gaming", "tech"],
          averageVideoViews: 25000,
          defaultClipGuidelines: "재미있는 순간, 하이라이트 위주로 편집해주세요. 1분 내외로 만들어주세요.",
        },
      },
    },
  });

  const creator2 = await prisma.user.upsert({
    where: { email: "creator2@example.com" },
    update: {},
    create: {
      email: "creator2@example.com",
      name: "이뷰티",
      nickname: "뷰티스타",
      role: "CREATOR",
      image: null,
      bio: "뷰티/메이크업 전문 크리에이터입니다.",
      preferredLanguage: "KO",
      creatorProfile: {
        create: {
          youtubeChannelName: "뷰티스타",
          subscriberCount: 320000,
          contentCategories: ["beauty", "vlog"],
          averageVideoViews: 45000,
        },
      },
    },
  });

  const creator3 = await prisma.user.upsert({
    where: { email: "creator3@example.com" },
    update: {},
    create: {
      email: "creator3@example.com",
      name: "박먹방",
      nickname: "먹방의신",
      role: "CREATOR",
      image: null,
      bio: "대한민국 No.1 먹방 유튜버! 맛집 탐방과 쿡방도 합니다.",
      preferredLanguage: "KO",
      creatorProfile: {
        create: {
          youtubeChannelName: "먹방의신",
          subscriberCount: 890000,
          contentCategories: ["mukbang", "vlog"],
          averageVideoViews: 120000,
        },
      },
    },
  });

  // Create sample clippers
  const clipper1 = await prisma.user.upsert({
    where: { email: "clipper1@example.com" },
    update: {},
    create: {
      email: "clipper1@example.com",
      name: "정편집",
      nickname: "클립마스터",
      role: "CLIPPER",
      image: null,
      bio: "영상 편집 경력 5년. 게임/테크 분야 전문 클리퍼입니다.",
      preferredLanguage: "KO",
      clipperProfile: {
        create: {
          specializations: ["gaming", "tech", "education"],
          tier: "GOLD",
          isVerified: true,
          averageRating: 4.7,
          totalProjectsCompleted: 48,
          totalEarnings: 12500000,
        },
      },
    },
  });

  const clipper2 = await prisma.user.upsert({
    where: { email: "clipper2@example.com" },
    update: {},
    create: {
      email: "clipper2@example.com",
      name: "최숏폼",
      nickname: "숏폼장인",
      role: "CLIPPER",
      image: null,
      bio: "틱톡, 릴스 전문 편집자. 빠른 컷과 트렌디한 편집이 강점입니다.",
      preferredLanguage: "KO",
      clipperProfile: {
        create: {
          specializations: ["beauty", "vlog", "comedy"],
          tier: "SILVER",
          isVerified: true,
          averageRating: 4.3,
          totalProjectsCompleted: 22,
          totalEarnings: 5800000,
        },
      },
    },
  });

  const clipper3 = await prisma.user.upsert({
    where: { email: "clipper3@example.com" },
    update: {},
    create: {
      email: "clipper3@example.com",
      name: "한뉴비",
      nickname: "편집초보",
      role: "CLIPPER",
      image: null,
      bio: "편집 공부 중인 학생입니다. 열심히 하겠습니다!",
      preferredLanguage: "KO",
      clipperProfile: {
        create: {
          specializations: ["gaming", "music"],
          tier: "BRONZE",
          isVerified: false,
          averageRating: null,
          totalProjectsCompleted: 2,
          totalEarnings: 300000,
        },
      },
    },
  });

  // Create sample projects
  const project1 = await prisma.project.create({
    data: {
      creatorId: creator1.id,
      title: "게임 하이라이트 클립 제작 (발로란트)",
      description: "발로란트 랭크 게임 영상에서 하이라이트 클립을 만들어주세요.",
      brief:
        "에이스, 클러치, 재미있는 실수 등 흥미로운 순간을 골라서 15-60초 사이의 숏폼 클립으로 제작해주세요. 배경음악은 저작권 프리 음악을 사용해주세요. 자막은 한국어로 넣어주세요.",
      status: "OPEN",
      type: "OPEN_REQUEST",
      sourceVideoUrl: "https://www.youtube.com/watch?v=example1",
      sourceVideoTitle: "발로란트 다이아 랭크 10연승 도전기",
      targetPlatforms: ["YOUTUBE_SHORTS", "TIKTOK"],
      pricingModel: "PER_CLIP",
      budgetAmount: 30000,
      maxClipsRequested: 5,
      maxRevisionRounds: 2,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      contentCategory: "gaming",
    },
  });

  const project2 = await prisma.project.create({
    data: {
      creatorId: creator2.id,
      title: "데일리 메이크업 튜토리얼 숏폼 제작",
      description: "30분짜리 메이크업 튜토리얼을 3개의 숏폼 클립으로 나눠주세요.",
      brief:
        "각 클립은 하나의 단계(베이스, 아이, 립)에 집중해주세요. 세로 화면(9:16), 자막 필수, 텍스트 오버레이로 제품명을 표시해주세요. 감성적인 BGM 사용.",
      status: "OPEN",
      type: "OPEN_REQUEST",
      sourceVideoUrl: "https://www.youtube.com/watch?v=example2",
      sourceVideoTitle: "봄맞이 데일리 메이크업 완벽 가이드",
      targetPlatforms: ["INSTAGRAM_REELS", "TIKTOK"],
      pricingModel: "FIXED",
      budgetAmount: 150000,
      maxClipsRequested: 3,
      maxRevisionRounds: 3,
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
      contentCategory: "beauty",
    },
  });

  const project3 = await prisma.project.create({
    data: {
      creatorId: creator3.id,
      title: "먹방 베스트 리액션 모음 클립",
      description: "최근 먹방 영상들에서 가장 재미있는 리액션 순간을 모아주세요.",
      brief:
        "음식 먹는 순간의 리액션, ASMR 느낌의 순간, 재미있는 멘트 위주로 편집. 자막 큰 글씨로, 이모지 사용 OK. 밝고 재미있는 분위기로!",
      status: "OPEN",
      type: "OPEN_REQUEST",
      sourceVideoUrl: "https://www.youtube.com/watch?v=example3",
      sourceVideoTitle: "역대급 매운 라면 10종 먹방",
      targetPlatforms: ["YOUTUBE_SHORTS", "TIKTOK", "INSTAGRAM_REELS"],
      pricingModel: "FIXED",
      budgetAmount: 200000,
      maxClipsRequested: 5,
      maxRevisionRounds: 2,
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
      contentCategory: "mukbang",
    },
  });

  const project4 = await prisma.project.create({
    data: {
      creatorId: creator1.id,
      assignedClipperId: clipper1.id,
      title: "리그 오브 레전드 시즌 하이라이트",
      description: "이번 시즌 챌린저 달성 과정 하이라이트 클립 제작",
      brief:
        "펜타킬, 역전 장면, 명장면 위주로 편집. 빠른 컷 편집, 효과음 추가. 각 클립 30초~1분.",
      status: "IN_PROGRESS",
      type: "OPEN_REQUEST",
      sourceVideoUrl: "https://www.youtube.com/watch?v=example4",
      sourceVideoTitle: "챌린저 달성 기념 하이라이트",
      targetPlatforms: ["YOUTUBE_SHORTS"],
      pricingModel: "FIXED",
      budgetAmount: 250000,
      maxClipsRequested: 8,
      maxRevisionRounds: 2,
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
      contentCategory: "gaming",
    },
  });

  const project5 = await prisma.project.create({
    data: {
      creatorId: creator2.id,
      assignedClipperId: clipper2.id,
      title: "스킨케어 루틴 숏폼",
      description: "아침/저녁 스킨케어 루틴 영상 숏폼 제작",
      brief: "ASMR 느낌으로, 제품 클로즈업 샷 포함, 자막 필수",
      status: "COMPLETED",
      type: "DIRECT_ASSIGNMENT",
      sourceVideoUrl: "https://www.youtube.com/watch?v=example5",
      targetPlatforms: ["INSTAGRAM_REELS"],
      pricingModel: "FIXED",
      budgetAmount: 100000,
      maxClipsRequested: 2,
      maxRevisionRounds: 2,
      deadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      contentCategory: "beauty",
    },
  });

  // Create sample applications
  await prisma.application.create({
    data: {
      projectId: project1.id,
      clipperId: clipper1.id,
      pitch: "게임 클립 전문 편집자입니다. 발로란트 관련 클립을 많이 만들어봤습니다. 빠른 컷 편집과 효과음 추가가 강점입니다.",
      estimatedDeliveryDays: 3,
      portfolioSamples: [],
      status: "PENDING",
    },
  });

  await prisma.application.create({
    data: {
      projectId: project1.id,
      clipperId: clipper3.id,
      pitch: "게임 편집을 좋아하는 학생입니다. 열심히 만들어보겠습니다!",
      proposedPrice: 20000,
      estimatedDeliveryDays: 5,
      portfolioSamples: [],
      status: "PENDING",
    },
  });

  await prisma.application.create({
    data: {
      projectId: project2.id,
      clipperId: clipper2.id,
      pitch: "뷰티 콘텐츠 전문 클리퍼입니다. 인스타 릴스에 최적화된 감성 편집이 가능합니다.",
      estimatedDeliveryDays: 4,
      portfolioSamples: [],
      status: "PENDING",
    },
  });

  await prisma.application.create({
    data: {
      projectId: project3.id,
      clipperId: clipper1.id,
      pitch: "먹방 클립도 경험 있습니다. 자막과 이모지 활용한 편집 가능합니다.",
      estimatedDeliveryDays: 5,
      portfolioSamples: [],
      status: "PENDING",
    },
  });

  await prisma.application.create({
    data: {
      projectId: project3.id,
      clipperId: clipper2.id,
      pitch: "틱톡에서 인기 있는 스타일로 편집해드리겠습니다!",
      estimatedDeliveryDays: 4,
      portfolioSamples: [],
      status: "PENDING",
    },
  });

  // Create a review for the completed project
  await prisma.review.create({
    data: {
      projectId: project5.id,
      reviewerId: creator2.id,
      revieweeId: clipper2.id,
      rating: 5,
      comment: "빠르고 퀄리티 높은 편집이었습니다. 다음에도 함께 작업하고 싶습니다!",
    },
  });

  console.log("Seed complete!");
  console.log({
    creators: [creator1.id, creator2.id, creator3.id],
    clippers: [clipper1.id, clipper2.id, clipper3.id],
    projects: [project1.id, project2.id, project3.id, project4.id, project5.id],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
