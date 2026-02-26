import { Link, Outlet, useNavigate } from "react-router-dom";
import { clearToken, isAuthed } from "../api/auth";

export function Layout() {
  const nav = useNavigate();
  const authed = isAuthed();

  function logout() {
    clearToken();
    nav("/");
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <Link to="/" style={{ fontWeight: 700, fontSize: 20, textDecoration: "none" }}>OLX Clone</Link>

        <nav style={{ display: "flex", gap: 12 }}>
          <Link to="/">Home</Link>
          {authed && <Link to="/create">Create</Link>}
{authed && <Link to="/my">My Ads</Link>}
{authed && <Link to="/chats">Chats</Link>}
{authed && <Link to="/profile">Profile</Link>}
{authed && <Link to="/orders">Orders</Link>}
{authed && <Link to="/followed">Followed</Link>}
        </nav>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          {!authed ? (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          ) : (
            <button onClick={logout}>Logout</button>
          )}
        </div>
      </header>

      <Outlet />
    </div>
  );
}