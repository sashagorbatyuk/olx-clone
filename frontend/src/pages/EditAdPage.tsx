import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCategories, type Category } from "../api/categories";
import {
  getAdById,
  updateAd,
  uploadAdPhoto,
  deleteAdPhoto,
  setMainAdPhoto,
} from "../features/ads/api";
import type { AdCondition } from "../features/ads/types";

type Photo = { id: string; url: string; sortOrder: number };

export function EditAdPage() {
  const { id } = useParams();
  const nav = useNavigate();

  // IMPORTANT: твій бекенд віддає фото як "/uploads/..", тому тут має бути base API URL
  const API = useMemo(() => (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5015"), []);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [currency, setCurrency] = useState("UAH");
  const [city, setCity] = useState("");
  const [condition, setCondition] = useState<AdCondition>(1);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [newFiles, setNewFiles] = useState<FileList | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [photoBusy, setPhotoBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  async function reloadPhotos() {
    if (!id) return;
    const ad = await getAdById(id);
    // ad.photos має бути масивом { id, url, sortOrder }
    setPhotos((ad.photos ?? []) as Photo[]);
  }

  useEffect(() => {
    if (!id) return;

    setErr(null);
    getAdById(id)
      .then((ad) => {
        setCategoryId(ad.categoryId);
        setTitle(ad.title);
        setDescription(ad.description);
        setPrice(ad.price);
        setCurrency(ad.currency || "UAH");
        setCity(ad.city);
        setCondition(ad.condition);

        setPhotos((ad.photos ?? []) as Photo[]);
      })
      .catch((e) => setErr(e?.response?.data ?? e?.message ?? "Failed to load ad"));
  }, [id]);

  useEffect(() => {
    // якщо сервер віддає photos — цього може бути достатньо,
    // але reloadPhotos гарантує, що після будь-яких змін фото UI підтягне актуальний стан
    if (!id) return;
    reloadPhotos().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onUploadPhotos() {
    if (!id) return;
    if (!newFiles || newFiles.length === 0) return;

    setPhotoBusy(true);
    setErr(null);
    try {
      const arr = Array.from(newFiles).slice(0, 10);
      for (const f of arr) {
        await uploadAdPhoto(id, f);
      }
      setNewFiles(null);
      setFileInputKey((k) => k + 1);
      await reloadPhotos();
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Upload failed");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function onDeletePhoto(photoId: string) {
    if (!id) return;
    if (!confirm("Delete this photo?")) return;

    setPhotoBusy(true);
    setErr(null);
    try {
      await deleteAdPhoto(id, photoId);
      await reloadPhotos();
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Delete photo failed");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function onSetMain(photoId: string) {
    if (!id) return;

    setPhotoBusy(true);
    setErr(null);
    try {
      await setMainAdPhoto(id, photoId);
      await reloadPhotos();
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Set main failed");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function onSave() {
    if (!id) return;
    setErr(null);
    setBusy(true);

    try {
      if (!categoryId) throw new Error("Pick category");
      if (!title.trim()) throw new Error("Title required");
      if (!city.trim()) throw new Error("City required");

      await updateAd(id, {
        categoryId,
        title,
        description,
        price: Number(price),
        currency,
        city,
        condition,
      });

      nav(`/ads/${id}`);
    } catch (e: any) {
      setErr(e?.response?.data ?? e?.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <h1>Edit Ad</h1>

      {err && (
        <div style={{ background: "#fee", padding: 10, borderRadius: 8, marginBottom: 10 }}>
          {String(err)}
        </div>
      )}

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

        <div style={{ display: "flex", gap: 10 }}>
          <button disabled={busy} onClick={onSave}>
            {busy ? "Saving..." : "Save"}
          </button>
          <button onClick={() => nav(-1)} disabled={busy}>
            Cancel
          </button>
        </div>

        <hr style={{ margin: "18px 0" }} />
        <h2 style={{ marginBottom: 8 }}>Photos</h2>

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
          <input
            key={fileInputKey}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setNewFiles(e.target.files)}
          />
          <button onClick={onUploadPhotos} disabled={photoBusy || !newFiles || newFiles.length === 0}>
            {photoBusy ? "Working..." : "Upload"}
          </button>
        </div>

        {photos.length === 0 && <div style={{ color: "#666" }}>No photos yet.</div>}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {photos
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((p, idx) => (
              <div key={p.id} style={{ width: 220 }}>
                <div
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 10,
                    overflow: "hidden",
                    width: 220,
                    height: 160,
                    background: "#f5f5f5",
                  }}
                >
                  <img
                    src={`${API}${p.url}`}
                    alt="photo"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={() => {
                      console.log("Image failed to load:", `${API}${p.url}`);
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={() => onSetMain(p.id)} disabled={photoBusy} title="Make main">
                    {idx === 0 ? "Main" : "Set main"}
                  </button>

                  <button onClick={() => onDeletePhoto(p.id)} disabled={photoBusy}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}