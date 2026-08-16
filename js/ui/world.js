import { $ } from "./dom.js";

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

// フェーズ2でサーバー集計値(/api/world-status)に差し替えるまでの、ローカル完結のダミー値。
export function renderWorldGauge(){
  const balance = Math.sin(Date.now()/600000)*0.6;
  $("worldMarker").style.left = ((balance+1)/2*100)+"%";
  $("worldLabel").textContent = labelFor(balance);
}
