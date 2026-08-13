import { upgCount } from "../core/state.js";
import { BUILDINGS, LOWIDS } from "./buildings.js";

export const ACH=[
  {id:"p1",n:"煩悩の芽",d:"煩悩を50ためる",k:1,c:s=>s.total>=50},{id:"c1",n:"木魚見習い",d:"5回たたく",k:1,c:s=>s.clicks>=5},
  {id:"g1",n:"合掌",d:"合掌を1つ得る",k:1,c:s=>s.own.gassho>=1},{id:"p2",n:"塵も積もれば",d:"煩悩を500ためる",k:1,c:s=>s.total>=500},
  {id:"sa1",n:"お賽銭",d:"賽銭を1つ得る",k:1,c:s=>s.own.saisen>=1},{id:"c2",n:"除夜の鐘",d:"108回たたく",k:2,c:s=>s.clicks>=108},
  {id:"up1",n:"はじめての学び",d:"学びを1つ得る",k:1,c:s=>upgCount()>=1},{id:"p3",n:"煩悩まみれ",d:"煩悩を5,000ためる",k:1,c:s=>s.total>=5000},
  {id:"om1",n:"すがる心",d:"お守りを1つ得る",k:1,c:s=>s.own.omamori>=1},{id:"f1",n:"御縁",d:"御縁玉でフィーバー発動",k:2,c:s=>s.feversDone>=1},
  {id:"cr1",n:"会心",d:"会心を1回出す",k:2,c:s=>s.crits>=1},{id:"rh",n:"読経",d:"念仏コンボを20つなぐ",k:2,c:s=>s.maxCombo>=20},
  {id:"p4",n:"煩悩沼",d:"煩悩を50,000ためる",k:2,c:s=>s.total>=50000},
  {id:"mk1",n:"漆塗り",d:"木魚が漆塗りに変化",k:2,c:s=>s.total>=1e4},{id:"ju1",n:"百八の珠",d:"数珠を1つ得る",k:1,c:s=>s.own.juzu>=1},
  {id:"r1",n:"初転生",d:"はじめて転生する",k:3,c:s=>s.rebirths>=1},{id:"p5",n:"一切皆苦",d:"煩悩を500,000ためる",k:3,c:s=>s.total>=500000},
  {id:"ga1",n:"餓えの化身",d:"餓鬼を1つ得る",k:3,c:s=>s.own.gaki>=1},{id:"k15",n:"業が深い",d:"業を15ためる",k:2,c:s=>s.gou>=15},
  {id:"s2",n:"煩悩無限機関",d:"煩悩／秒を5,000にする",k:3,c:s=>s.cps>=5000},{id:"up5",n:"蒐集癖",d:"学びを10得る",k:2,c:s=>upgCount()>=10},
  {id:"f10",n:"鐘の主",d:"フィーバーを10回発動",k:3,c:s=>s.feversDone>=10},{id:"kd5",n:"功徳者",d:"功徳を5ためる",k:3,c:s=>s.kudoku>=5},
  {id:"luk",n:"果報者",d:"幸運の御縁玉を掴む",k:3,c:s=>s.luckies>=1},{id:"frz",n:"連打狂乱",d:"連打の御縁玉を掴む",k:3,c:s=>s.frenzies>=1},
  {id:"hy",n:"大法要",d:"大法要の御縁玉を掴む",k:4,c:s=>s.houyous>=1},{id:"low",n:"衆生済度",d:"下位発生源を合計200所持",k:4,c:s=>LOWIDS.reduce((a,i)=>a+s.own[i],0)>=200},
  {id:"pk1",n:"悟りの一歩",d:"転生特典を1つ授かる",k:2,c:s=>Object.keys(s.perks).length>=1},{id:"pk10",n:"悟りの蒐集",d:"転生特典を10授かる",k:5,c:s=>Object.keys(s.perks).length>=10},
  {id:"jg",n:"地獄めぐり",d:"地獄を1つ得る",k:4,c:s=>s.own.jigoku>=1},{id:"mk3",n:"百鬼の器",d:"木魚が百鬼に変化",k:5,c:s=>s.total>=1e10},
  {id:"full",n:"煩悩フルコース",d:"全ての発生源を1つ以上",k:6,c:s=>BUILDINGS.every(b=>s.own[b.id]>=1)},
  {id:"p6",n:"世を煩悩に沈める",d:"煩悩を100,000,000ためる",k:8,c:s=>s.total>=1e8},{id:"mk4",n:"曼荼羅の相",d:"木魚が曼荼羅に変化",k:10,c:s=>s.total>=1e12},
  {id:"neh",n:"彼岸へ",d:"涅槃を1つ得る",k:8,c:s=>s.own.nehan>=1},{id:"sm",n:"須弥の頂",d:"須弥山を1つ得る",k:12,c:s=>s.own.shumisen>=1},
  {id:"r5",n:"輪廻の輪",d:"5回転生する",k:6,c:s=>s.rebirths>=5},{id:"r15",n:"六道を巡る",d:"15回転生する",k:9,c:s=>s.rebirths>=15},
  {id:"cm",n:"止まらぬ読経",d:"念仏コンボを10秒つなぐ",k:4,c:s=>s.maxComboMs>=10000},{id:"meta",n:"煩悩に何時間使ってんの",d:"10,000回たたく",k:0,c:s=>s.clicks>=10000},
];
