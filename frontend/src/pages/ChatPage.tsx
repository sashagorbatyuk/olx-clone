import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getChat, sendMessage, type ChatDetails, type ChatMessage } from "../api/chats";
import { getMyUserIdFromToken } from "../api/auth";

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function isNearBottom(el: HTMLElement) {
  const threshold = 140;
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

export function ChatPage() {
  const { id } = useParams();
  const nav = useNavigate();

  const API = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5015", []);
  const myId = getMyUserIdFromToken();

  const [chat, setChat] = useState<ChatDetails | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function scrollToBottom(smooth = true) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }

  function otherAvatarSrc() {
    if (!chat?.otherUserAvatarUrl) return null;
    return `${API}${chat.otherUserAvatarUrl}`;
  }

  async function load() {
    if (!id) return;
    setErr(null);
    setLoading(true);

    try {
      const data = await getChat(id);
      setChat(data);
      setTimeout(() => scrollToBottom(false), 0);
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Failed to load chat");
      setChat(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSend() {
    if (!id) return;
    if (!myId) {
      setErr("Not authorized.");
      return;
    }

    const t = text.trim();
    if (!t) return;

    const shouldScroll = listRef.current ? isNearBottom(listRef.current) : true;

    // optimistic message
    const optimistic: ChatMessage = {
      id: `tmp-${crypto.randomUUID()}`,
      senderId: myId,
      text: t,
      createdAt: new Date().toISOString(),
    };

    setErr(null);
    setText("");
    setChat((prev) => (prev ? { ...prev, messages: [...prev.messages, optimistic] } : prev));

    // keep typing experience nice
    setTimeout(() => textareaRef.current?.focus(), 0);
    if (shouldScroll) setTimeout(() => scrollToBottom(true), 0);

    setBusy(true);
    try {
      const real = await sendMessage(id, t);
      setChat((prev) => {
        if (!prev) return prev;
        return { ...prev, messages: prev.messages.map((m) => (m.id === optimistic.id ? real : m)) };
      });
      if (shouldScroll) setTimeout(() => scrollToBottom(true), 0);
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Send failed");
      // rollback optimistic
      setChat((prev) => (prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== optimistic.id) } : prev));
      setText(t); // restore typed text
    } finally {
      setBusy(false);
    }
  }

  if (!id) return <div>No chat id</div>;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <button
            onClick={() => nav(-1)}
            style={{
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid #e6e6e6",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            ←
          </button>

          {/* Avatar */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              background: "#f1f1f1",
              border: "1px solid #eee",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: "#777",
              flex: "0 0 auto",
            }}
            title={chat?.otherUserName ?? ""}
          >
            {otherAvatarSrc() ? (
              <img
                src={otherAvatarSrc()!}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              (chat?.otherUserName?.[0] ?? "U").toUpperCase()
            )}
          </div>

          {/* Titles */}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {loading ? "Loading..." : chat?.otherUserName ?? "Chat"}
            </div>
            {chat && (
              <div style={{ color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Ad:{" "}
                <Link to={`/ads/${chat.adId}`} style={{ color: "#1e60ff", textDecoration: "none" }}>
                  {chat.adTitle}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {chat && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link to={`/users/${chat.otherUserId}`} style={{ textDecoration: "none" }}>
              <button
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #e6e6e6",
                  background: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                View profile
              </button>
            </Link>
          </div>
        )}
      </div>

      {/* Error banner */}
      {err && (
        <div
          style={{
            background: "#fee",
            padding: 10,
            borderRadius: 12,
            marginBottom: 10,
            border: "1px solid #f3c9c9",
          }}
        >
          {String(err)}
        </div>
      )}

      {/* Messages */}
      <div
        ref={listRef}
        style={{
          border: "1px solid #e6e6e6",
          borderRadius: 16,
          padding: 12,
          height: "66vh",
          overflow: "auto",
          background: "#fafafa",
        }}
        onScroll={() => {
          // optional: тут можна трекати near-bottom, але зараз ми перевіряємо перед send/load
        }}
      >
        {loading && <div style={{ color: "#666" }}>Loading chat...</div>}

        {!loading && chat && chat.messages.length === 0 && (
          <div style={{ color: "#666" }}>No messages yet. Say hi 🙂</div>
        )}

        {!loading &&
          chat?.messages.map((m) => {
            const mine = myId && m.senderId === myId;
            const isTmp = m.id.startsWith("tmp-");

            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: mine ? "flex-end" : "flex-start",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    maxWidth: "72%",
                    padding: "10px 12px",
                    borderRadius: 16,
                    background: mine ? "#1e60ff" : "#e9e9e9",
                    color: mine ? "#fff" : "#111",
                    whiteSpace: "pre-wrap",
                    boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
                    opacity: isTmp ? 0.75 : 1,
                  }}
                >
                  <div style={{ fontSize: 14, lineHeight: 1.35 }}>{m.text}</div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.78, display: "flex", gap: 8, alignItems: "center" }}>
                    <span>{formatTime(m.createdAt)}</span>
                    {isTmp && <span>sending…</span>}
                  </div>
                </div>
              </div>
            );
          })}

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "stretch" }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          rows={2}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 14,
            border: "1px solid #ddd",
            resize: "none",
            outline: "none",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!busy) onSend();
            }
          }}
          disabled={loading}
        />

        <button
          onClick={onSend}
          disabled={busy || loading || !text.trim()}
          style={{
            padding: "10px 16px",
            borderRadius: 14,
            border: "1px solid #1e60ff",
            background: busy || loading || !text.trim() ? "#cfe0ff" : "#1e60ff",
            color: "#fff",
            cursor: busy || loading || !text.trim() ? "not-allowed" : "pointer",
            fontWeight: 800,
            minWidth: 110,
          }}
        >
          {busy ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}