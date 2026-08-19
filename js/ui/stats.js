import { state } from "../core/state.js";
import { fmt, fmtTime } from "../core/format.js";
import { rankOf, rebirthReq, canRebirth } from "../core/formulas.js";
import { fanfare, chime } from "../core/audio.js";
import { ACH } from "../data/achievements.js";
import { NEWS, WORLD_NEWS } from "../data/content.js";
import { $, tk, achEls, shake, toastEl } from "./dom.js";

export function check(){
  const s=state.s,shu=s.faction==="shu";
  let un=false;
  ACH.forEach(a=>{if(!s.got[a.id]&&a.c(s)){s.got[a.id]=1;s.gou+=a.k;toastEl("","実績解除",shu&&a.nShu?a.nShu:a.n,a.k>0?"業 +"+a.k:"業には非ず");un=true;}});
  if(un){state.dirty=true;fanfare();}
  return un;
}

export function renderStats(){
  const s=state.s,shu=s.faction==="shu";
  $("stClicks").textContent=fmt(s.clicks);$("stTotal").textContent=fmt(s.total);$("stFever").textContent=fmt(s.feversDone);$("stHouyou").textContent=fmt(s.houyous);$("stCrit").textContent=fmt(s.crits);$("stReb").textContent=fmt(s.rebirths);$("stCombo").textContent=fmtTime(s.maxComboMs);
  let got=0;ACH.forEach(a=>{if(s.got[a.id]){got++;const e=achEls[a.id];if(!e.el.classList.contains("got")){e.el.classList.add("got");e.name.textContent=shu&&a.nShu?a.nShu:a.n;}}});$("achCount").textContent=got+"/"+ACH.length;
}

// タブ名・因縁ビューの見出し・統計ラベルを陣営別に切り替える。main.js起動時と陣営決定時(faction.js/room.js)から呼ぶ。
const FACTION_LABELS={
  kon:{tabGaran:"伽藍",tabInen:"因縁",sttitleStat:"因縁（統計）",sttitleAch:"獲得した実績",
    skClicks:"木魚を叩いた数",skTotal:"生産した煩悩（累計）",skFever:"フィーバー発動回数",skHouyou:"大法要の回数",skCrit:"会心を出した回数",skReb:"転生した回数",skCombo:"念仏コンボ最長持続"},
  shu:{tabGaran:"沼コレクション",tabInen:"戦績",sttitleStat:"戦績（統計）",sttitleAch:"解禁した実績",
    skClicks:"脳を叩いた数",skTotal:"生産した煩悩（累計）",skFever:"ドーパミンフィーバー回数",skHouyou:"祭り騒ぎの回数",skCrit:"メガヒットを出した回数",skReb:"転生した回数",skCombo:"グルーヴコンボ最長持続"},
};
export function applyFactionLabels(){
  const t=FACTION_LABELS[state.s.faction==="shu"?"shu":"kon"];
  for(const id in t)$(id).textContent=t[id];
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
