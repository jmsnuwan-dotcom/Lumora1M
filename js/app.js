const $=s=>document.querySelector(s);
let dataMode="DEMO";
function paint(r){
 if(!r)return;
 document.body.className=r.status.toLowerCase();
 $("#card").className="card "+r.status.toLowerCase();
 const data={GOOD:["↗","GOOD","Historical market condition is favorable"],NEUTRAL:["↔","NEUTRAL","Market conditions are mixed / unclear"],BAD:["↓","BAD","Historical ranges are mostly unfavorable"]}[r.status];
 $("#icon").textContent=data[0];$("#status").textContent=data[1];$("#desc").textContent=data[2];
 $("#confidence").textContent=`Hybrid score ${r.score}/${r.total} • Confidence ${r.confidence}%`;
 $("#price").textContent=r.price==null?"—":Number(r.price).toFixed(2);
 $("#direction").textContent=r.direction||"MIXED";
 $("#score").textContent=`${r.score}/${r.total}`;
 if($("#contextScore")) $("#contextScore").textContent=`${r.contextGood ?? "—"}/7`;
 if($("#currentScore")) $("#currentScore").textContent=`${r.currentGood ?? "—"}/7`;
 if($("#hybridDecision")) $("#hybridDecision").textContent=r.status;
 $("#directionSub").textContent="EMA 5 / EMA 12";
 $("#dataSource").textContent=dataMode==="LIVE"?"LIVE DATA":"DEMO DATA";
 $("#dataSource").className=dataMode==="LIVE"?"live":"demo";
 $("#updated").textContent="Updated "+new Date().toLocaleTimeString("en-GB",{hour12:false});
 r.values.forEach((x,i)=>{
   const row=$("#metric"+i); if(!row)return;
   row.className="metric-row "+x.state.toLowerCase();
   $("#m"+i).textContent=x.label;
   const cv=r.currentValues?.[i]||x;
   $("#v"+i).textContent=cv.fmt(cv.value)+(cv.unit||"");
   $("#s"+i).textContent=cv.state;
   $("#rg"+i).textContent=rangeText(x);
 });
 // When the live condition is GOOD, make the exact current values prominent
 // beside the historical GOOD ranges.
 const gp={
   gpSlope:r.directionalSlope, gpGap:r.directionalGap, gpDi:r.directionalDiDiff,
   gpRsi:r.directionalRsi, gpAdx:r.adx, gpAtr:r.atrRatio, gpBody:r.bodyRatio
 };
 Object.entries(gp).forEach(([id,val])=>{
   const el=$("#"+id); if(el && Number.isFinite(val)) el.textContent="Current "+Number(val).toFixed(id==="gpAdx"||id==="gpDi"||id==="gpRsi"?"1":id==="gpAtr"||id==="gpBody"?"2":"3");
 });
 r.reasons.forEach((x,i)=>{if($("#reason"+(i+1)))$("#reason"+(i+1)).textContent=x});
}
function rangeText(x){
 const ranges={
  "EMA Slope":"GOOD ≥ 0.46",
  "EMA Gap":"GOOD ≥ 0.79",
  "DI Diff":"GOOD ≥ 19",
  "Directional RSI":"GOOD ≥ 65",
  "ADX":"GOOD 36.7–46.8",
  "ATR Ratio":"GOOD 1.08–1.18×",
  "Body Ratio":"GOOD ≤ 0.45"
 }; return ranges[x.label]||"Historical range";
}
function mockCandles(){
 let a=[],p=4348.62,seed=73129;
 const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<220;i++){const drift=(i<70?0.32:(i<140?-0.12:0.25)),noise=(rnd()-.5)*1.2,o=p,c=p+drift+noise,h=Math.max(o,c)+(.2+rnd()*1.0),l=Math.min(o,c)-(.2+rnd()*1.0);a.push({time:Date.now()-(220-i)*60000,open:o,high:h,low:l,close:c,volume:650+rnd()*650});p=c}
 return a;
}
function toEpochSeconds(v){
 const n=Number(v);
 if(Number.isFinite(n) && n>0) return n>2e12?n/1000:n;
 const d=Date.parse(v);
 return Number.isFinite(d)?d/1000:0;
}

