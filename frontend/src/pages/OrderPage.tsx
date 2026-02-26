import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  acceptOrder,
  cancelOrder,
  completeOrder,
  getOrder,
  getOrderShipping,
  markDelivered,
  markShipped,
  rejectOrder,
  saveOrderShipping,
  createReview,
  getMyReview,
  type OrderDetails,
  type Shipping,
  type MyOrderReview,
} from "../api/orders";
import { getMyUserIdFromToken } from "../api/auth";


function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
function fmtMoney(v: number, cur: string) {
  return `${Math.round(v)} ${cur}`;
}

const ORDER_STATUS: Record<number, { label: string; tone: "gray" | "blue" | "green" | "red" }> = {
  0: { label: "Created", tone: "blue" },
  1: { label: "Accepted", tone: "green" },
  2: { label: "Rejected", tone: "red" },
  3: { label: "Cancelled", tone: "red" },
  4: { label: "Completed", tone: "gray" },
};

const SHIPPING_METHOD: Record<number, string> = {
  0: "Meetup",
  1: "Post",
  2: "Courier",
};

const SHIPPING_STATUS: Record<number, string> = {
  0: "Draft",
  1: "Ready",
  2: "Shipped",
  3: "Delivered",
};

function Badge({ text, tone }: { text: string; tone: "gray" | "blue" | "green" | "red" }) {
  const bg =
    tone === "blue" ? "#e8f0ff" : tone === "green" ? "#e9fbef" : tone === "red" ? "#ffecec" : "#f1f1f1";
  const bd =
    tone === "blue" ? "#cfe0ff" : tone === "green" ? "#c8f0d6" : tone === "red" ? "#f3c9c9" : "#e6e6e6";
  const fg =
    tone === "blue" ? "#1e60ff" : tone === "green" ? "#0a7a2f" : tone === "red" ? "#b00020" : "#444";

  return (
    <span
      style={{
        background: bg,
        border: `1px solid ${bd}`,
        color: fg,
        padding: "4px 10px",
        borderRadius: 999,
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function Card({ title, children }: { title: string; children: any }) {
  return (
    <div style={{ border: "1px solid #e6e6e6", borderRadius: 16, background: "#fff", padding: 14 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Button({ kind = "ghost", disabled, onClick, children }: any) {
  const styles =
    kind === "primary"
      ? { border: "1px solid #1e60ff", background: "#1e60ff", color: "#fff" }
      : kind === "danger"
      ? { border: "1px solid #f3c9c9", background: "#ffecec", color: "#b00020" }
      : { border: "1px solid #e6e6e6", background: "#fff", color: "#222" };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 900,
        opacity: disabled ? 0.65 : 1,
        ...styles,
      }}
    >
      {children}
    </button>
  );
}

function Stepper({ status }: { status: number }) {
  const steps = [
    { k: 0, label: "Draft" },
    { k: 1, label: "Ready" },
    { k: 2, label: "Shipped" },
    { k: 3, label: "Delivered" },
  ];

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {steps.map((s, idx) => {
          const active = status >= s.k;
          return (
            <div key={s.k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  border: active ? "1px solid #1e60ff" : "1px solid #e6e6e6",
                  background: active ? "#e8f0ff" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  color: active ? "#1e60ff" : "#777",
                }}
              >
                {idx + 1}
              </div>
              <div style={{ fontWeight: 900, color: active ? "#222" : "#777" }}>{s.label}</div>
              {idx !== steps.length - 1 && (
                <div style={{ width: 24, height: 2, background: active ? "#1e60ff" : "#e6e6e6" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OrderPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const myId = getMyUserIdFromToken();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [shipping, setShipping] = useState<Shipping | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // review
  // undefined = loading, null = no review, object = review exists
  const [myReview, setMyReview] = useState<MyOrderReview | undefined>(undefined);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  

  

  // buyer shipping form
  const [shipForm, setShipForm] = useState({
    method: 0,
    recipientName: "",
    recipientPhone: "",
    city: "",
    addressLine: "",
    carrier: "" as string | "",
  });

  // seller ship payload
  const [shipCarrier, setShipCarrier] = useState("");
  const [shipTracking, setShipTracking] = useState("");

  const role = useMemo(() => {
    if (!order || !myId) return null;
    if (order.buyerId === myId) return "buyer";
    if (order.sellerId === myId) return "seller";
    return null;
  }, [order, myId]);

  const st = order ? (ORDER_STATUS[order.status] ?? { label: `Status ${order.status}`, tone: "gray" as const }) : null;

  async function load() {
    if (!id) return;

    setErr(null);
    setLoading(true);
    setMyReview(undefined);

    try {
      const o = await getOrder(id);
      setOrder(o);

      const s = await getOrderShipping(id); // backend returns empty object with id=null -> OK
      setShipping(s);

      setShipForm({
        method: s.method ?? 0,
        recipientName: s.recipientName ?? "",
        recipientPhone: s.recipientPhone ?? "",
        city: s.city ?? "",
        addressLine: s.addressLine ?? "",
        carrier: (s.carrier ?? "") as any,
      });

      setShipCarrier(s.carrier ?? "");
      setShipTracking(s.trackingNumber ?? "");

      // review (only buyer can have one, but endpoint returns null if none)
      // після того, як ти вже знаєш role + canReview
if (role === "buyer" && canReview) {
  try {
    const r = await getMyReview(id);
    setMyReview(r); // null або object
  } catch {
    setMyReview(null);
  }
} else {
  setMyReview(undefined); // або null — але краще undefined, бо "не застосовується"
}
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Failed to load order");
      setOrder(null);
      setShipping(null);
      setMyReview(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  // rules (matching your backend)
  const canAcceptReject = role === "seller" && order?.status === 0;
  const canCancel = role === "buyer" && (order?.status === 0 || order?.status === 1);
  const canComplete =
    role === "seller" &&
    order?.status === 1 &&
    (!shipping?.id || shipping.status === 3); // if shipping exists -> must be Delivered

  const canSaveShipping = role === "buyer" && (order?.status === 0 || order?.status === 1);
  const canMarkShipped =
    role === "seller" && order?.status === 1 && shipping != null && shipping.status !== 0; // not Draft
  const canMarkDelivered =
    (role === "buyer" || role === "seller") && order?.status === 1 && shipping?.status === 2;

  // review rules
  const isFinished =
  (order?.statusName
    ? ["Rejected", "Cancelled", "Completed"].includes(order.statusName)
    : (order?.status === 2 || order?.status === 3 || order?.status === 4));
    
    const canReview = role === "buyer" && !!order && isFinished;

  const shipFormValid = useMemo(() => {
    if (!shipForm.recipientName.trim()) return false;
    if (!shipForm.recipientPhone.trim()) return false;
    if (!shipForm.city.trim()) return false;

    const method = Number(shipForm.method);
    if ((method === 1 || method === 2) && !shipForm.addressLine.trim()) return false;

    return true;
  }, [shipForm]);

  if (!id) return <div>No order id</div>;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => nav(-1)}
            style={{
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid #e6e6e6",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            ← Back
          </button>
          <h1 style={{ margin: 0 }}>Order</h1>
        </div>

        <Button kind="ghost" disabled={busy} onClick={load}>
          {busy ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {err && (
        <div
          style={{
            marginTop: 12,
            background: "#fee",
            padding: 12,
            borderRadius: 14,
            border: "1px solid #f3c9c9",
          }}
        >
          {String(err)}
        </div>
      )}

      {loading && !order && <div style={{ marginTop: 12, color: "#666" }}>Loading order…</div>}

      {!loading && order && (
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {/* Summary */}
          <Card title="Summary">
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 950, fontSize: 18, lineHeight: 1.2 }}>
                <Link to={`/ads/${order.adId}`} style={{ textDecoration: "none", color: "#1e60ff" }}>
                  {order.adTitle}
                </Link>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {st && <Badge text={st.label} tone={st.tone} />}
                <Badge text={role ? role.toUpperCase() : "—"} tone="gray" />
                <Badge text={fmtMoney(order.price, order.currency)} tone="gray" />
              </div>

              <div style={{ color: "#777", fontSize: 12 }}>
                Created: {fmtDateTime(order.createdAt)} • Updated: {fmtDateTime(order.updatedAt)}
              </div>
            </div>
          </Card>

          {/* People */}
          <Card title="People">
            <div style={{ display: "grid", gap: 8 }}>
              <div>
                <b>Buyer:</b> {order.buyerName} <span style={{ color: "#777", fontSize: 12 }}>({order.buyerId})</span>
              </div>
              <div>
                <b>Seller:</b> {order.sellerName}{" "}
                <span style={{ color: "#777", fontSize: 12 }}>({order.sellerId})</span>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card title="Actions">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {canAcceptReject && (
                <>
                  <Button kind="primary" disabled={busy} onClick={() => act(() => acceptOrder(order.id))}>
                    Accept
                  </Button>
                  <Button kind="danger" disabled={busy} onClick={() => act(() => rejectOrder(order.id))}>
                    Reject
                  </Button>
                </>
              )}

              {canCancel && (
                <Button kind="danger" disabled={busy} onClick={() => act(() => cancelOrder(order.id))}>
                  Cancel
                </Button>
              )}

              {canComplete && (
                <Button kind="primary" disabled={busy} onClick={() => act(() => completeOrder(order.id))}>
                  Complete
                </Button>
              )}

              {!canAcceptReject && !canCancel && !canComplete && (
                <div style={{ color: "#777" }}>No actions available for your role/status.</div>
              )}
            </div>

            {/* Helpful hint */}
            <div style={{ marginTop: 10, color: "#777", fontSize: 13 }}>
              {order.status === 0 && "Waiting for seller decision (Accept/Reject)."}
              {order.status === 1 && shipping?.status === 0 && "Buyer should fill shipping details (Draft)."}
              {order.status === 1 && shipping?.status === 1 && "Seller can mark as Shipped when sent."}
              {order.status === 1 && shipping?.status === 2 && "Mark Delivered when received."}
              {order.status === 1 && shipping?.status === 3 && "Delivered. Seller can complete the order."}
              {(order.status === 2 || order.status === 3) && "Order finished (failed). Buyer can leave a review."}
              {order.status === 4 && "Order finished (success). Buyer can leave a review."}
            </div>
          </Card>

          {/* Shipping */}
          <Card title="Shipping">
            {shipping && (
              <div style={{ marginBottom: 10 }}>
                <Stepper status={shipping.status} />
              </div>
            )}

            {shipping && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", color: "#444", marginBottom: 10 }}>
                <span>
                  <b>Method:</b> {SHIPPING_METHOD[shipping.method] ?? shipping.method}
                </span>
                <span>
                  <b>Status:</b> {SHIPPING_STATUS[shipping.status] ?? shipping.status}
                </span>
              </div>
            )}

            {/* Buyer form */}
            {role === "buyer" && canSaveShipping && (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <select
                  aria-label="Shipping method"
                  value={shipForm.method}
                  onChange={(e) => setShipForm((p) => ({ ...p, method: Number(e.target.value) }))}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #e6e6e6",
                    background: "#fff",
                    fontWeight: 800,
                    }}
                    >
                    <option value={0}>Meetup</option>
                    <option value={1}>Post</option>
                    <option value={2}>Courier</option>
                  </select>

                  <input
                    value={shipForm.recipientPhone}
                    onChange={(e) => setShipForm((p) => ({ ...p, recipientPhone: e.target.value }))}
                    placeholder="Recipient phone"
                    style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e6e6e6" }}
                  />
                </div>

                <input
                  value={shipForm.recipientName}
                  onChange={(e) => setShipForm((p) => ({ ...p, recipientName: e.target.value }))}
                  placeholder="Recipient name"
                  style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e6e6e6" }}
                />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input
                    value={shipForm.city}
                    onChange={(e) => setShipForm((p) => ({ ...p, city: e.target.value }))}
                    placeholder="City"
                    style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e6e6e6" }}
                  />
                  <input
                    value={shipForm.addressLine}
                    onChange={(e) => setShipForm((p) => ({ ...p, addressLine: e.target.value }))}
                    placeholder={Number(shipForm.method) === 0 ? "Meet place (optional)" : "Address line"}
                    style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e6e6e6" }}
                  />
                </div>

                <input
                  value={shipForm.carrier}
                  onChange={(e) => setShipForm((p) => ({ ...p, carrier: e.target.value }))}
                  placeholder="Carrier (optional)"
                  style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e6e6e6" }}
                />

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <Button
                    kind="primary"
                    disabled={busy || !shipFormValid}
                    onClick={() =>
                      act(() =>
                        saveOrderShipping(order.id, {
                          method: Number(shipForm.method),
                          recipientName: shipForm.recipientName,
                          recipientPhone: shipForm.recipientPhone,
                          city: shipForm.city,
                          addressLine: shipForm.addressLine,
                          carrier: shipForm.carrier?.trim() ? shipForm.carrier.trim() : null,
                        })
                      )
                    }
                  >
                    Save shipping (→ Ready)
                  </Button>

                  <div style={{ color: "#777", fontSize: 13 }}>
                    Post/Courier require address. After save status becomes <b>Ready</b>.
                  </div>
                </div>
              </div>
            )}

            {/* Shipping view */}
            {shipping && shipping.id && (
              <div
                style={{
                  marginTop: role === "buyer" && canSaveShipping ? 14 : 0,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div>
                  <b>Recipient:</b> {shipping.recipientName} • {shipping.recipientPhone}
                </div>
                <div>
                  <b>Address:</b> {shipping.city}
                  {shipping.addressLine ? `, ${shipping.addressLine}` : ""}
                </div>
                <div>
                  <b>Carrier:</b> {shipping.carrier ?? "—"} • <b>Tracking:</b> {shipping.trackingNumber ?? "—"}
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                  {/* seller: mark shipped */}
                  {canMarkShipped && (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <input
                        value={shipCarrier}
                        onChange={(e) => setShipCarrier(e.target.value)}
                        placeholder="Carrier (optional)"
                        style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e6e6e6" }}
                      />
                      <input
                        value={shipTracking}
                        onChange={(e) => setShipTracking(e.target.value)}
                        placeholder="Tracking number (optional)"
                        style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e6e6e6" }}
                      />
                      <Button
                        kind="primary"
                        disabled={busy}
                        onClick={() =>
                          act(() =>
                            markShipped(order.id, {
                              carrier: shipCarrier?.trim() ? shipCarrier.trim() : undefined,
                              trackingNumber: shipTracking?.trim() ? shipTracking.trim() : undefined,
                            })
                          )
                        }
                      >
                        Mark shipped
                      </Button>
                    </div>
                  )}

                  {/* buyer/seller: mark delivered */}
                  {canMarkDelivered && (
                    <Button kind="primary" disabled={busy} onClick={() => act(() => markDelivered(order.id))}>
                      Mark delivered
                    </Button>
                  )}

                  {!canMarkShipped && !canMarkDelivered && (
                    <div style={{ color: "#777" }}>No shipping actions available.</div>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Review */}

          {role === "buyer" && (
          <Card title="Rate seller">
                {!canReview && <div style={{ color: "#777" }}>You can rate the seller after the order is finished.</div>}
                {canReview && myReview === undefined && <div style={{ color: "#777" }}>Loading review…</div>}
                {canReview && myReview && (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontWeight: 900 }}>
                      You already rated: {"⭐".repeat(Math.max(1, Math.min(5, Number((myReview as any).rating) || 5)))} (
                        {(myReview as any).rating}/5)
                        </div>
                        <div style={{ whiteSpace: "pre-wrap" }}>{String((myReview as any).comment ?? "")}</div>
                        <div style={{ color: "#777", fontSize: 12 }}>
                          {(myReview as any).createdAt ? fmtDateTime(String((myReview as any).createdAt)) : ""}
                          </div>
                          </div>
                        )}
                        {canReview && myReview === null && (
                          <div style={{ display: "grid", gap: 10 }}>
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                              <div style={{ fontWeight: 900 }}>Rating</div>
                              
                              <select
                              aria-label="Rating"
                              value={rating}
                              onChange={(e) => setRating(Number(e.target.value))}
                              style={{
                                padding: "10px 12px",
                                borderRadius: 12,
                                border: "1px solid #e6e6e6",
                                background: "#fff",
                                fontWeight: 800,
                              }}
                              >
                                {[5, 4, 3, 2, 1].map((x) => (
                                  <option key={x} value={x}>
                                    {x} - {"⭐".repeat(x)}
                                    </option>
                                  ))}
                                  </select>
                                  </div>
                                  
                                  <textarea
                                  value={comment}
                                  onChange={(e) => setComment(e.target.value)}
                                  placeholder="Write a short comment…"
                                  rows={4}
                                  style={{ padding: 12, borderRadius: 14, border: "1px solid #e6e6e6", resize: "vertical" }}
                                  />
                                  <Button
                                  kind="primary"
                                  disabled={busy || !comment.trim()}
                                  onClick={() =>
                                    act(async () => {
                                      await createReview(order.id, { rating, comment: comment.trim() });
                                      const r = await getMyReview(order.id);
                                      setMyReview(r);
                                      setComment("");
                                    })
                                  }>
                                    Submit review
                                    </Button>
                                    <div style={{ color: "#777", fontSize: 13 }}>One review per order. It will appear in seller profile.</div>
                                    </div>
                                  )}
                                  </Card>
          )}
</div>
      )}
    </div>
  );
}