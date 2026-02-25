import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { http } from "../api/http";
import { setToken } from "../api/auth";

declare global {
  interface Window {
    google?: any;
  }
}

function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();

    const existing = document.querySelector('script[data-gsi="1"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("GSI load failed")), { once: true });
      return;
    }

    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.dataset.gsi = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("GSI load failed"));
    document.body.appendChild(s);
  });
}

export function RegisterPage() {
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // google
  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const canRegister =
    name.trim().length >= 2 &&
    email.trim().length >= 5 &&
    email.includes("@") &&
    password.length >= 6;

  async function onRegister() {
    setErr(null);
    if (!canRegister) {
      setErr("Please enter a valid name, email and password (min 6 chars).");
      return;
    }

    setBusy(true);
    try {
      const res = await http.post("/auth/register", {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setToken(res.data.token);
      nav("/");
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Register failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initGoogle() {
      if (!googleClientId) return;
      if (!googleBtnRef.current) return;

      try {
        await loadGsiScript();
        if (cancelled) return;
        if (!window.google?.accounts?.id) return;

        googleBtnRef.current.innerHTML = "";

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (resp: any) => {
            setErr(null);
            setBusy(true);
            try {
              // For Google: we just call /auth/google and get our JWT
              const r = await http.post("/auth/google", { idToken: resp.credential });
              setToken(r.data.token);
              nav("/");
            } catch (e: any) {
              setErr(e?.response?.data ?? e?.message ?? "Google sign-up failed");
            } finally {
              setBusy(false);
            }
          },
        });

        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          width: 280,
        });
      } catch (e) {
        console.error(e);
        // не обов'язково показувати як err, але можна:
        // setErr("Google Sign-In script failed to load.");
      }
    }

    initGoogle();
    return () => {
      cancelled = true;
    };
  }, [googleClientId, nav]);

  return (
    <div style={{ maxWidth: 420 }}>
      <h1>Register</h1>

      {err && (
        <div style={{ background: "#fee", padding: 10, borderRadius: 8, marginBottom: 10 }}>
          {String(err)}
        </div>
      )}

      {/* Google Sign-In (optional) */}
      {googleClientId && (
        <div style={{ marginBottom: 12 }}>
          <div ref={googleBtnRef} />
          <div style={{ marginTop: 10, color: "#666", fontSize: 12 }}>
            Or create an account with email and password:
          </div>
        </div>
      )}

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        style={{ width: "100%", padding: 8, marginBottom: 8 }}
        disabled={busy}
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        style={{ width: "100%", padding: 8, marginBottom: 8 }}
        disabled={busy}
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password (min 6)"
        type="password"
        style={{ width: "100%", padding: 8, marginBottom: 8 }}
        disabled={busy}
      />

      <button onClick={onRegister} disabled={busy || !canRegister}>
        {busy ? "Please wait..." : "Register"}
      </button>

      <div style={{ marginTop: 10 }}>
        Have account? <Link to="/login">Login</Link>
      </div>
    </div>
  );
}