async function fetchLive(){
 const u="/api/xauusd/candles?tf=1m&limit=220";
 try{
   const r=await fetch(u+"&ts="+Date.now(),{
     cache:"no-store",
     headers:{"Cache-Control":"no-cache"}
   });
   if(!r.ok){
     console.warn("Lumora API HTTP",r.status);
     return null;
   }

   const j=await r.json();
   const c=Array.isArray(j)?j:(j.candles||j.data||[]);
   if(!Array.isArray(c) || c.length<80) {
     console.warn("Lumora API: insufficient candles",c?.length);
     return null;
   }

   const liveFlag=(j.live===true || String(j.live).toLowerCase()==="true");
   if(!liveFlag){
     console.warn("Lumora API: live flag is not true",j.live);
     return null;
   }

   const candles=c.map(x=>({
     time:x.time||x.datetime_utc||x.timestamp,
     open:Number(x.open),
     high:Number(x.high),
     low:Number(x.low),
     close:Number(x.close),
     volume:Number(x.volume??x.tick_volume??0)
   })).filter(x=>
     Number.isFinite(x.open)&&Number.isFinite(x.high)&&
     Number.isFinite(x.low)&&Number.isFinite(x.close)
   );

   if(candles.length<80) return null;

   // Do not reject valid MT5 live data just because received_at is
   // missing or formatted differently. Prefer received_at, otherwise
   // use the newest candle timestamp as the freshness check.
   const received=toEpochSeconds(j.received_at);
   const lastCandle=toEpochSeconds(candles[candles.length-1].time);
   const freshnessBase=received||lastCandle;
   const age=freshnessBase>0 ? (Date.now()/1000)-freshnessBase : 0;

   // MT5 sends the CURRENT forming M1 candle. Allow a small clock/network
   // tolerance and reject only clearly stale data.
   if(freshnessBase>0 && (age>180 || age<-30)){
     console.warn("Lumora API: stale/future data",{
       received_at:j.received_at,
       last_candle:candles[candles.length-1].time,
       age_seconds:age
     });
     return null;
   }

   return {
     candles,
     price:Number.isFinite(Number(j.price))?Number(j.price):candles[candles.length-1].close,
     symbol:j.symbol||"XAUUSD",
     received_at:received||lastCandle
   };
 }catch(e){
   console.error("Lumora live API error",e);
   return null;
}

async function load(){
 const live=await fetchLive();

 // Production dashboard must never silently present generated candles as
 // if they were market data. If the MT5 bridge is unavailable, show a
 // neutral/unavailable state instead.
 dataMode=live?"LIVE":"UNAVAILABLE";

 if(!live){
   window.__lumoraCandles=[];
   paint({
     status:"NEUTRAL",
     score:0,
     total:7,
     confidence:0,
     price:null,
     direction:"MIXED",
     values:[],
     currentValues:[],
     contextValues:[],
     contextGood:0,
     currentGood:0,
     reasons:[
       "Live MT5 market data is unavailable.",
       "Waiting for the XAU/USD M1 bridge."
     ]
   });
   if($("#dataSource")){
     $("#dataSource").textContent="LIVE DATA UNAVAILABLE";
     $("#dataSource").className="demo";
   }
   if($("#sourceNote"))$("#sourceNote").textContent="Waiting for MT5 bridge — no demo market data";
   return;
 }

 const candles=live.candles;
 window.__lumoraCandles=candles;
 const result=LumoraEngine.classify(candles,{sessions:LumoraEngine.sessionInfo?.()});
 result.livePrice=live.price;
 result.price=live.price;
 result.currentCandle=true;
 dataMode="LIVE";
 paint(result);
 $("#sourceNote").textContent=`LIVE MT5 • ${live.symbol} • CURRENT FORMING M1 CANDLE`;
}
for(let i=0;i<58;i++){let c=document.createElement("i");c.className="candle";c.style.left=(i*1.8-2)+"%";c.style.bottom=(18+Math.random()*50)+"%";c.style.height=(18+Math.random()*60)+"px";$("#candles").appendChild(c)}
load();setInterval(load,5000);
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js");

let deferredInstallPrompt=null,installBtn=$("#installBtn"),installToast=$("#installToast"),installToastTitle=$("#installToastTitle"),installToastText=$("#installToastText");
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e});
function toast(t,x){if(!installToast)return;installToastTitle.textContent=t;installToastText.textContent=x;installToast.classList.add("show");clearTimeout(window.__lumoraToast);window.__lumoraToast=setTimeout(()=>installToast.classList.remove("show"),4200)}
function isStandalone(){return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true}
function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1)}
installBtn&&installBtn.addEventListener("click",async()=>{if(isStandalone())return toast("Lumora Installed","Lumora is already installed.");if(deferredInstallPrompt){deferredInstallPrompt.prompt();const x=await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;if(x?.outcome==="accepted")toast("Lumora Installed","The app was added to your device.");return}if(isIOS())return toast("Add Lumora to Home Screen","In Safari: Share → Add to Home Screen.");if(location.protocol!=="file:")toast("Install not available yet","Open Lumora from the local server or HTTPS.")});
window.addEventListener("appinstalled",()=>{deferredInstallPrompt=null;if(installBtn)installBtn.textContent="Lumora Installed";toast("Lumora Installed","The app is ready on your device.")});

