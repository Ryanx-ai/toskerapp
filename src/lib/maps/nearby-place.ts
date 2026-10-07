export function nearbyMetres(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number}) {
  const rad=Math.PI/180,dy=(b.latitude-a.latitude)*rad,dx=(b.longitude-a.longitude)*rad;
  const h=Math.sin(dy/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dx/2)**2;
  return 6371000*2*Math.asin(Math.min(1,Math.sqrt(h)));
}
/** Named amenity/building only, never an address inferred to be a business. */
export function credibleNearby(value:Record<string,unknown>,origin:{latitude:number;longitude:number}) {
  return typeof value.name==="string"&&value.name.trim().length>0&&["amenity","building"].includes(String(value.result_type))&&typeof value.lat==="number"&&typeof value.lon==="number"&&nearbyMetres(origin,{latitude:value.lat,longitude:value.lon})<=20;
}
