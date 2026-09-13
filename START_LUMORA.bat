@echo off
cd /d "%~dp0"
echo ============================================
echo        LUMORA XAU/USD M1 LIVE DASHBOARD
echo ============================================
echo.
echo Starting local server on http://127.0.0.1:8765
start "Lumora Server" cmd /k python server.py
timeout /t 2 >nul
start "Lumora Dashboard" http://127.0.0.1:8765/
echo.
echo NEXT: In MT5 attach mt5_bridge\Lumora_XAUUSD_M1_Bridge.mq5 to any chart.
echo Set InpSymbol if your broker uses a custom gold symbol (e.g. XAUUSDm).
echo Add http://127.0.0.1:8765 to MT5 Tools ^> Options ^> Expert Advisors ^> Allow WebRequest.
pause
