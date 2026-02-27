import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAds } from "../features/ads/api";
import type { AdsListItem } from "../features/ads/types";
import { AdCard } from "../components/AdCard";
import { getCategories, type Category } from "../api/categories";

export function AdsExplorePage() {
  const [sp, setSp] = useSearchParams();

  const [items, setItems] = useState<AdsListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // читаємо зі строки
  const search = sp.get("search") ?? "";
  const categoryId = sp.get("categoryId") ?? "";
  const city = sp.get("city") ?? "";
  const page = Number(sp.get("page") ?? "1") || 1;

  const isFiltered = useMemo(
    () => Boolean(search.trim() || categoryId || city.trim()),
    [search, categoryId, city]
  );

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(sp);
    if (!value) next.delete(key);
    else next.set(key, value);
    // при зміні фільтра — page=1
    if (key !== "page") next.set("page", "1");
    setSp(next);
  }

  async function load() {
    const data = await getAds({
      search: search.trim() || undefined,
      categoryId: categoryId || undefined,
      city: city.trim() || undefined,
      page,
      pageSize: isFiltered ? 20 : 12,
      sort: "createdAt_desc",
    });
    setItems(data.items);
  }

  useEffect(() => {
    getCategories()
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryId, city, page]);

  return (
    <div className="container">
      <div className="pageTitle">
        <div>
          <div className="h2">{isFiltered ? "Результати" : "Усі оголошення"}</div>
          <div className="sub">Фільтруй і знаходь потрібне</div>
        </div>
      </div>

      {/* Filters panel */}
      <div className="card panel" style={{ marginBottom: 14 }}>
        <div className="row2">
          <div>
            <div className="label">Search</div>
            <input
              className="input"
              value={search}
              onChange={(e) => setParam("search", e.target.value)}
              placeholder="Що шукаєте?"
            />
          </div>

          <div>
            <div className="label">City</div>
            <input
              className="input"
              value={city}
              onChange={(e) => setParam("city", e.target.value)}
              placeholder="Уся Україна / Київ / Львів..."
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="label">Category</div>
          <select
            className="select"
            value={categoryId}
            onChange={(e) => setParam("categoryId", e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn"
            onClick={() => setSp(new URLSearchParams())}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Ads */}
      <div className={isFiltered ? "list" : "grid"}>
        {items.map((ad) => (
          <AdCard key={ad.id} ad={ad} variant={isFiltered ? "list" : "grid"} />
        ))}
      </div>

      {/* Paging */}
      <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
        <button
          className="btn"
          disabled={page <= 1}
          onClick={() => setParam("page", String(page - 1))}
        >
          Prev
        </button>

        <div className="muted" style={{ paddingTop: 10, fontWeight: 900 }}>
          Page {page}
        </div>

        <button
          className="btn"
          onClick={() => setParam("page", String(page + 1))}
        >
          Next
        </button>
      </div>
    </div>
  );
}