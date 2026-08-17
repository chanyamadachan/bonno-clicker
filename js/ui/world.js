import { $ } from "./dom.js";
import { state } from "../core/state.js";

const API_BASE = "/backend/public/api";
const FETCH_INTERVAL_MS = 60 * 1000; // 世界情勢の取得は60秒おきで十分(直近窓は48時間単位のため)

const LABELS = [
  { max: -0.6, text: "涅槃寂静" },
  { max: -0.2, text: "平穏" },
  { max: 0.2, text: "拮抗" },
  { max: 0.6, text: "煩悩渦巻く" },
  { max: Infinity, text: "煩悩まみれ" },
];

function labelFor(balance){
  for(const l of LABELS) if(balance<=l.max) return l.text;
  return "拮抗";
}

let cached = null; // 直近取得できたworld-statusのレスポンス
let lastFetch = 0;
let fetching = false;

async function refreshWorldStatus(){
  if(fetching) return;
  fetching = true;
  try{
    const res = await fetch(API_BASE + "/world-status.php");
    if(res.ok) cached = await res.json();
  }catch(e){
    // API未設置・オフライン等は下のダミー値表示にフォールバックする(本編プレイは一切ブロックしない)。
  }finally{
    fetching = false;
  }
}

// バックエンド未接続時(ローカル開発・API障害時)は、ゆるやかに動くダミー値で見た目だけ成立させる。
function dummyBalance(){
  return Math.sin(Date.now()/600000)*0.6;
}

// 母数の誠実な開示(企画設計書 5.10 / 9.3 Step 3-1)。人数を隠さず「今が一番一打の重みが大きい」文脈で見せる。
function renderPopulation(){
  if(!cached || !cached.activePlayers){
    $("worldPop").textContent = "";
    $("worldBoost").textContent = "";
    return;
  }
  const { kon, shu } = cached.activePlayers;
  const total = kon + shu;
  $("worldPop").textContent = total>0 ? `直近アクティブ ${total}人（仏教${kon}・煩悩${shu}）` : "直近アクティブ 0人（今が一番の狙い目）";

  const faction = state.s.faction;
  const boost = cached.boost && faction ? cached.boost[faction] : null;
  if(boost && boost > 1.01){
    const pct = Math.round((boost-1)*100);
    const label = faction==="shu" ? "煩悩陣営" : "仏教陣営";
    $("worldBoost").textContent = `${label}は少数派のため貢献+${pct}%中`;
  }else{
    $("worldBoost").textContent = "";
  }
}

export function renderWorldGauge(){
  const now = Date.now();
  if(now - lastFetch > FETCH_INTERVAL_MS){
    lastFetch = now;
    refreshWorldStatus();
  }
  const balance = cached ? cached.balance : dummyBalance();
  const label = cached ? cached.label : labelFor(balance);
  $("worldMarker").style.left = ((balance+1)/2*100)+"%";
  $("worldLabel").textContent = label;
  renderPopulation();
}
