import { state } from "../core/state.js";
import { ac, applyMute } from "../core/audio.js";
import { save } from "../core/save.js";
import { BUILDINGS } from "../data/buildings.js";
import { BUILDINGS_SHU } from "../data/buildings-shu.js";
import { UP } from "../data/upgrades.js";
import { PERKS } from "../data/perks.js";
import { ACH } from "../data/achievements.js";
import { buyN, buyUpg } from "./shop.js";
import { buyPerk } from "./rebirth.js";
import { renderStats } from "./stats.js";

export function $(id){return document.getElementById(id);}

export const zone=$("clickzone");
export const tip=$("tip");
export const tk=$("ticker");
export const scenery=$("scenery");

let modalYes=null;
export function ask(msg,yesLabel,cb){$("mmsg").textContent=msg;$("mYes").textContent=yesLabel||"はい";modalYes=cb;$("modal").classList.add("on");}
$("mYes").addEventListener("click",()=>{$("modal").classList.remove("on");if(modalYes)modalYes();modalYes=null;});
$("mNo").addEventListener("click",()=>{$("modal").classList.remove("on");modalYes=null;});

export function toastEl(cls,ot,on,ok){const el=document.createElement("div");el.className="ofuda "+cls;el.innerHTML=`<div class="ot">${ot}</div><div class="on">${on}</div><div class="ok">${ok}</div>`;$("toasts").appendChild(el);setTimeout(()=>el.remove(),cls.indexOf("welcome")>=0?6000:3800);}

export function shake(){const c=$("colMok");c.classList.remove("shake");void c.offsetWidth;c.classList.add("shake");}

const panelB=$("panelB"),upList=$("upList"),perkList=$("perkList"),achGrid=$("achGrid");
export const rows={};
BUILDINGS.concat(BUILDINGS_SHU).forEach(b=>{const el=document.createElement("button");el.className="bld hide";
  el.innerHTML=`<span class="cnt"></span><span class="icon pix"></span><span class="body"><span class="name">${b.name}</span><span class="rate"></span></span><span class="right"><span class="cost"></span><span class="own"></span></span><span class="prog"></span>`;
  el.addEventListener("click",()=>buyN(b));panelB.appendChild(el);
  rows[b.id]={el,icon:el.querySelector(".icon"),nameEl:el.querySelector(".name"),cost:el.querySelector(".cost"),rate:el.querySelector(".rate"),own:el.querySelector(".own"),cnt:el.querySelector(".cnt"),prog:el.querySelector(".prog"),costVal:1e99,aff:false,revealed:false,mode:""};});
export const upRows={},upTeaser=$("upTeaser");
UP.forEach(u=>{const el=document.createElement("button");el.className="bld up hide";
  el.innerHTML=`<span class="icon">✦</span><span class="body"><span class="name">${u.n}</span><span class="rate">${u.d}</span></span><span class="right"><span class="cost"></span></span>`;
  el.addEventListener("click",()=>buyUpg(u));upList.appendChild(el);upRows[u.id]={el,cost:el.querySelector(".cost"),visible:false,aff:false};});
upList.parentNode.appendChild(upTeaser);
export const perkCards={};
PERKS.forEach(p=>{const el=document.createElement("div");el.className="pk no";
  el.innerHTML=`<span class="pc"></span><div class="pn">${p.n}</div><div class="pd">${p.d}</div>`;
  el.addEventListener("click",()=>buyPerk(p));perkList.appendChild(el);perkCards[p.id]={el,pc:el.querySelector(".pc")};});
export const achEls={};
ACH.forEach(a=>{const el=document.createElement("div");el.className="ach";el.innerHTML=`<div class="an">？？？</div><div class="ad">${a.d}</div>`;achGrid.appendChild(el);achEls[a.id]={el,name:el.querySelector(".an")};});

document.querySelectorAll(".qbtn").forEach(q=>q.addEventListener("click",()=>{state.buyQty=q.dataset.q==="max"?"max":+q.dataset.q;document.querySelectorAll(".qbtn").forEach(x=>x.classList.toggle("on",x===q));state.dirty=true;}));
$("sound").addEventListener("click",()=>{state.s.muted=!state.s.muted;$("sound").textContent=state.s.muted?"🔕":"🔔";applyMute();if(!state.s.muted)ac();save();});
$("tabGaran").addEventListener("click",()=>switchScene("garan"));
$("tabInen").addEventListener("click",()=>switchScene("inen"));
function switchScene(v){const g=v==="garan";$("garanView").style.display=g?"":"none";$("inenView").style.display=g?"none":"";$("tabGaran").classList.toggle("on",g);$("tabInen").classList.toggle("on",!g);if(!g)renderStats();}
(function(){const g=$("ornHalo");let d="";for(let i=0;i<24;i++){const a=i*15*Math.PI/180,x=125+Math.cos(a)*70,y=108+Math.sin(a)*70,x2=125+Math.cos(a)*104,y2=108+Math.sin(a)*104;d+=`<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#ffe08a" stroke-width="${i%2?2:4}" opacity=".55"/>`;}g.innerHTML=d+'<circle cx="125" cy="108" r="66" fill="none" stroke="#ffdd80" stroke-width="2" opacity=".4"/>';})();
