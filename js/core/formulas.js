import { state, activeLowids, activeBuildings } from "./state.js";
import { now } from "./format.js";
import { BUILDINGS } from "../data/buildings.js";
import { BUILDINGS_SHU } from "../data/buildings-shu.js";
import { UP } from "../data/upgrades.js";
import { UP_SHU } from "../data/upgrades-shu.js";
import { PERKS } from "../data/perks.js";
import { RANKS, MOKTIERS } from "../data/content.js";

const R=1.15;
export function costOf(b,n){const p=Math.pow(R,state.s.own[b.id]);return Math.ceil(b.base*state.up.priceMul*p*(Math.pow(R,n)-1)/(R-1));}
export function maxAff(b){const unit=b.base*state.up.priceMul*Math.pow(R,state.s.own[b.id]);const v=state.s.bonno*(R-1)/unit+1;if(v<=1)return 0;return Math.max(0,Math.floor(Math.log(v)/Math.log(R)));}

export function computeUp(){
  state.up={clickMul:1,globalMul:1,permMul:1,bld:{},clickFromCps:0,feverDurAdd:0,feverFreqMul:1,feverMulAdd:0,gouPer:0.03,priceMul:1,kudokuVal:0.03,startOwn:0,startBonnoFrac:0,momoPeakAdd:0,momoDurAdd:0,comboMax:40,comboStep:0.02,critChance:0.04,critMul:7,goldPow:1,offlineEff:0.4,lowSynergy:0,houyouPer:0.04};
  const up=state.up;
  BUILDINGS.forEach(b=>up.bld[b.id]=1);
  BUILDINGS_SHU.forEach(b=>up.bld[b.id]=1);
  UP.concat(UP_SHU).forEach(u=>{if(!state.s.upg[u.id])return;const e=u.eff;if(e.t==="click")up.clickMul*=e.m;else if(e.t==="global")up.globalMul*=e.m;else if(e.t==="bld")up.bld[e.id]*=e.m;else if(e.t==="clickcps")up.clickFromCps+=e.m;else if(e.t==="feverdur")up.feverDurAdd+=e.m;else if(e.t==="feverfreq")up.feverFreqMul*=e.m;else if(e.t==="fevermul")up.feverMulAdd+=e.m;else if(e.t==="gou")up.gouPer=Math.max(up.gouPer,e.m);else if(e.t==="combo")up.comboStep+=e.m;else if(e.t==="combomax")up.comboMax+=e.m;else if(e.t==="crit")up.critChance+=e.m;else if(e.t==="critmul")up.critMul+=e.m;else if(e.t==="goldpow")up.goldPow+=e.m;else if(e.t==="offline")up.offlineEff+=e.m;else if(e.t==="synergy")up.lowSynergy+=e.m;else if(e.t==="houyoup")up.houyouPer+=e.m;});
  PERKS.forEach(p=>{if(state.s.perks[p.id])p.eff(up);});
}

export function feverOn(){return state.fever.until>now();}
export function frenzyOn(){return state.frenzyUntil>now();}
export function houyouOn(){return state.houyouUntil>now();}

// 陣営固有メカニクス「静寂」「暴走」(企画設計書 5.12 / 9.3 Step 3-3)。
export function seijakuWarmingUp(){return state.s.faction==="kon"&&state.seijakuOn&&now()<state.seijakuWarmupUntil;}
export function seijakuActive(){return state.s.faction==="kon"&&state.seijakuOn&&now()>=state.seijakuWarmupUntil;}
export function seijakuOnCooldown(){return now()<state.seijakuCooldownUntil;}
export function bousouActive(){return state.s.faction==="shu"&&now()<state.bousouUntil;}
export function bousouOnCooldown(){return state.s.faction==="shu"&&now()>=state.bousouUntil&&now()<state.bousouCooldownUntil;}
// クリックにのみ乗る倍率(静寂=-40%、暴走=+150%)。既存のCPS計算(state.curMult)には影響させない。
export function factionModeClickMul(){if(seijakuActive())return 0.6;if(bousouActive())return 2.5;return 1;}
// クリック・CPS双方に乗る倍率。暴走終了後120秒だけ-30%(3.4のboostとは独立、state.curMult経由で両方に効く)。
export function factionModeProdMul(){return bousouOnCooldown()?0.7:1;}
// 誘惑(5.13 / 9.3 Step 3-6)。サーバーが配信するstate.yuuwakuUntilが未来なら、仏教陣営のコンボ判定幅が拡張される。
export function yuuwakuActive(){return state.s.faction==="kon"&&now()<state.yuuwakuUntil;}
// 暴走・誘惑いずれか有効な間はコンボ判定幅を190〜820msから150〜1000msへ拡張する。
export function comboWindow(){return (bousouActive()||yuuwakuActive())?[150,1000]:[190,820];}
export function lowCount(){return activeLowids().reduce((a,id)=>a+state.s.own[id],0);}
export function comboMul(){return 1+Math.min(state.combo,state.up.comboMax)*state.up.comboStep;}
export function baseMult(){return (1+state.up.gouPer*state.s.gou)*(1+state.up.kudokuVal*state.s.kudoku)*(1+state.up.lowSynergy*lowCount())*state.up.globalMul*state.up.permMul;}
export function clickPower(){return ((1+0.25*state.s.own[activeBuildings()[0].id])*state.up.clickMul*state.curMult+state.up.clickFromCps*state.s.cps)*comboMul()*factionModeClickMul();}
export function rankIdx(){let i=0;for(let k=0;k<RANKS.length;k++){if(state.s.total>=RANKS[k][0])i=k;}return i;}
export function rankOf(){return RANKS[rankIdx()][1];}
export function rebirthReq(){return 1e6*Math.pow(4,state.s.rebirths);}
export function canRebirth(){return state.s.total>=rebirthReq();}
export function mokTierOf(t){let i=0;for(let k=0;k<MOKTIERS.length;k++){if(t>=MOKTIERS[k].min)i=k;}return i;}
export function revealed(b){return state.s.total>=b.base*0.3;}
