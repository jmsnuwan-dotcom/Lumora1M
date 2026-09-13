#property strict
#property version   "1.0"
#property description "Lumora XAU/USD M1 live-data bridge. Analysis only; never sends or modifies trades."

input string InpServerURL = "https://lumora-m1.vercel.app/api/xauusd/candles";
input string InpSymbol = "";          // blank = auto-detect XAUUSD/GOLD symbol
input int    InpBars = 220;            // M1 bars to send, including the current forming candle
input int    InpTimerSeconds = 5;      // polling interval
input bool   InpSendOnEveryPoll = true; // current M1 candle changes every tick

string g_symbol = "";
datetime g_last_sent_bar = 0;

string JsonEscape(string s)
{
   StringReplace(s, "\\", "\\\\");
   StringReplace(s, "\"", "\\\"");
   return s;
}

string DetectGoldSymbol()
{
   if(InpSymbol != "") return InpSymbol;
   int total = SymbolsTotal(true);
   for(int i=0;i<total;i++)
   {
      string s=SymbolName(i,true);
      string u=s; StringToUpper(u);
      if(StringFind(u,"XAUUSD")>=0) return s;
      if(StringFind(u,"GOLD")>=0) return s;
   }
   total = SymbolsTotal(false);
   for(int i=0;i<total;i++)
   {
      string s=SymbolName(i,false);
      string u=s; StringToUpper(u);
      if(StringFind(u,"XAUUSD")>=0) return s;
      if(StringFind(u,"GOLD")>=0) return s;
   }
   return "";
}

string Num(double v,int digits=8)
{
   return DoubleToString(v,digits);
}

bool SendSnapshot()
{
   if(g_symbol=="") g_symbol=DetectGoldSymbol();
   if(g_symbol=="") { Print("Lumora Bridge: XAUUSD/GOLD symbol not found."); return false; }
   if(!SymbolSelect(g_symbol,true)) { Print("Lumora Bridge: SymbolSelect failed: ",g_symbol); return false; }

   MqlRates r[];
   ArraySetAsSeries(r,true);
   int got=CopyRates(g_symbol,PERIOD_M1,0,MathMax(80,InpBars),r); // start at 0 = current forming M1 candle
   if(got<80) { Print("Lumora Bridge: not enough M1 history. Got ",got); return false; }

   datetime newest=r[0].time;
   if(!InpSendOnEveryPoll && newest==g_last_sent_bar) return true;

   MqlTick tick;
   double price=r[0].close;
   if(SymbolInfoTick(g_symbol,tick))
      price=(tick.bid>0 && tick.ask>0)?(tick.bid+tick.ask)/2.0:(tick.last>0?tick.last:r[0].close);

   string json="{\"symbol\":\""+JsonEscape(g_symbol)+"\",\"timeframe\":\"M1\",\"price\":"+Num(price,8)+",\"bar_time\":"+IntegerToString((long)newest)+",\"candles\":[";
   // r[got-1] is oldest, r[0] is the CURRENT FORMING M1 candle when series=true
   for(int i=got-1;i>=0;i--)
   {
      if(i<got-1) json+=",";
      json+="{\"time\":"+IntegerToString((long)r[i].time)+",\"open\":"+Num(r[i].open,8)+",\"high\":"+Num(r[i].high,8)+",\"low\":"+Num(r[i].low,8)+",\"close\":"+Num(r[i].close,8)+",\"volume\":"+Num((double)r[i].tick_volume,0)+"}";
   }
   json+="]}";

   char data[]; StringToCharArray(json,data,0,WHOLE_ARRAY,CP_UTF8);
   char result[]; string headers;
   ResetLastError();
   int code=WebRequest("POST",InpServerURL,"Content-Type: application/json\r\n",5000,data,ArraySize(data)-1,result,headers);
   if(code<200 || code>=300)
   {
      Print("Lumora Bridge: WebRequest failed. HTTP=",code," error=",GetLastError(),". Add URL to MT5 allowed WebRequest list: ",InpServerURL);
      return false;
   }
   g_last_sent_bar=newest;
   Print("Lumora Bridge: sent ",got," M1 bars (including CURRENT forming candle) for ",g_symbol," | candle=",TimeToString(newest,TIME_DATE|TIME_MINUTES));
   return true;
}

int OnInit()
{
   g_symbol=DetectGoldSymbol();
   if(g_symbol=="") Print("Lumora Bridge: attach to any chart; set InpSymbol manually if auto-detect cannot find your broker symbol.");
   EventSetTimer(MathMax(1,InpTimerSeconds));
   SendSnapshot();
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}

void OnTimer()
{
   SendSnapshot();
}
