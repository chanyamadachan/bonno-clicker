import { $ } from "./dom.js";
import { state } from "../core/state.js";
import { seijakuActive } from "../core/formulas.js";

const API_BASE = "/backend/public/api";
const FETCH_INTERVAL_MS = 60 * 1000; // 世界情勢の取得は60秒おきで十分(直近窓は48時間単位のため)
// CP = log10(deltaResource + 1) × k の簡易複製(企画設計書 5.11)。backend/config.phpの$CP_Kと同じ値だが、
// あくまで即時フィードバック用の見た目上の概算であり、実際のCP・天秤はサーバーが権威(3.2の設計方針どおり)。
const CLIENT_K_GUESS = 12.0;

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
// 直近のworld-status取得時点でのs.total(5.11)。nullの間は仮反映を行わない(初回取得前に生涯累計を仮反映しないため)。
let totalAtLastFetch = null;

async function refreshWorldStatus(){
  if(fetching) return;
  fetching = true;
  try{
    const res = await fetch(API_BASE + "/world-status.php");
    if(res.ok){
      cached = await res.json();
      // この時点までの増分はもう「実測値」に含まれたはずなので、仮反映の起点をここへ進める。
      totalAtLastFetch = state.s.total;
    }
  }catch(e){
    // API未設置・オフライン等は下のダミー値表示にフォールバックする(本編プレイは一切ブロックしない)。
  }finally{
    fetching = false;
  }
}

// 自分の直近の生産分(前回のworld-status取得以降の増分)を、天秤にその場でうっすら仮反映する(5.11)。
// 実測値と混同しないよう、呼び出し側で.wmarkerに`pending`クラスを付けて見た目を変える。
function computeDisplayBalance(){
  const konBase = (cached && cached.konCP) || 0;
  const shuBase = (cached && cached.shuCP) || 0;
  let konCP = konBase, shuCP = shuBase, pending = false;

  const faction = state.s.faction;
  if(faction && totalAtLastFetch !== null){
    const pendingDelta = Math.max(0, state.s.total - totalAtLastFetch);
    if(pendingDelta > 0){
      const kEff = (faction==="kon" && seijakuActive()) ? CLIENT_K_GUESS*1.25 : CLIENT_K_GUESS;
      const boost = (cached && cached.boost && cached.boost[faction]) || 1;
      const virtualCp = Math.log10(pendingDelta+1) * kEff * boost;
      if(faction==="kon") konCP += virtualCp; else shuCP += virtualCp;
      pending = true;
    }
  }

  const eps = 1e-6, sum = konCP + shuCP;
  const balance = sum>0 ? Math.max(-1, Math.min(1, (shuCP-konCP)/(sum+eps))) : 0;
  return { balance, pending };
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
  let balance, pending;
  if(cached){
    ({ balance, pending } = computeDisplayBalance());
  }else{
    balance = dummyBalance(); pending = false;
  }
  // .wmarkerには既存のtransition:left .5s easeが効いているため、毎フレームstyle.leftを
  // 更新するだけで仮反映値↔実測値の切り替わりも含めて自然に補間される(5.11の「アニメーションでイーズ」)。
  $("worldMarker").style.left = ((balance+1)/2*100)+"%";
  $("worldMarker").classList.toggle("pending", pending);
  $("worldLabel").textContent = labelFor(balance);
  renderPopulation();
}
