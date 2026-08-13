import { BUILDINGS } from "../data/buildings.js";

export const KEY = "bonno-clicker-save-v9";

export function fresh(){
  const own={};
  BUILDINGS.forEach(b=>own[b.id]=0);
  return {bonno:0,total:0,clicks:0,own,got:{},upg:{},perks:{},spent:0,gou:0,kudoku:0,rebirths:0,feversDone:0,bellStrikes:0,crits:0,luckies:0,frenzies:0,houyous:0,maxCombo:0,maxComboMs:0,cps:0,muted:false};
}

export const state = {
  s: fresh(),
  up: {},
  fever: {until:0, nextBong:0},
  curTier: 0,
  curMult: 1,
  buyQty: 1,
  dirty: true,
  lastPeak: 0,
  momoUntil: 0,
  momoPeak: 1,
  momoDur: 1,
  pendingMomo: false,
  frenzyUntil: 0,
  houyouUntil: 0,
  combo: 0,
  lastTap: 0,
  tapGaps: [],
  comboActive: false,
  comboStart: 0,
  clickHeat: 0,
};

export function upgCount(){ return Object.keys(state.s.upg).length; }
export function availKudoku(){ return state.s.kudoku - state.s.spent; }
