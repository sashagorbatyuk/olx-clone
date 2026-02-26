import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyChats, type ChatListItem } from "../api/chats";
import { getMyUserIdFromToken } from "../api/auth";

export function ChatsPage() {
  const nav = useNavigate();
  const myId = getMyUserIdFromToken();
  const API = useMemo(
    () => import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5015",
    []
  );

  const [items, setItems] = useState<ChatListItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [includeEmpty, setIncludeEmpty] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setErr(null);
    setBusy(true);
    try {
      const data = await getMyChats(includeEmpty);
      // safety: якщо раптом бек віддасть "не мої", ми відсічемо
      const safe = myId ? data.filter((c) => c.otherUserId !== myId) : data;
      setItems(safe);
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Failed to load chats");
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeEmpty]);

  function avatarSrc(c: ChatListItem) {
    if (!c.otherUserAvatarUrl) return null;
    return `${API}${c.otherUserAvatarUrl}`;
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Chats</h1>

        <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#444" }}>
          <input
            type="checkbox"
            checked={includeEmpty}
            onChange={(e) => setIncludeEmpty(e.target.checked)}
          />
          show empty
        </label>
      </div>

      {err && (
        <div style={{ background: "#fee", padding: 10, borderRadius: 8, marginTop: 12 }}>
          {String(err)}
        </div>
      )}

      {!err && items.length === 0 && (
        <div style={{ color: "#666", marginTop: 12 }}>
          {busy ? "Loading..." : "No chats yet."}
        </div>
      )}

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {items.map((c) => (
          <button
            key={c.id}
            onClick={() => nav(`/chats/${c.id}`)}
            style={{
              textAlign: "left",
              padding: 12,
              borderRadius: 14,
              border: "1px solid #e6e6e6",
              background: "#fff",
              cursor: "pointer",
              display: "grid",
              gridTemplateColumns: "44px 1fr auto",
              gap: 12,
              alignItems: "center",
            }}
          >
            {/* avatar */}
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
              }}
            >
              {avatarSrc(c) ? (
                <img
                  src={avatarSrc(c)!}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                (c.otherUserName?.[0] ?? "U").toUpperCase()
              )}
            </div>

            {/* main */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.otherUserName ?? "User"}
                </div>
                <div style={{ color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  • {c.adTitle ?? `Ad: ${c.adId}`}
                </div>
              </div>

              <div style={{ marginTop: 4, color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.lastMessageText ? c.lastMessageText : <span style={{ color: "#888" }}>No messages yet</span>}
              </div>
            </div>

            {/* time */}
            <div style={{ color: "#777", fontSize: 12, whiteSpace: "nowrap" }}>
              {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : ""}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}