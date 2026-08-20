import { $ } from "./dom.js";
import { state } from "../core/state.js";
import { save } from "../core/save.js";
import { showGame } from "./intro.js";
import { applyMokTier } from "./scenery.js";
import { applyFactionLabels } from "./stats.js";

const API_BASE = "/backend/public/api";
const POLL_INTERVAL_MS = 15 * 1000; // 少人数・短時間のルーム対戦は世界情勢(60秒)より短い間隔で確認する

let pollTimer = null;
let lastStatus = null;

function fmtCountdown(sec){
  if(sec<=0) return "終了";
  const d = Math.floor(sec/86400), h = Math.floor((sec%86400)/3600), m = Math.floor((sec%3600)/60), s = Math.floor(sec%60);
  if(d>0) return `${d}日${h}時間`;
  if(h>0) return `${h}時間${m}分`;
  if(m>0) return `${m}分${s}秒`;
  return `${s}秒`;
}

function roomErrorText(code){
  switch(code){
    case "room_not_found": return "その合言葉のルームは見つかりません。";
    case "room_finished": return "そのルームはすでに終了しています。";
    case "room_full": return "そのルームは満員です。";
    case "faction_full": return "その陣営はすでに定員に達しています。";
    case "invalid_code": return "合言葉は6文字の英数字です。";
    default: return "エラーが発生しました。しばらくしてから試してください。";
  }
}

function showHomePane(){ $("roomHome").style.display=""; $("roomActive").style.display="none"; }
function showActivePane(){
  $("roomHome").style.display="none"; $("roomActive").style.display="";
  $("roomCodeDisplay").textContent = state.s.roomCode || "------";
  $("roomResult").textContent = "";
  $("roomAgainBtn").style.display = "none";
}

function switchTab(tab){
  const creating = tab==="create";
  $("rtabCreate").classList.toggle("on", creating);
  $("rtabJoin").classList.toggle("on", !creating);
  $("roomCreatePane").style.display = creating ? "" : "none";
  $("roomJoinPane").style.display = creating ? "none" : "";
  if(creating) resetJoinFlow();
}

function updateFactionPick(){
  // 初回導線中（プレイ画面がまだ隠れている間）だけ表示する。すでに通常プレイ中(トップバーの
  // ルームチップから開いた場合)は陣営が確定済みなので選択UI自体を出さない。
  const introActive = $("viewGame").classList.contains("pre-start");
  $("roomFactionPick").style.display = introActive ? "" : "none";
  $("roomChooseKon").classList.toggle("on", state.s.faction==="kon");
  $("roomChooseShu").classList.toggle("on", state.s.faction==="shu");
}

function pickFaction(id){
  state.s.faction = id;
  state.dirty = true;
  applyMokTier(state.curTier);
  applyFactionLabels();
  save();
  updateFactionPick();
}

function resetJoinFlow(){
  $("roomCodeInput").disabled = false;
  $("roomJoinCheckBtn").style.display = "";
  $("roomJoinFactionPick").style.display = "none";
}

export function openRoomModal(tab){
  $("roomError").textContent = "";
  // 呼び出し元がすでにcreate/joinを決めている場合(トップの陣営選択モーダルの2ボタン経由)は、
  // ここでもう一度切り替えタブを出すと二度手間になるので隠す。トップバーの「対戦する」チップ
  // から引数なしで開いた場合のみ、従来どおり両方選べるようにする。
  $("roomTabs").style.display = tab ? "none" : "";
  updateFactionPick();
  resetJoinFlow();
  $("roomCodeInput").value = "";
  if(state.s.roomCode){ showActivePane(); refreshRoomStatus(); }
  else{ showHomePane(); switchTab(tab || "create"); }
  $("roomModal").classList.add("on");
}
function closeRoomModal(){
  $("roomModal").classList.remove("on");
  // 初回導線中（プレイ画面がまだ隠れている間）にルームを閉じた場合は、陣営選択だけ済ませて
  // ルーム作成/参加を完了させていない状態でゲームへ進んでしまわないよう、トップページへ戻す。
  if($("viewGame").classList.contains("pre-start")) $("factionModal").classList.add("on");
}

async function createRoom(){
  if(!state.s.faction){ $("roomError").textContent = "先に陣営を選んでください。"; return; }
  const maxPlayers = parseInt($("roomMaxPlayers").value, 10);
  const durationMinutes = parseInt($("roomDuration").value, 10);
  $("roomError").textContent = "";
  try{
    const res = await fetch(API_BASE + "/room-create.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: state.s.playerId, faction: state.s.faction, maxPlayers, durationMinutes }),
    });
    const data = await res.json();
    if(!res.ok){ $("roomError").textContent = roomErrorText(data.error); return; }
    state.s.roomCode = data.code;
    save();
    showActivePane();
    startPolling();
    showGame();
  }catch(e){
    $("roomError").textContent = "通信に失敗しました。しばらくしてから試してください。";
  }
}

// 合言葉を確認し、2人ルームなら陣営選択なしでそのまま参加、4/8人ルームなら人数が均等になる
// よう陣営選択ボタンを出す(改善案: 参加者に陣営を自由選択させると偏りうるため)。
async function checkJoinCode(){
  const code = $("roomCodeInput").value.trim().toUpperCase();
  if(!/^[A-Z0-9]{6}$/.test(code)){ $("roomError").textContent = "合言葉は6文字の英数字です。"; return; }
  $("roomError").textContent = "";
  try{
    const res = await fetch(API_BASE + "/room-status.php?code=" + encodeURIComponent(code));
    const data = await res.json();
    if(!res.ok){ $("roomError").textContent = roomErrorText(data.error); return; }
    if(data.status==="finished"){ $("roomError").textContent = roomErrorText("room_finished"); return; }
    if(data.participants >= data.maxPlayers){ $("roomError").textContent = roomErrorText("room_full"); return; }
    if(data.maxPlayers===2){
      joinRoom(code, null);
    }else{
      showJoinFactionPick(code, data);
    }
  }catch(e){
    $("roomError").textContent = "通信に失敗しました。しばらくしてから試してください。";
  }
}

