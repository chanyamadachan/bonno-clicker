import { $ } from "./dom.js";

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
}
