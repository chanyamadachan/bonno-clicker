import { BUILDINGS, LOWIDS } from "../data/buildings.js";
import { BUILDINGS_SHU, LOWIDS_SHU } from "../data/buildings-shu.js";

export const KEY = "bonno-clicker-save-v9";

// 陣営対戦の匿名プレイヤーID(8.1)。crypto.randomUUID未対応の古い環境向けにフォールバックを持つ。
function genPlayerId(){
  if(typeof crypto!=="undefined"&&crypto.randomUUID)return crypto.randomUUID();
  let id="";for(let i=0;i<32;i++)id+=Math.floor(Math.random()*16).toString(16);return id;
}

export function fresh(){
  const own={};
  BUILDINGS.forEach(b=>own[b.id]=0);
  BUILDINGS_SHU.forEach(b=>own[b.id]=0);
  return {bonno:0,total:0,clicks:0,own,got:{},upg:{},perks:{},spent:0,gou:0,kudoku:0,rebirths:0,feversDone:0,bellStrikes:0,crits:0,luckies:0,frenzies:0,houyous:0,maxCombo:0,maxComboMs:0,cps:0,muted:false,faction:null,playerId:genPlayerId(),lastReportedTotal:0,roomCode:null,bousouUses:0,bousouDay:""};
}

// 陣営ごとの発生源データセットを切り替える。faction===null（未選択）の間は仏教陣営(既存データ)を既定値として扱う。
export function activeBuildings(){ return state.s.faction==="shu" ? BUILDINGS_SHU : BUILDINGS; }
export function activeLowids(){ return state.s.faction==="shu" ? LOWIDS_SHU : LOWIDS; }
// 選ばれなかった側の発生源データセット。陣営選択前後でショップDOMに残る取りこぼしを掃除する用途。
export function inactiveBuildings(){ return state.s.faction==="shu" ? BUILDINGS : BUILDINGS_SHU; }

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
  // 陣営固有メカニクス「静寂」「暴走」(企画設計書 5.12 / 9.3 Step 3-3)。
  // 発動回数(bousouUses/bousouDay)以外は端末を跨いだ意味を持たない一時状態のためsave()の対象外にする
  // (既存のfever/frenzy/houyouUntil等と同じ扱い、再読み込みで解除されても実害が小さい)。
  seijakuOn: false,
  seijakuWarmupUntil: 0,
  seijakuCooldownUntil: 0,
  bousouUntil: 0,
  bousouCooldownUntil: 0,
};

export function upgCount(){ return Object.keys(state.s.upg).length; }
export function availKudoku(){ return state.s.kudoku - state.s.spent; }
