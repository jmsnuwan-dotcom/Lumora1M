/* Experimental descriptive M1 regime detector; no trade execution or forecasts. */
(function(){
const TYPES=[
['CHOPPY / SIDEWAYS','CAUTION','Small overlapping candles inside a narrow range.'],
['VOLATILE RANGE','CAUTION','Wide swings inside a range; both directions are active.'],
['BULLISH TREND','TREND','Higher highs / higher lows with upward momentum.'],
['BEARISH TREND','TREND','Lower highs / lower lows with downward momentum.'],
['EXPLOSIVE MOMENTUM','CAUTION','Unusually large directional candles; avoid chasing.'],
['SQUEEZE / COMPRESSION','WATCH','Recent ranges are contracting; wait for a confirmed break.'],
['FAKE BREAKOUT','AVOID','Price broke a recent extreme but closed back inside.'],
['TREND EXHAUSTION','WATCH','Existing trend is slowing or showing rejection.'],
['TREND REVERSAL','WATCH','Recent structure is shifting against the previous move.'],
['PULLBACK / CONTINUATION','WATCH','Short countertrend move within a broader trend.'],
['NEWS SPIKE / EXTREME VOLATILITY','AVOID','Exceptional candle size; cause cannot be confirmed from candles alone.'],
['LOW VOLUME / DEAD MARKET','CAUTION','Small ranges and relatively low tick volume.']
];
const avg=a=>a.reduce((s,v)=>s+v,0)/Math.max(1,a.length);
const info=c=>({range:Math.max(.00001,c.high-c.low),body:Math.abs(c.close-c.open),up:c.high-Math.max(c.open,c.close),down:Math.min(c.open,c.close)-c.low});
function detect(all){
 if(!Array.isArray(all)||all.length<55)return null;
 // Last bar is still forming; use it for an explicit live warning only.
 const closed=all.slice(0,-1),last=closed.at(-1),recent=closed.slice(-12),prior=closed.slice(-25,-12),base=closed.slice(-50,-12),forming=all.at(-1);
 const ranges=base.map(x=>info(x).range),normal=avg(ranges),r=recent.map(info),short=avg(r.slice(-5).map(x=>x.range)),long=avg(r.map(x=>x.range)),volumeBase=avg(base.map(x=>Number(x.volume)||0));
 const recentVolume=avg(recent.slice(-5).map(x=>Number(x.volume)||0)),volumeRatio=volumeBase?recentVolume/volumeBase:1;
 const hi=Math.max(...recent.map(x=>x.high)),lo=Math.min(...recent.map(x=>x.low));
 const oldHi=Math.max(...prior.map(x=>x.high)),oldLo=Math.min(...prior.map(x=>x.low));
 const up=last.close-recent[0].open,move=up/(normal||1),sign=Math.sign(up);
 const overlap=recent.slice(1).filter((x,i)=>Math.min(x.high,recent[i].high)-Math.max(x.low,recent[i].low)>0).length/11;
 const latest=info(last),before=closed.at(-2),prev=info(before),wick=Math.max(latest.up,latest.down)/latest.range;
 const previousMove=(prior.at(-1).close-prior[0].open)/normal;
 const highestPrev=Math.max(...closed.slice(-21,-1).map(x=>x.high)),lowestPrev=Math.min(...closed.slice(-21,-1).map(x=>x.low));
 const falseBreak=(last.high>highestPrev&&last.close<highestPrev)||(last.low<lowestPrev&&last.close>lowestPrev);
 const squeeze=short<normal*.65&&long<normal*.88;
 const spike=latest.range>normal*3.2 || (short>normal*2.4&&volumeRatio>1.8);
 const explosive=recent.slice(-3).filter(x=>{let q=info(x);return q.range>normal*1.6&&q.body/q.range>.66&&Math.sign(x.close-x.open)===Math.sign(last.close-last.open)}).length>=2;
 const trending=Math.abs(move)>3.1&&overlap<.84;
 const reversal=Math.abs(previousMove)>2.3&&Math.sign(previousMove)!==sign&&Math.abs(move)>1.9&&((sign>0&&last.close>oldHi)||(sign<0&&last.close<oldLo));
 const pullback=Math.abs(previousMove)>2.5&&Math.sign(previousMove)!==sign&&Math.abs(move)>0.7&&Math.abs(move)<Math.abs(previousMove)*.85;
 const exhaustion=Math.abs(previousMove)>3&&((Math.sign(previousMove)>0&&latest.up/latest.range>.48)||(Math.sign(previousMove)<0&&latest.down/latest.range>.48))&&short<normal*1.15;
 let type=0;
 if(falseBreak)type=6;
 else if(spike)type=10;
 else if(explosive)type=4;
 else if(reversal)type=8;
 else if(exhaustion)type=7;
 else if(pullback)type=9;
 else if(squeeze)type=5;
 else if(short<normal*.55&&volumeRatio<.75)type=11;
 else if(trending)type=sign>=0?2:3;
 else if(long>normal*1.25&&overlap>.55)type=1;
 else type=0;
 let developing='No clear transition yet',detail='Wait for completed M1 candles to confirm a change.';
 if(type===5){developing='POSSIBLE BREAKOUT',detail='Compression is building. Direction is not confirmed.';}
 else if(type===0||type===1){developing='WATCH RANGE BREAK',detail='A close outside the recent range, with expansion, is needed.';}
 else if(type===2||type===3){developing='WATCH PULLBACK / EXHAUSTION',detail='Monitor momentum and the next completed candles.';}
 else if(type===7){developing='POSSIBLE REVERSAL',detail='Trend weakness alone does not confirm reversal.';}
 else if(type===6){developing='WATCH RANGE RETURN',detail='The breakout failed; wait for fresh confirmation.';}
 else if(type===4||type===10){developing='WATCH VOLATILITY COOLING',detail='Large moves may reverse sharply; do not chase the candle.';}
 else if(type===9){developing='WATCH TREND RESUMPTION',detail='A completed candle back with the broader trend is needed.';}
 else if(type===8){developing='WATCH NEW STRUCTURE',detail='More completed candles are needed to validate the new direction.';}
 else if(type===11){developing='WATCH ACTIVITY RETURN',detail='Volume and range expansion would indicate a change.';}
 const live=info(forming),liveAlert=live.range>normal*2?'Forming M1 candle expanding rapidly — unconfirmed':'Forming M1 candle is provisional';
 const confidence= type===0?'Low':(type===6||type===10||type===4)?'Event detected':'Rule-based';
 return {index:type+1,name:TYPES[type][0],state:TYPES[type][1],description:TYPES[type][2],developing,detail,liveAlert,confidence,volumeRatio,rangeRatio:short/normal,closedTime:last.time,formingTime:forming.time,candles:all.slice(-26),allTypes:TYPES};
}
window.LumoraRegime={detect,TYPES};
})();