function updateMarketTime(){const d=new Date();if($("#marketTime"))$("#marketTime").textContent=d.toLocaleTimeString("en-GB",{hour12:false});if($("#clock"))$("#clock").textContent=d.toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short",year:"numeric"})+" "+d.toLocaleTimeString("en-GB",{hour12:false});updateSession(d)}
function hourInZone(d,tz){const p=new Intl.DateTimeFormat("en-US",{timeZone:tz,hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(d);return Number(p.find(x=>x.type==="hour").value)+Number(p.find(x=>x.type==="minute").value)/60}
function updateSession(d){const el=$("#sessionName");if(!el)return;const tok=hourInZone(d,"Asia/Tokyo"),lon=hourInZone(d,"Europe/London"),ny=hourInZone(d,"America/New_York"),s=[];if(tok>=9&&tok<18)s.push("TOKYO");if(lon>=8&&lon<17)s.push("LONDON");if(ny>=8&&ny<17)s.push("NEW YORK");el.textContent=s.length?s.join(" • "):"OFF SESSION"}
updateMarketTime();setInterval(()=>updateMarketTime(),1000);

let newsEvents=[],showAllNews=false;
function safeNews(raw){const arr=Array.isArray(raw)?raw:(raw?.events||raw?.data||raw?.news||[]);return arr.map((x,i)=>{const t=x.timestamp||x.releaseTime||x.datetime||x.dateTime||x.time||x.date,dt=new Date(typeof t==="number"?(t<2e12?t*1000:t):t),impact=String(x.impact||x.importance||"medium").toLowerCase();return{id:String(x.id||i),country:x.country||"US",currency:x.currency||"USD",title:x.title||x.event||x.name||"Economic event",impact:impact.includes("high")||impact==="3"?"high":impact.includes("low")||impact==="1"?"low":"medium",time:dt}}).filter(x=>Number.isFinite(x.time.getTime())&&(x.currency==="USD"||x.country==="US"))}
function countdown(ms){ms=Math.max(0,ms);let s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return[h,m,x].map(v=>String(v).padStart(2,"0")).join(":")}
function renderNews(){const list=$("#newsList"),empty=$("#newsEmpty");if(!list)return;const now=Date.now(),cutoff=now+3600000;newsEvents=newsEvents.filter(n=>n.time>now&&n.time<=cutoff);const shown=showAllNews?newsEvents:newsEvents.slice(0,3);list.innerHTML="";empty.hidden=shown.length>0;shown.forEach(n=>{const row=document.createElement("div");row.className="news-item";row.innerHTML=`<div class="news-country">${n.country}</div><div class="news-copy"><b>${n.currency} — ${n.title}</b><small>Potential impact on XAU/USD</small><label class="news-impact ${n.impact}">${n.impact} impact</label></div><div class="news-count"><b>${countdown(n.time-Date.now())}</b><small>Hours　 Minutes　 Seconds</small></div>`;list.appendChild(row)})}
async function loadNews(){try{const r=await fetch("/api/news?ts="+Date.now(),{cache:"no-store"});if(r.ok)newsEvents=safeNews(await r.json()).sort((a,b)=>a.time-b.time)}catch(e){}renderNews()}
$("#viewNews")?.addEventListener("click",()=>{showAllNews=!showAllNews;$("#viewNews").textContent=showAllNews?"Show Less":"View All";renderNews()});
loadNews();setInterval(renderNews,1000);setInterval(loadNews,300000);
