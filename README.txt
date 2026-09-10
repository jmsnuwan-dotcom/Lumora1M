LUMORA XAU/USD 1M ANALYSIS — REAL LOGO EDITION

The visible Lumora header now uses the exact uploaded lumora-logo.png.

Analysis engine:
- MACD
- Relative volume
- Choppiness Index
- Wick pressure/rejection
- Sideways/compression
- EMA20/EMA50 trend
- ATR expansion caution
- Conservative GOOD / NEUTRAL / BAD classification

The included browser demo uses mock candles. Connect a secure backend/MT5 bridge
to supply real XAU/USD 1-minute OHLCV data. Never expose broker/API secrets
inside browser JavaScript.


PWA INSTALL
- PC Chrome/Edge and Android Chrome support the native one-click install prompt when served over HTTPS.
- iPhone/iPad Safari intentionally requires Share -> Add to Home Screen because iOS does not expose the same browser install prompt.
- The Install Lumora button automatically detects the device/browser and shows the correct flow.
- For production, serve the site over HTTPS and keep manifest.webmanifest + sw.js accessible from the same origin.


INSTALL BUTTON + LOGO
- The visible "Install Lumora" button is now in the top-right header.
- Browser favicon and installed PWA icons are generated from the exact supplied Lumora logo.
- PC/Android native PWA install prompt requires HTTPS (or localhost during development).
- Opening index.html directly with file:/// can show the button and instructions, but browsers will not provide the native PWA install prompt from a file URL.


LATEST UX FIX
- Install Lumora button immediately triggers the native browser PWA install prompt when available.
- No instruction modal is shown after clicking.
- Unsupported/iOS cases show only a small bottom message.
- A larger live clock is displayed directly under "1M • LIVE MARKET ANALYSIS".


LOCAL PWA TESTING
Double-click START_LUMORA.bat instead of opening index.html directly.
It opens Lumora at http://localhost:8765/, which gives Chrome/Edge the proper
web origin needed for PWA installation. The old file:// error toast is disabled.


SYNC FIX
- The previous browser/app status could differ because the demo candle generator used Math.random().
- This version uses a deterministic candle sequence, so all devices calculate the same demo GOOD/NEUTRAL/BAD result.
- Service-worker cache is bumped to v4 and old Lumora caches are removed on activation.
- Once the real XAU/USD 1M backend is connected, every device will read the same live market data instead of demo candles.


V6 CHANGES
- News countdown is event-timestamp based and preserved across refresh on the same device.
- Expired news automatically disappears.
- News section shows only upcoming XAU/USD-relevant USD events.
- Added large live 24-hour time and dynamic Forex session display: TOKYO / LONDON / NEW YORK / overlaps.
- IMPORTANT: api/news.js is still a DEMO endpoint. Replace it with a licensed live economic-calendar provider for production accuracy.
