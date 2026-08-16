import { state, fresh, availKudoku, activeBuildings } from "../core/state.js";
import { now } from "../core/format.js";
import { canRebirth, computeUp } from "../core/formulas.js";
import { chime, fanfare } from "../core/audio.js";
import { save, wipe } from "../core/save.js";
import { PERKS } from "../data/perks.js";
import { $, ask, perkCards } from "./dom.js";
import { check } from "./stats.js";
import { resetSceneryCache, renderChill, applyMokTier } from "./scenery.js";

$("rebirth").addEventListener("click",()=>{if(!canRebirth())return;doRebirth();});

function doRebirth(){
  const s=state.s;
  s.kudoku+=1;s.rebirths++;s.bonno=0;s.upg={};Object.keys(s.own).forEach(id=>s.own[id]=0);state.combo=0;state.comboActive=false;state.tapGaps.length=0;computeUp();
  if(state.up.startOwn>0)activeBuildings().forEach(b=>s.own[b.id]=state.up.startOwn);
  if(state.up.startBonnoFrac>0)s.bonno=Math.floor(state.up.startBonnoFrac*state.lastPeak);
  state.lastPeak=s.bonno;state.pendingMomo=true;chime();state.dirty=true;check();save();openGokuraku();
}

function openGokuraku(){renderPerks();$("gokuraku").classList.add("on");}

export function renderPerks(){const av=availKudoku();$("gokKud").textContent=av;PERKS.forEach(p=>{const c=perkCards[p.id],owned=!!state.s.perks[p.id],aff=av>=p.cost;c.el.className="pk"+(owned?" owned":aff?" aff":" no");c.pc.textContent=owned?"解除":"功徳 "+p.cost;});}

function closeGokuraku(){$("gokuraku").classList.remove("on");if(state.pendingMomo){state.pendingMomo=false;state.momoPeak=3+state.up.momoPeakAdd;state.momoDur=14+state.up.momoDurAdd;state.momoUntil=now()+state.momoDur*1000;}fanfare();state.dirty=true;}
$("gReturn").addEventListener("click",closeGokuraku);
$("gSkip").addEventListener("click",closeGokuraku);

export function renderActivePerks(){const owned=PERKS.filter(p=>state.s.perks[p.id]);const el=$("activePerks");if(!owned.length){el.style.display="none";return;}el.style.display="";el.innerHTML='<div class="aph">発動中の転生特典</div>'+owned.map(p=>`<span class="ap" title="${p.d}">✧${p.n}</span>`).join("");}

export function buyPerk(p){
  const s=state.s;
  if(s.perks[p.id]){s.spent-=p.cost;delete s.perks[p.id];computeUp();chime();}
  else{if(availKudoku()<p.cost)return;s.spent+=p.cost;s.perks[p.id]=1;computeUp();fanfare();}
  renderPerks();renderActivePerks();check();state.dirty=true;save();
}

$("reset").addEventListener("click",()=>{ask("すべての記録を消して最初からにします。よいですか？","消す",()=>{
  const m=state.s.muted;state.s=fresh();state.s.muted=m;
  state.curTier=0;state.momoUntil=0;state.frenzyUntil=0;state.houyouUntil=0;state.lastPeak=0;state.combo=0;state.comboActive=false;state.pendingMomo=false;
  computeUp();wipe();
  resetSceneryCache();renderChill(0);applyMokTier(0);
  renderActivePerks();state.dirty=true;
});});
