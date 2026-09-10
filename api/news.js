export default async function handler(req,res){
 const now=new Date();
 // DEMO ONLY: fixed timestamps for the current UTC day. Replace with a real economic-calendar provider.
 const y=now.getUTCFullYear(),m=now.getUTCMonth(),d=now.getUTCDate();
 const events=[
  {id:`usd-core-cpi-${y}-${m+1}-${d}`,country:"US",currency:"USD",title:"Core CPI m/m",impact:"high",timestamp:new Date(Date.UTC(y,m,d,now.getUTCHours()+1,0,0)).toISOString()}
 ].filter(e=>new Date(e.timestamp)>now);
 res.setHeader("Cache-Control","s-maxage=30, stale-while-revalidate=60");res.status(200).json(events);
}