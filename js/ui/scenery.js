import { state, activeBuildings, activeLowids } from "../core/state.js";
import { houyouOn, lowCount, feverOn } from "../core/formulas.js";
import { fmtRate } from "../core/format.js";
import { bong } from "../core/audio.js";
import { SPRITE_URL, CHILL_URL } from "../core/sprites.js";
import { BUILDINGS } from "../data/buildings.js";
import { BUILDINGS_SHU } from "../data/buildings-shu.js";
import { UP } from "../data/upgrades.js";
import { UP_SHU } from "../data/upgrades-shu.js";
import { CHILL, MOKTIERS, MOKTIERS_SHU } from "../data/content.js";
import { $, zone, tip, scenery, shake, toastEl } from "./dom.js";
import { addItem } from "./rain.js";

let chillTier=-1;
export function renderChill(tier){if(tier===chillTier)return;const prev=chillTier;chillTier=tier;const box=$("chill");box.innerHTML="";
  CHILL.forEach(cfg=>{if(cfg.t>tier)return;const el=document.createElement("div");el.className="chillsp pix"+(cfg.t>prev?" pop":"");el.style.left=cfg.x+"%";el.style.top=cfg.y+"%";el.style.backgroundImage="url("+(CHILL_URL[cfg.k]||"")+")";el.style.animationDelay=(cfg.x%5*0.4)+"s";if(cfg.zzz)el.innerHTML='<span class="zzz">z</span>';box.appendChild(el);});}

// faction/feverの状態に応じてmokSvg・bellSvg・brainSvg・discoSvgの4枚から出すべき1枚を切り替える。
// applyMokTier(ティア変化)とevents.js(フィーバー開始/終了)の両方から呼ばれる。
export function updateClickVisual(){
  const shu=state.s.faction==="shu",fever=feverOn();
  $("mokSvg").style.display=(!shu&&!fever)?"":"none";
  $("bellSvg").style.display=(!shu&&fever)?"":"none";
  $("brainSvg").style.display=(shu&&!fever)?"":"none";
  $("discoSvg").style.display=(shu&&fever)?"":"none";
}
export function applyMokTier(t){
  const shu=state.s.faction==="shu";
  if(shu){const T=MOKTIERS_SHU[t];$("bg0").setAttribute("stop-color",T.body[0]);$("bg1").setAttribute("stop-color",T.body[1]);$("bg2").setAttribute("stop-color",T.body[2]);$("bJewel").setAttribute("fill",T.jewel);$("bOrnGold").style.display=T.gold?"":"none";$("bOrnSpark").style.display=T.flame?"":"none";$("bOrnEye").style.display=T.eye?"":"none";$("bOrnHalo").style.display=T.halo?"":"none";$("brainSvg").style.filter=T.glow||"";$("moktier").textContent=T.name;}
  else{const T=MOKTIERS[t];$("g0").setAttribute("stop-color",T.body[0]);$("g1").setAttribute("stop-color",T.body[1]);$("g2").setAttribute("stop-color",T.body[2]);$("jewel").setAttribute("fill",T.jewel);$("ornGold").style.display=T.gold?"":"none";$("ornFlame").style.display=T.flame?"":"none";$("ornEye").style.display=T.eye?"":"none";$("ornHalo").style.display=T.halo?"":"none";$("mokSvg").style.filter=T.glow||"";$("moktier").textContent=T.name;}
  updateClickVisual();renderChill(t);
}
export function tierUp(t){applyMokTier(t);bong(true);shake();const z=zone;z.classList.remove("morph");void z.offsetWidth;z.classList.add("morph");for(let i=0;i<20;i++)addItem();
  const shu=state.s.faction==="shu",T=shu?MOKTIERS_SHU[t]:MOKTIERS[t];
  toastEl("morph",shu?"脳が変化":"木魚が変化",T.name,shu?"ドーパミンが振り切れた":"桁が上がった");}

