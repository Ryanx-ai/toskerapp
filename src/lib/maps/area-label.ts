import { validWorldPoint } from "./place-projection";
export type RegionData = { features: { properties: { REGION_N: string }; geometry: { type: "MultiPolygon"; coordinates: number[][][][] } }[] };
export const REGION_DATA_PATH = "/geography/sg-ura-mp2019-regions.geojson";
export const REGION_SOURCE = "https://data.gov.sg/datasets/d_bf4d24df9129d5a8ff8cf82e20959ee0/view";
export const REGION_LICENSE = "https://data.gov.sg/open-data-licence";
const names: Record<string,string> = {"WEST REGION":"Singapore West","CENTRAL REGION":"Singapore Central","EAST REGION":"Singapore East","NORTH REGION":"Singapore North","NORTH-EAST REGION":"Singapore North-East"};
function insideRing(longitude:number,latitude:number,ring:number[][]) {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const [x,y]=ring[i],[px,py]=ring[j];
    if((y>latitude)!==(py>latitude)&&longitude<(px-x)*(latitude-y)/(py-y)+x)inside=!inside;
  }
  return inside;
}
/** Exact published polygons, including island rings and holes. Never guessed rectangles. */
export function singaporeArea(data:RegionData,latitude:number,longitude:number):string|null {
  if(!validWorldPoint(latitude,longitude))return null;
  for(const feature of data.features) if(feature.geometry.type==="MultiPolygon"&&feature.geometry.coordinates.some(rings=>insideRing(longitude,latitude,rings[0])&&!rings.slice(1).some(r=>insideRing(longitude,latitude,r))))return names[feature.properties.REGION_N]??null;
  return null;
}
/** Provider hierarchy only; never formatted address, street, postcode or coordinates. */
export function projectBroadArea(value:Record<string,unknown>):string|null {
  if(!["city","state","country"].includes(String(value.result_type)))return null;
  const field=value.result_type==="city"?value.city:value.result_type==="state"?value.state:value.country;
  return typeof field==="string"&&field.trim()?field.replace(/[\u0000-\u001F]/g," ").trim().slice(0,100):null;
}
