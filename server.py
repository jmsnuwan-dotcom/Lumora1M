#!/usr/bin/env python3
"""Lumora local server + MT5 M1 bridge receiver.
The server never trades. It only receives current + historical XAU/USD M1 candles from the MT5 bridge EA and serves them to the dashboard.
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json, os, threading, time

ROOT=os.path.dirname(os.path.abspath(__file__))
DATA=os.path.join(ROOT,"data","live_candles.json")
STATE=os.path.join(ROOT,"data","live_state.json")
LOCK=threading.Lock()


def load_state():
    try:
        with LOCK:
            with open(STATE,"r",encoding="utf-8") as f: return json.load(f)
    except Exception:
        return {}


def load_candles(limit=220):
    try:
        with LOCK:
            with open(DATA,"r",encoding="utf-8") as f: a=json.load(f)
        if not isinstance(a,list): return []
        return a[-max(1,min(limit,1000)):]
    except Exception:
        return []


def save_snapshot(candles, meta):
    os.makedirs(os.path.dirname(DATA),exist_ok=True)
    tmp=DATA+".tmp"; tmp2=STATE+".tmp"
    with LOCK:
        with open(tmp,"w",encoding="utf-8") as f: json.dump(candles[-1000:],f,separators=(",",":"))
        os.replace(tmp,DATA)
        with open(tmp2,"w",encoding="utf-8") as f: json.dump(meta,f,separators=(",",":"))
        os.replace(tmp2,STATE)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=ROOT,**kwargs)
    def send_json(self,obj,code=200):
        raw=json.dumps(obj,separators=(",",":")).encode()
        self.send_response(code); self.send_header("Content-Type","application/json")
        self.send_header("Cache-Control","no-store"); self.send_header("Content-Length",str(len(raw)))
        self.end_headers(); self.wfile.write(raw)
    def do_GET(self):
        p=urlparse(self.path)
        if p.path=="/api/xauusd/candles":
            q=parse_qs(p.query)
            try: limit=int(q.get("limit",["220"])[0])
            except Exception: limit=220
            st=load_state(); age=time.time()-float(st.get("received_at",0) or 0)
            live=bool(st) and age<=90 and len(load_candles(limit))>=80
            return self.send_json({"symbol":st.get("symbol","XAUUSD"),"timeframe":"M1","live":live,
                                   "received_at":st.get("received_at"),"bar_time":st.get("bar_time"),
                                   "price":st.get("price"),"age_seconds":round(max(0,age),1),
                                   "candles":load_candles(limit)})
        return super().do_GET()
    def do_POST(self):
        if urlparse(self.path).path!="/api/xauusd/candles":
            return self.send_json({"error":"Not found"},404)
        try:
            n=int(self.headers.get("Content-Length","0")); body=self.rfile.read(n)
            obj=json.loads(body.decode("utf-8"))
            a=obj if isinstance(obj,list) else obj.get("candles",[])
            if not isinstance(a,list) or len(a)<80: raise ValueError("need at least 80 M1 candles")
            clean=[]
            for x in a:
                clean.append({"time":x.get("time") or x.get("datetime_utc") or x.get("timestamp"),
                              "open":float(x["open"]),"high":float(x["high"]),"low":float(x["low"]),
                              "close":float(x["close"]),"volume":float(x.get("volume",x.get("tick_volume",0)))})
            now=time.time()
            meta={"symbol":str(obj.get("symbol","XAUUSD")),"timeframe":"M1","price":float(obj.get("price",clean[-1]["close"])),
                  "bar_time":obj.get("bar_time",clean[-1]["time"]),"received_at":now}
            save_snapshot(clean,meta)
            return self.send_json({"ok":True,"live":True,"symbol":meta["symbol"],"bar_time":meta["bar_time"]})
        except Exception as e:
            return self.send_json({"ok":False,"error":str(e)},400)

if __name__=="__main__":
    print("Lumora live server: http://127.0.0.1:8765")
    print("Waiting for MT5 XAU/USD M1 bridge data...")
    ThreadingHTTPServer(("0.0.0.0",8765),Handler).serve_forever()
