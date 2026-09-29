const $=s=>document.querySelector(s);
const el=(id,value)=>{const e=$(id);if(e)e.textContent=value;};
const fmt=(n,d=2)=>Number.isFinite(n)?Number(n).toFixed(d):'—';
let lastAccepted='NEUTRAL',pending=null,pendingCount=0,lastM5=null,lastM15=null;
try {const s=JSON.parse(localStorage.getItem('lumora-v4-status')||'{}');
  if(['GOOD','BAD','NEUTRAL'].includes(s.status)) lastAccepted=s.status;
  if(Number.isFinite(s.m5))lastM5=s.m5;
  if(Number.isFinite(s.m15))lastM15=s.m15;
} catch(_) {}
function setStatus(status,reason) {
  document.body.className=status.toLowerCase();
  $('#card').className='card '+status.toLowerCase();
  const labels={GOOD:['↗','GOOD'],BAD:['↓','BAD'],NEUTRAL:['↔','NEUTRAL']};
  el('#icon',labels[status][0]);el('#status',labels[status][1]);el('#desc',reason);
}
function renderFrame(id,f) {el('#'+id+'Status',f.status);el('#'+id+'Score',f.good+'/7');el('#'+id+'Direction',f.direction);}

function regimeUnavailable(message){
 el('#regimeName','DATA UNAVAILABLE');el('#regimeState','UNAVAILABLE');el('#regimeDescription',message);
 el('#regimeNext','WAIT FOR LIVE DATA');el('#regimeNextDesc','No current condition can be assessed.');
 el('#regimeLive','—');el('#regimeFactors','—');el('#regimeAlign','M5 / M15 confirmation unavailable');el('#regimeUpdated','Offline / stale');
 const svg=$('#regimeSvg');if(svg)svg.replaceChildren();
}
function drawRegimeCandles(candles){
 const svg=$('#regimeSvg');if(!svg)return;
 const NS='http://www.w3.org/2000/svg',min=Math.min(...candles.map(x=>x.low)),max=Math.max(...candles.map(x=>x.high)),span=Math.max(.00001,max-min),y=v=>183-(v-min)/span*165;
 svg.replaceChildren();
 for(let i=0;i<5;i++){let line=document.createElementNS(NS,'line');line.setAttribute('x1',0);line.setAttribute('x2',560);line.setAttribute('y1',16+i*42);line.setAttribute('y2',16+i*42);line.setAttribute('class','regime-grid');svg.appendChild(line)}
 candles.forEach((c,i)=>{
  let x=12+i*21.3,up=c.close>=c.open,forming=i===candles.length-1;
  let g=document.createElementNS(NS,'g');g.setAttribute('class','regime-candle '+(up?'up':'down')+(forming?' forming':''));
  let wick=document.createElementNS(NS,'line');wick.setAttribute('x1',x);wick.setAttribute('x2',x);wick.setAttribute('y1',y(c.high));wick.setAttribute('y2',y(c.low));g.appendChild(wick);
  let body=document.createElementNS(NS,'rect');body.setAttribute('x',x-5);body.setAttribute('width',10);body.setAttribute('y',Math.min(y(c.open),y(c.close)));body.setAttribute('height',Math.max(2,Math.abs(y(c.close)-y(c.open))));g.appendChild(body);svg.appendChild(g);
 });
}
function renderRegime(candles,r){
 const v=window.LumoraRegime?.detect(candles);if(!v){regimeUnavailable('Not enough completed M1 candles');return;}
 const p=$('.regime-panel');p.dataset.state=v.state.toLowerCase();
 el('#regimeName',v.index+'. '+v.name);el('#regimeState',v.state);el('#regimeDescription',v.description);
 el('#regimeNext',v.developing);el('#regimeNextDesc',v.detail);el('#regimeLive',v.liveAlert);
 el('#regimeFactors','Recent range: '+fmt(v.rangeRatio,2)+'× baseline  •  Tick volume: '+fmt(v.volumeRatio,2)+'× baseline');
 el('#regimeAlign','M5: '+r.m5.direction+' ('+r.m5.status+')  •  M15: '+r.m15.direction+' ('+r.m15.status+')  •  '+(r.m5.direction===r.m15.direction?'Aligned':'Mixed directions'));
 el('#regimeUpdated','Last completed M1: '+new Date(Number(v.closedTime)*1000).toLocaleTimeString('en-GB',{hour12:false}));
 drawRegimeCandles(v.candles);
 const list=$('#regimeTypes');if(list&&!list.children.length){v.allTypes.forEach((t,i)=>{let d=document.createElement('div');d.className='regime-type';d.dataset.type=i+1;let b=document.createElement('b');b.textContent=(i+1)+'. '+t[0];let small=document.createElement('small');small.textContent=t[2];d.append(b,small);list.appendChild(d)})}
 if(list)list.querySelectorAll('.regime-type').forEach(d=>d.classList.toggle('active',Number(d.dataset.type)===v.index));
}

