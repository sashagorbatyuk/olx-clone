import { useEffect, useMemo, useState } from "react";
import { getMe, updateMe, uploadMyAvatar, type MeDto } from "../api/users";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}
function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function ProfilePage() {
  const API = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5015", []);

  const [me, setMe] = useState<MeDto | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState<string>("");
  const [about, setAbout] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function avatarSrc() {
    if (!me?.avatarUrl) return null;
    return `${API}${me.avatarUrl}`;
  }

  async function load() {
    setErr(null);
    try {
      const data = await getMe();
      setMe(data);
      setName(data.name ?? "");
      setPhone(data.phone ?? "");
      setAbout(data.about ?? "");
    } catch (e: any) {
      setErr(String(e?.response?.data ?? e?.message ?? "Failed to load profile"));
      setMe(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSave() {
    setSaving(true);
    setErr(null);
    try {
      await updateMe({
        name: name.trim(),
        phone: phone.trim() ? phone.trim() : null,
        about: about.trim() ? about.trim() : null,
      });
      await load();
    } catch (e: any) {
      setErr(String(e?.response?.data ?? e?.message ?? "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  async function onPickAvatar(file: File | null) {
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      await uploadMyAvatar(file);
      await load();
    } catch (e: any) {
      setErr(String(e?.response?.data ?? e?.message ?? "Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  if (!me && !err) return <div style={{ color: "#666" }}>Loading profile…</div>;

  return (
    <div style={{ maxWidth: 920, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 900 }}>My profile</div>

        <button
          onClick={load}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #e6e6e6",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          Refresh
        </button>
      </div>

      {err && (
        <div style={{ background: "#fee", padding: 12, borderRadius: 14, border: "1px solid #f3c9c9", marginBottom: 12 }}>
          {err}
          <div style={{ marginTop: 10 }}>
            <button
              onClick={load}
              style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #e6e6e6", background: "#fff", cursor: "pointer", fontWeight: 800 }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {me && (
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
              title={me.name}
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
                (me.name?.[0] ?? "U").toUpperCase()
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={{ display: "inline-block" }}>
                <input type="file" accept="image/*" disabled={uploading} onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)} />
              </label>
              {uploading && <div style={{ color: "#666", marginTop: 6 }}>Uploading…</div>}
            </div>

            <div style={{ marginTop: 10, color: "#777", fontSize: 12 }}>
              Joined: {me.createdAt ? formatDate(me.createdAt) : "—"}
            </div>

            <div style={{ marginTop: 6, color: "#777", fontSize: 12 }}>
              Email: <span style={{ fontWeight: 800 }}>{me.email}</span>
            </div>
          </div>

          {/* Info */}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{me.name}</div>
              <div style={{ color: "#777" }}>UserId: <span style={{ fontFamily: "monospace" }}>{me.id}</span></div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {/* Name */}
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Name</div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 14, border: "1px solid #eee", background: "#fafafa" }}
                />
              </div>

              {/* Phone */}
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Phone</div>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+380..."
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 14, border: "1px solid #eee", background: "#fafafa" }}
                />
              </div>

              {/* About */}
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>About</div>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  maxLength={1000}
                  rows={6}
                  placeholder="Write a short description about yourself..."
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 14, border: "1px solid #eee", background: "#fafafa", resize: "vertical" }}
                />
                <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>{about.length}/1000</div>
              </div>

              {/* Save */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  onClick={onSave}
                  disabled={saving || uploading || name.trim().length < 2}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #1e60ff",
                    background: "#1e60ff",
                    color: "#fff",
                    cursor: saving || uploading ? "not-allowed" : "pointer",
                    fontWeight: 900,
                    opacity: saving || uploading ? 0.7 : 1,
                  }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>

                <div style={{ color: "#777", fontSize: 13 }}>
                  Edit your profile info. Rating is calculated from buyer reviews.
                </div>
              </div>

              {/* Rating */}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Seller rating</div>

                <div
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 14,
                    background: "#fafafa",
                    padding: 12,
                    display: "flex",
                    gap: 14,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 950 }}>
                    {me.ratingAvg == null ? "—" : me.ratingAvg.toFixed(1)}
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#777" }}> / 5</span>
                  </div>
                  <div style={{ color: "#777", fontWeight: 800 }}>
                    {me.ratingCount} review{me.ratingCount === 1 ? "" : "s"}
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {me.recentReviews?.length ? (
                    me.recentReviews.map((r) => (
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
                            {r.raterName} • {"⭐".repeat(Math.max(1, Math.min(5, r.rating)))}
                          </div>
                          <div style={{ color: "#777", fontSize: 12 }}>{fmtDateTime(r.createdAt)}</div>
                        </div>
                        <div style={{ marginTop: 8, color: "#333", whiteSpace: "pre-wrap" }}>{r.comment}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#777" }}>No reviews yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!err && (
        <div style={{ marginTop: 12, color: "#777", fontSize: 13 }}>
          This is your private profile page. Other users can see your public profile only if they have a chat with you.
        </div>
      )}
    </div>
  );
}