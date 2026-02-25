import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AdsListItem } from "../features/ads/types";
import { deleteAd } from "../features/ads/api";
import { getMyAds } from "../api/users";


export function MyAdsPage() {
  const nav = useNavigate();
  const [items, setItems] = useState<AdsListItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const data = await getMyAds<AdsListItem>(1, 50);
      setItems(data.items);
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Error");
      setItems([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onDelete(id: string) {
  if (!confirm("Archive this ad?")) return;

  setBusyId(id);
  setErr(null);
  try {
    await deleteAd(id);
    await load();
  } catch (e: any) {
    setErr(e?.response?.data ?? e?.message ?? "Delete failed");
  } finally {
    setBusyId(null);
  }
}

  return (
    <div>
      <h1>My Ads</h1>

      {err && (
        <div style={{ background: "#fee", padding: 10, borderRadius: 8, marginBottom: 10 }}>
          {String(err)}
        </div>
      )}

      {items.length === 0 && !err && <div style={{ color: "#666" }}>No ads yet.</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((ad) => (
          <div
            key={ad.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 12,
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{ fontSize: 18, fontWeight: 600, cursor: "pointer" }}
                onClick={() => nav(`/ads/${ad.id}`)}
              >
                {ad.title}
              </div>

              <div style={{ marginTop: 6 }}>
                <b>{ad.price}</b> {ad.currency} • {ad.city}
              </div>

              <div style={{ marginTop: 6, color: "#666" }}>
                {new Date(ad.createdAt).toLocaleString()}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => nav(`/edit/${ad.id}`)} style={{ padding: "8px 12px" }}>
                Edit
              </button>

              <button
                onClick={() => onDelete(ad.id)}
                disabled={busyId === ad.id}
                style={{ padding: "8px 12px" }}
              >
                {busyId === ad.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}