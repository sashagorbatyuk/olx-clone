import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyOrders, type OrderListItem } from "../api/orders";
import { getMyUserIdFromToken } from "../api/auth";

function statusLabel(s: number) {
  switch (s) {
    case 0: return "Created";
    case 1: return "Accepted";
    case 2: return "Rejected";
    case 3: return "Cancelled";
    case 4: return "Completed";
    default: return "Unknown";
  }
}

export function MyOrdersPage() {
  const [items, setItems] = useState<OrderListItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const me = getMyUserIdFromToken();

  async function load() {
    setErr(null);
    try {
      const data = await getMyOrders();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Failed to load orders");
      setItems([]);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={{ maxWidth: 900 }}>
      <h1>My Orders</h1>

      {err && <div style={{ background: "#fee", padding: 10, borderRadius: 8, marginBottom: 10 }}>{String(err)}</div>}

      {items.length === 0 && !err && <div style={{ color: "#666" }}>No orders yet.</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {items.map(o => {
          const role = me && o.buyerId === me ? "Buyer" : "Seller";
          return (
            <div key={o.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 700 }}>
                  <Link to={`/orders/${o.id}`}>{o.adTitle}</Link>
                </div>
                <div style={{ color: "#666" }}>{role}</div>
              </div>

              <div style={{ marginTop: 6 }}>
                <b>{o.price}</b> {o.currency} • <span style={{ color: "#666" }}>{statusLabel(o.status)}</span>
              </div>

              <div style={{ marginTop: 6, color: "#666", fontSize: 13 }}>
                Updated: {new Date(o.updatedAt).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}