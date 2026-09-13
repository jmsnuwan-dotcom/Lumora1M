LUMORA XAU/USD M1 — VERCEL PRODUCTION LIVE DASHBOARD

Analysis only; never opens, modifies, or blocks trades.

ARCHITECTURE
MT5 XAU/USD M1 Bridge -> Vercel HTTPS API -> Lumora Dashboard

HYBRID ENGINE
- Last 5 COMPLETED M1 candles = 70% stable market context.
- CURRENT FORMING M1 candle = 30% live confirmation/warning.
- Per-indicator context state uses majority across the last 5 completed candles.
- Weighted score: context GOOD x 70% + current GOOD x 30%.
- GOOD >= 4.0; NEUTRAL 2.5–3.9; BAD <= 2.4.

HISTORICAL GOOD RANGES
EMA Slope >= 0.46
EMA Gap >= 0.79
DI Diff >= 19
Directional RSI >= 65
ADX 36.7–46.8
ATR Ratio 1.08–1.18x
Body Ratio <= 0.45

VERCEL SETUP
1. Push this project to GitHub.
2. Import the repository into the Lumora Vercel project.
3. Vercel installs @vercel/blob automatically.
4. In Vercel Storage, create a Blob store and connect it to this project. This creates BLOB_READ_WRITE_TOKEN.
5. Redeploy. The API will then persist the latest MT5 snapshot in Vercel Blob.
6. Keep the MT5 WebRequest allow-list entry: https://lumora-m1.vercel.app
7. Attach the included bridge EA. Its default endpoint is https://lumora-m1.vercel.app/api/xauusd/candles.

INITIAL TEST
If BLOB_READ_WRITE_TOKEN is not configured yet, the API has an in-memory fallback for basic testing, but persistent Blob storage is recommended for reliable production operation.

MT5 BRIDGE
- Sends 220 M1 bars including the CURRENT forming candle.
- Polls every 5 seconds.
- Analysis only; no trade functions.
