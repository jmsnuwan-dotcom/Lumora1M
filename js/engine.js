/* Lumora XAU/USD 1M — Hybrid Market Condition Engine V14
   70% = last 5 COMPLETED M1 candles (stable market context)
   30% = CURRENT FORMING M1 candle (live confirmation / warning)
   Analysis only: never sends, modifies, or blocks trades.
*/
function ema(a,p){if(!a.length)return 0;let k=2/(p+1),e=a[0];for(let i=1;i<a.length;i++)e=a[i]*k+e*(1-k);return e}
function atrWilder(c,p=8){if(c.length<p+1)return null;let tr=[];for(let i=1;i<c.length;i++)tr.push(Math.max(c[i].high-c[i].low,Math.abs(c[i].high-c[i-1].close),Math.abs(c[i].low-c[i-1].close)));let a=tr.slice(0,p).reduce((s,v)=>s+v,0)/p;for(let i=p;i<tr.length;i++)a=(a*(p-1)+tr[i])/p;return a}
function rsiWilder(c,p=8){if(c.length<p+1)return null;let gains=0,losses=0;for(let i=1;i<=p;i++){let d=c[i].close-c[i-1].close;if(d>0)gains+=d;else losses-=d}let ag=gains/p,al=losses/p;for(let i=p+1;i<c.length;i++){let d=c[i].close-c[i-1].close,g=d>0?d:0,l=d<0?-d:0;ag=(ag*(p-1)+g)/p;al=(al*(p-1)+l)/p}return al===0?100:100-(100/(1+ag/al))}
function adxWilder(c,p=14){
 if(c.length<2*p+1)return {adx:null,diPlus:null,diMinus:null};
 let trs=[],plus=[],minus=[];
 for(let i=1;i<c.length;i++){
   let h=c[i].high,l=c[i].low,ph=c[i-1].high,pl=c[i-1].low;
   trs.push(Math.max(h-l,Math.abs(h-c[i-1].close),Math.abs(l-c[i-1].close)));
   let up=h-ph,down=pl-l; plus.push(up>down&&up>0?up:0); minus.push(down>up&&down>0?down:0);
 }
 let tr=trs.slice(0,p).reduce((a,b)=>a+b,0),dp=plus.slice(0,p).reduce((a,b)=>a+b,0),dm=minus.slice(0,p).reduce((a,b)=>a+b,0),dx=[];
 for(let i=p;i<trs.length;i++){
   if(i>p){tr=tr-tr/p+trs[i];dp=dp-dp/p+plus[i];dm=dm-dm/p+minus[i]}
   let dip=tr?100*dp/tr:0,dim=tr?100*dm/tr:0,den=dip+dim;dx.push(den?100*Math.abs(dip-dim)/den:0);
 }
 if(dx.length<p)return {adx:null,diPlus:null,diMinus:null};
 let adx=dx.slice(0,p).reduce((a,b)=>a+b,0)/p;
 for(let i=p;i<dx.length;i++)adx=(adx*(p-1)+dx[i])/p;
 let tr2=trs.slice(0,p).reduce((a,b)=>a+b,0),dp2=plus.slice(0,p).reduce((a,b)=>a+b,0),dm2=minus.slice(0,p).reduce((a,b)=>a+b,0);
 for(let i=p;i<trs.length;i++){tr2=tr2-tr2/p+trs[i];dp2=dp2-dp2/p+plus[i];dm2=dm2-dm2/p+minus[i]}
 return {adx,diPlus:tr2?100*dp2/tr2:0,diMinus:tr2?100*dm2/tr2:0};
}
function candleInfo(z){let range=z.high-z.low;if(range<=0)return {range:0,body:0,bodyRatio:0,upperWick:0,lowerWick:0,wickRejection:0};let body=Math.abs(z.close-z.open),up=z.high-Math.max(z.open,z.close),down=Math.min(z.open,z.close)-z.low;return {range,body,bodyRatio:body/range,upperWick:up/range,lowerWick:down/range,wickRejection:Math.max(up,down)/range}}
function calc(c){
 if(!Array.isArray(c)||c.length<80)return null;
 let close=c.map(x=>Number(x.close)),n=close.length,last=c[n-1];
 let e5=ema(close,5),e12=ema(close,12),gap=e5-e12,prev5=ema(close.slice(0,-1),5),slope=e5-prev5;
 let rsi=rsiWilder(c,8),adx=adxWilder(c,14),a8=atrWilder(c,8);
 let atrs=[];for(let i=9;i<c.length;i++){let q=atrWilder(c.slice(0,i+1),8);if(q!=null)atrs.push(q)}
 let atrAvg=atrs.slice(-10).reduce((s,v)=>s+v,0)/Math.max(1,Math.min(10,atrs.length)),atrRatio=a8/(atrAvg||a8),ci=candleInfo(last);
 let diDiff=(adx.diPlus??0)-(adx.diMinus??0),bullish=gap>=0;
 let dSlope=bullish?slope:-slope,dGap=bullish?gap:-gap,dDi=bullish?diDiff:-diDiff,dRsi=bullish?rsi:100-rsi;
 return {price:last.close,ema5:e5,ema12:e12,emaSlope:slope,emaGap:gap,directionalSlope:dSlope,directionalGap:dGap,diPlus:adx.diPlus,diMinus:adx.diMinus,diDiff,directionalDiDiff:dDi,rsi,directionalRsi:dRsi,adx:adx.adx,atr:a8,atrAvg,atrRatio,bodyRatio:ci.bodyRatio,upperWick:ci.upperWick,lowerWick:ci.lowerWick,wickRejection:ci.wickRejection,direction:bullish?"BULLISH":"BEARISH",time:last.time,currentCandle:true};
}
const RANGES=[
 {key:"directionalSlope",label:"EMA Slope",good:x=>x>=0.46,bad:x=>x<0.22,fmt:x=>x.toFixed(3),unit:""},
 {key:"directionalGap",label:"EMA Gap",good:x=>x>=0.79,bad:x=>x<0.42,fmt:x=>x.toFixed(3),unit:""},
 {key:"directionalDiDiff",label:"DI Diff",good:x=>x>=19,bad:x=>x<4,fmt:x=>x.toFixed(1),unit:""},
 {key:"directionalRsi",label:"Directional RSI",good:x=>x>=65,bad:x=>x<56,fmt:x=>x.toFixed(1),unit:""},
 {key:"adx",label:"ADX",good:x=>x>=36.7&&x<=46.8,bad:x=>x<21||x>52,fmt:x=>x.toFixed(1),unit:""},
 {key:"atrRatio",label:"ATR Ratio",good:x=>x>=1.08&&x<=1.18,bad:x=>x<0.92||x>1.55,fmt:x=>x.toFixed(2),unit:"×"},
 {key:"bodyRatio",label:"Body Ratio",good:x=>x<=0.45,bad:x=>x>0.62,fmt:x=>x.toFixed(2),unit:""}
];
function classifyOne(v){
 return RANGES.map(q=>{let x=v[q.key],state=Number.isFinite(x)?(q.good(x)?"GOOD":q.bad(x)?"BAD":"NEUTRAL"):"NEUTRAL";return {...q,value:x,state}});
}
function majorityState(historyValues,index){
 let counts={GOOD:0,BAD:0,NEUTRAL:0};historyValues.forEach(v=>counts[v[index].state]++);
 if(counts.GOOD>=3)return "GOOD";if(counts.BAD>=3)return "BAD";return "NEUTRAL";
}
function classify(c){
 if(!Array.isArray(c)||c.length<85)return {status:"NEUTRAL",score:0,total:RANGES.length,confidence:0,values:[],currentValues:[],contextValues:[],contextGood:0,currentGood:0,reasons:["Need at least 85 M1 candles.","Waiting for XAU/USD data."]};
 // The last candle is CURRENT/forming. Build the stable context from the five candles before it.
 const completed=c.slice(0,-1), current=calc(c), snapshots=[];
 for(let k=5;k>=1;k--){const end=completed.length-(k-1);const snap=calc(completed.slice(0,end));if(snap)snapshots.push({calc:snap,values:classifyOne(snap)});}
 if(!current||snapshots.length<5)return {status:"NEUTRAL",score:0,total:RANGES.length,confidence:0,values:[],currentValues:[],contextValues:[],contextGood:0,currentGood:0,reasons:["Building five-candle context…"]};
 const currentValues=classifyOne(current);
 const contextValues=RANGES.map((q,i)=>{const state=majorityState(snapshots.map(s=>s.values),i);const nums=snapshots.map(s=>s.calc[q.key]).filter(Number.isFinite);const avg=nums.reduce((a,b)=>a+b,0)/Math.max(1,nums.length);return {...q,value:avg,state,window:5};});
 const contextGood=contextValues.filter(x=>x.state==="GOOD").length;
 const currentGood=currentValues.filter(x=>x.state==="GOOD").length;
 const weightedScore=contextGood*0.70+currentGood*0.30;
 const status=weightedScore>=4?"GOOD":weightedScore<=2.4?"BAD":"NEUTRAL";
 const confidence=Math.round(status==="GOOD"?62+weightedScore*4:status==="BAD"?60+(7-weightedScore)*3:56+Math.abs(weightedScore-3.5)*2);
 const reasons=[];
 reasons.push(`Past 5 completed M1 candles: ${contextGood}/7 GOOD factors`);
 reasons.push(`Current forming M1 candle: ${currentGood}/7 GOOD factors`);
 const weak=currentValues.filter(x=>x.state==="BAD").slice(0,2).map(x=>x.label+" is weak now");
 const strong=currentValues.filter(x=>x.state==="GOOD").slice(0,2).map(x=>x.label+" confirms the context");
 if(strong.length)reasons.push(...strong);if(weak.length)reasons.push(...weak);
 return {status,score:Number(weightedScore.toFixed(1)),total:7,confidence,values:currentValues,currentValues,contextValues,contextGood,currentGood,contextWeight:70,currentWeight:30,reasons:reasons.slice(0,5),...current};
}
window.LumoraEngine={classify,calc,RANGES};
