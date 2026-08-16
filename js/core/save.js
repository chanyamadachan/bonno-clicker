import { state, KEY } from "./state.js";
import { baseMult } from "./formulas.js";
import { fmt } from "./format.js";
import { BUILDINGS } from "../data/buildings.js";
import { toastEl } from "../ui/dom.js";

const store=(typeof window!=="undefined"&&window.storage)?window.storage:null;

export async function save(){if(!store)return;const s=state.s;try{await store.set(KEY,JSON.stringify({bonno:s.bonno,total:s.total,clicks:s.clicks,own:s.own,got:s.got,upg:s.upg,perks:s.perks,spent:s.spent,gou:s.gou,kudoku:s.kudoku,rebirths:s.rebirths,feversDone:s.feversDone,bellStrikes:s.bellStrikes,crits:s.crits,luckies:s.luckies,frenzies:s.frenzies,houyous:s.houyous,maxCombo:s.maxCombo,maxComboMs:s.maxComboMs,muted:s.muted,faction:s.faction,lastSeen:Date.now()}),false);}catch(e){}}

export async function wipe(){if(!store)return;try{await store.delete(KEY,false);}catch(e){}}

export function offlineWelcome(lastSeen){const s=state.s;if(!lastSeen)return;const el=Math.floor((Date.now()-lastSeen)/1000);if(el<60)return;let raw=0;for(const b of BUILDINGS)raw+=s.own[b.id]*b.cps*state.up.bld[b.id];const idleCps=raw*baseMult();if(idleCps<=0)return;const capped=Math.min(el,14400);const gain=Math.floor(idleCps*capped*state.up.offlineEff);if(gain<1)return;s.bonno+=gain;s.total+=gain;const hrs=(capped/3600);const dur=hrs>=1?hrs.toFixed(1)+"時間分":Math.round(capped/60)+"分";setTimeout(()=>toastEl("welcome","おかえりなさい","留守のあいだに","+"+fmt(gain)+"（"+dur+"）"),700);}

export async function load(){
  const s=state.s;
  let lastSeen=0;
  if(store){
    try{
      const r=await store.get(KEY,false);
      if(r&&r.value){
        const d=JSON.parse(r.value);
        s.bonno=d.bonno||0;s.total=d.total||0;s.clicks=d.clicks||0;s.gou=d.gou||0;s.kudoku=d.kudoku||0;s.rebirths=d.rebirths||0;s.feversDone=d.feversDone||0;s.bellStrikes=d.bellStrikes||0;s.crits=d.crits||0;s.luckies=d.luckies||0;s.frenzies=d.frenzies||0;s.houyous=d.houyous||0;s.maxCombo=d.maxCombo||0;s.maxComboMs=d.maxComboMs||0;s.muted=!!d.muted;s.spent=d.spent||0;s.faction=d.faction||null;
        BUILDINGS.forEach(b=>s.own[b.id]=(d.own&&d.own[b.id])||0);
        s.got=d.got||{};s.upg=d.upg||{};s.perks=d.perks||{};
        lastSeen=d.lastSeen||0;
      }
    }catch(e){}
  }
  return lastSeen;
}
