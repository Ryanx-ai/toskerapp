import type { PlaceIcon } from "@/lib/trip-contract";

/** Simple outlined symbols shared by React cards and stable MapLibre markers. */
export const PLACE_SYMBOL_PATHS: Record<PlaceIcon, string[]> = {
  destination: ["M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z", "M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"],
  checkpoint: ["M5 22V3", "M5 3c5-4 9 4 14 0v10c-5 4-9-4-14 0"],
  home: ["m3 10 9-7 9 7", "M5 9v12h14V9", "M9 21v-8h6v8"],
  work: ["M3 7h18v14H3Z", "M8 7V3h8v4", "M3 12h18", "M10 12v3h4v-3"],
  food: ["M4 3v6c0 3 6 3 6 0V3", "M7 3v18", "M20 21V3c-4 2-5 7-5 10h5"],
  stay: ["M3 18v3m18-3v3M3 18V8h18v10H3Z", "M3 13h18", "M7 13V8m5 5V8"],
  activity: ["M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z", "m16 8-3 5-5 3 3-5 5-3Z"],
  favourite: ["M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"],
  meetup: ["M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z", "M2 21v-3a6 6 0 0 1 12 0v3", "M17 3a4 4 0 0 1 0 8m2 3a5 5 0 0 1 3 4v3"],
};
