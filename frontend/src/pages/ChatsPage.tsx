import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyChats, type ChatListItem } from "../api/chats";

export function ChatsPage() {
  const nav = useNavigate();
  const [items, setItems] = useState<ChatListItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const data = await getMyChats();
      setItems(data);
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Failed to load chats");
      setItems([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ maxWidth: 820 }}>
      <h1>Chats</h1>

      {err && (
        <div style={{ background: "#fee", padding: 10, borderRadius: 8, marginBottom: 10 }}>
          {String(err)}
        </div>
      )}

      {items.length === 0 && !err && <div style={{ color: "#666" }}>No chats yet.</div>}

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((c) => (
          <button
            key={c.id}
            onClick={() => nav(`/chats/${c.id}`)}
            style={{
              textAlign: "left",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 700 }}>
              {c.adTitle ?? `Ad: ${c.adId}`}
            </div>
            <div style={{ marginTop: 4, color: "#666" }}>
              With: {c.otherUserName ?? "user"}
            </div>
            {c.lastMessageText && (
              <div style={{ marginTop: 6 }}>
                <span style={{ color: "#333" }}>{c.lastMessageText}</span>
                {c.lastMessageAt && (
                  <span style={{ color: "#777" }}> • {new Date(c.lastMessageAt).toLocaleString()}</span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}