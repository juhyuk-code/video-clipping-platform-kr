import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { MessagesClient } from "./messages-client";

interface Conversation {
  projectId: string;
  projectTitle: string;
  otherUserName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

async function getConversations(userId: string): Promise<Conversation[]> {
  // Find all projects where user is creator or assigned clipper
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { creatorId: userId },
        { assignedClipperId: userId },
      ],
      assignedClipperId: { not: null },
    },
    select: {
      id: true,
      title: true,
      creatorId: true,
      creator: { select: { nickname: true, name: true } },
      assignedClipper: { select: { nickname: true, name: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, createdAt: true },
      },
      _count: {
        select: {
          messages: { where: { senderId: { not: userId }, isRead: false } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return projects.map((p) => {
    const isCreator = p.creatorId === userId;
    const otherUser = isCreator ? p.assignedClipper : p.creator;
    const lastMsg = p.messages[0];
    return {
      projectId: p.id,
      projectTitle: p.title,
      otherUserName: otherUser?.nickname ?? otherUser?.name ?? "사용자",
      lastMessage: lastMsg?.content ?? "",
      lastMessageAt: lastMsg?.createdAt?.toISOString() ?? "",
      unreadCount: p._count.messages,
    };
  });
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  const { project: selectedProjectId } = await searchParams;

  if (!userId) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">로그인이 필요합니다</p>
      </div>
    );
  }

  const conversations = await getConversations(userId);

  // Find the selected project title
  const selectedConvo = conversations.find((c) => c.projectId === selectedProjectId);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">메시지</h1>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-24">
            <MessageSquare className="mb-4 h-16 w-16 text-muted-foreground/20" />
            <p className="text-muted-foreground">
              아직 대화가 없습니다
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              프로젝트에 클리퍼가 배정되면 메시지를 보낼 수 있습니다
            </p>
          </CardContent>
        </Card>
      ) : (
        <MessagesClient
          conversations={conversations}
          selectedProjectId={selectedProjectId}
          selectedProjectTitle={selectedConvo?.projectTitle}
          currentUserId={userId}
        />
      )}
    </div>
  );
}