let scenerySig="",prevOwn={};BUILDINGS.forEach(b=>prevOwn[b.id]=0);BUILDINGS_SHU.forEach(b=>prevOwn[b.id]=0);
export function resetSceneryCache(){scenerySig="";chillTier=-1;}
export function upgForBld(id){return UP.concat(UP_SHU).filter(u=>u.eff.t==="bld"&&u.eff.id===id&&state.s.upg[u.id]).length;}

export function renderScenery(){
  const s=state.s,BUILDINGS=activeBuildings();
  const sig=BUILDINGS.map(b=>s.own[b.id]).join(",")+"|"+Object.keys(s.upg).sort().join(",");if(sig===scenerySig)return;scenerySig=sig;
  const active=BUILDINGS.filter(b=>s.own[b.id]>0);
  if(!active.length){scenery.innerHTML='<div class="midempty">まだ何もない。<br>右の「徳を積む」で発生源を買うと、<br>ここに姿が増えていく。</div>';BUILDINGS.forEach(b=>prevOwn[b.id]=0);return;}
  scenery.innerHTML="";
  active.forEach(b=>{const owned=s.own[b.id],ups=upgForBld(b.id),grew=owned>(prevOwn[b.id]||0),url=SPRITE_URL[b.id];
    const band=document.createElement("div");band.className="band"+(ups>0?" boosted":"")+(grew?" pulse":"");band.dataset.id=b.id;band.style.background="linear-gradient(180deg,"+b.band+"cc,"+b.band+"77)";
    const cap=40,show=Math.min(owned,cap);let sp="";for(let i=0;i<show;i++){sp+=`<div class="sp pix${ups>0?" boost":""}${grew&&i===show-1?" new":""}" style="background-image:url(${url})"></div>`;}if(owned>cap)sp+=`<div class="more">＋${owned-cap}</div>`;
    band.innerHTML=`<div class="bandhead"><span class="bi pix" style="background-image:url(${url})"></span><span class="bn">${b.name}</span>${ups>0?'<span class="ups">'+"✦".repeat(ups)+" 学び</span>":""}<span class="bc">×${owned}</span></div><div class="sprites">${sp}</div>`;
    scenery.appendChild(band);});
  BUILDINGS.forEach(b=>prevOwn[b.id]=s.own[b.id]);
}

export function initSceneryTooltip(){
  scenery.addEventListener("mousemove",e=>{const band=e.target.closest(".band");if(!band){tip.style.display="none";return;}
    const s=state.s,up=state.up;
    const b=activeBuildings().find(x=>x.id===band.dataset.id),owned=s.own[b.id],per=b.cps*up.bld[b.id]*state.curMult,tot=owned*per,pct=s.cps>0?(tot/s.cps*100):0,ups=upgForBld(b.id),low=activeLowids().indexOf(b.id)>=0,perkMul=up.bld[b.id]/Math.pow(2,ups);
    tip.innerHTML=`<div class="tt">${b.name}</div><div class="ts">［所持数：${owned}］</div><div class="tl">・それぞれの${b.name}が毎秒 <b>${fmtRate(per)}</b> 生産</div><div class="tl">・${owned}${b.name}が毎秒 <b>${fmtRate(tot)}</b>（全体の <b>${pct.toFixed(1)}%</b>）</div>${ups>0?`<div class="tl">・学び：<b>×${Math.pow(2,ups)}</b>（${ups}段）</div>`:""}${perkMul>1.001?`<div class="tl">・転生特典：<b>×${Math.round(perkMul)}</b></div>`:""}${low&&up.lowSynergy>0?`<div class="tl syn">・下位シナジー：下位の総数が全体倍率を押し上げる（現在 ×${(1+up.lowSynergy*lowCount()).toFixed(2)}）</div>`:""}${low&&houyouOn()?`<div class="tl syn">・大法要中：下位の数だけ火力に加算</div>`:""}`;
    tip.style.display="block";let x=e.clientX+14,y=e.clientY+14;if(x+tip.offsetWidth>innerWidth-8)x=e.clientX-tip.offsetWidth-14;if(y+tip.offsetHeight>innerHeight-8)y=e.clientY-tip.offsetHeight-14;tip.style.left=x+"px";tip.style.top=y+"px";});
  scenery.addEventListener("mouseleave",()=>{tip.style.display="none";});
}
