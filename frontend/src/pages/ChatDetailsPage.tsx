import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getChat, sendMessage, type ChatDetails, type ChatMessage } from "../api/chats";
import { getToken } from "../api/auth";

export function ChatDetailsPage() {
  const { id } = useParams(); // chatId
  const [chat, setChat] = useState<ChatDetails | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const myId = useMemo(() => {
    // якщо в тебе є helper для current user id — використай його.
    // Тут простий варіант: розпарсити JWT (без валідації, лише UI)
    const t = getToken();
    if (!t) return null;
    try {
      const payload = JSON.parse(atob(t.split(".")[1]));
      return payload.sub as string;
    } catch {
      return null;
    }
  }, []);

  async function load() {
    if (!id) return;
    setErr(null);
    try {
      const data = await getChat(id);
      // messages можуть прийти null -> нормалізуємо
      data.messages = Array.isArray(data.messages) ? data.messages : [];
      setChat(data);
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Load chat failed");
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
      setChat((prev) => (prev ? { ...prev, messages: [...prev.messages, msg as ChatMessage] } : prev));
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Send failed");
    } finally {
      setBusy(false);
    }
  }

  if (!id) return <div>No chat id</div>;

  return (
    <div style={{ maxWidth: 820 }}>
      <h1>Chat</h1>

      {err && <div style={{ background: "#fee", padding: 10, borderRadius: 8, marginBottom: 10 }}>{String(err)}</div>}
      {!chat && !err && <div>Loading...</div>}

      {chat && (
        <>
          <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, height: 420, overflow: "auto" }}>
            {chat.messages.length === 0 && <div style={{ color: "#666" }}>No messages yet.</div>}

            <div style={{ display: "grid", gap: 10 }}>
              {chat.messages.map((m) => {
                const mine = myId && m.senderId === myId;
                return (
                  <div
                    key={m.id}
                    style={{
                      justifySelf: mine ? "end" : "start",
                      maxWidth: "75%",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid #e5e5e5",
                      background: mine ? "#f3f3f3" : "#fff",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <div>{m.text}</div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
                      {new Date(m.createdAt).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message..."
              style={{ padding: 10, flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSend();
              }}
            />
            <button disabled={busy} onClick={onSend} style={{ padding: "10px 14px" }}>
              {busy ? "Sending..." : "Send"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}