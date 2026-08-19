import { state } from "../core/state.js";
import { fmt, fmtTime } from "../core/format.js";
import { rankOf, rebirthReq, canRebirth } from "../core/formulas.js";
import { fanfare, chime } from "../core/audio.js";
import { ACH } from "../data/achievements.js";
import { NEWS, WORLD_NEWS } from "../data/content.js";
import { $, tk, achEls, shake, toastEl } from "./dom.js";

export function check(){
  const s=state.s;
  let un=false;
  ACH.forEach(a=>{if(!s.got[a.id]&&a.c(s)){s.got[a.id]=1;s.gou+=a.k;toastEl("","実績解除",a.n,a.k>0?"業 +"+a.k:"業には非ず");un=true;}});
  if(un){state.dirty=true;fanfare();}
  return un;
}

export function renderStats(){
  const s=state.s;
  $("stClicks").textContent=fmt(s.clicks);$("stTotal").textContent=fmt(s.total);$("stFever").textContent=fmt(s.feversDone);$("stHouyou").textContent=fmt(s.houyous);$("stCrit").textContent=fmt(s.crits);$("stReb").textContent=fmt(s.rebirths);$("stCombo").textContent=fmtTime(s.maxComboMs);
  let got=0;ACH.forEach(a=>{if(s.got[a.id]){got++;const e=achEls[a.id];if(!e.el.classList.contains("got")){e.el.classList.add("got");e.name.textContent=a.n;}}});$("achCount").textContent=got+"/"+ACH.length;
}

const cNum=$("cNum");let prevCount="";
export function setCount(cs){if(cs===prevCount)return;prevCount=cs;cNum.textContent=cs;const kn=(cs.match(/[^0-9]/g)||[]).length,dg=cs.length-kn,wt=kn*1.05+dg*0.6;cNum.style.fontSize=Math.max(20,Math.min(54,Math.floor(300/Math.max(wt,3))))+"px";}

let prevReb=-1;
export function updateRebirth(){const ok=canRebirth(),key=ok?1:0;if(key===prevReb&&ok)return;prevReb=key;const rb=$("rebirth");
  if(ok){rb.className="rebirth ready";rb.innerHTML=`天に召される（転生）<b>功徳 +1（永続 +${Math.round(state.up.kudokuVal*100)}%／回）</b>`;}
  else{rb.className="rebirth locked";rb.innerHTML=`転生には 累計 ${fmt(rebirthReq())} 必要<b>いま ${fmt(state.s.total)}</b>`;}}

function celebrateRank(){const el=$("rank");el.classList.remove("up");void el.offsetWidth;el.classList.add("up");chime();shake();toastEl("rank","位が上がった",rankOf(),"新たな称号を授かった");}

let prevRankI=-1;
export function initRank(ri){prevRankI=ri;}
export function checkRankChange(ri){if(ri!==prevRankI){if(prevRankI>=0&&ri>prevRankI)celebrateRank();prevRankI=ri;}}

const newsPool=NEWS.concat(WORLD_NEWS);
export function rotateNews(){tk.style.opacity="0";setTimeout(()=>{tk.innerHTML=newsPool[(Math.random()*newsPool.length)|0]();tk.style.opacity="1";},300);}
