const $=s=>document.querySelector(s);
function paint(r){
 document.body.className=r.status.toLowerCase();
 $("#card").className="card "+r.status.toLowerCase();
 const data={GOOD:["↗","GOOD","Market condition is favorable for trading"],NEUTRAL:["↔","NEUTRAL","Market conditions are mixed / unclear"],BAD:["↓","BAD","Market condition is unfavorable for trading"]}[r.status];
 $("#icon").textContent=data[0];$("#status").textContent=data[1];$("#desc").textContent=data[2];$("#confidence").textContent="Confidence "+r.confidence+"%";
 $("#macd").textContent=r.macd==null?"—":r.macd.toFixed(4);$("#macdSub").textContent=r.macd>0?"Bullish":"Bearish";
 $("#volume").textContent=r.volume==null?"—":r.volume.toFixed(2)+"×";$("#volumeSub").textContent=r.volume>1.25?"Confirming":"Weak / normal";
 $("#chop").textContent=r.chop==null?"—":r.chop.toFixed(1);$("#chopSub").textContent=r.chop>61.8?"Choppy":r.chop<38.2?"Trending":"Mixed";
 $("#wicks").textContent=r.wicks?(r.wicks.bull>r.wicks.bear?"BUY REJ.":"SELL REJ."):"—";$("#wicksSub").textContent=r.wicks?"Latest candle":"No data";
 $("#sideways").textContent=r.sideways==null?"—":r.sideways.toFixed(2);$("#sidewaysSub").textContent=r.sideways<1.25?"Compressed":r.sideways>2.2?"Expanding":"Normal";
 $("#trend").textContent=r.trend>0?"BULLISH":r.trend<0?"BEARISH":"MIXED";$("#trendSub").textContent="EMA20 / EMA50";
 r.reasons.forEach((x,i)=>{if($("#reason"+(i+1)))$("#reason"+(i+1)).textContent=x});
 $("#updated").textContent="Updated "+new Date().toLocaleTimeString("en-GB",{hour12:false});
}
function mockCandles(){
  // Deterministic demo candles: every browser/device receives the same data.
  // Replace this function with the real XAU/USD 1M API when the backend is connected.
  let a=[],p=2500,seed=73129;
  const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  for(let i=0;i<120;i++){
    const drift=(i<38?0.42:(i<72?-0.18:(i<98?0.31:-0.08)));
    const noise=(rnd()-0.5)*1.8;
    const o=p,c=p+drift+noise;
    const h=Math.max(o,c)+(0.55+rnd()*1.8);
    const l=Math.min(o,c)-(0.55+rnd()*1.8);
    const volume=650+rnd()*650;
    a.push({time:Date.now()-(120-i)*60000,open:o,high:h,low:l,close:c,volume});
    p=c;
  }
  return a;
}async function load(){
 // Production: fetch your MT5/broker bridge here.
 // Example: const r=await fetch('/api/xauusd/candles?tf=1m&limit=200'); const candles=await r.json();
 const candles=mockCandles(); window.__lumoraCandles=candles; paint(LumoraEngine.analyze(candles,{sessions:LumoraEngine.sessionInfo()}));
}
for(let i=0;i<58;i++){let c=document.createElement("i");c.className="candle";c.style.left=(i*1.8-2)+"%";c.style.bottom=(18+Math.random()*50)+"%";c.style.height=(18+Math.random()*60)+"px";$("#candles").appendChild(c)}
function clock(){let d=new Date();$("#clock").textContent=d.toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short",year:"numeric"})+" "+d.toLocaleTimeString("en-GB",{hour12:false})}clock();setInterval(clock,1000);

load();
setInterval(load, 60000);
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js");


// One-click PWA install: trigger the browser's native prompt immediately.
// No instruction popup is used. Unsupported browsers get a small toast only.
let deferredInstallPrompt = null;
const installBtn = document.getElementById("installBtn");
const installToast = document.getElementById("installToast");
const installToastTitle = document.getElementById("installToastTitle");
const installToastText = document.getElementById("installToastText");
const marketTime = document.getElementById("marketTime");

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

function toast(title,text){
  if(!installToast) return;
  installToastTitle.textContent=title;
  installToastText.textContent=text;
  installToast.classList.add("show");
  clearTimeout(window.__lumoraToast);
  window.__lumoraToast=setTimeout(()=>installToast.classList.remove("show"),4200);
}

function isStandalone(){
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone===true;
}
function isIOS(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
}

installBtn && installBtn.addEventListener("click", async ()=>{
  if(isStandalone()){
    toast("Lumora Installed","Lumora is already installed.");
    return;
  }
  if(deferredInstallPrompt){
    // Immediate native browser install prompt.
    deferredInstallPrompt.prompt();
    const result=await deferredInstallPrompt.userChoice;
    deferredInstallPrompt=null;
    if(result && result.outcome==="accepted"){
      toast("Lumora Installed","The app was added to your device.");
    }
    return;
  }
  if(isIOS()){
    // iOS does not expose a programmatic install prompt from a web page.
    // Do not open another modal; show only a concise message.
    toast("Add Lumora to Home Screen","In Safari: Share → Add to Home Screen.");
    return;
  }
  if (location.protocol === "file:") return; toast("Install not available yet","Open Lumora from the local server or HTTPS.");
});

window.addEventListener("appinstalled",()=>{
  deferredInstallPrompt=null;
  if(installBtn) installBtn.textContent="Lumora Installed";
  toast("Lumora Installed","The app is ready on your device.");
});

// Larger live local time + Forex session status.
function updateMarketTime(){
  const d=new Date();
  if($("#marketTime")) $("#marketTime").textContent=d.toLocaleTimeString("en-GB",{hour12:false});
  if($("#clock")) $("#clock").textContent=d.toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short",year:"numeric"})+" "+d.toLocaleTimeString("en-GB",{hour12:false});
  updateSession(d);
}
function hourInZone(d,tz){
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:tz,hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(d);
  const h=Number(parts.find(x=>x.type==="hour").value),m=Number(parts.find(x=>x.type==="minute").value);
  return h+(m/60);
}
function active(h,start,end){return h>=start&&h<end;}
function updateSession(d){
  const el=$("#sessionName"); if(!el)return;
  const tok=hourInZone(d,"Asia/Tokyo"), lon=hourInZone(d,"Europe/London"), ny=hourInZone(d,"America/New_York");
  const sessions=[];
  if(active(tok,9,18)) sessions.push("TOKYO");
  if(active(lon,8,17)) sessions.push("LONDON");
  if(active(ny,8,17)) sessions.push("NEW YORK");
  el.textContent=sessions.length?sessions.join(" • "):"OFF SESSION";
}
updateMarketTime();setInterval(updateMarketTime,1000);

// Event-based XAU/USD news countdown. The API timestamp is absolute; refresh never resets it.
const NEWS_KEY="lumora_xauusd_news_v6";
let newsEvents=[], showAllNews=false;
function safeNews(raw){
 const arr=Array.isArray(raw)?raw:(raw?.events||raw?.data||raw?.news||[]);
 return arr.map((x,i)=>{
  const t=x.timestamp||x.releaseTime||x.datetime||x.dateTime||x.time||x.date;
  const dt=new Date(typeof t==="number"?(t<2e12?t*1000:t):t);
  const impact=String(x.impact||x.importance||"medium").toLowerCase();
  return {id:String(x.id||i),country:x.country||"US",currency:x.currency||"USD",title:x.title||x.event||x.name||"Economic event",impact:impact.includes("high")||impact==="3"?"high":impact.includes("low")||impact==="1"?"low":"medium",time:dt};
 }).filter(x=>Number.isFinite(x.time.getTime())&&(x.currency==="USD"||x.country==="US"));
}
function renderNews(){
 const list=$("#newsList"), empty=$("#newsEmpty"); if(!list)return;
 const now=Date.now(), cutoff=now+3600000;
 newsEvents=newsEvents.filter(n=>n.time.getTime()>now&&n.time.getTime()<=cutoff);
 const shown=showAllNews?newsEvents:newsEvents.slice(0,3); list.innerHTML="";
 empty.hidden=shown.length>0;
 shown.forEach(n=>{const row=document.createElement("div");row.className="news-item";row.innerHTML=`<div class="news-country">${escNews(n.country)}</div><div class="news-copy"><b>${escNews(n.currency)} — ${escNews(n.title)}</b><small>Potential impact on XAU/USD</small><label class="news-impact ${n.impact}">${n.impact} impact</label></div><div class="news-count"><b>${countdown(n.time.getTime()-now)}</b><small>Hours　 Minutes　 Seconds</small></div>`;list.appendChild(row);});
}
function escNews(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));}
function countdown(ms){ms=Math.max(0,ms);let s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),x=s%60;return [h,m,x].map(v=>String(v).padStart(2,"0")).join(":");}
async function loadNews(){
 let fresh=[];
 try{const r=await fetch("/api/news",{cache:"no-store"});if(r.ok)fresh=safeNews(await r.json());}catch(e){}
 // Preserve absolute timestamps already known on this device. Never replace an existing event with a new +N-minutes timestamp.
 let stored=[];try{stored=safeNews(JSON.parse(localStorage.getItem(NEWS_KEY)||"[]"));}catch(e){}
 const byId=new Map(stored.map(n=>[n.id,n]));
 fresh.forEach(n=>{if(!byId.has(n.id))byId.set(n.id,n);});
 newsEvents=[...byId.values()].sort((a,b)=>a.time-b.time);
 // Recalculate market quality with the nearest upcoming high-impact news risk.
 if(window.__lumoraCandles){ const mins=newsEvents.length?Math.max(0,(newsEvents[0].time.getTime()-Date.now())/60000):null; paint(LumoraEngine.analyze(window.__lumoraCandles,{sessions:LumoraEngine.sessionInfo(),newsMinutes:mins})); }
 localStorage.setItem(NEWS_KEY,JSON.stringify(newsEvents.map(n=>({...n,time:n.time.toISOString()}))));
 renderNews();
}
$("#viewNews")?.addEventListener("click",()=>{showAllNews=!showAllNews;$("#viewNews").textContent=showAllNews?"Show Less":"View All";renderNews();});
loadNews();setInterval(renderNews,1000);setInterval(loadNews,300000);
