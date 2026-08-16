import { state } from "./state.js";
import { save } from "./save.js";

const API_BASE = "/backend/public/api";
const SEND_INTERVAL_MS = 3 * 60 * 1000; // 3分間隔(企画設計書 4.2)

let lastAttempt = 0;
let inFlight = false;

async function sendContribution(){
  const s = state.s;
  if(!s.faction || inFlight) return;
  const delta = s.total - (s.lastReportedTotal || 0);
  if(delta <= 0) return;
  inFlight = true;
  try{
    const res = await fetch(API_BASE + "/contribute.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: s.playerId, faction: s.faction, delta, clientTs: Date.now() }),
    });
    if(res.ok){
      // 送信できた分だけ既報告済みとして進める。失敗時はここを進めず、次回の間隔で差分がそのまま再送される(best-effort、4.2)。
      s.lastReportedTotal = s.total;
      save();
    }
  }catch(e){
    // オフライン・API障害時も陣営送信の失敗が本編プレイを一切ブロックしない(4.2の設計思想)。
  }finally{
    inFlight = false;
  }
}

// main.js の frame() から壁時計時刻(Date.now())の差分で呼び出す。
// requestAnimationFrame はバックグラウンドタブで大きく間引かれるため、フレームカウントではなく実時刻差分で送信要否を判定する(8.8)。
export function tickFactionSend(now){
  if(now - lastAttempt < SEND_INTERVAL_MS) return;
  lastAttempt = now;
  sendContribution();
}
