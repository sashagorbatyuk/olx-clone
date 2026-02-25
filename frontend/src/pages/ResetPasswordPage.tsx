import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { http } from "../api/http";

export function ResetPasswordPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const email = useMemo(() => sp.get("email") ?? "", [sp]);
  const token = useMemo(() => sp.get("token") ?? "", [sp]);

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit =
    email.trim().length > 3 &&
    token.trim().length > 10 &&
    pw1.length >= 6 &&
    pw1 === pw2;

  async function onReset() {
    setErr(null);
    if (!canSubmit) {
      setErr("Check email/token and passwords (min 6 chars, must match).");
      return;
    }

    setBusy(true);
    try {
      await http.post("/auth/reset-password", {
        email: email.trim(),
        token: token.trim(),
        newPassword: pw1,
      });
      setDone(true);
      // невелика пауза і на логін
      setTimeout(() => nav("/login"), 700);
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h1>Reset password</h1>

      {err && (
        <div style={{ background: "#fee", padding: 10, borderRadius: 8, marginBottom: 10 }}>
          {String(err)}
        </div>
      )}

      {done && (
        <div style={{ background: "#efe", padding: 10, borderRadius: 8, marginBottom: 10 }}>
          Password updated. Redirecting to login...
        </div>
      )}

      {/* Показуємо email/token (readonly) щоб юзер розумів що з лінка підтягнулось */}
      <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "#666" }}>Email</span>
          <input value={email} readOnly style={{ width: "100%", padding: 8 }} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "#666" }}>Token</span>
          <input value={token} readOnly style={{ width: "100%", padding: 8 }} />
        </label>
      </div>

      <input
        value={pw1}
        onChange={(e) => setPw1(e.target.value)}
        placeholder="New password (min 6)"
        type="password"
        style={{ width: "100%", padding: 8, marginBottom: 8 }}
      />
      <input
        value={pw2}
        onChange={(e) => setPw2(e.target.value)}
        placeholder="Repeat new password"
        type="password"
        style={{ width: "100%", padding: 8, marginBottom: 8 }}
      />

      <button onClick={onReset} disabled={busy || !canSubmit}>
        {busy ? "Saving..." : "Set new password"}
      </button>

      <div style={{ marginTop: 12 }}>
        <Link to="/login">Back to login</Link>
      </div>
    </div>
  );
}