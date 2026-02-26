import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getMyChats, type ChatListItem } from "../api/chats";
import { http } from "../api/http";

type PublicUserDto = {
  id: string;
  name: string;
  phone: string | null;
  about: string | null;
  avatarUrl: string | null;
  createdAt: string;

  ratingAvg: number | null;
  ratingCount: number;
  recentReviews: {
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    raterName: string;
  }[];
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function stars(n: number) {
  const x = Math.max(1, Math.min(5, n));
  return "⭐".repeat(x);
}

export function UserProfilePage() {
  const { id } = useParams();
  const nav = useNavigate();

  const API = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5015", []);

  const [user, setUser] = useState<PublicUserDto | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function avatarSrc() {
    if (!user?.avatarUrl) return null;
    return `${API}${user.avatarUrl}`;
  }

  async function loadProfileAndChat() {
    if (!id) return;

    setErr(null);
    setLoading(true);
    setChatId(null);

    try {
      // 1) profile
      const { data } = await http.get<PublicUserDto>(`/users/${id}`);
      setUser(data);

      // 2) find existing chat with this user
      setLoadingChat(true);
      try {
        const chats = await getMyChats(true);
        const found = chats.find((c: ChatListItem) => c.otherUserId === id);
        setChatId(found?.id ?? null);
      } finally {
        setLoadingChat(false);
      }
    } catch (e: any) {
      const msg = e?.response?.data ?? e?.message ?? "Failed to load profile";
      setErr(String(msg));
      setUser(null);
      setChatId(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfileAndChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!id) return <div>No user id</div>;

  return (
    <div style={{ maxWidth: 920, margin: "0 auto" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
            ← Back
          </button>

          <div style={{ fontSize: 20, fontWeight: 900 }}>User profile</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {chatId ? (
            <Link to={`/chats/${chatId}`} style={{ textDecoration: "none" }}>
              <button
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #1e60ff",
                  background: "#1e60ff",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                Open chat
              </button>
            </Link>
          ) : (
            <button
              disabled
              title={loadingChat ? "Searching chat..." : "No chat found"}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #e6e6e6",
                background: "#f3f3f3",
                color: "#777",
                cursor: "not-allowed",
                fontWeight: 800,
              }}
            >
              {loadingChat ? "Searching…" : "No chat"}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {err && (
        <div
          style={{
            background: "#fee",
            padding: 12,
            borderRadius: 14,
            border: "1px solid #f3c9c9",
            marginBottom: 12,
          }}
        >
          {err}
          <div style={{ marginTop: 10 }}>
            <button
              onClick={loadProfileAndChat}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid #e6e6e6",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && !err && <div style={{ color: "#666" }}>Loading profile…</div>}

      {/* Content */}
      {!loading && !err && user && (
        <div
          style={{
            border: "1px solid #e6e6e6",
            borderRadius: 18,
            background: "#fff",
            padding: 16,
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            gap: 16,
          }}
        >
          {/* Avatar */}
          <div>
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 999,
                border: "1px solid #eee",
                background: "#f1f1f1",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 44,
                fontWeight: 900,
                color: "#777",
              }}
              title={user.name}
            >
              {avatarSrc() ? (
                <img
                  src={avatarSrc()!}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                (user.name?.[0] ?? "U").toUpperCase()
              )}
            </div>
          </div>

          {/* Info */}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{user.name}</div>
              <div style={{ color: "#777" }}>Joined: {formatDate(user.createdAt)}</div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {/* About */}
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>About</div>
                <div
                  style={{
                    color: user.about ? "#222" : "#777",
                    background: "#fafafa",
                    border: "1px solid #eee",
                    borderRadius: 14,
                    padding: 12,
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.4,
                  }}
                >
                  {user.about?.trim() ? user.about : "No description."}
                </div>
              </div>

              {/* Phone */}
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Phone</div>
                <div
                  style={{
                    background: "#fafafa",
                    border: "1px solid #eee",
                    borderRadius: 14,
                    padding: 12,
                    color: user.phone ? "#222" : "#777",
                  }}
                >
                  {user.phone ? (
                    <a href={`tel:${user.phone}`} style={{ color: "#1e60ff", textDecoration: "none", fontWeight: 800 }}>
                      {user.phone}
                    </a>
                  ) : (
                    "Not provided."
                  )}
                </div>
              </div>

              {/* Rating (simple + clean) */}
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Seller rating</div>
                <div
                  style={{
                    background: "#fafafa",
                    border: "1px solid #eee",
                    borderRadius: 14,
                    padding: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontWeight: 900 }}>
                    {user.ratingAvg == null ? "—" : user.ratingAvg.toFixed(1)}
                    <span style={{ color: "#777", fontWeight: 800 }}> / 5</span>
                  </div>
                  <div style={{ color: "#777", fontWeight: 800 }}>
                    {user.ratingCount} review{user.ratingCount === 1 ? "" : "s"}
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {(user.recentReviews ?? []).length ? (
                    (user.recentReviews ?? []).map((r) => (
                      <div
                        key={r.id}
                        style={{
                          border: "1px solid #e6e6e6",
                          borderRadius: 14,
                          background: "#fff",
                          padding: 12,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ fontWeight: 900 }}>
                            {r.raterName} • {stars(r.rating)}
                          </div>
                          <div style={{ color: "#777", fontSize: 12 }}>{new Date(r.createdAt).toLocaleString()}</div>
                        </div>
                        <div style={{ marginTop: 8, color: "#333", whiteSpace: "pre-wrap" }}>{r.comment}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#777" }}>No reviews yet.</div>
                  )}
                </div>
              </div>

              {/* Id (optional, useful for debug) */}
              <div style={{ color: "#777", fontSize: 12 }}>
                UserId: <span style={{ fontFamily: "monospace" }}>{user.id}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {!loading && !err && (
        <div style={{ marginTop: 12, color: "#777", fontSize: 13 }}>
          Access note: this profile is available only if you have a conversation with this user.
        </div>
      )}
    </div>
  );
}