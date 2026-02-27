import { useEffect, useMemo, useRef, useState } from "react";
import { getMe, updateMe, uploadMyAvatar, type MeDto } from "../api/users";

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
}
function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function ProfilePage() {
  const API = useMemo(
    () => import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5015",
    []
  );

  const fileRef = useRef<HTMLInputElement | null>(null);

  const [me, setMe] = useState<MeDto | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState<string>("");
  const [about, setAbout] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // for avatar broken-image fallback
  const [avatarBroken, setAvatarBroken] = useState(false);

  const busy = saving || uploading;

  function avatarUrl() {
    if (!me?.avatarUrl) return null;
    // if backend returns "/avatars/..", concat base
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
      setAvatarBroken(false);
    } catch (e: any) {
      setErr(String(e?.response?.data ?? e?.message ?? "Failed to load profile"));
      setMe(null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initial = {
    name: me?.name ?? "",
    phone: me?.phone ?? "",
    about: me?.about ?? "",
  };

  const dirty =
    name.trim() !== initial.name.trim() ||
    phone.trim() !== initial.phone.trim() ||
    about.trim() !== initial.about.trim();

  async function onSave() {
    if (busy) return;
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
    if (!file || busy) return;

    // Basic client-side guard (optional)
    if (!file.type.startsWith("image/")) {
      setErr("Please select an image file.");
      return;
    }
    // You can tweak this limit if you want
    const maxMb = 8;
    if (file.size > maxMb * 1024 * 1024) {
      setErr(`Image is too large (max ${maxMb} MB).`);
      return;
    }

    setUploading(true);
    setErr(null);
    try {
      await uploadMyAvatar(file);
      await load();
    } catch (e: any) {
      setErr(String(e?.response?.data ?? e?.message ?? "Upload failed"));
    } finally {
      setUploading(false);
      // Reset input so picking the same file again triggers onChange
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!me && !err) return <div className="muted">Loading profile…</div>;

  const initials = (me?.name?.trim()?.[0] ?? me?.email?.trim()?.[0] ?? "U").toUpperCase();

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <div className="pageTitle">
        <div>
          <div className="h1">My profile</div>
          <div className="sub">Private profile settings & your seller rating</div>
        </div>

        <div className="row">
          <button className="btn" onClick={load} disabled={busy}>
            Refresh
          </button>
        </div>
      </div>

      {err && (
        <div className="alert" style={{ marginBottom: 12 }}>
          {err}
          <div style={{ marginTop: 10 }}>
            <button className="btn" onClick={load} disabled={busy}>
              Retry
            </button>
          </div>
        </div>
      )}

      {me && (
        <div className="card panel" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
          {/* Left column */}
          <div style={{ minWidth: 0 }}>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="avatar" style={{ width: 72, height: 72, borderRadius: 18, fontSize: 26 }}>
                  {avatarUrl() && !avatarBroken ? (
                    <img
                      src={avatarUrl()!}
                      alt=""
                      onError={() => setAvatarBroken(true)}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    initials
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div className="h2" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {me.name ?? "User"}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    Joined: {formatDate(me.createdAt)}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="label">Email</div>
                <div style={{ fontWeight: 900, wordBreak: "break-word" }}>{me.email}</div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div className="label">UserId</div>
                <div className="mono muted" style={{ fontSize: 12, wordBreak: "break-all" }}>
                  {me.id}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="label">Avatar</div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  disabled={busy}
                  onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)}
                />
                {uploading && <div className="muted" style={{ marginTop: 6 }}>Uploading…</div>}
              </div>
            </div>

            {/* Rating summary */}
            <div className="card" style={{ padding: 14, marginTop: 12 }}>
              <div style={{ fontWeight: 1000, marginBottom: 8 }}>Seller rating</div>

              <div
                style={{
                  border: `1px solid var(--border)`,
                  borderRadius: 14,
                  background: "rgba(255,255,255,.6)",
                  padding: 12,
                  display: "flex",
                  gap: 14,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 1000 }}>
                  {me.ratingAvg == null ? "—" : me.ratingAvg.toFixed(1)}
                  <span className="muted" style={{ fontSize: 14, fontWeight: 900 }}> / 5</span>
                </div>
                <div className="muted" style={{ fontWeight: 900 }}>
                  {me.ratingCount} review{me.ratingCount === 1 ? "" : "s"}
                </div>
              </div>

              <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>
                Rating is calculated from buyer reviews after completed orders.
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ minWidth: 0 }}>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontWeight: 1000, marginBottom: 10 }}>Profile info</div>

              <div className="row2">
                <div>
                  <div className="label">Name</div>
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={busy}
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <div className="label">Phone</div>
                  <input
                    className="input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={busy}
                    placeholder="+380..."
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="label">About</div>
                <textarea
                  className="textarea"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  disabled={busy}
                  maxLength={1000}
                  rows={6}
                  placeholder="Write a short description about yourself..."
                />
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  {about.length}/1000
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  className="btn btnPrimary"
                  onClick={onSave}
                  disabled={busy || !dirty || name.trim().length < 2}
                  title={!dirty ? "No changes to save" : undefined}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>

                {!dirty ? (
                  <span className="muted" style={{ fontSize: 13 }}>No unsaved changes.</span>
                ) : (
                  <span className="muted" style={{ fontSize: 13 }}>You have unsaved changes.</span>
                )}
              </div>
            </div>

            {/* Recent reviews */}
            <div className="card" style={{ padding: 14, marginTop: 12 }}>
              <div style={{ fontWeight: 1000, marginBottom: 10 }}>Recent reviews</div>

              <div style={{ display: "grid", gap: 10 }}>
                {me.recentReviews?.length ? (
                  me.recentReviews.map((r) => (
                    <div key={r.id} className="card" style={{ padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 1000 }}>
                          {r.raterName} • {"⭐".repeat(Math.max(1, Math.min(5, r.rating)))}
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>{fmtDateTime(r.createdAt)}</div>
                      </div>

                      {r.comment ? (
                        <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{r.comment}</div>
                      ) : (
                        <div className="muted" style={{ marginTop: 8 }}>No comment.</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="muted">No reviews yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!err && (
        <div className="muted" style={{ marginTop: 12, fontSize: 13 }}>
          This is your private profile page. Other users can see your public profile only if they have a chat with you.
        </div>
      )}

      {/* Mobile layout tweak (inline because you asked only for ProfilePage fixes; you can move to CSS later) */}
      <style>
        {`
          @media (max-width: 860px){
            .card.panel[style*="grid-template-columns: 280px 1fr"]{
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
    </div>
  );
}