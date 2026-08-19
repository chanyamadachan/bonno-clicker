export const now = () => Date.now();

const JU=["","万","億","兆","京","垓","秭","穣","溝","澗","正","載"];
export function fmt(n){n=Math.floor(n);if(!isFinite(n))return "∞";if(n<0)n=0;if(n<10000)return String(n);const ch=[];let x=n;while(x>0){ch.push(x%10000);x=Math.floor(x/10000);}const hi=ch.length-1;if(hi>=JU.length)return n.toExponential(2);let out=ch[hi]+JU[hi];if(hi>=1&&ch[hi-1]>0)out+=ch[hi-1]+JU[hi-1];return out;}
export function fmtRate(n){if(n<10)return (Math.round(n*10)/10).toString();if(n<10000)return String(Math.floor(n));return fmt(n);}
export function fmtTime(ms){return (ms/1000).toFixed(1)+" 秒";}
export function fmtClock(ms){const d=new Date(ms);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");}
