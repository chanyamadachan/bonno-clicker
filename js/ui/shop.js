import { state, activeBuildings, inactiveBuildings, upgCount } from "../core/state.js";
import { costOf, maxAff, revealed, computeUp } from "../core/formulas.js";
import { fmt, fmtRate } from "../core/format.js";
import { pok, chime } from "../core/audio.js";
import { SPRITE_URL, SPRITE_SIL } from "../core/sprites.js";
import { UP } from "../data/upgrades.js";
import { $, rows, upRows, upTeaser } from "./dom.js";
import { upgForBld } from "./scenery.js";
import { renderScenery } from "./scenery.js";
import { check } from "./stats.js";

export function buyN(b){const s=state.s;if(!revealed(b))return;let q=state.buyQty==="max"?maxAff(b):state.buyQty;if(q<1)return;const c=costOf(b,q);if(s.bonno<c)return;s.bonno-=c;s.own[b.id]+=q;pok();state.dirty=true;check();}
export function buyUpg(u){const s=state.s;if(s.upg[u.id]||!u.cond(s)||s.bonno<u.cost)return;s.bonno-=u.cost;s.upg[u.id]=1;computeUp();chime();state.dirty=true;check();}

export function renderShop(){
  const s=state.s,up=state.up;
  let teaserShown=false;
  activeBuildings().forEach(b=>{const r=rows[b.id];
    if(revealed(b)){r.revealed=true;if(r.mode!=="live"){r.mode="live";if(SPRITE_URL[b.id])r.icon.style.backgroundImage="url("+SPRITE_URL[b.id]+")";r.nameEl.textContent=b.name;r.prog.style.width="0";}
      let q=state.buyQty==="max"?Math.max(1,maxAff(b)):state.buyQty;const cost=costOf(b,q),owned=s.own[b.id];r.costVal=cost;const aff=s.bonno>=cost;r.aff=aff;
      r.el.className="bld"+(aff?" afford":" cant");r.cnt.textContent=owned||"";const _pm=up.bld[b.id]/Math.pow(2,upgForBld(b.id));r.rate.textContent=`1つ ${fmtRate(b.cps*up.bld[b.id]*state.curMult)} 煩悩／秒`+(_pm>1.001?`（特典×${Math.round(_pm)}）`:"");
      r.cost.textContent=fmt(cost)+(state.buyQty==="max"?`  (×${maxAff(b)})`:state.buyQty>1?`  (×${state.buyQty})`:"");r.cost.className="cost"+(aff?"":" no");r.own.textContent="所持 "+owned;}
    else if(!teaserShown){teaserShown=true;r.revealed=false;if(r.mode!=="lock"){r.mode="lock";if(SPRITE_SIL[b.id])r.icon.style.backgroundImage="url("+SPRITE_SIL[b.id]+")";}
      r.el.className="bld locked";r.cnt.textContent="";r.nameEl.textContent="？？？？？";r.rate.textContent="もっと徳を積むと現れる";r.cost.textContent="？？？";r.cost.className="cost";r.own.textContent="";r.prog.style.width=Math.min(100,s.total/(b.base*0.3)*100).toFixed(0)+"%";}
    else{r.revealed=false;r.el.className="bld hide";}});
  // 陣営を選び直した/選ぶ前に描画された、非対象側の発生源行の残留表示を毎回掃除する。
  inactiveBuildings().forEach(b=>{const r=rows[b.id];if(r.el.className!=="bld hide"){r.el.className="bld hide";r.revealed=false;r.mode="";}});
  UP.forEach(u=>{const r=upRows[u.id],vis=!s.upg[u.id]&&u.cond(s);r.visible=vis;if(!vis){r.el.className="bld up hide";return;}const aff=s.bonno>=u.cost;r.aff=aff;r.el.className="bld up"+(aff?" afford":" cant");r.cost.textContent=fmt(u.cost);r.cost.className="cost"+(aff?"":" no");});
  const locked=UP.some(u=>!s.upg[u.id]&&!u.cond(s));upTeaser.className="bld up locked"+(locked?"":" hide");
  let buyable=0;UP.forEach(u=>{if(upRows[u.id].visible&&upRows[u.id].aff)buyable++;});$("upCount").textContent="取得 "+upgCount()+(buyable>0?"　買える "+buyable:"");
  renderScenery();
}

export function updateAfford(){
  const s=state.s;
  activeBuildings().forEach(b=>{const r=rows[b.id];if(!r.revealed)return;const a=s.bonno>=r.costVal;if(a!==r.aff){r.aff=a;r.el.classList.toggle("afford",a);r.el.classList.toggle("cant",!a);}});
  UP.forEach(u=>{const r=upRows[u.id];if(!r.visible)return;const a=s.bonno>=u.cost;if(a!==r.aff){r.aff=a;r.el.classList.toggle("afford",a);r.el.classList.toggle("cant",!a);}});
}
