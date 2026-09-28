#property strict
#property version   "4.0"
#property description "Lumora XAU/USD M1/M5/M15 live-data bridge. Analysis only; never sends or modifies trades."

input string InpServerURL = "https://lumora1-m.vercel.app/api/xauusd/candles";
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

string RatesJson(const MqlRates &rates[],int count)
{
   string out="[";
   for(int i=count-1;i>=0;i--)
   {
      if(i<count-1) out+=",";
      out+="{\"time\":"+IntegerToString((long)rates[i].time)+",\"open\":"+Num(rates[i].open,8)+",\"high\":"+Num(rates[i].high,8)+",\"low\":"+Num(rates[i].low,8)+",\"close\":"+Num(rates[i].close,8)+",\"volume\":"+Num((double)rates[i].tick_volume,0)+"}";
   }
   return out+"]";
}

bool SendSnapshot()
{
   if(g_symbol=="") g_symbol=DetectGoldSymbol();
   if(g_symbol=="") { Print("Lumora Bridge: XAUUSD/GOLD symbol not found."); return false; }
   if(!SymbolSelect(g_symbol,true)) { Print("Lumora Bridge: SymbolSelect failed: ",g_symbol); return false; }

   MqlRates m1[],m5[],m15[];
   ArraySetAsSeries(m1,true); ArraySetAsSeries(m5,true); ArraySetAsSeries(m15,true);
   int n1=CopyRates(g_symbol,PERIOD_M1,0,MathMax(220,InpBars),m1);
   int n5=CopyRates(g_symbol,PERIOD_M5,0,220,m5);
   int n15=CopyRates(g_symbol,PERIOD_M15,0,220,m15);
   if(n1<100 || n5<100 || n15<100) {
      Print("Lumora V4: waiting for M1/M5/M15 history: ",n1,"/",n5,"/",n15);
      return false;
   }
   datetime newest=m1[0].time;
   if(!InpSendOnEveryPoll && newest==g_last_sent_bar) return true;
   MqlTick tick;
   double price=m1[0].close;
   if(SymbolInfoTick(g_symbol,tick))
      price=(tick.bid>0 && tick.ask>0)?(tick.bid+tick.ask)/2.0:(tick.last>0?tick.last:m1[0].close);
   string json="{\"symbol\":\""+JsonEscape(g_symbol)+"\",\"timeframe\":\"MULTI\",\"price\":"+Num(price,8)+",\"bar_time\":"+IntegerToString((long)newest)+",\"timeframes\":{\"M1\":"+RatesJson(m1,n1)+",\"M5\":"+RatesJson(m5,n5)+",\"M15\":"+RatesJson(m15,n15)+"}}";
   char data[]; StringToCharArray(json,data,0,WHOLE_ARRAY,CP_UTF8);
   // StringToCharArray() appends a terminating NUL byte. Do not send that byte
   // as part of the HTTP JSON body, otherwise the Python receiver can reject
   // the request with HTTP 400 / JSON parse error.
   int data_size=ArraySize(data);
   if(data_size>0 && data[data_size-1]==0)
      ArrayResize(data,data_size-1);
   char result[]; string headers;
   ResetLastError();
   int code=WebRequest("POST",InpServerURL,"Content-Type: application/json\r\n",5000,data,result,headers);
   if(code<200 || code>=300)
   {
      string body=CharArrayToString(result,0,-1,CP_UTF8);
      Print("Lumora Bridge: WebRequest failed. HTTP=",code," error=",GetLastError()," response=",body,". Add URL to MT5 allowed WebRequest list: ",InpServerURL);
      return false;
   }
   else
   {
      Print("Lumora V4: HTTP=",code," | sent M1=",n1," M5=",n5," M15=",n15," for ",g_symbol);
   }
   g_last_sent_bar=newest;

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
