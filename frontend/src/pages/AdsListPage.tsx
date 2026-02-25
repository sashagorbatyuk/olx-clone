import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getAds, getCategories } from "../features/ads/api";
import type { AdsListItem, Category } from "../features/ads/types";
import { apiUrl } from "../api/url";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString();
}

export function AdsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // filters from URL
  const search = searchParams.get("search") ?? "";
  const city = searchParams.get("city") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const sort = searchParams.get("sort") ?? "createdAt_desc";
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = 20;

  // UI state
  const [items, setItems] = useState<AdsListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // local inputs (so typing doesn't instantly refetch)
  const [searchInput, setSearchInput] = useState(search);
  const [cityInput, setCityInput] = useState(city);

  useEffect(() => {
  (async () => {
    try {
      const data = await getCategories();
      setCats(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load categories", e);
      setCats([]);
    }
  })();
}, []);

  const params = useMemo(() => {
    const p: any = { page, pageSize, sort };
    if (search) p.search = search;
    if (city) p.city = city;
    if (categoryId) p.categoryId = categoryId;
    return p;
  }, [search, city, categoryId, sort, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function applyFilters(next: Partial<Record<string, string>>) {
    const sp = new URLSearchParams(searchParams);
    // reset page when changing filters
    sp.set("page", "1");

    Object.entries(next).forEach(([k, v]) => {
      if (!v) sp.delete(k);
      else sp.set(k, v);
    });

    setSearchParams(sp);
  }

  function setPage(nextPage: number) {
    const sp = new URLSearchParams(searchParams);
    sp.set("page", String(nextPage));
    setSearchParams(sp);
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Ads</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
          gap: 8,
          alignItems: "end",
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Search</div>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="iphone, laptop..."
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>City</div>
          <input
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="Kyiv"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Category</div>
          <select
            value={categoryId}
            onChange={(e) => applyFilters({ categoryId: e.target.value })}
            style={{ width: "100%", padding: 8 }}
          >
            <option value="">All</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Sort</div>
          <select
            value={sort}
            onChange={(e) => applyFilters({ sort: e.target.value })}
            style={{ width: "100%", padding: 8 }}
          >
            <option value="createdAt_desc">Newest</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
          </select>
        </div>

        <button
          onClick={() => applyFilters({ search: searchInput.trim(), city: cityInput.trim() })}
          style={{ padding: "8px 12px" }}
        >
          Apply
        </button>
      </div>

      <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.7 }}>
        {loading ? "Loading..." : `Found: ${total}`}
      </div>

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
        {items.map((x) => (
          <li key={x.id} style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ width: 140, height: 100, background: "#f3f3f3", overflow: "hidden", borderRadius: 8 }}>
                {x.mainPhotoUrl ? (
                  <img
                    src={apiUrl(x.mainPhotoUrl)}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : null}
              </div>

              <div style={{ flex: 1 }}>
                <Link to={`/ads/${x.id}`} style={{ fontWeight: 700, textDecoration: "none" }}>
                  {x.title}
                </Link>

                <div style={{ marginTop: 6, fontSize: 14 }}>
                  <b>
                    {x.price} {x.currency}
                  </b>
                </div>

                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  {x.city} • {formatDate(x.createdAt)}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Prev
        </button>
        <div style={{ padding: "6px 10px" }}>
          Page {page} / {totalPages}
        </div>
        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}