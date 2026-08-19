import { $, zone } from "./dom.js";
import { state } from "../core/state.js";
import { save } from "../core/save.js";
import { now } from "../core/format.js";
import { seijakuActive, seijakuWarmingUp, seijakuOnCooldown, bousouActive, bousouOnCooldown } from "../core/formulas.js";
import { chime, fanfare } from "../core/audio.js";

// 陣営固有メカニクス「静寂」「暴走」の数値仕様(企画設計書 5.12)。
const SEIJAKU_WARMUP_MS = 3000;
const SEIJAKU_COOLDOWN_MS = 15000;
const BOUSOU_DURATION_MS = 60000;
const BOUSOU_COOLDOWN_MS = 120000;
const BOUSOU_DAILY_LIMIT = 3;

function todayStr(){ return new Date().toDateString(); }
function secsLeft(untilMs){ return Math.max(0, Math.ceil((untilMs - now()) / 1000)); }

function toggleSeijaku(){
  if(state.s.faction!=="kon") return;
  if(state.seijakuOn){
    // OFF: ウォームアップ中でも即座にクールダウンへ(ON連打での美味しいとこ取りを防ぐ、5.12)。
    state.seijakuOn = false;
    state.seijakuWarmupUntil = 0;
    state.seijakuCooldownUntil = now() + SEIJAKU_COOLDOWN_MS;
  }else{
    if(seijakuOnCooldown()) return;
    state.seijakuOn = true;
    state.seijakuWarmupUntil = now() + SEIJAKU_WARMUP_MS;
    chime();
  }
  renderModeUI();
}

function triggerBousou(){
  const s = state.s;
  if(s.faction!=="shu") return;
  if(bousouActive() || bousouOnCooldown()) return;
  if(s.bousouDay !== todayStr()){ s.bousouDay = todayStr(); s.bousouUses = 0; }
  if(s.bousouUses >= BOUSOU_DAILY_LIMIT) return;
  s.bousouUses++;
  state.bousouUntil = now() + BOUSOU_DURATION_MS;
  state.bousouCooldownUntil = state.bousouUntil + BOUSOU_COOLDOWN_MS;
  save();
  fanfare();
  renderModeUI();
}

// main.js の frame() の0.15秒間隔UI更新から呼ぶ。
export function renderModeUI(){
  const s = state.s;
  const bar = $("modebar"), seijakuBtn = $("seijakuBtn"), bousouBtn = $("bousouBtn"), statusEl = $("modeStatus");

  zone.classList.remove("mode-warmup", "mode-seijaku", "mode-bousou", "mode-cooldown");

  if(s.faction==="kon"){
    bar.style.display = ""; seijakuBtn.style.display = "inline-block"; bousouBtn.style.display = "none";
    if(seijakuWarmingUp()){
      seijakuBtn.textContent = "静寂へ…"; seijakuBtn.disabled = true;
      zone.classList.add("mode-warmup");
      statusEl.textContent = `静寂まで ${secsLeft(state.seijakuWarmupUntil)}秒`;
    }else if(seijakuActive()){
      seijakuBtn.textContent = "静寂をやめる"; seijakuBtn.disabled = false;
      zone.classList.add("mode-seijaku");
      statusEl.textContent = "静寂中：クリック威力-40% / 貢献の質+25%";
    }else if(seijakuOnCooldown()){
      seijakuBtn.textContent = "静寂へ"; seijakuBtn.disabled = true;
      statusEl.textContent = `再び静寂に入れるまで ${secsLeft(state.seijakuCooldownUntil)}秒`;
    }else{
      seijakuBtn.textContent = "静寂へ"; seijakuBtn.disabled = false;
      statusEl.textContent = "";
    }
  }else if(s.faction==="shu"){
    bar.style.display = ""; seijakuBtn.style.display = "none"; bousouBtn.style.display = "inline-block";
    if(bousouActive()){
      bousouBtn.textContent = "暴走中"; bousouBtn.disabled = true;
      zone.classList.add("mode-bousou");
      statusEl.textContent = `残り ${secsLeft(state.bousouUntil)}秒：クリック威力+150%`;
    }else if(bousouOnCooldown()){
      bousouBtn.textContent = "クールダウン中"; bousouBtn.disabled = true;
      zone.classList.add("mode-cooldown");
      statusEl.textContent = `生産量-30%：残り ${secsLeft(state.bousouCooldownUntil)}秒`;
    }else{
      const remain = Math.max(0, BOUSOU_DAILY_LIMIT - (s.bousouDay===todayStr() ? s.bousouUses : 0));
      bousouBtn.textContent = "暴走する"; bousouBtn.disabled = remain<=0;
      statusEl.textContent = remain>0 ? `本日あと${remain}回` : "本日の回数を使い切りました";
    }
  }else{
    bar.style.display = "none";
  }
}

// トップレベルで即時登録すると循環import経路で壊れうるため、main.jsの起動シーケンスから呼ぶ(CLAUDE.md「循環importの注意」)。
export function initModeUI(){
  $("seijakuBtn").addEventListener("click", toggleSeijaku);
  $("bousouBtn").addEventListener("click", triggerBousou);
  renderModeUI();
}
