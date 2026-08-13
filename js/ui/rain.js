import { ITEM_SPRITES } from "../core/sprites.js";
import { $ } from "./dom.js";

const rainCv=$("rain"),rctx=rainCv.getContext("2d"),colMok=$("colMok");
export function sizeRain(){rainCv.width=colMok.clientWidth;rainCv.height=colMok.clientHeight;}
const ITEMS=[];const MAXI=140;
export function addItem(burstX,burstY){if(ITEMS.length>=MAXI||!ITEM_SPRITES.length)return;const w=rainCv.width||300;
  if(burstX!=null)ITEMS.push({x:burstX,y:burstY,vy:-2-Math.random()*2.5,vx:(Math.random()-0.5)*3.2,idx:(Math.random()*ITEM_SPRITES.length)|0,sz:16+Math.random()*12,g:0.14});
  else ITEMS.push({x:Math.random()*w,y:-16,vy:0.9+Math.random()*1.7,vx:(Math.random()-0.5)*0.4,idx:(Math.random()*ITEM_SPRITES.length)|0,sz:16+Math.random()*14,g:0});}
export function stepRain(k){rctx.clearRect(0,0,rainCv.width,rainCv.height);rctx.imageSmoothingEnabled=false;rctx.globalAlpha=0.92;for(let i=ITEMS.length-1;i>=0;i--){const p=ITEMS[i];if(p.g)p.vy+=p.g*k;p.x+=p.vx*k;p.y+=p.vy*k;if(p.y>rainCv.height+20){ITEMS.splice(i,1);continue;}rctx.drawImage(ITEM_SPRITES[p.idx],p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);}rctx.globalAlpha=1;}
