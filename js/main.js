import { state, availKudoku, activeBuildings } from "./core/state.js";
import { fmt, fmtRate } from "./core/format.js";
import { baseMult, feverOn, frenzyOn, houyouOn, lowCount, mokTierOf, rankIdx, rankOf, comboMul, computeUp } from "./core/formulas.js";
import { buildSprites } from "./core/sprites.js";
import { load, save, offlineWelcome } from "./core/save.js";
import { NEWS } from "./data/content.js";
import { $, zone, tk } from "./ui/dom.js";
import { applyMokTier, tierUp, initSceneryTooltip } from "./ui/scenery.js";
import { sizeRain, addItem, stepRain } from "./ui/rain.js";
import { renderShop, updateAfford } from "./ui/shop.js";
import { renderStats, setCount, updateRebirth, checkRankChange, initRank, check, rotateNews } from "./ui/stats.js";
import { feverTick } from "./ui/events.js";
import { renderActivePerks } from "./ui/rebirth.js";
import { maybeShowFactionPrompt } from "./ui/faction.js";
import { renderWorldGauge } from "./ui/world.js";
import "./ui/click.js";

let lastT=Date.now(),accMeter=0,accCheck=0,accNews=0,accSave=0,accRain=0;

function frame(){
  const s=state.s,up=state.up;
  const t=Date.now();const dt=Math.min(0.25,(t-lastT)/1000);lastT=t;const k=Math.min(3,dt*60);
  if(state.combo>0&&t-state.lastTap>900)state.combo=Math.max(0,state.combo-dt*9);
  if(state.comboActive){const dur=t-state.comboStart;if(dur>s.maxComboMs)s.maxComboMs=dur;if(state.combo<=0)state.comboActive=false;}
  let mm=1;if(state.momoUntil>t){mm=1+(state.momoPeak-1)*((state.momoUntil-t)/(state.momoDur*1000));}
  const hy=houyouOn()?(2+lowCount()*up.houyouPer):1;
  state.curMult=baseMult()*(feverOn()?(10+up.feverMulAdd):1)*mm*hy;
  let raw=0;for(const b of activeBuildings())raw+=s.own[b.id]*b.cps*up.bld[b.id];s.cps=raw*state.curMult;
  if(s.cps>0){const g=s.cps*dt;s.bonno+=g;s.total+=g;}
  if(s.bonno>state.lastPeak)state.lastPeak=s.bonno;
  feverTick(t);
  const nt=mokTierOf(s.total);if(nt!==state.curTier){const u=nt>state.curTier;state.curTier=nt;if(u)tierUp(nt);else applyMokTier(nt);}
  checkRankChange(rankIdx());
  setCount(fmt(s.bonno));
  zone.style.transform="scale("+(1+Math.min(state.clickHeat,26)*0.006).toFixed(3)+")";
  const mo=$("momo");if(state.momoUntil>t||hy>1){mo.style.display="";mo.textContent=hy>1?"🪷 大法要 ×"+hy.toFixed(1):"🔥 転生の勢い ×"+mm.toFixed(1);}else if(mo.style.display!=="none")mo.style.display="none";
  state.clickHeat*=0.94;const rate=Math.min(2.6,Math.log10(s.cps+1)*0.09+state.clickHeat*0.08+(feverOn()?0.8:0)+(frenzyOn()?0.6:0)+(hy>1?0.5:0));accRain+=rate*k;while(accRain>=1){accRain--;addItem();}stepRain(k);
  accMeter+=dt;if(accMeter>0.15){accMeter=0;$("persec").textContent=fmtRate(s.cps)+" 煩悩／秒";$("mGou").textContent=fmt(s.gou);$("mMult").textContent="×"+state.curMult.toFixed(2);$("mKudoku").textContent=fmt(availKudoku());$("rank").textContent=rankOf();
    const cb=$("combo");if(state.combo>=3){cb.style.display="";$("comboTxt").textContent="念仏コンボ ×"+comboMul().toFixed(2)+(state.combo>=10?"　念仏、流れる…":"");$("comboBar").style.width=Math.min(100,state.combo/up.comboMax*100)+"%";cb.classList.toggle("hot",state.combo>=10);}else if(cb.style.display!=="none")cb.style.display="none";
    updateAfford();updateRebirth();renderWorldGauge();if($("inenView").style.display!=="none")renderStats();}
  accCheck+=dt;if(accCheck>0.3){accCheck=0;check();}
  if(state.dirty){renderShop();state.dirty=false;}
  accNews+=dt;if(accNews>6){accNews=0;rotateNews();}
  accSave+=dt;if(accSave>5){accSave=0;save();}
  requestAnimationFrame(frame);
}

async function init(){
  const lastSeen = await load();
  $("sound").textContent = state.s.muted ? "🔕" : "🔔";
  buildSprites();
  computeUp();
  offlineWelcome(lastSeen);
  state.curTier = mokTierOf(state.s.total);
  applyMokTier(state.curTier);
  state.lastPeak = state.s.bonno;
  initRank(rankIdx());
  renderActivePerks();
  initSceneryTooltip();
  sizeRain();
  addEventListener("resize", sizeRain);
  tk.innerHTML = NEWS[0]();
  if(state.s.clicks < 1) zone.classList.add("hint");
  maybeShowFactionPrompt();
  state.dirty = true;
  requestAnimationFrame(frame);
}

init();
