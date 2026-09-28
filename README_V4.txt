LUMORA V4 — M15/M5 stable market-condition dashboard

1. Upload ALL files from this ZIP into the ROOT of the GitHub Lumora1M repository, replacing previous versions. Keep api/, js/, icons/, index.html, sw.js, styles.css, package.json, vercel.json.
2. Vercel: wait for Production deployment Ready. Connect a Vercel Blob store to the project and confirm BLOB_READ_WRITE_TOKEN is available in Production; redeploy. Without Blob, the serverless in-memory fallback is unreliable.
3. MT5: copy mt5_bridge/Lumora_XAUUSD_MTF_Bridge_V4.mq5 to MQL5/Experts; open in MetaEditor and Compile (F7). Attach to XAUUSD M1 chart, ensure terminal stays open and Algo Trading is enabled as required by your MT5 setup.
4. MT5 Tools > Options > Expert Advisors > Allow WebRequest for listed URL: https://lumora1-m.vercel.app
5. EA URL input: https://lumora1-m.vercel.app/api/xauusd/candles. Experts log should say HTTP=200 sent M1=... M5=... M15=...
6. Browser API /api/xauusd/candles should show live:true, timeframes.M1/M5/M15 each >=100 bars. Hard reload dashboard. Remove old V16 bridge from chart to avoid overwriting V4 snapshots; old V16 POST is rejected by V4 API.

DESIGN: completed M15 60%, completed M5 30%, live M1 10% warning. Main GOOD requires aligned GOOD M15+M5, BAD requires both BAD; otherwise NEUTRAL. Change main status only after two distinct completed M5 bars confirm the same new candidate. Refresh every 5s; status updates much less often. Browser keeps last accepted status locally; after API is unavailable it displays UNAVAILABLE (not an invented assessment).

IMPORTANT: Indicator thresholds on M5/M15 are provisional ATR-normalized design assumptions, NOT validated historical GOOD ranges. Validate with M5/M15 history and out-of-sample tests before relying on classifications. The displayed MTF score is NOT win probability. This EA only transmits market data; it never trades.
