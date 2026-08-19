import { $, ask, toastEl } from "./dom.js";
import { state, availKudoku } from "../core/state.js";
import { save } from "../core/save.js";
import { fanfare } from "../core/audio.js";
import { getCachedWorldStatus } from "./world.js";
import { check } from "./stats.js";

// 済度・誘惑(企画設計書 5.13 / 9.3 Step 3-6)。消費資源は「ドーパミンポイント」という独立資源をコード上
// 新設せず、既存の陣営中立な貯める→使う型資源である功徳(availKudoku())に統一する(0-A)。
const API_BASE = "/backend/public/api";
const BOON_COST_KUDOKU = 2;
// backend/config.phpの$BOON_UNDERDOG_THRESHOLDと同値。あくまでボタンの事前フィードバック用の複製で、
// 実際の劣勢判定・乱用防止はサーバー側(boon-seido.php/boon-yuuwaku.php)が権威(0-B)。
const UNDERDOG_THRESHOLD = 0.2;

function todayStr(){ return new Date().toDateString(); }
function alreadyCastToday(){ return state.s.boonCastDate === todayStr(); }

function targetIsUnderdog(targetFaction){
  const cached = getCachedWorldStatus();
  if(!cached || typeof cached.balance !== "number") return false;
  return targetFaction==="shu" ? cached.balance<=-UNDERDOG_THRESHOLD : cached.balance>=UNDERDOG_THRESHOLD;
}

function boonErrorText(code){
  switch(code){
    case "target_not_underdog": return "相手陣営はまだ劣勢ではないようです。";
    case "rate_limited_daily": return "本日はすでに施しました。";
    default: return "エラーが発生しました。しばらくしてから試してください。";
  }
}

function castBoon(boonType){
  const s = state.s;
  if(!s.faction || alreadyCastToday() || availKudoku()<BOON_COST_KUDOKU) return;
  const targetFaction = boonType==="seido" ? "shu" : "kon";
  if(!targetIsUnderdog(targetFaction)) return;
  const label = boonType==="seido" ? "済度" : "誘惑";
  ask(`功徳${BOON_COST_KUDOKU}を消費して${label}を施します。よいですか？`, "施す", ()=>doCastBoon(boonType));
}

async function doCastBoon(boonType){
  const s = state.s;
  const endpoint = boonType==="seido" ? "/boon-seido.php" : "/boon-yuuwaku.php";
  try{
    const res = await fetch(API_BASE + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: s.playerId, faction: s.faction }),
    });
    const data = await res.json();
    if(!res.ok){ $("boonStatus").textContent = boonErrorText(data.error); return; }
    // 功徳の残高チェック・消費はクライアントローカルの自己申告(buyPerk()と同型、0-B)。
    s.spent += BOON_COST_KUDOKU;
    s.boonCastDate = todayStr();
    if(boonType==="seido") s.seidoGiven = true;
    save();
    fanfare();
    const label = boonType==="seido" ? "済度" : "誘惑";
    toastEl(boonType, "施し", label+"を送りました", "劣勢の陣営に加護が届きます");
    check();
    renderBoonUI();
  }catch(e){
    $("boonStatus").textContent = "通信に失敗しました。しばらくしてから試してください。";
  }
}

function updateBtn(btn, statusEl, targetFaction, label){
  if(alreadyCastToday()){
    btn.textContent = "本日はすでに施しました"; btn.disabled = true;
    statusEl.textContent = "";
  }else if(availKudoku() < BOON_COST_KUDOKU){
    btn.textContent = label; btn.disabled = true;
    statusEl.textContent = `功徳が${BOON_COST_KUDOKU}必要です（残り${availKudoku()}）`;
  }else if(!targetIsUnderdog(targetFaction)){
    btn.textContent = label; btn.disabled = true;
    statusEl.textContent = "相手陣営が劣勢のときだけ発動できます";
  }else{
    btn.textContent = label; btn.disabled = false;
    statusEl.textContent = `功徳${BOON_COST_KUDOKU}を消費して劣勢の陣営を後押しします`;
  }
}

// main.js の frame() の0.15秒間隔UI更新から呼ぶ。
export function renderBoonUI(){
  const s = state.s;
  const bar = $("boonbar"), seidoBtn = $("seidoBtn"), yuuwakuBtn = $("yuuwakuBtn"), statusEl = $("boonStatus");
  if(!bar) return;

  if(s.faction==="kon"){
    bar.style.display=""; seidoBtn.style.display="inline-block"; yuuwakuBtn.style.display="none";
    updateBtn(seidoBtn, statusEl, "shu", "済度を施す");
  }else if(s.faction==="shu"){
    bar.style.display=""; seidoBtn.style.display="none"; yuuwakuBtn.style.display="inline-block";
    updateBtn(yuuwakuBtn, statusEl, "kon", "誘惑する");
  }else{
    bar.style.display="none";
  }
}

// トップレベルで即時登録すると循環import経路で壊れうるため、main.jsの起動シーケンスから呼ぶ(CLAUDE.md「循環importの注意」)。
export function initBoonUI(){
  $("seidoBtn").addEventListener("click", ()=>castBoon("seido"));
  $("yuuwakuBtn").addEventListener("click", ()=>castBoon("yuuwaku"));
  renderBoonUI();
}
