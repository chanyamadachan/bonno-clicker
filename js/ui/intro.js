import { $ } from "./dom.js";
import { state } from "../core/state.js";
import { sizeRain } from "./rain.js";

export function showGame(){
  $("factionModal").classList.remove("on");
  $("roomModal").classList.remove("on");
  $("viewGame").classList.remove("pre-start");
  sizeRain();
}

// トップレベルで即時登録すると循環import経路で壊れうるため、main.jsの起動シーケンスから呼ぶ(CLAUDE.md「循環importの注意」)。
export function startIntroFlow(){
  if(state.s.faction===null){
    $("viewGame").classList.add("pre-start");
    $("factionModal").classList.add("on");
  }else{
    showGame();
  }
}
