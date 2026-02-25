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
    // already loaded
    if (window.google?.accounts?.id) return resolve();

    // already inserted
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

export function LoginPage() {
  const nav = useNavigate();

  // classic login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // google
  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  async function onLogin() {
    setErr(null);
    setBusy(true);
    try {
      const res = await http.post("/auth/login", { email, password });
      setToken(res.data.token);
      nav("/");
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Login failed");
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

        // clear to avoid duplicates in React StrictMode
        googleBtnRef.current.innerHTML = "";

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (resp: any) => {
            setErr(null);
            setBusy(true);
            try {
              // resp.credential = Google ID token
              const r = await http.post("/auth/google", { idToken: resp.credential });
              setToken(r.data.token);
              nav("/");
            } catch (e: any) {
              setErr(e?.response?.data ?? e?.message ?? "Google login failed");
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

        // optional: one-tap (можеш прибрати)
        // window.google.accounts.id.prompt();
      } catch (e: any) {
        console.error(e);
        setErr("Google Sign-In script failed to load.");
      }
    }

    initGoogle();
    return () => {
      cancelled = true;
    };
  }, [googleClientId, nav]);

  return (
    <div style={{ maxWidth: 420 }}>
      <h1>Login</h1>

      {err && (
        <div style={{ background: "#fee", padding: 10, borderRadius: 8, marginBottom: 10 }}>
          {String(err)}
        </div>
      )}

      {/* Google Sign-In */}
      {googleClientId ? (
        <div style={{ marginBottom: 12 }}>
          <div ref={googleBtnRef} />
          <div style={{ marginTop: 10, color: "#666", fontSize: 12 }}>
            Or login with email and password:
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 12, color: "#666", fontSize: 12 }}>
          Google login is not configured (missing VITE_GOOGLE_CLIENT_ID).
        </div>
      )}

      {/* Email/password login */}
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
        placeholder="Password"
        type="password"
        style={{ width: "100%", padding: 8, marginBottom: 8 }}
        disabled={busy}
      />

      <button onClick={onLogin} disabled={busy || email.trim().length < 3 || password.length < 3}>
        {busy ? "Please wait..." : "Login"}
      </button>

      <div style={{ marginTop: 10 }}>
        No account? <Link to="/register">Register</Link>
      </div>

      <div style={{ marginTop: 10 }}>
        <Link to="/forgot-password">Forgot password?</Link>
      </div>
    </div>
  );
}