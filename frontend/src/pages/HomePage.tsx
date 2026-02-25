import { useEffect, useMemo, useState } from "react";
import { getAds } from "../features/ads/api";
import type { AdsListItem } from "../features/ads/types";
import { AdCard } from "../components/AdCard";
import { getCategories, type Category } from "../api/categories";


export function HomePage() {
  const [items, setItems] = useState<AdsListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [city, setCity] = useState("");
  const [page, setPage] = useState(1);

  const isFiltered = useMemo(
    () => Boolean(search.trim() || categoryId || city.trim()),
    [search, categoryId, city]
  );

  async function load(pageToLoad = page) {
    const data = await getAds({
      search: search.trim() || undefined,
      categoryId: categoryId || undefined,
      city: city.trim() || undefined,
      page: pageToLoad,
      pageSize: isFiltered ? 20 : 12, // list трохи більше, grid компактно
      sort: "createdAt_desc",
    });
    setItems(data.items);
  }

  useEffect(() => {
    getCategories()
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  // завантаження при зміні page
  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div>
      <h1>Ads</h1>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          style={{ padding: 8, minWidth: 220 }}
        />

        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ padding: 8 }}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          style={{ padding: 8, minWidth: 160 }}
        />

        <button
          onClick={() => {
            setPage(1);
            load(1);
          }}
        >
          Apply
        </button>

        {isFiltered && (
          <button
            onClick={() => {
              setSearch("");
              setCategoryId("");
              setCity("");
              setPage(1);
              // load after state updates
              setTimeout(() => load(1), 0);
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* OLX-like: grid when no filters, list when searching */}
      <div className={isFiltered ? "list" : "grid"}>
        {items.map((ad) => (
          <AdCard key={ad.id} ad={ad} variant={isFiltered ? "list" : "grid"} />
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Prev
        </button>
        <div style={{ paddingTop: 6 }}>Page {page}</div>
        <button onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
}