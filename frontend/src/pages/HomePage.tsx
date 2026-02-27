import { useEffect, useMemo, useState } from "react";
import { getAds } from "../features/ads/api";
import type { AdsListItem } from "../features/ads/types";
import { AdCard } from "../components/AdCard";
import { getCategories, type Category } from "../api/categories";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5015";

function IconSearch() {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none">
      <path
        d="M10.5 18a7.5 7.5 0 1 1 7.5-7.5A7.5 7.5 0 0 1 10.5 18Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M16.5 16.5 21 21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPin() {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 22s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 12a2.5 2.5 0 1 0-2.5-2.5A2.5 2.5 0 0 0 12 12Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function HomePage() {
  const [items, setItems] = useState<AdsListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const nav = useNavigate();

  // filters
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [city, setCity] = useState("");

  const [page, setPage] = useState(1);

  const isFiltered = useMemo(
    () => Boolean(search.trim() || categoryId || city.trim()),
    [search, categoryId, city]
  );

  // (для hero) простий список регіонів — можеш замінити на свій
  const regions = ["Уся Україна", "Київ", "Львів", "Одеса", "Дніпро", "Харків"];

  async function load(pageToLoad = page) {
    const data = await getAds({
      search: search.trim() || undefined,
      categoryId: categoryId || undefined,
      city: city.trim() || undefined,
      page: pageToLoad,
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
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function applyFilters() {
    setPage(1);
    // load(1) треба викликати одразу, бо setPage асинхронний
    load(1);
  }

  function resetFilters() {
    setSearch("");
    setCategoryId("");
    setCity("");
    setPage(1);
    // дати стейту оновитись
    setTimeout(() => load(1), 0);
  }

  return (
    <div className="homeHero">
      {/* HERO / Categories */}
      <div className="homeCanvas">
        {/* Search bar like OLX */}
        <div className="homeSearchWrap">
          <div className="homeSearchBar">
            <div className="homeSearchField">
              <IconSearch />
              <input
                className="homeSearchInput"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Що шукаєте?"
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyFilters();
                }}
              />
            </div>

            <div className="homeLocation">
              <IconPin />
              <select
                className="homeLocationSelect"
                value={city ? city : "Уся Україна"}
                onChange={(e) => {
                  const v = e.target.value;
                  setCity(v === "Уся Україна" ? "" : v);
                }}
              >
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <button className="homeSearchBtn" onClick={applyFilters}>
              Пошук <IconSearch />
            </button>
          </div>
        </div>

        <div className="homeTitle">Розділи на сервісі OLX</div>

        <div className="catsGrid">
          {/* "All categories" — як швидкий reset */}
          <div
            className="catItem"
            onClick={() => nav("/ads")}
            title="Усі категорії"
          >
            <div className="catCircle" style={{ background: "rgba(30,96,255,.10)" }}>
              <span style={{ fontWeight: 1000, color: "var(--primary)" }}>★</span>
            </div>
            <div className="catName">Усі</div>
          </div>

          {categories.map((c) => {
  const iconSrc = c.iconUrl ? `${API}${c.iconUrl}` : null;

  return (
    <div
      key={c.id}
      className="catItem"
      onClick={() => nav(`/ads?categoryId=${c.id}`)}
      title={c.name}
    >
      <div className="catCircle">
        {iconSrc ? (
          <img src={iconSrc} alt="" />
        ) : (
          <span className="catLetter">{c.name?.[0]?.toUpperCase() ?? "C"}</span>
        )}
      </div>
      <div className="catName">{c.name}</div>
    </div>
  );
})}
        </div>

        {/* Tiny filter hint / reset */}
        {isFiltered && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
            <button className="btn" onClick={resetFilters}>
              Скинути фільтри
            </button>
          </div>
        )}
      </div>

      {/* Ads section (your existing behavior) */}
      <div style={{ marginTop: 18 }}>
        <div className="pageTitle">
          <div>
            <div className="h2">{isFiltered ? "Результати пошуку" : "Свіжі оголошення"}</div>
            <div className="sub">
              {isFiltered
                ? "Відфільтровано за вашим запитом"
                : "Останні оголошення, відсортовані за датою"}
            </div>
          </div>

          {/* Optional quick controls */}
          <div className="row">
            {/* Category quick select (optional, but handy) */}
            <select
              className="select"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
                setTimeout(() => load(1), 0);
              }}
              style={{ minWidth: 220 }}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button className="btn btnPrimary" onClick={applyFilters}>
              Apply
            </button>
          </div>
        </div>

        <div className={isFiltered ? "list" : "grid"}>
          {items.map((ad) => (
            <AdCard key={ad.id} ad={ad} variant={isFiltered ? "list" : "grid"} />
          ))}
        </div>

        <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
          <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </button>
          <div className="muted" style={{ paddingTop: 10, fontWeight: 900 }}>
            Page {page}
          </div>
          <button className="btn" onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}