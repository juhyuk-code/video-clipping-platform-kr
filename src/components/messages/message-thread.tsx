"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  sender: {
    id: string;
    name: string | null;
    nickname: string | null;
    image: string | null;
  };
}

interface MessageThreadProps {
  projectId: string;
  projectTitle: string;
  currentUserId: string;
}

export function MessageThread({ projectId, projectTitle, currentUserId }: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/projects/${projectId}/messages`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(Array.isArray(data) ? data : data.data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        const msg = data.data ?? data;
        setMessages((prev) => [...prev, msg]);
        setNewMessage("");
      }
    } catch {
      // silent fail
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">메시지를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <p className="font-medium">{projectTitle}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "60vh" }}>
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            아직 메시지가 없습니다. 첫 메시지를 보내보세요!
          </p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender.id === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-lg px-3 py-2 ${isMine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {!isMine && (
                    <p className="mb-1 text-xs font-medium">{msg.sender.nickname ?? msg.sender.name}</p>
                  )}
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  <p className={`mt-1 text-xs ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            rows={1}
            className="min-h-[40px] resize-none"
          />
          <Button onClick={handleSend} disabled={!newMessage.trim() || sending} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
