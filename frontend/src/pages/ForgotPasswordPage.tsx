import { useState } from "react";
import { Link } from "react-router-dom";
import { http } from "../api/http";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSend() {
    setErr(null);
    setDone(false);

    if (!email.trim()) {
      setErr("Email is required");
      return;
    }

    setBusy(true);
    try {
      await http.post("/auth/forgot-password", { email: email.trim() });
      // ✅ завжди показуємо однаковий результат (не палимо, чи існує email)
      setDone(true);
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Failed to send reset link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h1>Forgot password</h1>

      {err && (
        <div style={{ background: "#fee", padding: 10, borderRadius: 8, marginBottom: 10 }}>
          {String(err)}
        </div>
      )}

      {done ? (
        <div style={{ background: "#efe", padding: 10, borderRadius: 8, marginBottom: 10 }}>
          If this email exists, we sent a reset link. Check your inbox (and spam).
        </div>
      ) : (
        <div style={{ color: "#666", marginBottom: 10 }}>
          Enter your email and we will send you a password reset link.
        </div>
      )}

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        style={{ width: "100%", padding: 8, marginBottom: 8 }}
      />

      <button onClick={onSend} disabled={busy}>
        {busy ? "Sending..." : "Send reset link"}
      </button>

      <div style={{ marginTop: 12 }}>
        <Link to="/login">Back to login</Link>
      </div>
    </div>
  );
}