import { state } from "../core/state.js";
import { save } from "../core/save.js";
import { $ } from "./dom.js";

let skippedThisSession = false;

function openFactionModal(){
  $("factionModal").classList.add("on");
}

function closeFactionModal(){
  $("factionModal").classList.remove("on");
}

function chooseFaction(id){
  state.s.faction = id;
  state.dirty = true;
  closeFactionModal();
  save();
}

export function maybeShowFactionPrompt(){
  if(state.s.faction===null && !skippedThisSession) openFactionModal();
}

$("chooseKon").addEventListener("click", ()=>chooseFaction("kon"));
$("chooseShu").addEventListener("click", ()=>chooseFaction("shu"));
$("fSkip").addEventListener("click", ()=>{ skippedThisSession=true; closeFactionModal(); });
