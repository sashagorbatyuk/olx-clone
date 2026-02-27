import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { clearToken, isAuthed } from "../api/auth";

function IconChat() {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none">
      <path d="M8 21l1.6-3H16a5 5 0 0 0 0-10H7a5 5 0 0 0 0 10h.5L8 21Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  );
}
function IconHeart() {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none">
      <path d="M12 21s-7-4.4-9.3-8.6C.7 8.7 3.2 6 6.2 6c1.7 0 3.1.8 3.8 2 0 0 1.4-2 3.8-2 3 0 5.5 2.7 3.5 6.4C19 16.6 12 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  );
}
function IconBell() {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none">
      <path d="M18 16H6l1-2v-4a5 5 0 1 1 10 0v4l1 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconUser() {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none">
      <path d="M20 21a8 8 0 1 0-16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

export function Layout() {
  const nav = useNavigate();
  const authed = isAuthed();

  const [lang, setLang] = useState<"uk" | "ru">("uk");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function logout() {
    clearToken();
    setMenuOpen(false);
    nav("/");
  }

  return (
    <>
      <header className="topbar">
        <div className="topbarInner">
          <NavLink to="/" className="topbarLogo" aria-label="Home">
            <span className="topbarLogoMark">olx</span>
          </NavLink>

          <div className="topbarRight">
            <div className="topbarGroup">
              <NavLink className="topbarItem" to="/chats">
                <IconChat />
                <span className="label">Чат</span>
              </NavLink>

              <div className="topbarLang" aria-label="Language">
                <button className={lang === "uk" ? "active" : ""} onClick={() => setLang("uk")}>Укр</button>
                <span className="mut">|</span>
                <button className={lang === "ru" ? "active" : ""} onClick={() => setLang("ru")}>Рус</button>
              </div>

              <NavLink className="topbarItem" to="/followed" title="Favorites">
                <IconHeart />
              </NavLink>

              <button className="topbarItem" type="button" title="Notifications">
                <IconBell />
              </button>

              <div className="topbarProfile" ref={menuRef}>
                <button
                  type="button"
                  className="topbarProfileBtn"
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <IconUser />
                  <span className="label">Ваш профіль</span>
                  <span className="topbarCaret">▼</span>
                </button>

                {menuOpen && (
                  <div className="topbarMenu">
                    {!authed ? (
                      <>
                        <NavLink to="/login" onClick={() => setMenuOpen(false)}>Login</NavLink>
                        <NavLink to="/register" onClick={() => setMenuOpen(false)}>Register</NavLink>
                      </>
                    ) : (
                      <>
                        <NavLink to="/profile" onClick={() => setMenuOpen(false)}>My profile</NavLink>
                        <NavLink to="/my-ads" onClick={() => setMenuOpen(false)}>My ads</NavLink>
                        <NavLink to="/orders" onClick={() => setMenuOpen(false)}>Orders</NavLink>
                        <button className="danger" onClick={logout}>Logout</button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <NavLink className="topbarAdd" to={authed ? "/ads/create" : "/login"}>
                Додати оголошення
              </NavLink>
            </div>
          </div>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </>
  );
}