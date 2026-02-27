// frontend/src/features/categories/icons.ts
// Map category NAME -> local icon image (png/svg) for HomePage circles.
// Put your files here: frontend/src/assets/categories/*
// Names below match your current categories list exactly.

import animals from "../../assets/categories/animals.png";
import auto from "../../assets/categories/auto.png";
import businessServices from "../../assets/categories/business-services.png";
import electronics from "../../assets/categories/electronics.png";
import exchange from "../../assets/categories/exchange.png";
import fashionStyle from "../../assets/categories/fashion-style.png";
import freeStuff from "../../assets/categories/free-stuff.png";
import help from "../../assets/categories/help.png";
import hobbiesLeisureSports from "../../assets/categories/hobbies-leisure-sports.png";
import homeGarden from "../../assets/categories/home-garden.png";
import jobs from "../../assets/categories/jobs.png";
import kids from "../../assets/categories/kids.png";
import realEstate from "../../assets/categories/real-estate.png";
import rentals from "../../assets/categories/rentals.png";
import shortTermRentals from "../../assets/categories/short-term-rentals.png";
import spareParts from "../../assets/categories/spare-parts.png";

/**
 * Exact category names from your DB -> icon path
 */
export const categoryIconByName: Record<string, string> = {
  "Animals": animals,
  "Auto": auto,
  "Business & Services": businessServices,
  "Electronics": electronics,
  "Exchange": exchange,
  "Fashion & Style": fashionStyle,
  "Free Stuff": freeStuff,
  "Help": help,
  "Hobbies, Leisure & Sports": hobbiesLeisureSports,
  "Home & Garden": homeGarden,
  "Jobs": jobs,
  "Kids": kids,
  "Real Estate": realEstate,
  "Rentals": rentals,
  "Short-term Rentals": shortTermRentals,
  "Spare Parts": spareParts,
};

/**
 * Optional: helper that safely returns icon or null
 */
export function getCategoryIcon(name?: string | null): string | null {
  if (!name) return null;
  return categoryIconByName[name] ?? null;
}