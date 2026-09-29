/** Public basemap configuration only. Server search credentials must never enter this module. */
export type BrowserMapProvider = {
  id: "geoapify";
  styleUrl: string;
  attribution: string;
};

export const SINGAPORE_CENTER: [number, number] = [103.8198, 1.3521];

// Keeping provider URLs/credits here allows the renderer and future canonical places
// to survive a provider change without leaking vendor details into Room services.
export function getBrowserMapProvider(key = process.env.NEXT_PUBLIC_GEOAPIFY_MAP_KEY): BrowserMapProvider | null {
  if (!key || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) return null;
  return {
    id: "geoapify",
    styleUrl: `https://maps.geoapify.com/v1/styles/dark-matter/style.json?apiKey=${encodeURIComponent(key)}`,
    attribution: '<a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a> | <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> | <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>',
  };
}
