import { state } from "../core/state.js";
import { fmt } from "../core/format.js";
import { rankOf } from "../core/formulas.js";

export const RANKS=[[0,"見習い煩悩"],[300,"俗物"],[12000,"生臭坊主"],[400000,"煩悩の達人"],[2e7,"大欲魔"],[1e9,"百八の主"],[6e10,"煩悩大権現"],[3e12,"生き仏（大嘘）"],[1e15,"煩悩の化身"]];

export const HEART=["色即是空","空即是色","般若波羅蜜","照見五蘊皆空","羯諦羯諦","波羅羯諦","不生不滅","遠離顛倒夢想","心無罣礙","菩提薩埵"];
export const HYPE=["乗ってきた","MAX TENSION","止まらない","ノリノリ","もっとくれ","TOP OF THE WORLD"];

export const MOKTIERS=[
  {min:0,name:"素木の木魚",body:["#d8b98a","#b5915f","#7d5f36"],jewel:"#a23327",gold:0,flame:0,eye:0,halo:0,glow:""},
  {min:1e4,name:"漆塗りの木魚",body:["#c9743f","#9c4e28","#5c2f16"],jewel:"#e34b2c",gold:0,flame:0,eye:0,halo:0,glow:"drop-shadow(0 4px 6px rgba(0,0,0,.5))"},
  {min:1e8,name:"金装の木魚",body:["#f0d27a","#cd9a34","#7a5416"],jewel:"#ff5a2c",gold:1,flame:0,eye:0,halo:0,glow:"drop-shadow(0 0 10px rgba(255,215,120,.6))"},
  {min:1e10,name:"百鬼の木魚",body:["#8a3a58","#4a1f33","#1c0e1a"],jewel:"#ff2b2b",gold:1,flame:1,eye:1,halo:0,glow:"drop-shadow(0 0 16px rgba(210,40,70,.65))"},
  {min:1e12,name:"曼荼羅の木魚",body:["#ffe9a8","#e6b84a","#9a6b1a"],jewel:"#ff3b3b",gold:1,flame:1,eye:1,halo:1,glow:"drop-shadow(0 0 22px rgba(255,215,120,.9))"},
];

// 煩悩陣営の「叩く対象」＝脳みそのティア変化。MOKTIERSと同じmin閾値・同じ意味のプロパティ(gold/flame/eye/halo)を
// 使い回し、scenery.jsのapplyMokTier()が陣営分岐で参照する。
export const MOKTIERS_SHU=[
  {min:0,name:"生まれたての脳みそ",body:["#ffd0e0","#ff8fb8","#a03a68"],jewel:"#ff2bd6",gold:0,flame:0,eye:0,halo:0,glow:""},
  {min:1e4,name:"ときめきピンク脳",body:["#ffb0d8","#ff4fa8","#8a1a54"],jewel:"#ff1ae0",gold:0,flame:0,eye:0,halo:0,glow:"drop-shadow(0 4px 8px rgba(255,43,214,.4))"},
  {min:1e8,name:"バキバキ覚醒脳",body:["#fff2a0","#ffcf30","#a07a10"],jewel:"#ffee00",gold:1,flame:0,eye:0,halo:0,glow:"drop-shadow(0 0 12px rgba(255,230,0,.6))"},
  {min:1e10,name:"限界突破ドーパミン脳",body:["#d090ff","#8a2ae0","#3a0a6a"],jewel:"#ff2bff",gold:1,flame:1,eye:1,halo:0,glow:"drop-shadow(0 0 18px rgba(200,40,255,.7))"},
  {min:1e12,name:"宇宙まで突き抜けた脳",body:["#ffe9ff","#ff6bf0","#4a0a8a"],jewel:"#fff23b",gold:1,flame:1,eye:1,halo:1,glow:"drop-shadow(0 0 26px rgba(255,80,220,.95))"},
];

export const CHILL=[
  {k:"catSleep",x:6,y:22,t:0,zzz:1},{k:"catLoaf",x:11,y:64,t:1},{k:"teacup",x:90,y:37,t:1},{k:"bozu",x:91,y:65,t:1,zzz:1},{k:"zabuton",x:8,y:92,t:1},
  {k:"koTanuki",x:10,y:37,t:2},{k:"jizo",x:5,y:50,t:2},{k:"koTanuki",x:16,y:9,t:2},{k:"oshou",x:7,y:90,t:2,zzz:1},{k:"jizo",x:85,y:93,t:2},
  {k:"tanuki",x:6,y:78,t:3},{k:"catStretch",x:94,y:24,t:3},{k:"catBelly",x:95,y:51,t:3},{k:"dango",x:24,y:88,t:3},
  {k:"koTanuki",x:95,y:79,t:4},{k:"catSleep",x:20,y:94,t:4,zzz:1},{k:"dango2",x:74,y:90,t:4},{k:"oshou",x:92,y:88,t:4,zzz:1},{k:"bozu",x:84,y:8,t:4,zzz:1},{k:"catBelly",x:80,y:95,t:4},
];

export const NEWS=[
  ()=>"近所の寺、煩悩の過去最多を更新。",()=>"木魚職人「叩けば無心になる、はずだった」。",()=>`速報：あなたの位、<b>${rankOf()}</b>に到達。`,
  ()=>"餓鬼、求人募集中。飢え歓迎・経験不問。",()=>"専門家「何もしないのが一番むずかしい」。",()=>"閻魔「今日も残業。裁いても終わらぬ」。",
  ()=>"数珠、108粒では足りぬとの声。",()=>"賽銭箱、投げ銭で満杯。ご利益は未確認。",()=>`累計 ${fmt(state.s.total)} の煩悩が世に放たれました。`,
  ()=>"「煩悩は消せぬが、増やせる」——当社調べ。",()=>"六道、本日も渋滞。地獄方面で事故の情報。",()=>`木魚、ただいま「<b>${MOKTIERS[state.curTier].name}</b>」の相。`,
  ()=>"住職「リズム良く叩くと、つい念仏が出る」。",()=>"極楽の窓口「功徳は貯めても腐りませんよ」。",()=>"御縁玉に四相あり。大法要は下位の徳を糧とすると。",
  ()=>"だらけ猫、木魚の周りに定住。住職は黙認の構え。",()=>"下位の徳、侮るなかれ。数が力になる日が来る。",
];

// 陣営バランス調整の「世界のお知らせ」ログ(企画設計書 5.15)。サーバー側のパラメータ
// (CP係数k・boost上限など)を調整した際、都度ここに一行足す運用。NEWSと同じくrotateNewsで
// 抽選されティッカーに流れる(js/ui/stats.js)。黙って変えない透明性がそのまま信頼になる、という狙い。
export const WORLD_NEWS=[
  ()=>"📢 8月17日、陣営対戦の集計に「少数派救済」ブーストを反映しました。人数の少ない陣営ほど貢献が大きく届きます。",
  ()=>"📢 8月17日、突発的な連投で天秤が振り切れないよう、外れ値を丸める処理を導入しました。",
  ()=>"📢 8月19日、自分の一打が天秤に反映されるまでのラグを縮め、その場で仮の動きが見えるようにしました。",
];
