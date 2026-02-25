import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getMyUserIdFromToken } from "../api/auth";
import {
  acceptOrder,
  cancelOrder,
  completeOrder,
  getOrder,
  rejectOrder,
  getOrderShipping,
  saveOrderShipping,
  markShipped,
  markDelivered,
  type OrderDetails,
  type Shipping,
} from "../api/orders";

function statusLabel(s: number) {
  switch (s) {
    case 0:
      return "Created";
    case 1:
      return "Accepted";
    case 2:
      return "Rejected";
    case 3:
      return "Canceled";
    case 4:
      return "Completed";
    default:
      return "Unknown";
  }
}

function shipStatusLabel(s: number) {
  switch (s) {
    case 0:
      return "Draft";
    case 1:
      return "Ready";
    case 2:
      return "Shipped";
    case 3:
      return "Delivered";
    default:
      return "Unknown";
  }
}

export function OrderPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const me = getMyUserIdFromToken();

  const [o, setO] = useState<OrderDetails | null>(null);
  const [ship, setShip] = useState<Shipping | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // buyer form
  const [method, setMethod] = useState(0);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [carrier, setCarrier] = useState("");

  // seller ship
  const [track, setTrack] = useState("");
  const [shipCarrier, setShipCarrier] = useState("");

  async function load() {
    if (!id) return;

    setErr(null);
    try {
      // 1) order
      const ord = await getOrder(id);
      setO(ord);

      // 2) shipping (бекенд може повертати “порожній” об’єкт)
      const s = await getOrderShipping(id);
      setShip(s);

      // buyer defaults
      setMethod(typeof s.method === "number" ? s.method : 0);
      setRecipientName(s.recipientName ?? "");
      setRecipientPhone(s.recipientPhone ?? "");
      setShipCity(s.city ?? "");
      setAddressLine(s.addressLine ?? "");
      setCarrier(s.carrier ?? "");

      // seller defaults
      setTrack(s.trackingNumber ?? "");
      setShipCarrier(s.carrier ?? "");
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

  const isBuyer = !!me && o?.buyerId === me;
  const isSeller = !!me && o?.sellerId === me;

  async function act(fn: () => Promise<any>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      await load(); // ✅ refresh order+shipping
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 10 }}>
        <Link to="/orders">← Back to orders</Link>
      </div>

      <h1>Order</h1>

      {err && (
        <div style={{ background: "#fee", padding: 10, borderRadius: 8, marginBottom: 10 }}>
          {String(err)}
        </div>
      )}
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

          {/* ACTIONS */}
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {/* Seller actions */}
            {isSeller && o.status === 0 && (
              <>
                <button disabled={busy} onClick={() => act(() => acceptOrder(o.id))}>
                  Accept
                </button>
                <button disabled={busy} onClick={() => act(() => rejectOrder(o.id))}>
                  Reject
                </button>
              </>
            )}

            {/* Buyer actions */}
            {isBuyer && (o.status === 0 || o.status === 1) && (
              <button
                disabled={busy}
                onClick={() => {
                  if (!confirm("Cancel this order?")) return;
                  act(() => cancelOrder(o.id));
                }}
              >
                Cancel
              </button>
            )}

            {/* Complete (seller) — тільки після Delivered */}
            {isSeller && o.status === 1 && ship?.status === 3 && (
              <button
                disabled={busy}
                onClick={() => {
                  if (!confirm("Mark as completed?")) return;
                  act(() => completeOrder(o.id));
                }}
              >
                Complete
              </button>
            )}

            <button onClick={() => nav(`/chats`)} disabled={busy}>
              Open chats
            </button>
          </div>

          <div style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
            Created: {new Date(o.createdAt).toLocaleString()} • Updated: {new Date(o.updatedAt).toLocaleString()}
          </div>

          {/* SHIPPING */}
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

            {/* BUYER: fill shipping після Accepted */}
            {isBuyer && o.status === 1 && (
              <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
                <select value={method} onChange={(e) => setMethod(Number(e.target.value))} style={{ padding: 8 }}>
                  <option value={0}>Meetup</option>
                  <option value={1}>Post</option>
                  <option value={2}>Courier</option>
                </select>

                <input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Recipient name"
                  style={{ padding: 8 }}
                  disabled={busy}
                />
                <input
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="Recipient phone"
                  style={{ padding: 8 }}
                  disabled={busy}
                />
                <input
                  value={shipCity}
                  onChange={(e) => setShipCity(e.target.value)}
                  placeholder="City"
                  style={{ padding: 8 }}
                  disabled={busy}
                />

                {method === 1 && (
                  <input
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="Post office / address"
                    style={{ padding: 8 }}
                    disabled={busy}
                  />
                )}

                {method === 2 && (
                  <input
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="Courier address"
                    style={{ padding: 8 }}
                    disabled={busy}
                  />
                )}

                {method === 0 && (
                  <input
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="Meetup place (optional)"
                    style={{ padding: 8 }}
                    disabled={busy}
                  />
                )}

                <input
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="Carrier (optional, e.g. NovaPoshta)"
                  style={{ padding: 8 }}
                  disabled={busy}
                />

                <button
                  disabled={
                    busy ||
                    recipientName.trim().length < 2 ||
                    recipientPhone.trim().length < 5 ||
                    shipCity.trim().length < 2 ||
                    ((method === 1 || method === 2) && addressLine.trim().length < 3)
                  }
                  onClick={() =>
                    act(async () => {
                      await saveOrderShipping(o.id, {
                        method,
                        recipientName: recipientName.trim(),
                        recipientPhone: recipientPhone.trim(),
                        city: shipCity.trim(),
                        addressLine: addressLine.trim(),
                        carrier: carrier.trim() ? carrier.trim() : null,
                      });
                    })
                  }
                >
                  Save shipping details
                </button>
              </div>
            )}

            {/* SELLER: mark shipped (коли buyer вже зберіг shipping => Ready) */}
            {isSeller && o.status === 1 && ship?.status === 1 && (
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

            {/* Buyer OR Seller: mark delivered (коли shipped) */}
            {(isBuyer || isSeller) && o.status === 1 && ship?.status === 2 && (
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
          </div>
        </div>
      )}
    </div>
  );
}