function renderUnavailable(note) {
  regimeUnavailable(note);
  setStatus('NEUTRAL','LIVE DATA UNAVAILABLE');
  el('#dataSource','LIVE DATA UNAVAILABLE');$('#dataSource').className='demo';
  el('#sourceNote',note);el('#confidence','No current market assessment');
  el('#hybridDecision','UNAVAILABLE');el('#price','—');el('#direction','—');el('#score','—');
  ['m15','m5','m1'].forEach(x=>{el('#'+x+'Status','—');el('#'+x+'Score','—');el('#'+x+'Direction','—')});
  for(let i=0;i<7;i++){el('#v'+i,'—');el('#s'+i,'—');$('#metric'+i).className='metric-row';}
}
function acceptCandidate(r) {
  // Status change requires two NEW completed M5 bars showing same candidate.
  // A new M15 bar can change the candidate but not bypass the two-M5 confirmation.
  const m5Time=Number(r.m5.barTime),m15Time=Number(r.m15.barTime);
  if(m5Time===lastM5) return lastAccepted;
  lastM5=m5Time;lastM15=m15Time;
  if(r.candidate===lastAccepted) {pending=null;pendingCount=0;}
  else if(pending===r.candidate) {pendingCount++;}
  else {pending=r.candidate;pendingCount=1;}
  if(pendingCount>=2) {lastAccepted=pending;pending=null;pendingCount=0;}
  try{localStorage.setItem('lumora-v4-status',JSON.stringify({status:lastAccepted,m5:lastM5,m15:lastM15}));}catch(_){}
  return lastAccepted;
}
function render(r,j) {
  renderRegime(j.timeframes.M1,r);
  const status=acceptCandidate(r);
  const wait=pending?' • '+pending+' pending '+pendingCount+'/2 M5 closes':'';
  setStatus(status,'M15 trend + M5 confirmation'+wait);
  el('#confidence','MTF score '+fmt(r.score,1)+'/7 • provisional rules');
  el('#dataSource','LIVE DATA');$('#dataSource').className='live';
  el('#sourceNote','MT5 • M15 + M5 CLOSED • M1 warning • refresh 5s');
  el('#updated','Updated '+new Date().toLocaleTimeString('en-GB',{hour12:false}));
  renderFrame('m15',r.m15);renderFrame('m5',r.m5);renderFrame('m1',r.m1);
  el('#hybridDecision',status);el('#price',fmt(Number(j.price)));el('#direction',r.direction);
  el('#score',fmt(r.score,1)+'/7');el('#directionSub','M15 / M5 EMA 5 / EMA 12');
  el('#contextScore',r.m15.good+'/7');el('#currentScore',r.m5.good+'/7');
  const labels=['EMA slope / ATR','EMA gap / ATR','DI diff','Directional RSI','ADX','ATR ratio','Body ratio'];
  const ranges=['≥ 0.12','≥ 0.35','≥ 12','≥ 58','25–55','0.95–1.40×','0.25–0.75'];
  r.m15.values.forEach((x,i)=>{
    $('#metric'+i).className='metric-row '+x.state.toLowerCase();
    el('#m'+i,labels[i]);el('#v'+i,fmt(x.value,i<2?3:2));
    el('#rg'+i,'Provisional '+ranges[i]);el('#s'+i,x.state);
  });
  el('#reason1','M15 '+r.m15.status+' ('+r.m15.good+'/7), M5 '+r.m5.status+' ('+r.m5.good+'/7)');
  el('#reason2',r.warning);el('#reason3',pending?'Waiting for '+(2-pendingCount)+' more M5 close(s)':'Status stable');
  el('#reason4','M15 and M5 use closed candles only');
  el('#reason5','Analysis only; not a trade signal');
}
async function load() {
  try {
    const response=await fetch('/api/xauusd/candles?ts='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw Error('API HTTP '+response.status);
    const j=await response.json();
    const age=Date.now()/1000-Number(j.received_at||0);
    if(j.live!==true||!j.timeframes?.M15||!j.timeframes?.M5||!j.timeframes?.M1||age>90||age< -30) {
      renderUnavailable('Waiting for fresh M1/M5/M15 MT5 bridge data');return;
    }
    const r=LumoraMTF.classify(j.timeframes);
    if(!r){renderUnavailable('Insufficient timeframe history');return;}
    render(r,j);
  }catch(e){console.warn('Lumora V4:',e);renderUnavailable('API unavailable — check MT5 Experts log');}
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
