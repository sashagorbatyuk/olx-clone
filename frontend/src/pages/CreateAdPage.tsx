import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories, type Category } from "../api/categories";
import { createAd, uploadAdPhoto } from "../features/ads/api";
import type { AdCondition } from "../features/ads/types";

export function CreateAdPage() {
  const nav = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [currency, setCurrency] = useState("UAH");
  const [city, setCity] = useState("");
  const [condition, setCondition] = useState<AdCondition>(1);
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  async function onCreate() {
    setErr(null);
    setBusy(true);
    try {
      if (!categoryId) throw new Error("Pick category");
      if (!title.trim()) throw new Error("Title required");
      if (!city.trim()) throw new Error("City required");

      const created = await createAd({
        categoryId,
        title,
        description,
        price: Number(price),
        currency,
        city,
        condition,
      });

      const adId = created.id;

      if (files && files.length > 0) {
        // завантажимо перші 10
        const arr = Array.from(files).slice(0, 10);
        for (const f of arr) {
          await uploadAdPhoto(adId, f);
        }
      }

      nav(`/ads/${adId}`);
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <h1>Create Ad</h1>

      {err && <div style={{ background: "#fee", padding: 10, borderRadius: 8, marginBottom: 10 }}>{String(err)}</div>}

      <div style={{ display: "grid", gap: 10 }}>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ padding: 8 }}>
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={{ padding: 8 }} />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={5}
          style={{ padding: 8 }}
        />

        <input
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          type="number"
          placeholder="Price"
          style={{ padding: 8 }}
        />

        <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="Currency" style={{ padding: 8 }} />

        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" style={{ padding: 8 }} />

        <select value={condition} onChange={(e) => setCondition(Number(e.target.value) as AdCondition)} style={{ padding: 8 }}>
          <option value={0}>New</option>
          <option value={1}>Used</option>
        </select>

        <input type="file" multiple accept="image/*" onChange={(e) => setFiles(e.target.files)} />

        <button disabled={busy} onClick={onCreate}>
          {busy ? "Creating..." : "Create"}
        </button>
      </div>
    </div>
  );
}