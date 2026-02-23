import { prisma } from "@/lib/db";
import { getYouTubeScopeStatus } from "@/lib/social/youtube-permissions";

export type CreatorYouTubeReadiness =
  | {
      ready: true;
      status: "READY";
      connectionId: string;
      missingScopes: [];
    }
  | {
      ready: false;
      status: "MISSING_CONNECTION" | "MISSING_SCOPE";
      connectionId: null;
      missingScopes: string[];
    };

export class CreatorYouTubeReadyError extends Error {
  status: "MISSING_CONNECTION" | "MISSING_SCOPE";
  missingScopes: string[];

  constructor(
    message: string,
    status: "MISSING_CONNECTION" | "MISSING_SCOPE",
    missingScopes: string[] = []
  ) {
    super(message);
    this.name = "CreatorYouTubeReadyError";
    this.status = status;
    this.missingScopes = missingScopes;
  }
}

export async function getCreatorYouTubeReadiness(userId: string): Promise<CreatorYouTubeReadiness> {
  const connection = await prisma.socialConnection.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: "YOUTUBE",
      },
    },
    select: {
      id: true,
      scope: true,
    },
  });

  if (!connection) {
    return {
      ready: false,
      status: "MISSING_CONNECTION",
      connectionId: null,
      missingScopes: [],
    };
  }

  const scopeStatus = getYouTubeScopeStatus(connection.scope);
  if (!scopeStatus.ready) {
    return {
      ready: false,
      status: "MISSING_SCOPE",
      connectionId: null,
      missingScopes: scopeStatus.missing,
    };
  }

  return {
    ready: true,
    status: "READY",
    connectionId: connection.id,
    missingScopes: [],
  };
}

export async function assertCreatorYouTubeReady(userId: string): Promise<{ connectionId: string }> {
  const readiness = await getCreatorYouTubeReadiness(userId);
  if (readiness.ready) {
    return { connectionId: readiness.connectionId };
  }

  if (readiness.status === "MISSING_CONNECTION") {
    throw new CreatorYouTubeReadyError(
      "크리에이터 YouTube 계정을 먼저 연결해야 합니다. 설정에서 연결 후 다시 시도해주세요.",
      "MISSING_CONNECTION"
    );
  }

  throw new CreatorYouTubeReadyError(
    "크리에이터 YouTube 필수 권한이 누락되었습니다. YouTube 계정을 재연결하고 두 권한(youtube.readonly, yt-analytics.readonly)을 모두 허용해주세요.",
    "MISSING_SCOPE",
    readiness.missingScopes
  );
}
