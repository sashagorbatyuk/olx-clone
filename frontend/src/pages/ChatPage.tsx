import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getChat, sendMessage } from "../api/chats";
import { getMyUserIdFromToken } from "../api/auth";

type Msg = { id: string; senderId: string; text: string; createdAt: string };

type ChatDto = {
  id: string;
  adId: string;
  adTitle: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatarUrl?: string | null;
  messages: Msg[];
};

export function ChatPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const API = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5015", []);
  const myId = getMyUserIdFromToken();

  const [chat, setChat] = useState<ChatDto | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    if (!id) return;
    setErr(null);
    try {
      const data = await getChat(id);
      setChat(data);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Failed to load chat");
      setChat(null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSend() {
    if (!id) return;
    const t = text.trim();
    if (!t) return;

    setBusy(true);
    setErr(null);
    try {
      const msg = await sendMessage(id, t);
      setText("");
      setChat((prev) => (prev ? { ...prev, messages: [...prev.messages, msg] } : prev));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Send failed");
    } finally {
      setBusy(false);
    }
  }

  if (!id) return <div>No chat id</div>;

  if (err) {
    return (
      <div style={{ maxWidth: 900 }}>
        <div style={{ background: "#fee", padding: 10, borderRadius: 10 }}>{String(err)}</div>
        <button onClick={() => nav(-1)} style={{ marginTop: 10 }}>
          Back
        </button>
      </div>
    );
  }

  if (!chat) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{chat.otherUserName}</div>
          <div style={{ color: "#666" }}>
            Ad: <Link to={`/ads/${chat.adId}`}>{chat.adTitle}</Link>
          </div>
        </div>

        <Link to={`/users/${chat.otherUserId}`} style={{ textDecoration: "none" }}>
          <button style={{ padding: "8px 12px" }}>View profile</button>
        </Link>
      </div>

      <div
        style={{
          marginTop: 12,
          border: "1px solid #e6e6e6",
          borderRadius: 14,
          padding: 12,
          height: "66vh",
          overflow: "auto",
          background: "#fafafa",
        }}
      >
        {chat.messages.map((m) => {
          const mine = myId && m.senderId === myId;
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
                  maxWidth: "70%",
                  padding: "10px 12px",
                  borderRadius: 14,
                  background: mine ? "#1e60ff" : "#e9e9e9",
                  color: mine ? "#fff" : "#111",
                  whiteSpace: "pre-wrap",
                }}
              >
                <div style={{ fontSize: 14, lineHeight: 1.3 }}>{m.text}</div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                  {new Date(m.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type message..."
          rows={2}
          style={{ flex: 1, padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
        />
        <button onClick={onSend} disabled={busy} style={{ padding: "10px 16px" }}>
          {busy ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}