import { useEffect, useState } from "react";
import { getMe, updateMe, uploadMyAvatar, type MeDto } from "../api/users";

const API = import.meta.env.VITE_API_BASE_URL;

export function ProfilePage() {
  const [me, setMe] = useState<MeDto | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState<string>("");
  const [about, setAbout] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setErr(null);
    try {
      const data = await getMe();
      setMe(data);
      setName(data.name ?? "");
      setPhone(data.phone ?? "");
      setAbout(data.about ?? ""); // ✅ важливо
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Error");
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
      setErr(e?.response?.data ?? e?.message ?? "Save failed");
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
      setErr(e?.response?.data ?? e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (!me && !err) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: 720 }}>
      <h1>My Profile</h1>

      {err && (
        <div style={{ background: "#fee", padding: 10, borderRadius: 8, marginBottom: 10 }}>
          {String(err)}
        </div>
      )}

      {me && (
        <>
          {/* Header: avatar + email */}
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 999,
                overflow: "hidden",
                background: "#eee",
                border: "1px solid #ddd",
              }}
            >
              {me.avatarUrl ? (
                <img
                  src={`${API}${me.avatarUrl}`}
                  alt="avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : null}
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ color: "#666" }}>{me.email}</div>
              <label style={{ display: "inline-block" }}>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)}
                />
              </label>
              {uploading && <div style={{ color: "#666" }}>Uploading...</div>}
              <div style={{ fontSize: 12, color: "#666" }}>
                Joined: {me.createdAt ? new Date(me.createdAt).toLocaleDateString() : "—"}
              </div>
            </div>
          </div>

          {/* Form */}
          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+380..."
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>About me</span>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                maxLength={1000}
                rows={6}
                placeholder="Write a short description about yourself..."
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  resize: "vertical",
                }}
              />
              <div style={{ fontSize: 12, color: "#666" }}>{about.length}/1000</div>
            </label>

            <button
              onClick={onSave}
              disabled={saving || uploading || name.trim().length < 2}
              style={{ padding: "10px 12px", borderRadius: 10 }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}