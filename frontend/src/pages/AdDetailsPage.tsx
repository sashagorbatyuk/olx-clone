import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getAdById } from "../features/ads/api";
import { createOrGetChatByAd } from "../api/chats";
import { isAuthed, getMyUserIdFromToken } from "../api/auth";
import { createOrderByAd } from "../api/orders";
import {
  getSubscriptionStatus,
  subscribeAd,
  unsubscribeAd,
} from "../api/subscriptions";

type Photo = { id: string; url: string; sortOrder: number };

type AdDetails = {
  userId: string;
  id: string;
  categoryId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  city: string;
  condition: number;
  createdAt: string;
  photos: Photo[];
};

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function AdDetailsPage() {
  const { id } = useParams();
  const nav = useNavigate();

  const API = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5015", []);

  const [ad, setAd] = useState<AdDetails | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // main photo url (relative like "/uploads/..")
  const [activeUrl, setActiveUrl] = useState<string | null>(null);

  // subscription
  const authed = isAuthed();
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [subBusy, setSubBusy] = useState(false);

  // lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // zoom & pan
  const [zoom, setZoom] = useState(1); // 1..4
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const wheelRef = useRef<HTMLDivElement | null>(null);

  const myId = getMyUserIdFromToken();
  const isMine = !!myId && !!ad && ad.userId === myId;

  const sortedPhotos = (ad?.photos ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);

  // -------------------- load ad + subscription --------------------
  useEffect(() => {
    if (!id) {
      setErr("No ad id in route. Check router: it must be /ads/:id");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);
    setAd(null);
    setActiveUrl(null);
    setLightboxOpen(false);
    setLightboxIndex(0);
    setSubscribed(false);

    (async () => {
      try {
        const data: any = await getAdById(id);

        const photos: Photo[] = Array.isArray(data?.photos)
          ? data.photos.map((p: any) =>
              typeof p === "string"
                ? { id: p, url: p, sortOrder: 0 }
                : { id: String(p.id), url: String(p.url), sortOrder: Number(p.sortOrder ?? 0) }
            )
          : [];

        const normalized: AdDetails = {
          userId: data.userId,
          id: data.id,
          categoryId: data.categoryId,
          title: data.title ?? "",
          description: data.description ?? "",
          price: Number(data.price ?? 0),
          currency: data.currency ?? "UAH",
          city: data.city ?? "",
          condition: Number(data.condition ?? 0),
          createdAt: data.createdAt,
          photos,
        };

        const sorted = photos.slice().sort((a, b) => a.sortOrder - b.sortOrder);
        const first = sorted[0]?.url ?? null;

        setAd(normalized);
        setActiveUrl(first);
        setLightboxIndex(0);

        // subscription status (only when authed and not my ad)
        if (authed && normalized.userId && myId && normalized.userId !== myId) {
          try {
            const st = await getSubscriptionStatus(normalized.id);
            setSubscribed(!!st?.subscribed);
          } catch {
            // ignore; keep false
          }
        }
      } catch (e: any) {
        setErr(e?.response?.data ?? e?.message ?? "Failed to load ad");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // sync lightbox index with activeUrl
  useEffect(() => {
    if (!activeUrl) return;
    const idx = sortedPhotos.findIndex((p) => p.url === activeUrl);
    if (idx >= 0) setLightboxIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUrl]);

  // lock body scroll while lightbox open
  useEffect(() => {
    if (!lightboxOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lightboxOpen]);

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setDragging(false);
  }

  function openLightboxAt(index: number) {
    const url = sortedPhotos[index]?.url ?? null;
    setLightboxIndex(index);
    setActiveUrl(url);
    resetView();
    setLightboxOpen(true);
  }

  function prevPhoto() {
    if (sortedPhotos.length === 0) return;
    const next = (lightboxIndex - 1 + sortedPhotos.length) % sortedPhotos.length;
    openLightboxAt(next);
  }

  function nextPhoto() {
    if (sortedPhotos.length === 0) return;
    const next = (lightboxIndex + 1) % sortedPhotos.length;
    openLightboxAt(next);
  }

  // keyboard for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") prevPhoto();
      if (e.key === "ArrowRight") nextPhoto();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, lightboxIndex, sortedPhotos.length]);

  // wheel zoom (non-passive)
  useEffect(() => {
    if (!lightboxOpen) return;

    const el = wheelRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      setZoom((z) => {
        const nz = Math.min(4, Math.max(1, Number((z + delta).toFixed(2))));
        if (nz === 1) setPan({ x: 0, y: 0 });
        return nz;
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel as any);
  }, [lightboxOpen]);

  async function onToggleSubscribe() {
    if (!ad) return;
    if (!authed) {
      nav("/login");
      return;
    }
    if (isMine) return;

    setSubBusy(true);
    try {
      if (subscribed) {
        await unsubscribeAd(ad.id);
        setSubscribed(false);
      } else {
        await subscribeAd(ad.id);
        setSubscribed(true);
      }
    } catch (e: any) {
      alert(String(e?.response?.data ?? e?.message ?? "Subscription failed"));
    } finally {
      setSubBusy(false);
    }
  }

  // -------------------- render --------------------
  if (loading) return <div>Loading...</div>;

  if (err)
    return (
      <div style={{ maxWidth: 920 }}>
        <div style={{ background: "#fee", padding: 12, borderRadius: 12, border: "1px solid #f3c9c9", marginBottom: 10 }}>
          {String(err)}
        </div>
        <button onClick={() => nav(-1)} style={{ padding: "10px 12px", borderRadius: 12 }}>
          Back
        </button>
      </div>
    );

  if (!ad)
    return (
      <div style={{ maxWidth: 920 }}>
        <div style={{ color: "#666" }}>Ad not found.</div>
        <button onClick={() => nav(-1)} style={{ marginTop: 10, padding: "10px 12px", borderRadius: 12 }}>
          Back
        </button>
      </div>
    );

  const mainPhoto = activeUrl ? `${API}${activeUrl}` : null;

  // thumbs: max 8 + "+N"
  const thumbsMax = 8;
  const thumbs = sortedPhotos.slice(0, thumbsMax);
  const rest = Math.max(0, sortedPhotos.length - thumbs.length);

  return (
    <div style={{ maxWidth: 920, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, lineHeight: 1.15 }}>{ad.title}</h1>
          <div style={{ marginTop: 8, fontSize: 20 }}>
            <b>{ad.price}</b> {ad.currency} • {ad.city}
          </div>
          <div style={{ marginTop: 6, color: "#666" }}>{fmtDateTime(ad.createdAt)}</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {authed && isMine && (
            <Link to={`/ads/${ad.id}/edit`} style={{ textDecoration: "none" }}>
              <button
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #e6e6e6",
                  background: "#fff",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                Edit
              </button>
            </Link>
          )}

          <button
            onClick={() => nav(-1)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #e6e6e6",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            Back
          </button>
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {/* Buyer actions */}
        {authed && !isMine && (
          <>
            <button
              onClick={async () => {
                try {
                  const r = await createOrderByAd(ad.id);
                  nav(`/orders/${r.id}`);
                } catch (e: any) {
                  alert(String(e?.response?.data ?? e?.message ?? "Buy failed"));
                }
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #1e60ff",
                background: "#1e60ff",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Buy
            </button>

            <button
              onClick={async () => {
                try {
                  const r = await createOrGetChatByAd(ad.id);
                  nav(`/chats/${r.id}`);
                } catch (e: any) {
                  alert(String(e?.response?.data ?? e?.message ?? "Chat failed"));
                }
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #e6e6e6",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Write
            </button>

            <button
              onClick={onToggleSubscribe}
              disabled={subBusy}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: subscribed ? "1px solid #f3c9c9" : "1px solid #e6e6e6",
                background: subscribed ? "#ffecec" : "#fff",
                color: subscribed ? "#b00020" : "#222",
                cursor: subBusy ? "not-allowed" : "pointer",
                fontWeight: 900,
                opacity: subBusy ? 0.7 : 1,
              }}
              title={subscribed ? "Unfollow this ad" : "Follow this ad"}
            >
              {subscribed ? "Unfollow" : "Follow"}
            </button>

            <button
              onClick={() => nav("/followed")}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #e6e6e6",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 900,
              }}
              title="Open watchlist"
            >
              Watchlist
            </button>
          </>
        )}

        {/* Owner shortcuts */}
        {authed && isMine && (
          <>
            <button
              onClick={() => nav("/chats")}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #e6e6e6",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Open chats
            </button>
            <button
              onClick={() => nav("/orders")}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #e6e6e6",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Orders
            </button>
          </>
        )}

        {/* Not authed */}
        {!authed && (
          <>
            <button
              onClick={() => nav("/login")}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #e6e6e6",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Login to buy / chat / follow
            </button>
          </>
        )}
      </div>

      {/* Main photo */}
      <div style={{ marginTop: 14 }}>
        <button
          onClick={() => (sortedPhotos.length ? openLightboxAt(lightboxIndex) : undefined)}
          disabled={!mainPhoto}
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            borderRadius: 14,
            overflow: "hidden",
            background: "#f3f3f3",
            border: "1px solid #e6e6e6",
            padding: 0,
            cursor: mainPhoto ? "zoom-in" : "default",
          }}
          title="Open full size"
        >
          {mainPhoto ? (
            <img
              src={mainPhoto}
              alt="main"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{ color: "#666", padding: 12 }}>No photo</div>
          )}
        </button>
      </div>

      {/* Thumbs */}
      {sortedPhotos.length > 1 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          {thumbs.map((p, idx) => {
            const url = `${API}${p.url}`;
            const isActive = p.url === activeUrl;

            return (
              <button
                key={p.id}
                onClick={() => openLightboxAt(idx)}
                style={{
                  width: 140,
                  aspectRatio: "4 / 3",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#f3f3f3",
                  border: isActive ? "2px solid #111" : "1px solid #e6e6e6",
                  padding: 0,
                  cursor: "zoom-in",
                }}
                title="Open full size"
              >
                <img
                  src={url}
                  alt="thumb"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </button>
            );
          })}

          {rest > 0 && (
            <button
              onClick={() => openLightboxAt(0)}
              style={{
                width: 140,
                aspectRatio: "4 / 3",
                borderRadius: 12,
                overflow: "hidden",
                background: "#111",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "#fff",
                padding: 0,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 900,
              }}
              title="Open gallery"
            >
              +{rest}
            </button>
          )}
        </div>
      )}

      {/* Description */}
      <h3 style={{ marginTop: 18 }}>Description</h3>
      <div style={{ whiteSpace: "pre-wrap" }}>{ad.description}</div>

      {/* LIGHTBOX */}
      {lightboxOpen && sortedPhotos.length > 0 && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "min(1100px, 96vw)",
              userSelect: "none",
            }}
          >
            {/* VIEWPORT */}
            <div
              ref={wheelRef}
              onMouseDown={(e) => {
                if (zoom <= 1) return;
                setDragging(true);
                setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
              }}
              onMouseMove={(e) => {
                if (!dragging) return;
                setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
              }}
              onMouseUp={() => setDragging(false)}
              onMouseLeave={() => setDragging(false)}
              onDoubleClick={() => {
                setZoom((z) => {
                  const nz = z === 1 ? 2 : 1;
                  if (nz === 1) setPan({ x: 0, y: 0 });
                  return nz;
                });
              }}
              style={{
                width: "100%",
                height: "86vh",
                borderRadius: 12,
                overflow: "hidden",
                background: "#111",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in",
              }}
            >
              <img
                src={`${API}${sortedPhotos[lightboxIndex].url}`}
                alt="full"
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transition: dragging ? "none" : "transform .08s ease",
                }}
              />
            </div>

            {/* Close */}
            <button
              onClick={() => setLightboxOpen(false)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(0,0,0,0.55)",
                color: "#fff",
                cursor: "pointer",
              }}
              title="Close (Esc)"
            >
              ✕
            </button>

            {/* Zoom controls */}
            <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", gap: 8 }}>
              <button
                onClick={() => setZoom((z) => Math.min(4, Number((z + 0.25).toFixed(2))))}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: "rgba(0,0,0,0.55)",
                  color: "#fff",
                  cursor: "pointer",
                }}
                title="Zoom in"
              >
                +
              </button>
              <button
                onClick={() =>
                  setZoom((z) => {
                    const nz = Math.max(1, Number((z - 0.25).toFixed(2)));
                    if (nz === 1) setPan({ x: 0, y: 0 });
                    return nz;
                  })
                }
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: "rgba(0,0,0,0.55)",
                  color: "#fff",
                  cursor: "pointer",
                }}
                title="Zoom out"
              >
                −
              </button>
              <button
                onClick={() => resetView()}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: "rgba(0,0,0,0.55)",
                  color: "#fff",
                  cursor: "pointer",
                }}
                title="Reset"
              >
                Reset
              </button>
            </div>

            {/* Prev/Next */}
            {sortedPhotos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.25)",
                    background: "rgba(0,0,0,0.55)",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                  title="Prev (←)"
                >
                  ←
                </button>

                <button
                  onClick={nextPhoto}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.25)",
                    background: "rgba(0,0,0,0.55)",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                  title="Next (→)"
                >
                  →
                </button>
              </>
            )}

            <div style={{ marginTop: 10, color: "rgba(255,255,255,0.8)", textAlign: "center", fontSize: 13 }}>
              {lightboxIndex + 1} / {sortedPhotos.length} — Esc close, ←/→ navigate, wheel zoom, drag pan, dblclick zoom
            </div>
          </div>
        </div>
      )}
    </div>
  );
}