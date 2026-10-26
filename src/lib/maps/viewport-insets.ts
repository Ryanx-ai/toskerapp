export type ViewportInsets = { top:number; right:number; bottom:number; left:number };

/** Keep at least a small usable camera rectangle even with large text/overlays.
 * This bounds fit math only; it does not hide or shrink accessible controls. */
export function boundedMapInsets(width:number,height:number,input:ViewportInsets):ViewportInsets {
  const finite=(n:number)=>Number.isFinite(n)?Math.max(0,n):0;
  const pair=(a:number,b:number,total:number)=>{
    const first=finite(a),second=finite(b),available=Math.max(0,finite(total)-80);
    const scale=first+second>available?available/(first+second):1;
    return [first*scale,second*scale];
  };
  const [left,right]=pair(input.left,input.right,width),[top,bottom]=pair(input.top,input.bottom,height);
  return {left,right,top,bottom};
}
