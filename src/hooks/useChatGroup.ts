import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { initialsFromName } from "@/lib/offerings";
import type { ChatMessage, SectionUser } from "@/data/mockSection";

import { productionApi } from "@/lib/landingConfig";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? productionApi.baseUrl;

function wsUrl(groupId: number, token: string): string {
  const base = API_BASE.replace(/^http/, "ws");
  return `${base}/chat/ws/${groupId}?token=${encodeURIComponent(token)}`;
}

function mapMessage(
  row: Record<string, unknown>,
  courseCode: string,
  section: string,
  facultyName?: string
): ChatMessage {
  const name = String(row.sender_name ?? "User");
  const isFaculty = facultyName
    ? name.toLowerCase() === facultyName.toLowerCase()
    : false;
  const author: SectionUser = {
    name,
    role: isFaculty ? "faculty" : "student",
    initials: initialsFromName(name),
  };
  return {
    id: String(row.id),
    courseCode,
    section,
    content: String(row.body ?? ""),
    author,
    createdAt: new Date(String(row.created_at ?? Date.now())),
  };
}

function mergeMessages(prev: ChatMessage[], mapped: ChatMessage[]): ChatMessage[] {
  const ids = new Set(prev.map((m) => m.id));
  const merged = [...prev];
  for (const m of mapped) {
    if (!ids.has(m.id)) merged.push(m);
  }
  return merged.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function useChatGroup(
  groupId: number | null,
  meta: { courseCode: string; section: string; facultyName?: string }
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const lastIdRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const poll = useCallback(async () => {
    if (!groupId) return;
    try {
      const res = await api.getChatMessages(groupId, lastIdRef.current || undefined);
      const items = res.items as Record<string, unknown>[];
      if (items.length > 0) {
        const mapped = items.map((r) =>
          mapMessage(r, meta.courseCode, meta.section, meta.facultyName)
        );
        lastIdRef.current = Math.max(
          lastIdRef.current,
          ...items.map((r) => Number(r.id))
        );
        setMessages((prev) => mergeMessages(prev, mapped));
      }
    } catch {
      /* ignore poll errors */
    }
  }, [groupId, meta.courseCode, meta.section, meta.facultyName]);

  useEffect(() => {
    setMessages([]);
    lastIdRef.current = 0;
    setWsConnected(false);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (!groupId) return;

    void poll();

    const token = getAccessToken();
    if (!token) {
      const timer = setInterval(() => void poll(), 8000);
      return () => clearInterval(timer);
    }

    let cancelled = false;
    const socket = new WebSocket(wsUrl(groupId, token));
    wsRef.current = socket;

    socket.onopen = () => {
      if (!cancelled) setWsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data)) as {
          type?: string;
          item?: Record<string, unknown>;
        };
        if (data.type === "chat_message" && data.item) {
          const mapped = mapMessage(
            data.item,
            meta.courseCode,
            meta.section,
            meta.facultyName
          );
          lastIdRef.current = Math.max(lastIdRef.current, Number(data.item.id));
          setMessages((prev) => mergeMessages(prev, [mapped]));
        }
      } catch {
        /* ignore */
      }
    };

    socket.onclose = () => {
      if (!cancelled) setWsConnected(false);
    };

    socket.onerror = () => {
      setWsConnected(false);
    };

    const fallback = setInterval(() => void poll(), 15000);

    return () => {
      cancelled = true;
      clearInterval(fallback);
      socket.close();
      wsRef.current = null;
    };
  }, [groupId, meta.courseCode, meta.section, meta.facultyName, poll]);

  const sendMessage = async (body: string) => {
    if (!groupId) throw new Error("Chat group not found");
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "message", body }));
      return;
    }
    await api.sendChatMessage(groupId, body);
    await poll();
  };

  return { messages, sendMessage, refresh: poll, wsConnected };
}
