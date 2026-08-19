import { state } from "../core/state.js";
import { save } from "../core/save.js";
import { $ } from "./dom.js";
import { showGame } from "./intro.js";
import { openRoomModal } from "./room.js";
import { applyMokTier } from "./scenery.js";
import { applyFactionLabels } from "./stats.js";

function closeFactionModal(){
  $("factionModal").classList.remove("on");
}

function chooseFaction(id){
  state.s.faction = id;
  state.dirty = true;
  applyMokTier(state.curTier); // 陣営決定で木魚⇔脳みそ等の見た目を即座に切り替える
  applyFactionLabels();
  closeFactionModal();
  save();
  showGame();
}

// トップレベルで即時登録すると循環import経路で壊れうるため、main.jsの起動シーケンスから呼ぶ(CLAUDE.md「循環importの注意」、0.3-E)。
export function initFactionUI(){
  $("chooseKon").addEventListener("click", ()=>chooseFaction("kon"));
  $("chooseShu").addEventListener("click", ()=>chooseFaction("shu"));
  $("fRandom").addEventListener("click", ()=>chooseFaction(Math.random()<0.5 ? "kon" : "shu"));
  $("fRoomCreateBtn").addEventListener("click", ()=>{
    closeFactionModal();
    openRoomModal("create");
  });
  $("fRoomJoinBtn").addEventListener("click", ()=>{
    closeFactionModal();
    openRoomModal("join");
  });
}
