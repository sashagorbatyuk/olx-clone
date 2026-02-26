import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMyFollowedAds, markAdSeen, unsubscribeAd, type FollowedAd } from "../api/subscriptions";
import { isAuthed } from "../api/auth";

function fmtMoney(v: number, cur: string) {
  return `${Math.round(v)} ${cur}`;
}
function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function Badge({ text, tone }: { text: string; tone: "gray" | "blue" | "green" | "red" }) {
  const bg =
    tone === "blue" ? "#e8f0ff" : tone === "green" ? "#e9fbef" : tone === "red" ? "#ffecec" : "#f1f1f1";
  const bd =
    tone === "blue" ? "#cfe0ff" : tone === "green" ? "#c8f0d6" : tone === "red" ? "#f3c9c9" : "#e6e6e6";
  const fg =
    tone === "blue" ? "#1e60ff" : tone === "green" ? "#0a7a2f" : tone === "red" ? "#b00020" : "#444";

  return (
    <span
      style={{
        background: bg,
        border: `1px solid ${bd}`,
        color: fg,
        padding: "4px 10px",
        borderRadius: 999,
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

export function FollowedAdsPage() {
  const nav = useNavigate();
  const API = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5015", []);

  const [items, setItems] = useState<FollowedAd[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [onlyUpdated, setOnlyUpdated] = useState(false);

  async function load() {
    setErr(null);
    setBusy(true);
    try {
      const data = await getMyFollowedAds();
      setItems(data ?? []);
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Failed to load followed ads");
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!isAuthed()) {
      nav("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items
      .filter((x) => (onlyUpdated ? !!x.hasUpdates : true))
      .filter((x) => (qq ? (x.title ?? "").toLowerCase().includes(qq) : true))
      .sort((a, b) => {
        // updated first, then recent updates
        if (a.hasUpdates !== b.hasUpdates) return a.hasUpdates ? -1 : 1;
        return (a.updatedAt ?? "") < (b.updatedAt ?? "") ? 1 : -1;
      });
  }, [items, q, onlyUpdated]);

  async function onUnfollow(adId: string) {
    const ok = confirm("Unfollow this ad?");
    if (!ok) return;

    setBusy(true);
    try {
      await unsubscribeAd(adId);
      setItems((prev) => prev.filter((x) => x.adId !== adId));
    } catch (e: any) {
      alert(String(e?.response?.data ?? e?.message ?? "Unfollow failed"));
    } finally {
      setBusy(false);
    }
  }

  async function onMarkSeen(adId: string) {
    setBusy(true);
    try {
      await markAdSeen(adId);
      // optimistic update
      setItems((prev) =>
        prev.map((x) =>
          x.adId === adId
            ? { ...x, hasUpdates: false, lastSeenAt: new Date().toISOString() }
            : x
        )
      );
    } catch (e: any) {
      alert(String(e?.response?.data ?? e?.message ?? "Mark seen failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Watchlist</h1>
        <button
          onClick={load}
          disabled={busy}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #e6e6e6",
            background: "#fff",
            cursor: busy ? "not-allowed" : "pointer",
            fontWeight: 900,
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {err && (
        <div style={{ marginTop: 12, background: "#fee", padding: 12, borderRadius: 14, border: "1px solid #f3c9c9" }}>
          {String(err)}
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title…"
          style={{ minWidth: 260, padding: "10px 12px", borderRadius: 12, border: "1px solid #e6e6e6" }}
        />

        <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#333", fontWeight: 800 }}>
          <input type="checkbox" checked={onlyUpdated} onChange={(e) => setOnlyUpdated(e.target.checked)} />
          Only updated
        </label>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => nav(-1)}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #e6e6e6",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          Back
        </button>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {filtered.length === 0 && !err && (
          <div style={{ color: "#666" }}>{busy ? "Loading…" : "No followed ads."}</div>
        )}

        {filtered.map((x) => {
          const img = x.mainPhotoUrl ? `${API}${x.mainPhotoUrl}` : null;

          return (
            <div
              key={x.adId}
              style={{
                border: "1px solid #e6e6e6",
                borderRadius: 16,
                background: "#fff",
                padding: 14,
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 120,
                  aspectRatio: "4 / 3",
                  borderRadius: 14,
                  overflow: "hidden",
                  background: "#f3f3f3",
                  border: "1px solid #eee",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#777",
                  fontWeight: 900,
                }}
              >
                {img ? (
                  <img src={img} alt="ad" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  "No photo"
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {x.title}
                  </div>
                  {x.hasUpdates && <Badge text="Updated" tone="blue" />}
                </div>

                <div style={{ marginTop: 8, color: "#444", display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <span><b>Price:</b> {fmtMoney(x.price, x.currency)}</span>
                  <span><b>City:</b> {x.city}</span>
                </div>

                <div style={{ marginTop: 6, color: "#777", fontSize: 12 }}>
                  Updated: {fmtDateTime(x.updatedAt)} • Seen: {fmtDateTime(x.lastSeenAt)}
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link to={`/ads/${x.adId}`} style={{ textDecoration: "none" }}>
                    <button
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid #1e60ff",
                        background: "#1e60ff",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      Open
                    </button>
                  </Link>

                  <button
                    onClick={() => onUnfollow(x.adId)}
                    disabled={busy}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid #f3c9c9",
                      background: "#ffecec",
                      color: "#b00020",
                      cursor: busy ? "not-allowed" : "pointer",
                      fontWeight: 900,
                      opacity: busy ? 0.7 : 1,
                    }}
                  >
                    Unfollow
                  </button>

                  {x.hasUpdates && (
                    <button
                      onClick={() => onMarkSeen(x.adId)}
                      disabled={busy}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid #e6e6e6",
                        background: "#fff",
                        cursor: busy ? "not-allowed" : "pointer",
                        fontWeight: 900,
                        opacity: busy ? 0.7 : 1,
                      }}
                      title="Mark as seen"
                    >
                      Mark seen
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}