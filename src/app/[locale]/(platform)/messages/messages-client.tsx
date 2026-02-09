"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { MessageThread } from "@/components/messages/message-thread";

interface Conversation {
  projectId: string;
  projectTitle: string;
  otherUserId: string;
  otherUserName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface MessagesClientProps {
  conversations: Conversation[];
  selectedProjectId?: string;
  selectedProjectTitle?: string;
  currentUserId: string;
}

function formatTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days}일 전`;
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export function MessagesClient({
  conversations,
  selectedProjectId,
  selectedProjectTitle,
  currentUserId,
}: MessagesClientProps) {
  const router = useRouter();

  function selectConversation(projectId: string) {
    router.push(`/messages?project=${projectId}`);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3" style={{ minHeight: "70vh" }}>
      {/* Conversation List */}
      <Card className="lg:col-span-1">
        <CardContent className="p-0">
          <div className="divide-y">
            {conversations.map((convo) => (
              <button
                key={convo.projectId}
                onClick={() => selectConversation(convo.projectId)}
                className={`w-full px-4 py-3 text-left transition-colors hover:bg-accent ${
                  convo.projectId === selectedProjectId ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">{convo.projectTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {convo.otherUserId ? (
                        <a
                          href={`/profile/${convo.otherUserId}`}
                          className="hover:underline hover:text-foreground transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {convo.otherUserName}
                        </a>
                      ) : convo.otherUserName}
                    </p>
                    {convo.lastMessage && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {convo.lastMessage}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {convo.lastMessageAt && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(convo.lastMessageAt)}
                      </span>
                    )}
                    {convo.unreadCount > 0 && (
                      <Badge variant="default" className="h-5 min-w-5 justify-center px-1.5 text-xs">
                        {convo.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Message Thread */}
      <Card className="lg:col-span-2">
        {selectedProjectId && selectedProjectTitle ? (
          <MessageThread
            projectId={selectedProjectId}
            projectTitle={selectedProjectTitle}
            currentUserId={currentUserId}
          />
        ) : (
          <CardContent className="flex flex-col items-center justify-center py-24">
            <MessageSquare className="mb-4 h-16 w-16 text-muted-foreground/20" />
            <p className="text-muted-foreground">대화를 선택하세요</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
