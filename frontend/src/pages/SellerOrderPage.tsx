import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  acceptOrder,
  completeOrder,
  getOrder,
  getOrderShipping,
  markDelivered,
  markShipped,
  rejectOrder,
  type OrderDetails,
  type Shipping,
} from "../api/orders";
import { getMyUserIdFromToken } from "../api/auth";

function statusLabel(s: number) {
  switch (s) {
    case 0: return "Created";
    case 1: return "Accepted";
    case 2: return "Rejected";
    case 3: return "Canceled";
    case 4: return "Completed";
    default: return "Unknown";
  }
}

function shipStatusLabel(s: number) {
  switch (s) {
    case 0: return "Draft";
    case 1: return "Ready";
    case 2: return "Shipped";
    case 3: return "Delivered";
    default: return "Unknown";
  }
}

export function SellerOrderPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const me = getMyUserIdFromToken();

  const [o, setO] = useState<OrderDetails | null>(null);
  const [ship, setShip] = useState<Shipping | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [shipCarrier, setShipCarrier] = useState("");
  const [track, setTrack] = useState("");

  async function load() {
    if (!id) return;

    setErr(null);
    try {
      const ord = await getOrder(id);
      setO(ord);

      const s = await getOrderShipping(id);
      setShip(s);

      setShipCarrier(s.carrier ?? "");
      setTrack(s.trackingNumber ?? "");
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Load failed");
      setO(null);
      setShip(null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isSeller = !!me && o?.sellerId === me;

  async function act(fn: () => Promise<any>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      await load();
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (!isSeller && o) {
    return (
      <div style={{ maxWidth: 900 }}>
        <div style={{ background: "#fee", padding: 10, borderRadius: 8 }}>Forbidden: you are not the seller of this order.</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 10 }}>
        <Link to="/seller/orders">← Back to seller orders</Link>
      </div>

      <h1>Seller — Order</h1>

      {err && <div style={{ background: "#fee", padding: 10, borderRadius: 8, marginBottom: 10 }}>{String(err)}</div>}
      {!o && !err && <div>Loading...</div>}

      {o && (
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              <Link to={`/ads/${o.adId}`}>{o.adTitle}</Link>
            </div>
            <div style={{ color: "#666" }}>{statusLabel(o.status)}</div>
          </div>

          <div style={{ marginTop: 8 }}>
            <b>{o.price}</b> {o.currency}
          </div>

          <div style={{ marginTop: 10, color: "#666" }}>
            Buyer: {o.buyerName} • Seller: {o.sellerName}
          </div>

          {/* Actions */}
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {o.status === 0 && (
              <>
                <button disabled={busy} onClick={() => act(() => acceptOrder(o.id))}>Accept</button>
                <button disabled={busy} onClick={() => act(() => rejectOrder(o.id))}>Reject</button>
              </>
            )}

            <button disabled={busy} onClick={() => nav("/chats")}>Open chats</button>
          </div>

          {/* Shipping */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #eee" }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Shipping</div>

            {ship ? (
              <div style={{ color: "#666", marginBottom: 10 }}>
                Status: {shipStatusLabel(ship.status)}
                {ship.trackingNumber ? ` • Tracking: ${ship.trackingNumber}` : ""}
              </div>
            ) : (
              <div style={{ color: "#666", marginBottom: 10 }}>Loading shipping...</div>
            )}

            {/* Seller: mark shipped — only when order accepted AND buyer filled shipping => Ready */}
            {o.status === 1 && ship?.status === 1 && (
              <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
                <input
                  value={shipCarrier}
                  onChange={(e) => setShipCarrier(e.target.value)}
                  placeholder="Carrier (optional)"
                  style={{ padding: 8 }}
                  disabled={busy}
                />
                <input
                  value={track}
                  onChange={(e) => setTrack(e.target.value)}
                  placeholder="Tracking number (optional)"
                  style={{ padding: 8 }}
                  disabled={busy}
                />
                <button
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      await markShipped(o.id, {
                        carrier: shipCarrier.trim() || undefined,
                        trackingNumber: track.trim() || undefined,
                      });
                    })
                  }
                >
                  Mark shipped
                </button>
              </div>
            )}

            {/* mark delivered — seller can also do it */}
            {o.status === 1 && ship?.status === 2 && (
              <button
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    if (!confirm("Mark as delivered?")) return;
                    await markDelivered(o.id);
                  })
                }
              >
                Mark delivered
              </button>
            )}

            {/* complete — only after delivered */}
            {o.status === 1 && ship?.status === 3 && (
              <button
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    if (!confirm("Complete this order?")) return;
                    await completeOrder(o.id);
                  })
                }
              >
                Complete
              </button>
            )}

            {o.status !== 1 && (
              <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
                Shipping actions are available only after order is accepted.
              </div>
            )}
          </div>

          <div style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
            Created: {new Date(o.createdAt).toLocaleString()} • Updated: {new Date(o.updatedAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}