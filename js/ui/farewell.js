import { $ } from "./dom.js";
import { getWorldHistory, buildSparkMarkup } from "./world.js";

// セッション終了時の「持ち帰り」演出(企画設計書 5.14 / 9.3 Step 3-6)。
// beforeunloadはカスタムUIを描画できない(ブラウザ標準ダイアログしか出せない)ため使わず、
// 離脱の実務的な代理シグナルとして visibilitychange(hidden) を主トリガー、
// 一定時間の無操作を副トリガーとする。セッション(ページロード)につき最大1回だけ表示する。
const IDLE_MS = 4 * 60 * 1000;

let shown = false;
let idleTimer = null;

function showFarewell(){
  if(shown) return;
  shown = true;
  const spark = buildSparkMarkup(getWorldHistory(), 130, 24);
  const el = document.createElement("div");
  el.className = "ofuda farewell";
  el.innerHTML =
    `<div class="ot">またのお参りを</div>` +
    `<div class="on">あなたが去った後も陣営は動き続けます</div>` +
    `<div class="ok">次に来たとき、世界がどう変わっているか楽しみにしていてください</div>` +
    (spark ? `<svg class="whistory farewell-spark" viewBox="0 0 130 24" preserveAspectRatio="none">${spark}</svg>` : "");
  $("toasts").appendChild(el);
  setTimeout(()=>el.remove(), 6000);
}

function resetIdleTimer(){
  clearTimeout(idleTimer);
  if(shown) return;
  idleTimer = setTimeout(showFarewell, IDLE_MS);
}

function onVisibilityChange(){
  if(document.visibilityState === "hidden") showFarewell();
}

// トップレベルで即時登録すると循環import経路で壊れうるため、main.jsの起動シーケンスから呼ぶ(CLAUDE.md「循環importの注意」)。
export function initFarewellUI(){
  document.addEventListener("visibilitychange", onVisibilityChange);
  ["pointerdown", "keydown", "wheel"].forEach(ev => addEventListener(ev, resetIdleTimer, { passive: true }));
  resetIdleTimer();
}
