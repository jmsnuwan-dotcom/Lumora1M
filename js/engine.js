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
// V4 provisional dimensionless rules. NOT historically calibrated on M5/M15.
function frame(candles, tf) {
  if (!Array.isArray(candles) || candles.length < 100) return null;
  // Exclude current/forming bar for M5/M15. M1 is a warning only.
  const closed = tf === 'M1' ? candles : candles.slice(0,-1);
  const v=calc(closed);
  if (!v || !Number.isFinite(v.atr) || v.atr <= 0) return null;
  const slope=v.directionalSlope/v.atr, gap=v.directionalGap/v.atr;
  const tests=[
    ['EMA slope / ATR',slope,slope>=0.12,slope<0.025],
    ['EMA gap / ATR',gap,gap>=0.35,gap<0.10],
    ['DI diff',v.directionalDiDiff,v.directionalDiDiff>=12,v.directionalDiDiff<3],
    ['Directional RSI',v.directionalRsi,v.directionalRsi>=58,v.directionalRsi<50],
    ['ADX',v.adx,v.adx>=25&&v.adx<=55,v.adx<18],
    ['ATR ratio',v.atrRatio,v.atrRatio>=0.95&&v.atrRatio<=1.4,v.atrRatio<0.8],
    ['Body ratio',v.bodyRatio,v.bodyRatio>=0.25&&v.bodyRatio<=0.75,v.bodyRatio>0.88]
  ];
  const values=tests.map(([label,value,good,bad])=>({label,value,state:good?'GOOD':bad?'BAD':'NEUTRAL'}));
  const good=values.filter(x=>x.state==='GOOD').length;
  const bad=values.filter(x=>x.state==='BAD').length;
  const status=good>=5&&bad<=1?'GOOD':good<=2||bad>=4?'BAD':'NEUTRAL';
  return {tf,status,good,bad,values,direction:v.direction,barTime:closed.at(-1).time,price:v.price};
}
function classify(timeframes) {
  const m15=frame(timeframes?.M15,'M15'),m5=frame(timeframes?.M5,'M5'),m1=frame(timeframes?.M1,'M1');
  if (!m15||!m5||!m1) return null;
  const score=(m15.good*0.6+m5.good*0.3+m1.good*0.1);
  // Main decision uses ONLY completed M15/M5 bars; M1 never flips status.
  const aligned=m15.direction===m5.direction;
  let candidate='NEUTRAL';
  if (m15.status==='GOOD'&&m5.status==='GOOD'&&aligned) candidate='GOOD';
  else if (m15.status==='BAD'&&m5.status==='BAD') candidate='BAD';
  return {m15,m5,m1,candidate,score:Number(score.toFixed(1)),direction:aligned?m15.direction:'MIXED',warning:m1.status==='BAD'?'M1 weakness — warning only':'M1 '+m1.status};
}
window.LumoraMTF={classify};
