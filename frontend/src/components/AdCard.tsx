import { Link } from "react-router-dom";
import type { AdsListItem } from "../features/ads/types";

export function AdCard({
  ad,
  variant = "grid",
}: {
  ad: AdsListItem;
  variant?: "grid" | "list";
}) {
  const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5015";
  const img = ad.mainPhotoUrl ? `${API}${ad.mainPhotoUrl}` : null;

  if (variant === "list") {
    return (
      <Link to={`/ads/${ad.id}`} style={{ textDecoration: "none", color: "inherit" }}>
        <div className="row">
          <div className="rowMedia">{img ? <img src={img} alt="main" /> : null}</div>

          <div>
            <div className="rowTitle">{ad.title}</div>
            <div className="cardPrice">
              {ad.price} {ad.currency}
            </div>
            <div className="cardMeta">
              <span>{ad.city}</span>
              <span>•</span>
              <span>{new Date(ad.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // grid
  return (
    <Link to={`/ads/${ad.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="card">
        <div className="cardMedia">{img ? <img src={img} alt="main" /> : null}</div>

        <div className="cardBody">
          <div className="cardPrice">
            {ad.price} {ad.currency}
          </div>
          <div className="cardTitle">{ad.title}</div>
          <div className="cardMeta">
            <span>{ad.city}</span>
            <span>•</span>
            <span>{new Date(ad.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}