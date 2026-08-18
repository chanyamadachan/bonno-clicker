import { state } from "../core/state.js";
import { now, fmt } from "../core/format.js";
import { feverOn, frenzyOn, clickPower, comboWindow } from "../core/formulas.js";
import { bong, pok, critSfx, chant, grooveBeat, scratch } from "../core/audio.js";
import { HEART, HYPE } from "../data/content.js";
import { $, zone, shake } from "./dom.js";
import { addItem } from "./rain.js";
import { check } from "./stats.js";

function spawnSutra(){const el=document.createElement("div");el.className="float sutra";el.textContent=HEART[(Math.random()*HEART.length)|0];const r=zone.getBoundingClientRect();el.style.left=(r.width*(0.32+Math.random()*0.36))+"px";el.style.top=(r.height*0.34)+"px";zone.appendChild(el);setTimeout(()=>el.remove(),1250);}
function spawnHype(){const el=document.createElement("div");el.className="float sutra hype";el.textContent=HYPE[(Math.random()*HYPE.length)|0];const r=zone.getBoundingClientRect();el.style.left=(r.width*(0.32+Math.random()*0.36))+"px";el.style.top=(r.height*0.34)+"px";zone.appendChild(el);setTimeout(()=>el.remove(),1250);}
export function popFloat(cls,txt,x,y){const fl=document.createElement("div");fl.className="float"+(cls?" "+cls:"");fl.textContent=txt;fl.style.left=x+"px";fl.style.top=y+"px";zone.appendChild(fl);setTimeout(()=>fl.remove(),cls&&cls.indexOf("crit")>=0?1100:850);}

zone.addEventListener("click",e=>{
  const s=state.s,up=state.up,t=now();
  if(zone.classList.contains("hint"))zone.classList.remove("hint");
  const shu=s.faction==="shu";let comboGrew=false,comboBroke=false;
  if(state.lastTap){const gap=t-state.lastTap;const[gMin,gMax]=comboWindow();
    if(gap>=gMin&&gap<=gMax){state.tapGaps.push(gap);if(state.tapGaps.length>5)state.tapGaps.shift();const avg=state.tapGaps.reduce((a,c)=>a+c,0)/state.tapGaps.length;if(Math.abs(gap-avg)<=155){state.combo=Math.min(up.comboMax,state.combo+1);comboGrew=true;}else{state.combo=Math.max(0,state.combo-2);comboBroke=true;}}
    else{state.combo=Math.max(0,state.combo-3);state.tapGaps.length=0;comboBroke=true;}}
  state.lastTap=t;if(state.combo>0&&!state.comboActive){state.comboActive=true;state.comboStart=t;}if(state.combo>s.maxCombo)s.maxCombo=state.combo;
  if(shu){if(comboGrew&&state.combo>=2)grooveBeat(state.combo);else if(comboBroke&&state.combo===0)scratch();}
  const f=feverOn();let gain=clickPower();if(f){gain*=2.2;s.bellStrikes++;}if(frenzyOn())gain*=Math.round(77*up.goldPow);
  const crit=Math.random()<up.critChance;if(crit){gain*=up.critMul;s.crits++;}
  s.bonno+=gain;s.total+=gain;s.clicks++;state.clickHeat=Math.min(26,state.clickHeat+3);
  const r=zone.getBoundingClientRect(),cx=e.clientX-r.left,cy=e.clientY-r.top;
  for(let i=0;i<(crit?7:3);i++)addItem(cx,cy);
  zone.classList.remove("hit");void zone.offsetWidth;zone.classList.add("hit");
  const pitch=Math.pow(2,Math.min(state.combo,20)/24);if(f)bong();else pok(crit?1.5:pitch);
  if(crit){critSfx();shake();}
  if(state.combo>=10&&Math.random()<0.55){if(shu)spawnHype();else{spawnSutra();chant();}}
  popFloat(crit?"crit":(f?"big":""),(crit?"会心！+":"+")+fmt(gain),cx,cy);
  state.dirty=true;check();});
