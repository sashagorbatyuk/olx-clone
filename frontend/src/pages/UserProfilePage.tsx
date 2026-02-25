import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getUser, type PublicUserDto } from "../api/users";

const API = import.meta.env.VITE_API_BASE_URL;

export function UserProfilePage() {
  const { id } = useParams();
  const [user, setUser] = useState<PublicUserDto | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    (async () => {
      setErr(null);
      try {
        const data = await getUser(id);
        setUser(data);
      } catch (e: any) {
        const status = e?.response?.status;
        if (status === 403) setErr("You can view this profile only if you have a conversation with this user.");
        else setErr(e?.response?.data ?? e?.message ?? "Error");
      }
    })();
  }, [id]);

  if (!user && !err) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 10 }}>
        <Link to="/chats">← Back to chats</Link>
      </div>

      <h1>User Profile</h1>

      {err && (
        <div style={{ background: "#fee", padding: 10, borderRadius: 8, marginBottom: 10 }}>
          {String(err)}
        </div>
      )}

      {user && (
        <>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
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
              {user.avatarUrl ? (
                <img
                  src={`${API}${user.avatarUrl}`}
                  alt="avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : null}
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{user.name}</div>

              <div style={{ color: "#666", marginTop: 6 }}>
                {user.phone ?? "No phone"}
              </div>

              {/* ✅ joined date */}
              <div style={{ color: "#666", marginTop: 6 }}>
                Joined: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
              </div>
            </div>
          </div>

          {/* ✅ about */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>About</div>
            <div style={{ whiteSpace: "pre-wrap", color: "#333" }}>
              {user.about?.trim() ? user.about : "No description"}
            </div>
          </div>
        </>
      )}
    </div>
  );
}