LUMORA XAU/USD M1 — V14 HYBRID MARKET CONDITION DASHBOARD

- Analysis only; never opens, modifies, or blocks trades.
- Last 5 COMPLETED M1 candles = 70% stable market context.
- CURRENT FORMING M1 candle = 30% live confirmation/warning.
- Per-indicator context state is determined by a majority across the last 5 completed candles.
- Weighted score = context GOOD factors x 70% + current GOOD factors x 30%.
- GOOD >= 4.0; NEUTRAL 2.5–3.9; BAD <= 2.4.
- Current M1 indicator values are displayed against historical GOOD ranges.

HISTORICAL GOOD RANGES
EMA Slope >= 0.46
EMA Gap >= 0.79
DI Diff >= 19
Directional RSI >= 65
ADX 36.7–46.8
ATR Ratio 1.08–1.18x
Body Ratio <= 0.45

MT5 SETUP
1. Run START_LUMORA.bat.
2. Compile mt5_bridge/Lumora_XAUUSD_M1_Bridge.mq5.
3. Attach EA to any chart.
4. MT5 Tools -> Options -> Expert Advisors -> Allow WebRequest.
5. Add http://127.0.0.1:8765
6. If auto-detect fails, set InpSymbol to the exact broker XAUUSD/GOLD symbol.
7. The EA sends 220 M1 bars including the current forming candle every 5 seconds.
