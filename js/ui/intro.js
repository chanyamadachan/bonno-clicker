import { $ } from "./dom.js";
import { state } from "../core/state.js";
import { sizeRain } from "./rain.js";

let loadingHidden = false;
let watchdogId = null;

// 進捗が10秒経っても終わらない場合、原因(キャッシュ不整合等)を問わず
// 「無限にくるくる」で詰まらせずリロード導線を提示する保険。
export function initLoadingScreen(){
  const btn = $("lsReloadBtn");
  if(btn) btn.addEventListener("click", ()=>location.reload());
  watchdogId = setTimeout(()=>{
    if(loadingHidden) return;
    const el = $("loadingScreen");
    if(el) el.classList.add("stalled");
    const l = $("lsLabel");
    if(l) l.textContent = "読み込みに時間がかかっています…";
    if(btn) btn.style.display = "";
  }, 10000);
}

export function setLoadingProgress(pct, label){
  const clamped = Math.min(100, Math.max(0, pct));
  const fill = $("lsbarFill");
  if(fill) fill.style.width = clamped + "%";
  const pctEl = $("lsPercent");
  if(pctEl) pctEl.textContent = Math.round(clamped) + "%";
  if(label){ const l = $("lsLabel"); if(l) l.textContent = label; }
}

export function showLoadingError(){
  if(watchdogId) clearTimeout(watchdogId);
  const el = $("loadingScreen");
  if(el) el.classList.add("stalled");
  const l = $("lsLabel");
  if(l) l.textContent = "読み込みに失敗しました。再読み込みしてください。";
  const btn = $("lsReloadBtn");
  if(btn) btn.style.display = "";
}

export function hideLoadingScreen(){
  loadingHidden = true;
  if(watchdogId) clearTimeout(watchdogId);
  setLoadingProgress(100);
  const el = $("loadingScreen");
  if(!el) return;
  el.classList.add("hide");
}

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
