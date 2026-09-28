import { put, head } from '@vercel/blob';

// Lumora XAU/USD M1 live bridge endpoint.
// POST: MT5 bridge sends the latest 220 M1 candles.
// GET: dashboard reads the latest snapshot.
// Vercel Blob is used when BLOB_READ_WRITE_TOKEN is configured; otherwise
// a short-lived in-memory fallback is used for initial deployment testing.

const PATH = 'lumora/xauusd-m1-latest.json';
const MAX_AGE_SECONDS = 90;
const MAX_CANDLES = 250;

let memorySnapshot = null;

function send(res, status, body) {
  res.status(status).setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.json(body);
}

function cleanCandles(items, label) {
  if (!Array.isArray(items) || items.length < 100) throw new Error(label + ': need >=100 bars');
  const clean = items.slice(-MAX_CANDLES).map(x => ({
    time: Number(x.time ?? x.datetime_utc ?? x.timestamp),
    open: Number(x.open), high: Number(x.high), low: Number(x.low),
    close: Number(x.close), volume: Number(x.volume ?? x.tick_volume ?? 0)
  }));
  for (const c of clean) {
    if (![c.time,c.open,c.high,c.low,c.close,c.volume].every(Number.isFinite) ||
        c.time <= 0 || c.high < c.low || c.high < Math.max(c.open,c.close) || c.low > Math.min(c.open,c.close))
      throw new Error(label + ': invalid candle');
  }
  for (let i=1;i<clean.length;i++) if (clean[i].time <= clean[i-1].time) throw new Error(label + ': candles not chronological');
  return clean;
}
function normalizeSnapshot(input) {
  const tf = input?.timeframes;
  if (!tf || !tf.M1 || !tf.M5 || !tf.M15) throw new Error('V4 requires M1, M5, M15 arrays');
  const timeframes = Object.fromEntries(['M1','M5','M15'].map(t => [t,cleanCandles(tf[t],t)]));
  const now = Math.floor(Date.now()/1000);
  return {
    symbol: String(input.symbol || 'XAUUSD'), timeframe: 'MULTI',
    price: Number.isFinite(Number(input.price)) ? Number(input.price) : timeframes.M1.at(-1).close,
    bar_time: timeframes.M1.at(-1).time, received_at: now,
    timeframes, candles: timeframes.M1
  };
}

async function loadSnapshot() {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await head(PATH, { token: process.env.BLOB_READ_WRITE_TOKEN });
      const r = await fetch(`${blob.url}?t=${Date.now()}`, { cache: 'no-store' });
      if (r.ok) return await r.json();
    } catch (_) {
      // Fall through to memory snapshot during transient Blob errors.
    }
  }
  return memorySnapshot;
}

async function saveSnapshot(snapshot) {
  memorySnapshot = snapshot;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(PATH, JSON.stringify(snapshot), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
      cacheControlMaxAge: 0,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(204).end();
    }

    if (req.method === 'GET') {
      const s = await loadSnapshot();
      if (!s) return send(res, 200, { symbol: 'XAUUSD', timeframe: 'MULTI', live: false, received_at: null, bar_time: null, price: null, age_seconds: null, storage: process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : 'memory', candles: [], timeframes: {} });
      const age = Math.max(0, Date.now() / 1000 - Number(s.received_at || 0));
      const candles = Array.isArray(s.candles) ? s.candles.slice(-MAX_CANDLES) : [];
      return send(res, 200, {
        symbol: s.symbol || 'XAUUSD', timeframe: 'MULTI',
        live: age <= MAX_AGE_SECONDS && candles.length >= 100 && !!s.timeframes?.M5 && !!s.timeframes?.M15,
        received_at: s.received_at, bar_time: s.bar_time, price: s.price,
        age_seconds: Number(age.toFixed(1)),
        storage: process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : 'memory',
        candles, timeframes: s.timeframes || {}
      });
    }

    if (req.method === 'POST') {
      const snapshot = normalizeSnapshot(req.body);
      await saveSnapshot(snapshot);
      return send(res, 200, { ok: true, live: true, symbol: snapshot.symbol, bar_time: snapshot.bar_time, received_at: snapshot.received_at, storage: process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : 'memory' });
    }

    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return send(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (e) {
    return send(res, 400, { ok: false, error: String(e?.message || e) });
  }
}
