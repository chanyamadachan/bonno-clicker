import { $ } from "./dom.js";
import { state } from "../core/state.js";
import { seijakuActive } from "../core/formulas.js";

const API_BASE = "/backend/public/api";
const FETCH_INTERVAL_MS = 60 * 1000; // 世界情勢の取得は60秒おきで十分(直近窓は48時間単位のため)
// CP = log10(deltaResource + 1) × k の簡易複製(企画設計書 5.11)。backend/config.phpの$CP_Kと同じ値だが、
// あくまで即時フィードバック用の見た目上の概算であり、実際のCP・天秤はサーバーが権威(3.2の設計方針どおり)。
const CLIENT_K_GUESS = 12.0;

// 情勢推移グラフ(企画設計書 5.3)。faction_totalsの履歴API(バックエンド)は現状存在しないため、
// このブラウザが実際にworld-statusを取得できた瞬間の値だけを端末ローカルに積み上げる簡易版
// (「7日間の世界全体の推移」ではなく「このブラウザで見てきた直近の推移」に近い点は割り切り)。
const HISTORY_KEY = "bonno-clicker-world-history-v1";
const HISTORY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const HISTORY_MAX_POINTS = 500;
const historyStore = (typeof window !== "undefined" && window.storage) ? window.storage : null;
let history = [];

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

async function loadHistory(){
  if(!historyStore) return;
  try{
    const r = await historyStore.get(HISTORY_KEY, false);
    if(r && r.value) history = JSON.parse(r.value) || [];
  }catch(e){}
  renderHistorySpark();
}

function pruneHistory(){
  const cutoff = Date.now() - HISTORY_MAX_AGE_MS;
  history = history.filter(p=>p.t>=cutoff);
  if(history.length>HISTORY_MAX_POINTS) history = history.slice(history.length-HISTORY_MAX_POINTS);
}

async function refreshWorldStatus(){
  if(fetching) return;
  fetching = true;
  try{
    const res = await fetch(API_BASE + "/world-status.php");
    if(res.ok){
      cached = await res.json();
      // この時点までの増分はもう「実測値」に含まれたはずなので、仮反映の起点をここへ進める。
      totalAtLastFetch = state.s.total;
      // 誘惑(5.13)はサーバー権威の状態。世界情勢の取得タイミングに合わせて反映する(9.3 Step 3-6)。
      state.yuuwakuUntil = (cached.boons && cached.boons.yuuwakuUntilKon) || 0;
      // 実測できたバランス値だけを履歴に積む(仮反映値は含めない、5.3)。
      history.push({ t: Date.now(), balance: cached.balance });
      pruneHistory();
      renderHistorySpark();
      if(historyStore){ try{ historyStore.set(HISTORY_KEY, JSON.stringify(history), false); }catch(e){} }
    }
  }catch(e){
    // API未設置・オフライン等は下のダミー値表示にフォールバックする(本編プレイは一切ブロックしない)。
  }finally{
    fetching = false;
  }
}

// 情勢推移グラフのSVG中身を組み立てる(5.3)。持ち帰り演出(5.14)のミニグラフでも再利用するためexportする。
export function buildSparkMarkup(hist, W, H){
  if(hist.length<2) return "";
  const tMin=hist[0].t, tMax=hist[hist.length-1].t, span=Math.max(1,tMax-tMin);
  const pts = hist.map(p=>{
    const x = ((p.t-tMin)/span)*W;
    const y = H - ((Math.max(-1,Math.min(1,p.balance))+1)/2)*H;
    return x.toFixed(1)+","+y.toFixed(1);
  }).join(" ");
  return `<line x1="0" y1="${H/2}" x2="${W}" y2="${H/2}" class="wh-mid"/><polyline points="${pts}" class="wh-line"/>`;
}

function renderHistorySpark(){
  const svg = $("worldHistorySpark");
  if(!svg) return;
  svg.innerHTML = buildSparkMarkup(history, 130, 20);
}

// 持ち帰り演出(9.3 Step 3-6)が縮小版ミニグラフを描くための参照用getter。
export function getWorldHistory(){ return history; }

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

// 世界の見た目そのものへの反映(企画設計書 5.8)。背景を仏教寄り(静謐・青)⇔煩悩寄り(喧騒・赤)に
// リアルタイムで色付けする。拮抗(0付近)ではほぼ見えず、傾くほど強く出す。
// (合成音のドローンによる演出はコスト・リスクに対して効果検証が難しいため、このStepでは見送り)
let lastToneBucket = null;
function renderWorldTone(balance){
  const mag = Math.min(1, Math.abs(balance));
  const bucket = Math.round(mag*20); // 0.05刻みで丸め、微小変動での無駄なstyle書き換えを避ける
  if(bucket===lastToneBucket) return;
  lastToneBucket = bucket;
  const alpha = (0.04 + mag*0.20).toFixed(3);
  const color = balance>=0 ? `rgba(180,40,60,${alpha})` : `rgba(50,95,155,${alpha})`;
  $("worldTone").style.background = `radial-gradient(120% 90% at 50% 8%, ${color}, transparent 70%)`;
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
  const seidoBonus = cached.boons && cached.boons.seidoBonus && faction ? cached.boons.seidoBonus[faction] : 0;
  if(boost && boost > 1.01){
    const pct = Math.round((boost-1)*100);
    const label = faction==="shu" ? "煩悩陣営" : "仏教陣営";
    // 済度による一時ボーナス(5.13)が乗っている間は内訳を添える(0.3-Bのboost表示パイプラインを延長)。
    const seidoNote = seidoBonus > 0.001 ? `（うち済度+${Math.round(seidoBonus*100)}%）` : "";
    $("worldBoost").textContent = `${label}は少数派のため貢献+${pct}%中${seidoNote}`;
  }else{
    $("worldBoost").textContent = "";
  }
}

// 済度・誘惑(9.3 Step 3-6)がボタンの活性化条件をサーバーと同じ基準で先読みするための参照用getter。
// あくまで事前フィードバック用の概算であり、実際の劣勢判定・乱用防止はサーバー側(boon-*.php)が権威。
export function getCachedWorldStatus(){ return cached; }

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
  renderWorldTone(balance);
  renderPopulation();
}

// main.js の起動シーケンスから呼ぶ(トップレベルでの即時await/副作用を避ける、CLAUDE.mdの循環import注意)。
export function initWorldHistory(){
  loadHistory();
}
