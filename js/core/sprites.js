import { PAL, GRID } from "../data/sprite-data.js";

function makeSprite(rows){const S=12,cv=document.createElement('canvas');cv.width=cv.height=S;const g=cv.getContext('2d');rows.forEach((row,y)=>{for(let x=0;x<row.length&&x<S;x++){const col=PAL[row[x]];if(col){g.fillStyle=col;g.fillRect(x,y,1,1);}}});return cv;}
function makeSil(rows){const S=12,cv=document.createElement('canvas');cv.width=cv.height=S;const g=cv.getContext('2d');g.fillStyle="rgba(28,20,12,.82)";rows.forEach((row,y)=>{for(let x=0;x<row.length&&x<S;x++){if(PAL[row[x]])g.fillRect(x,y,1,1);}});return cv;}

export const SPRITE_URL={},SPRITE_SIL={},ITEM_SPRITES=[],CHILL_URL={};
const BMAP={gassho:"gassho",saisen:"coin",omamori:"omamori",juzu:"juzu",nenbutsu:"nenbutsu",gaki:"gaki",enma:"enma",jigoku:"jigoku",mandara:"mandara",nehan:"nehan",rinne:"rinne",shumisen:"shumisen"};
const CHILLKEYS=["catSleep","catLoaf","catStretch","zabuton","teacup","dango","catBelly","bozu","tanuki","dango2","oshou","koTanuki","jizo"];
export function buildSprites(){["coin","bag","bill","rice","ramen","futon","gem","sake"].forEach(k=>ITEM_SPRITES.push(makeSprite(GRID[k])));for(const id in BMAP){SPRITE_URL[id]=makeSprite(GRID[BMAP[id]]).toDataURL();SPRITE_SIL[id]=makeSil(GRID[BMAP[id]]).toDataURL();}CHILLKEYS.forEach(k=>CHILL_URL[k]=makeSprite(GRID[k]).toDataURL());}
