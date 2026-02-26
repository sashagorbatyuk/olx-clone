import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getMyOrders, type OrderListItem } from "../api/orders";
import { getMyUserIdFromToken } from "../api/auth";

function fmtMoney(v: number, cur: string) {
  return `${Math.round(v)} ${cur}`;
}
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const ORDER_STATUS: Record<number, { label: string; tone: "gray" | "blue" | "green" | "red" }> = {
  0: { label: "Created", tone: "blue" },
  1: { label: "Accepted", tone: "green" },
  2: { label: "Rejected", tone: "red" },
  3: { label: "Cancelled", tone: "red" },
  4: { label: "Completed", tone: "gray" },
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
        padding: "4px 8px",
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

function Tab({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: 12,
        border: "1px solid #e6e6e6",
        background: active ? "#1e60ff" : "#fff",
        color: active ? "#fff" : "#222",
        cursor: "pointer",
        fontWeight: 900,
      }}
    >
      {children}
    </button>
  );
}

export function MyOrdersPage() {
  const myId = getMyUserIdFromToken();

  const [items, setItems] = useState<OrderListItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState<"all" | "buying" | "selling">("all");
  const [statusFilter, setStatusFilter] = useState<number | "all">("all");
  const [q, setQ] = useState("");

  async function load() {
    setErr(null);
    setBusy(true);
    try {
      const data = await getMyOrders();
      setItems(data);
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Failed to load orders");
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return items
      .filter((o) => {
        if (!myId) return true;
        if (tab === "buying") return o.buyerId === myId;
        if (tab === "selling") return o.sellerId === myId;
        return true;
      })
      .filter((o) => (statusFilter === "all" ? true : o.status === statusFilter))
      .filter((o) => {
        if (!qq) return true;
        return o.adTitle?.toLowerCase().includes(qq);
      })
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [items, myId, tab, statusFilter, q]);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Orders</h1>
        <button
          onClick={load}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #e6e6e6",
            background: "#fff",
            cursor: busy ? "not-allowed" : "pointer",
            fontWeight: 900,
            opacity: busy ? 0.7 : 1,
          }}
          disabled={busy}
        >
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {err && (
        <div style={{ marginTop: 12, background: "#fee", padding: 12, borderRadius: 14, border: "1px solid #f3c9c9" }}>
          {String(err)}
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Tab active={tab === "all"} onClick={() => setTab("all")}>All</Tab>
        <Tab active={tab === "buying"} onClick={() => setTab("buying")}>Buying</Tab>
        <Tab active={tab === "selling"} onClick={() => setTab("selling")}>Selling</Tab>

        <div style={{ flex: 1 }} />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
          style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e6e6e6", background: "#fff", fontWeight: 800 }}
        >
          <option value="all">All statuses</option>
          {Object.entries(ORDER_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by ad title…"
          style={{ minWidth: 260, padding: "10px 12px", borderRadius: 12, border: "1px solid #e6e6e6" }}
        />
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {filtered.length === 0 && !err && <div style={{ color: "#666" }}>{busy ? "Loading…" : "No orders."}</div>}

        {filtered.map((o) => {
          const st = ORDER_STATUS[o.status] ?? { label: `Status ${o.status}`, tone: "gray" as const };
          const role =
            myId && o.buyerId === myId ? "Buyer" : myId && o.sellerId === myId ? "Seller" : "Order";

          return (
            <Link key={o.id} to={`/orders/${o.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div
                style={{
                  border: "1px solid #e6e6e6",
                  borderRadius: 16,
                  background: "#fff",
                  padding: 14,
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {o.adTitle}
                    </div>
                    <Badge text={st.label} tone={st.tone} />
                    <Badge text={role} tone="gray" />
                  </div>

                  <div style={{ marginTop: 8, color: "#555", display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <span><b>Price:</b> {fmtMoney(o.price, o.currency)}</span>
                    <span style={{ color: "#777", fontSize: 12 }}>
                      Updated: {fmtDate(o.updatedAt)}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ color: "#1e60ff", fontWeight: 900 }}>Open →</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}