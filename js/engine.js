/* Lumora 1M XAU/USD multi-factor scoring engine.
Expected candle shape: {time,open,high,low,close,volume}
time can be milliseconds or ISO string. This engine is deliberately conservative:
strong conflicting evidence -> NEUTRAL rather than forcing GOOD/BAD.
*/
function ema(a,p){if(!a.length)return 0;let k=2/(p+1),e=a[0];for(let i=1;i<a.length;i++)e=a[i]*k+e*(1-k);return e}
function atr(c,p=14){if(c.length<p+1)return null;let tr=[];for(let i=1;i<c.length;i++)tr.push(Math.max(c[i].high-c[i].low,Math.abs(c[i].high-c[i-1].close),Math.abs(c[i].low-c[i-1].close)));return tr.slice(-p).reduce((a,b)=>a+b,0)/p}
function macd(c){let x=c.map(z=>z.close);let fast=ema(x,12),slow=ema(x,26),m=fast-slow;let hist=m-ema(x.map((_,i)=>ema(x.slice(0,i+1),12)-ema(x.slice(0,i+1),26)),9);return {line:m,signal:m-hist,hist}}
function volumeFactor(c){let v=c.slice(-20).map(x=>x.volume||0);let avg=v.reduce((a,b)=>a+b,0)/v.length||1;return (c.at(-1).volume||0)/avg}
function chop(c,p=14){if(c.length<p+1)return null;let trs=[];for(let i=c.length-p;i<c.length;i++)trs.push(Math.max(c[i].high-c[i].low,Math.abs(c[i].high-c[i-1].close),Math.abs(c[i].low-c[i-1].close)));let sum=trs.reduce((a,b)=>a+b,0);let hi=Math.max(...c.slice(-p).map(x=>x.high)),lo=Math.min(...c.slice(-p).map(x=>x.low));return hi===lo?100:100*Math.log10(sum/(hi-lo))/Math.log10(p)}
function wickInfo(c){let z=c.at(-1),range=z.high-z.low;if(!range)return {bull:0,bear:0,ratio:0};let body=Math.abs(z.close-z.open),up=z.high-Math.max(z.open,z.close),down=Math.min(z.open,z.close)-z.low;return {bull:down/range,bear:up/range,ratio:Math.max(up,down)/(range||1),body:body/range}}
function sideways(c,p=20){if(c.length<p)return 1;let x=c.slice(-p),hi=Math.max(...x.map(z=>z.high)),lo=Math.min(...x.map(z=>z.low)),a=atr(c,14)||1;return (hi-lo)/(a*p)}
function analyze(c){
 if(!Array.isArray(c)||c.length<60)return {status:"NEUTRAL",confidence:0,reasons:["Need at least 60 one-minute candles","Waiting for XAU/USD live data"]};
 let close=c.map(x=>x.close), a=atr(c,14)||0, m=macd(c), vf=volumeFactor(c), ch=chop(c), w=wickInfo(c), sw=sideways(c);
 let e20=ema(close,20),e50=ema(close,50),price=close.at(-1), prev=close.at(-2);
 let score=0,reasons=[];
 // Trend direction
 let trend=e20>e50&&price>e20?1:e20<e50&&price<e20?-1:0;
 score+=trend*22; reasons.push(trend>0?"EMA20/50 trend bullish":trend<0?"EMA20/50 trend bearish":"EMA trend is mixed");
 // MACD
 let mh=m.hist, md=close.at(-1)-close.at(-6);
 let mac=mh>0&&md>0?1:mh<0&&md<0?-1:0; score+=mac*22;
 reasons.push(mac>0?"MACD momentum positive":mac<0?"MACD momentum negative":"MACD is mixed");
 // Volume confirmation
 if(vf>1.25){score+=mac*14;reasons.push("Volume confirms the current momentum")}else if(vf<.7){score-=Math.sign(score)*5;reasons.push("Volume is weak; signal confidence reduced")}else reasons.push("Volume is average");
 // Choppiness: high chop is a veto/penalty
 if(ch>61.8){score*=.45;reasons.push("High CHOP: market is choppy")}else if(ch<38.2){score+=Math.sign(score)*8;reasons.push("Low CHOP: directional movement is cleaner")}else reasons.push("CHOP is moderate");
 // Wick rejection
 if(w.bull>w.bear*1.45){score+=7;reasons.push("Lower-wick rejection supports buyers")}else if(w.bear>w.bull*1.45){score-=7;reasons.push("Upper-wick rejection supports sellers")}else reasons.push("Wick pressure is balanced");
 // Sideways/range detector
 if(sw<1.25){score*=.5;reasons.push("Price is compressed/sideways")}else if(sw>2.2){reasons.push("Range expansion supports movement")}else reasons.push("Price structure is normal");
 // Large last candle opposite the direction = caution
 if(a&&Math.abs(price-prev)>1.5*a){score*=.7;reasons.push("Last-minute expansion reduces confidence")}
 let status=Math.abs(score)<18?"NEUTRAL":score>0?"GOOD":"BAD";
 let confidence=Math.round(Math.min(98,50+Math.abs(score)*1.15));
 return {status,confidence,score,price,macd:m.hist,volume:vf,chop:ch,wicks:w,sideways:sw,trend,reasons:reasons.slice(-4)}
}
window.LumoraEngine={analyze};