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
 let a=[],p=2500;for(let i=0;i<100;i++){let drift=i<50?.8:-.25,noise=(Math.random()-.45)*4,o=p,c=p+drift+noise,h=Math.max(o,c)+Math.random()*3,l=Math.min(o,c)-Math.random()*3;a.push({time:Date.now()-(100-i)*60000,open:o,high:h,low:l,close:c,volume:500+Math.random()*500});p=c}return a;
}
async function load(){
 // Production: fetch your MT5/broker bridge here.
 // Example: const r=await fetch('/api/xauusd/candles?tf=1m&limit=200'); const candles=await r.json();
 const candles=mockCandles(); paint(LumoraEngine.analyze(candles));
}
for(let i=0;i<58;i++){let c=document.createElement("i");c.className="candle";c.style.left=(i*1.8-2)+"%";c.style.bottom=(18+Math.random()*50)+"%";c.style.height=(18+Math.random()*60)+"px";$("#candles").appendChild(c)}
function clock(){let d=new Date();$("#clock").textContent=d.toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short",year:"numeric"})+" "+d.toLocaleTimeString("en-GB",{hour12:false})}clock();setInterval(clock,1000);
let sec=31*60+13;setInterval(()=>{if(sec>0){sec--;let h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;$("#timer").textContent=[h,m,s].map(x=>String(x).padStart(2,"0")).join(":")}else{$("#newsLive").style.display="none";$("#released").style.display="flex"}},1000);
load();
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

// Larger live time directly below "1M • LIVE MARKET ANALYSIS".
function updateMarketTime(){
  if(!marketTime) return;
  const d=new Date();
  marketTime.textContent=d.toLocaleTimeString("en-GB",{hour12:false});
}
updateMarketTime();
setInterval(updateMarketTime,1000);
