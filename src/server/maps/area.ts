import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { singaporeArea, type RegionData } from "@/lib/maps/area-label";
/** Public boundary dataset cache only: never cache positions or lookup results. */
let regions:Promise<RegionData>|undefined;
export async function localArea(latitude:number,longitude:number) {
  regions??=readFile(path.join(process.cwd(),"public/geography/sg-ura-mp2019-regions.geojson"),"utf8").then(text=>JSON.parse(text) as RegionData);
  return singaporeArea(await regions,latitude,longitude);
}
