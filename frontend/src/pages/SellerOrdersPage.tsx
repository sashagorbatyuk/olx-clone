import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyOrders, type OrderListItem } from "../api/orders";
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

export function SellerOrdersPage() {
  const me = getMyUserIdFromToken();
  const [items, setItems] = useState<OrderListItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const data = await getMyOrders();
      const onlySeller = (Array.isArray(data) ? data : []).filter((o) => !!me && o.sellerId === me);
      setItems(onlySeller);
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Load failed");
      setItems([]);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={{ maxWidth: 900 }}>
      <h1>Seller Orders</h1>

      {err && <div style={{ background: "#fee", padding: 10, borderRadius: 8, marginBottom: 10 }}>{String(err)}</div>}
      {items.length === 0 && !err && <div style={{ color: "#666" }}>No orders yet.</div>}

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((o) => (
          <div key={o.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 800 }}>
                <Link to={`/seller/orders/${o.id}`}>{o.adTitle}</Link>
              </div>
              <div style={{ color: "#666" }}>{statusLabel(o.status)}</div>
            </div>

            <div style={{ marginTop: 6 }}>
              <b>{o.price}</b> {o.currency}
            </div>

            <div style={{ marginTop: 6, color: "#666" }}>
              BuyerId: {o.buyerId} • {new Date(o.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}