/* Lumora XAU/USD 1M Multi-Factor Market Quality Engine.
   GOOD = tradeable market environment (either bullish or bearish).
   BAD = poor/unsafe market environment (chop, dead volatility, abnormal volatility, weak confirmation, etc.).
   NEUTRAL = mixed evidence / transition.
*/
function ema(a,p){if(!a.length)return 0;let k=2/(p+1),e=a[0];for(let i=1;i<a.length;i++)e=a[i]*k+e*(1-k);return e}
function sma(a,p){if(a.length<p)return null;let x=a.slice(-p);return x.reduce((s,v)=>s+v,0)/p}
function stdev(a,p){if(a.length<p)return null;let x=a.slice(-p),m=x.reduce((s,v)=>s+v,0)/p;return Math.sqrt(x.reduce((s,v)=>s+(v-m)**2,0)/p)}
function atr(c,p=14){if(c.length<p+1)return null;let tr=[];for(let i=1;i<c.length;i++)tr.push(Math.max(c[i].high-c[i].low,Math.abs(c[i].high-c[i-1].close),Math.abs(c[i].low-c[i-1].close)));return tr.slice(-p).reduce((a,b)=>a+b,0)/p}
function rsi(c,p=14){if(c.length<p+1)return null;let gains=0,losses=0;for(let i=c.length-p;i<c.length;i++){let d=c[i].close-c[i-1].close;if(d>0)gains+=d;else losses-=d}let ag=gains/p,al=losses/p;return al===0?100:100-(100/(1+ag/al))}
function macd(c){let x=c.map(z=>z.close);let fast=ema(x,12),slow=ema(x,26),line=fast-slow;let histSeries=[];for(let i=0;i<x.length;i++){let q=x.slice(0,i+1);histSeries.push(ema(q,12)-ema(q,26))}let signal=ema(histSeries,9),hist=line-signal;return {line,signal,hist}}
function volumeFactor(c){let v=c.slice(-21,-1).map(x=>Number(x.volume)||0);let avg=v.reduce((a,b)=>a+b,0)/Math.max(v.length,1)||1;return (Number(c.at(-1).volume)||0)/avg}
function chop(c,p=14){if(c.length<p+1)return null;let trs=[];for(let i=c.length-p;i<c.length;i++)trs.push(Math.max(c[i].high-c[i].low,Math.abs(c[i].high-c[i-1].close),Math.abs(c[i].low-c[i-1].close)));let sum=trs.reduce((a,b)=>a+b,0),hi=Math.max(...c.slice(-p).map(x=>x.high)),lo=Math.min(...c.slice(-p).map(x=>x.low));return hi===lo?100:100*Math.log10(sum/(hi-lo))/Math.log10(p)}
function wickInfo(c){let z=c.at(-1),range=z.high-z.low;if(!range)return {bull:0,bear:0,body:0,ratio:0};let body=Math.abs(z.close-z.open),up=z.high-Math.max(z.open,z.close),down=Math.min(z.open,z.close)-z.low;return {bull:down/range,bear:up/range,ratio:Math.max(up,down)/range,body:body/range}}
function sideways(c,p=20){if(c.length<p)return null;let x=c.slice(-p),hi=Math.max(...x.map(z=>z.high)),lo=Math.min(...x.map(z=>z.low)),a=atr(c,14)||1;return (hi-lo)/(a*p)}
function bollinger(c,p=20,k=2){let x=c.map(z=>z.close),m=sma(x,p),sd=stdev(x,p);if(m==null||!m)return null;return {mid:m,upper:m+k*sd,lower:m-k*sd,width:(2*k*sd)/m,position:(x.at(-1)-m)/(k*sd||1)}}
function structure(c,p=10){if(c.length<p*2)return {direction:0,quality:0};let a=c.slice(-p),b=c.slice(-p*2,-p),ah=Math.max(...a.map(x=>x.high)),al=Math.min(...a.map(x=>x.low)),bh=Math.max(...b.map(x=>x.high)),bl=Math.min(...b.map(x=>x.low));let bull=ah>bh&&al>bl,bear=ah<bh&&al<bl;return {direction:bull?1:bear?-1:0,quality:bull||bear?1:0}}
function volatility(c){let a=atr(c,14);if(!a)return {atr:null,ratio:null,state:"unknown"};let recent=[];for(let i=20;i<c.length;i++){let q=atr(c.slice(0,i+1),14);if(q)recent.push(q)}let avg=recent.slice(-50).reduce((s,v)=>s+v,0)/Math.max(recent.slice(-50).length,1);let ratio=a/(avg||a);return {atr:a,ratio,state:ratio<0.65?"dead":ratio>1.9?"extreme":ratio>0.9?"healthy":"soft"}}
function sessionInfo(d=new Date()){
 const hour=(tz)=>{let p=new Intl.DateTimeFormat("en-US",{timeZone:tz,hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(d);return Number(p.find(x=>x.type==="hour").value)+Number(p.find(x=>x.type==="minute").value)/60};
 let s=[];if(hour("Asia/Tokyo")>=9&&hour("Asia/Tokyo")<18)s.push("TOKYO");if(hour("Europe/London")>=8&&hour("Europe/London")<17)s.push("LONDON");if(hour("America/New_York")>=8&&hour("America/New_York")<17)s.push("NEW YORK");return s;
}
function analyze(c,ctx={}){
 if(!Array.isArray(c)||c.length<80)return {status:"NEUTRAL",confidence:0,reasons:["Need at least 80 one-minute candles","Waiting for XAU/USD live data"],direction:"MIXED"};
 let close=c.map(x=>Number(x.close)), price=close.at(-1), m=macd(c), vf=volumeFactor(c), ch=chop(c), w=wickInfo(c), sw=sideways(c), bb=bollinger(c), r=rsi(c), vol=volatility(c), st=structure(c);
 let e20=ema(close,20),e50=ema(close,50),e20prev=ema(close.slice(0,-5),20),slope=e20-e20prev;
 let trendDir=e20>e50&&price>e20?1:e20<e50&&price<e20?-1:0;
 let macDir=m.hist>0&&m.line>m.signal?1:m.hist<0&&m.line<m.signal?-1:0;
 let momentumDir=(macDir+(r!=null?(r>55?1:r<45?-1:0):0)); momentumDir=momentumDir>0?1:momentumDir<0?-1:0;
 let structureDir=st.direction;
 let directionalAgreement=[trendDir,macDir,momentumDir,structureDir].filter(x=>x!==0);
 let agreement=directionalAgreement.length?directionalAgreement.filter(x=>x===Math.sign(directionalAgreement.reduce((a,b)=>a+b,0))).length/directionalAgreement.length:0;
 let quality=0, reasons=[];
 // Directional coherence: a clear direction is useful, but does not decide GOOD/BAD by itself.
 if(directionalAgreement.length>=3 && agreement>=0.75){quality+=22;reasons.push((trendDir>0?"Bullish":"Bearish")+" structure is aligned across trend and momentum")}else if(directionalAgreement.length>=2 && agreement>=0.66){quality+=12;reasons.push("Trend and momentum are reasonably aligned")}else{quality-=8;reasons.push("Trend and momentum are not fully aligned")}
 // Momentum strength
 let histStrength=bb?Math.abs(m.hist)/(Math.max(vol.atr||1,0.0001)):Math.abs(m.hist);
 if(momentumDir!==0 && ((r>=55&&momentumDir>0)||(r<=45&&momentumDir<0))){quality+=10;reasons.push("MACD and RSI support the current momentum")}else if(r>=45&&r<=55){quality-=2;reasons.push("RSI is near balance; momentum edge is limited")}else quality+=4;
 // Healthy volatility: too low and too high are both bad for 1M scalping.
 if(vol.state==="healthy"){quality+=18;reasons.push("ATR volatility is in a healthy tradeable range")}else if(vol.state==="soft"){quality+=5;reasons.push("Volatility is slightly soft")}else if(vol.state==="dead"){quality-=24;reasons.push("ATR volatility is too low for clean 1M movement")}else if(vol.state==="extreme"){quality-=20;reasons.push("ATR volatility is abnormally high; whipsaw risk is elevated")}
 // Volume confirmation
 if(vf>=1.2){quality+=14;reasons.push("Volume confirms current price movement")}else if(vf<0.7){quality-=15;reasons.push("Volume is weak; movement lacks participation")}else {quality+=2;reasons.push("Volume is average")}
 // CHOP
 if(ch<38.2){quality+=14;reasons.push("Low CHOP: directional conditions are cleaner")}else if(ch<=55){quality+=5;reasons.push("CHOP is moderate")}else if(ch<=61.8){quality-=8;reasons.push("CHOP is elevated; entries need caution")}else{quality-=24;reasons.push("High CHOP: market is choppy")}
 // Sideways / compression
 if(sw<1.15){quality-=22;reasons.push("Price is compressed/sideways")}
 else if(sw<1.55){quality-=6;reasons.push("Price structure is somewhat compressed")}
 else if(sw>2.2){quality+=8;reasons.push("Range expansion provides room for movement")}
 else quality+=4;
 // Wick quality: balanced is okay; extreme rejection against the dominant direction is a warning.
 let dominant=trendDir||momentumDir||structureDir;
 if(dominant!==0){let against=dominant>0?w.bear:w.bull, withDir=dominant>0?w.bull:w.bear;if(against>0.48&&against>withDir*1.25){quality-=10;reasons.push("Strong rejection wick conflicts with the current direction")}else if(withDir>0.28&&withDir>against*1.15){quality+=6;reasons.push("Wick structure supports the current direction")}else quality+=2}
 // Bollinger width / location as an extra volatility-quality check.
 if(bb){if(bb.width<0.0018){quality-=12;reasons.push("Bollinger width is very tight") } else if(bb.width>0.012){quality-=8;reasons.push("Bollinger width is unusually wide") }
   if(Math.abs(bb.position)>2.2){quality-=5;reasons.push("Price is stretched outside the normal Bollinger zone")}}
 // Session context
 const sessions=ctx.sessions||sessionInfo(); if(sessions.length){quality+=3;reasons.push("Active liquidity session: "+sessions.join(" • "))}else{quality-=5;reasons.push("Outside the main London/New York/Tokyo session windows")}
 // News proximity: optional context from the news engine. Major news close to release reduces tradeability.
 const newsMin=Number.isFinite(ctx.newsMinutes)?ctx.newsMinutes:null;
 if(newsMin!=null){if(newsMin<=10){quality-=25;reasons.push("High-impact news is very close") }else if(newsMin<=20){quality-=12;reasons.push("High-impact news is approaching")}else if(newsMin<=60){quality-=3;reasons.push("Upcoming news risk is present")}}
 // Normalize quality to roughly -100..100.
 quality=Math.max(-100,Math.min(100,quality));
 // Hard market-quality guards: extreme chop + compression is not a tradeable 1M environment,
 // even if another factor (for example ATR or volume) happens to look healthy.
 let forcedBad=false;
 if(ch!=null && sw!=null && ch>=70 && sw<1.20) forcedBad=true;
 if(ch!=null && bb && ch>=61.8 && bb.width<0.0018) forcedBad=true;
 if(vol.state==="dead" && sw!=null && sw<1.35) forcedBad=true;
 let status=forcedBad?"BAD":quality>=38?"GOOD":quality<=-18?"BAD":"NEUTRAL";
 if(forcedBad){ quality=Math.min(quality,-30); reasons.push("Market-quality guard: high chop and/or compression blocks 1M entries"); }
 // Confidence reflects strength and agreement, not direction.
 let evidence=Math.min(1,Math.abs(quality)/75), factorAgreement=Math.min(1,Math.max(0,agreement));
 let confidence=Math.round(Math.min(98,52+evidence*35+factorAgreement*11));
 if(status==="NEUTRAL")confidence=Math.round(Math.min(74,50+Math.abs(quality)*0.65+factorAgreement*8));
 let direction=dominant>0?"BULLISH":dominant<0?"BEARISH":"MIXED";
 return {status,confidence,quality,price,macd:m.hist,macdLine:m.line,volume:vf,chop:ch,wicks:w,sideways:sw,trend:trendDir,rsi:r,bollinger:bb,atr:vol.atr,volatilityRatio:vol.ratio,volatilityState:vol.state,structure:st.direction,direction,sessions,reasons:reasons.slice(-4)};
}
window.LumoraEngine={analyze,sessionInfo};
