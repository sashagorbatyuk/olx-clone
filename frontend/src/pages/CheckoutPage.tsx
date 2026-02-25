import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getAdById } from "../features/ads/api";
import { createOrderByAd, saveOrderShipping } from "../api/orders";

type Photo = { id: string; url: string; sortOrder: number };

type AdDetails = {
  id: string;
  userId: string;
  title: string;
  price: number;
  currency: string;
  city: string;
  photos: Photo[];
};

export function CheckoutPage() {
  const { adId } = useParams();
  const nav = useNavigate();
  const API = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5015", []);

  const [ad, setAd] = useState<AdDetails | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // shipping
  const [method, setMethod] = useState(0); // 0 meetup, 1 post, 2 courier
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [carrier, setCarrier] = useState("");

  useEffect(() => {
    if (!adId) {
      setErr("No adId in route. Use /checkout/:adId");
      return;
    }

    setErr(null);
    setAd(null);

    getAdById(adId)
      .then((d: any) => {
        const photos: Photo[] = Array.isArray(d?.photos)
          ? d.photos.map((p: any) => ({
              id: p.id,
              url: p.url,
              sortOrder: Number(p.sortOrder ?? 0),
            }))
          : [];

        const normalized: AdDetails = {
          id: d.id,
          userId: d.userId,
          title: d.title ?? "",
          price: Number(d.price ?? 0),
          currency: d.currency ?? "UAH",
          city: d.city ?? "",
          photos,
        };

        setAd(normalized);
        setShipCity(normalized.city); // дефолт
      })
      .catch((e: any) => setErr(e?.response?.data ?? e?.message ?? "Failed to load ad"));
  }, [adId]);

  async function onConfirm() {
    if (!ad) return;

    setErr(null);
    setBusy(true);
    try {
      // 1) create order
      const created = await createOrderByAd(ad.id);
      const orderId = created?.id;
      if (!orderId) throw new Error("Order created but no id returned.");

      // 2) save shipping
      await saveOrderShipping(orderId, {
        method,
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        city: shipCity.trim(),
        addressLine: addressLine.trim(),
        carrier: carrier.trim() ? carrier.trim() : null,
      });

      nav(`/orders/${orderId}`);
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  const mainPhoto = ad?.photos?.slice().sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url ?? null;

  const valid =
    recipientName.trim().length >= 2 &&
    recipientPhone.trim().length >= 5 &&
    shipCity.trim().length >= 2 &&
    ((method === 1 || method === 2) ? addressLine.trim().length >= 3 : true);

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 10 }}>
        <Link to={adId ? `/ads/${adId}` : "/"}>← Back to ad</Link>
      </div>

      <h1>Checkout</h1>

      {err && <div style={{ background: "#fee", padding: 10, borderRadius: 8, marginBottom: 10 }}>{String(err)}</div>}
      {!ad && !err && <div>Loading...</div>}

      {ad && (
        <>
          <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div
                style={{
                  width: 160,
                  height: 100,
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#eee",
                  border: "1px solid #ddd",
                }}
              >
                {mainPhoto ? (
                  <img src={`${API}${mainPhoto}`} alt="ad" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : null}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{ad.title}</div>
                <div style={{ marginTop: 6 }}>
                  <b>{ad.price}</b> {ad.currency} • {ad.city}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Delivery</div>

            <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
              <select value={method} onChange={(e) => setMethod(Number(e.target.value))} style={{ padding: 8 }} disabled={busy}>
                <option value={0}>Meetup</option>
                <option value={1}>Post</option>
                <option value={2}>Courier</option>
              </select>

              <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Recipient name" style={{ padding: 8 }} disabled={busy} />
              <input value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="Recipient phone" style={{ padding: 8 }} disabled={busy} />
              <input value={shipCity} onChange={(e) => setShipCity(e.target.value)} placeholder="City" style={{ padding: 8 }} disabled={busy} />

              {(method === 1 || method === 2) && (
                <input
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder={method === 1 ? "Post office / address" : "Courier address"}
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

              <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Carrier (optional)" style={{ padding: 8 }} disabled={busy} />

              <button
                disabled={busy || !valid}
                onClick={onConfirm}
                style={{ padding: "10px 12px", borderRadius: 10 }}
              >
                {busy ? "Processing..." : "Confirm purchase"}
              </button>

              <div style={{ color: "#666", fontSize: 12 }}>
                After confirmation the seller must accept your order.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}