function showJoinFactionPick(code, data){
  const cap = Math.floor(data.maxPlayers/2);
  $("roomCodeInput").disabled = true;
  $("roomJoinCheckBtn").style.display = "none";
  $("roomJoinFactionPick").style.display = "";
  const konBtn = $("roomJoinKon"), shuBtn = $("roomJoinShu");
  konBtn.disabled = data.konCount >= cap;
  shuBtn.disabled = data.shuCount >= cap;
  $("roomJoinKonCount").textContent = `(${data.konCount}/${cap})`;
  $("roomJoinShuCount").textContent = `(${data.shuCount}/${cap})`;
  konBtn.onclick = ()=>joinRoom(code, "kon");
  shuBtn.onclick = ()=>joinRoom(code, "shu");
}

// faction=null は2人ルームの自動割当(サーバー側でホストの逆陣営を決定)を意味する。
async function joinRoom(code, faction){
  $("roomError").textContent = "";
  try{
    const res = await fetch(API_BASE + "/room-join.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: state.s.playerId, code, faction }),
    });
    const data = await res.json();
    if(!res.ok){ $("roomError").textContent = roomErrorText(data.error); resetJoinFlow(); return; }
    state.s.faction = data.faction;
    state.dirty = true;
    applyMokTier(state.curTier);
    applyFactionLabels();
    state.s.roomCode = code;
    save();
    showActivePane();
    startPolling();
    showGame();
  }catch(e){
    $("roomError").textContent = "通信に失敗しました。しばらくしてから試してください。";
    resetJoinFlow();
  }
}

function leaveRoom(){
  state.s.roomCode = null;
  save();
  stopPolling();
  lastStatus = null;
  updateRoomChip();
  showHomePane();
}

function playAgain(){
  leaveRoom();
  switchTab("create");
}

function startPolling(){
  stopPolling();
  refreshRoomStatus();
  pollTimer = setInterval(refreshRoomStatus, POLL_INTERVAL_MS);
}
function stopPolling(){
  if(pollTimer){ clearInterval(pollTimer); pollTimer = null; }
}

async function refreshRoomStatus(){
  if(!state.s.roomCode){ stopPolling(); return; }
  try{
    const res = await fetch(API_BASE + "/room-status.php?code=" + encodeURIComponent(state.s.roomCode));
    if(!res.ok){
      if(res.status===404){ leaveRoom(); }
      return;
    }
    const data = await res.json();
    lastStatus = data;
    renderRoomStatus(data);
  }catch(e){
    // オフライン・API障害時は次回のポーリングに任せる(本編プレイはブロックしない)。
  }
}

function renderRoomStatus(data){
  if($("roomModal").classList.contains("on") && $("roomActive").style.display!=="none"){
    $("roomCodeDisplay").textContent = data.code;
    $("roomCountdown").textContent = data.status==="finished" ? "終了" : "残り "+fmtCountdown(data.remainingSeconds);
    $("roomMarker").style.left = ((data.balance+1)/2*100)+"%";
    $("roomKonCP").textContent = "仏教 "+data.konCP.toFixed(1);
    $("roomShuCP").textContent = "煩悩 "+data.shuCP.toFixed(1);
    $("roomParticipants").textContent = `参加者 ${data.participants}人 / 上限${data.maxPlayers}人（仏教${data.konCount}・煩悩${data.shuCount}）`;
    const resultEl = $("roomResult"), againBtn = $("roomAgainBtn");
    if(data.status==="finished"){
      if(data.winnerFaction==="kon") resultEl.textContent = "仏教陣営の勝利。";
      else if(data.winnerFaction==="shu") resultEl.textContent = "煩悩陣営の勝利。";
      else resultEl.textContent = "引き分け。";
      againBtn.style.display = "";
    }else{
      resultEl.textContent = "";
      againBtn.style.display = "none";
    }
  }
  if(data.status==="finished") stopPolling();
  updateRoomChip();
}

// main.js の frame() の0.15秒間隔UI更新から呼ぶ(トップバーのチップを常時最新に保つ)。
export function updateRoomChip(){
  const chip = $("roomChipText");
  if(!state.s.roomCode){ chip.textContent = "対戦する"; return; }
  if(!lastStatus){ chip.textContent = "対戦中"; return; }
  chip.textContent = lastStatus.status==="finished" ? "結果を見る" : fmtCountdown(lastStatus.remainingSeconds);
}

// トップレベルで即時登録すると循環import経路で壊れうるため、main.jsの起動シーケンスから呼ぶ(CLAUDE.md「循環importの注意」)。
export function initRoomUI(){
  $("roomChip").addEventListener("click", ()=>openRoomModal());
  $("roomClose").addEventListener("click", closeRoomModal);
  $("roomChooseKon").addEventListener("click", ()=>pickFaction("kon"));
  $("roomChooseShu").addEventListener("click", ()=>pickFaction("shu"));
  $("rtabCreate").addEventListener("click", ()=>switchTab("create"));
  $("rtabJoin").addEventListener("click", ()=>switchTab("join"));
  $("roomCreateBtn").addEventListener("click", createRoom);
  $("roomJoinCheckBtn").addEventListener("click", checkJoinCode);
  $("roomLeaveBtn").addEventListener("click", leaveRoom);
  $("roomAgainBtn").addEventListener("click", playAgain);
  if(state.s.roomCode) startPolling();
}
