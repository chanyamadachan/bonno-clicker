import { state } from "../core/state.js";
import { now, fmt } from "../core/format.js";
import { clickPower } from "../core/formulas.js";
import { chime, bong } from "../core/audio.js";
import { $, zone, shake, toastEl } from "./dom.js";
import { popFloat } from "./click.js";
import { check } from "./stats.js";

let goenEl=null,nextGoen=Date.now()+90000;

function spawnGoen(){const rr=Math.random(),type=rr<0.40?"fever":rr<0.66?"lucky":rr<0.84?"frenzy":"houyou";
  goenEl=document.createElement("div");goenEl.className="goen"+(type==="fever"?"":" "+type);
  goenEl.innerHTML='<div class="core">'+(type==="lucky"?"福":type==="frenzy"?"打":type==="houyou"?"法":"縁")+'</div>';
  goenEl.style.left=(14+Math.random()*60)+"vw";goenEl.style.top=(26+Math.random()*46)+"vh";
  goenEl.addEventListener("click",()=>{grantGoen(type);goenEl.remove();goenEl=null;});document.body.appendChild(goenEl);chime();
  toastEl("goen","出現",type==="lucky"?"幸運の御縁玉":type==="frenzy"?"連打の御縁玉":type==="houyou"?"大法要の御縁玉":"御縁玉",type==="lucky"?"福を掴め！":type==="frenzy"?"連打狂乱！":type==="houyou"?"下位の徳が火を噴く！":"撞いてフィーバー！");
  setTimeout(()=>{if(goenEl){goenEl.remove();goenEl=null;}},15000);}

function grantGoen(type){
  const s=state.s,up=state.up;
  if(type==="fever"){startFever();}
  else if(type==="lucky"){const lump=Math.floor((s.cps*120+clickPower()*30+s.bonno*0.10+20)*up.goldPow);s.bonno+=lump;s.total+=lump;s.luckies++;chime();shake();
    const r=zone.getBoundingClientRect();popFloat("lucky","福 +"+fmt(lump),r.width*0.5,r.height*0.4);toastEl("luck","幸運","臨時の煩悩","+"+fmt(lump));check();}
  else if(type==="frenzy"){state.frenzyUntil=now()+10000;s.frenzies++;$("frenzyBanner").classList.add("on");bong();shake();check();}
  else{state.houyouUntil=now()+15000;s.houyous++;$("houyouBanner").classList.add("on");bong(true);shake();check();}
}

export function startFever(){const s=state.s,up=state.up;state.fever.until=now()+15000+up.feverDurAdd*1000;state.fever.nextBong=0;s.feversDone++;bong();shake();$("banner").classList.add("on");$("feverbg").classList.add("on");$("mokSvg").style.display="none";$("bellSvg").style.display="";$("tapLabel").innerHTML='鐘 を 撞 け<small>フィーバー中：煩悩 ×'+(10+up.feverMulAdd)+'、一撞き大量</small>';state.dirty=true;check();}
function endFever(){$("banner").classList.remove("on");$("feverbg").classList.remove("on");$("mokSvg").style.display="";$("bellSvg").style.display="none";$("tapLabel").innerHTML='た　た　く<small>※ リズム良く叩くと念仏が流れ、ボーナス</small>';state.dirty=true;}

export function feverTick(t){
  const s=state.s,up=state.up;
  if(state.fever.until>t){if(t>=state.fever.nextBong){state.fever.nextBong=t+2000;bong();const b=s.cps*3+clickPower()*10;s.bonno+=b;s.total+=b;}}else if($("banner").classList.contains("on"))endFever();
  if(state.frenzyUntil<=t&&$("frenzyBanner").classList.contains("on"))$("frenzyBanner").classList.remove("on");
  if(state.houyouUntil<=t&&$("houyouBanner").classList.contains("on"))$("houyouBanner").classList.remove("on");
  if(!goenEl&&t>=nextGoen){spawnGoen();nextGoen=t+(120000+Math.random()*120000)*up.feverFreqMul;}
}
