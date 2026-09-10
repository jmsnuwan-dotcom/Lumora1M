export default async function handler(req,res){
  // Production hook: connect a real economic-calendar provider here.
  // This endpoint intentionally returns an empty list instead of inventing a countdown.
  res.setHeader("Cache-Control","s-maxage=30, stale-while-revalidate=60");
  res.status(200).json([]);
}
