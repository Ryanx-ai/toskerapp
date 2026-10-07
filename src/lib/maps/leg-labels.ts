/** Halfway along geometry, not halfway between endpoints (curved roads). */
export function legMidpoint(points:number[][]): [number,number] | null {
  if(points.length<2)return null;
  const lengths=points.slice(1).map((p,i)=>Math.hypot((p[0]-points[i][0])*Math.cos(p[1]*Math.PI/180),p[1]-points[i][1]));
  const total=lengths.reduce((a,b)=>a+b,0);if(!Number.isFinite(total)||total<=0)return null;
  let left=total/2;
  for(let i=0;i<lengths.length;i++){if(left<=lengths[i]&&lengths[i]>0){const t=left/lengths[i];return [points[i][0]+t*(points[i+1][0]-points[i][0]),points[i][1]+t*(points[i+1][1]-points[i][1])];}left-=lengths[i];}
  return null;
}
