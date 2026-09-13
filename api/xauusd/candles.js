import { put, head } from '@vercel/blob';

// Lumora XAU/USD M1 live bridge endpoint.
// POST: MT5 bridge sends the latest 220 M1 candles.
// GET: dashboard reads the latest snapshot.
// Vercel Blob is used when BLOB_READ_WRITE_TOKEN is configured; otherwise
// a short-lived in-memory fallback is used for initial deployment testing.

const PATH = 'lumora/xauusd-m1-latest.json';
const MAX_AGE_SECONDS = 90;
const MAX_CANDLES = 220;

let memorySnapshot = null;

function send(res, status, body) {
  res.status(status).setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.json(body);
}

function normalizeSnapshot(obj) {
  const input = Array.isArray(obj) ? { candles: obj } : obj || {};
  const candles = Array.isArray(input.candles) ? input.candles : [];
  if (candles.length < 80) throw new Error('need at least 80 M1 candles');

  const clean = candles.slice(-MAX_CANDLES).map((x) => ({
    time: x.time ?? x.datetime_utc ?? x.timestamp,
    open: Number(x.open),
    high: Number(x.high),
    low: Number(x.low),
    close: Number(x.close),
    volume: Number(x.volume ?? x.tick_volume ?? 0)
  }));

  for (const c of clean) {
    if (!Number.isFinite(Number(c.time)) || ![c.open,c.high,c.low,c.close,c.volume].every(Number.isFinite)) {
      throw new Error('invalid candle data');
    }
  }

  const now = Math.floor(Date.now() / 1000);
  return {
    symbol: String(input.symbol || 'XAUUSD'),
    timeframe: 'M1',
    price: Number.isFinite(Number(input.price)) ? Number(input.price) : clean[clean.length - 1].close,
    bar_time: Number(input.bar_time ?? clean[clean.length - 1].time),
    received_at: now,
    candles: clean
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
      if (!s) return send(res, 200, { symbol: 'XAUUSD', timeframe: 'M1', live: false, received_at: null, bar_time: null, price: null, age_seconds: null, storage: process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : 'memory', candles: [] });
      const age = Math.max(0, Date.now() / 1000 - Number(s.received_at || 0));
      const candles = Array.isArray(s.candles) ? s.candles.slice(-MAX_CANDLES) : [];
      return send(res, 200, {
        symbol: s.symbol || 'XAUUSD', timeframe: 'M1',
        live: age <= MAX_AGE_SECONDS && candles.length >= 80,
        received_at: s.received_at, bar_time: s.bar_time, price: s.price,
        age_seconds: Number(age.toFixed(1)),
        storage: process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : 'memory',
        candles
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
