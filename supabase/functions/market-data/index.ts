const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "GET, OPTIONS" };
const INTERVALS = new Set(["1m","3m","5m","15m","30m","1h","2h","4h","6h","12h","1d","1w"]);
const MARKETS = new Set(["spot","margin","futures","perpetual"]);
const DATA_TYPES = new Set(["candles","ticker","orderbook","trades"]);
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json","Cache-Control":"no-store"}});
function normalizeSymbol(value:string|null){const symbol=(value??"").trim().toUpperCase();if(!/^[A-Z0-9]{3,30}$/.test(symbol))throw new Error("Invalid symbol");return symbol;}
function normalizeLimit(value:string|null){const n=Number(value??"200");if(!Number.isInteger(n)||n<1||n>1000)throw new Error("limit must be 1-1000");return n;}
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="GET")return json({error:"Method not allowed"},405);

  try{
    const url=new URL(req.url);
    const market=(url.searchParams.get("market")??"spot").toLowerCase();
    const symbol=normalizeSymbol(url.searchParams.get("symbol"));
    const type=(url.searchParams.get("type")??"candles").toLowerCase();

    if(!MARKETS.has(market))throw new Error("Unsupported market");
    if(!DATA_TYPES.has(type))throw new Error("Unsupported data type");

    const futures=market==="futures"||market==="perpetual";
    const base=futures?"https://fapi.binance.com":"https://api.binance.com";

    if(type==="ticker"){
      const endpoint=futures?"/fapi/v1/ticker/24hr":"/api/v3/ticker/24hr";
      const upstream=await fetch(
        base+endpoint+"?symbol="+encodeURIComponent(symbol),
        {headers:{Accept:"application/json"}}
      );
      const raw=await upstream.json();

      if(!upstream.ok){
        return json({
          error:"Binance ticker request failed",
          upstream_status:upstream.status,
          details:raw
        },502);
      }

      return json({
        market,
        symbol,
        lastPrice:Number(raw.lastPrice),
        change24h:Number(raw.priceChangePercent),
        high24h:Number(raw.highPrice),
        low24h:Number(raw.lowPrice),
        volume24h:Number(raw.quoteVolume),
        eventTime:Number(raw.closeTime??raw.eventTime??Date.now()),
        source:"binance"
      });
    }

    if(type==="orderbook"){
      const endpoint=futures?"/fapi/v1/depth":"/api/v3/depth";
      const limit=normalizeLimit(url.searchParams.get("limit"));

      const upstream=await fetch(
        base+endpoint+
        "?symbol="+encodeURIComponent(symbol)+
        "&limit="+limit,
        {headers:{Accept:"application/json"}}
      );

      const raw=await upstream.json();

      if(!upstream.ok){
        return json({
          error:"Binance order-book request failed",
          upstream_status:upstream.status,
          details:raw
        },502);
      }

      const bids=Array.isArray(raw.bids)
        ?raw.bids.map((level:unknown[])=>[
            Number(level[0]),
            Number(level[1])
          ])
        :[];

      const asks=Array.isArray(raw.asks)
        ?raw.asks.map((level:unknown[])=>[
            Number(level[0]),
            Number(level[1])
          ])
        :[];

      return json({
        market,
        symbol,
        lastUpdateId:Number(raw.lastUpdateId??0),
        bids,
        asks,
        source:"binance",
        eventTime:Date.now()
      });
    }

    if(type==="trades"){
      const endpoint=futures?"/fapi/v1/trades":"/api/v3/trades";
      const limit=normalizeLimit(url.searchParams.get("limit"));
      const upstream=await fetch(
        base+endpoint+
        "?symbol="+encodeURIComponent(symbol)+
        "&limit="+limit,
        {headers:{Accept:"application/json"}}
      );
      const raw=await upstream.json();

      if(!upstream.ok){
        return json({
          error:"Binance recent-trades request failed",
          upstream_status:upstream.status,
          details:raw
        },502);
      }

      const trades=Array.isArray(raw)
        ?raw.map((trade:unknown)=> {
            const t=trade as Record<string, unknown>;
            return {
              id:Number(t.id??0),
              price:Number(t.price??0),
              quantity:Number(t.qty??0),
              quoteQuantity:Number(t.quoteQty??0),
              time:Number(t.time??0),
              isBuyerMaker:Boolean(t.isBuyerMaker??false),
              isBestMatch:Boolean(t.isBestMatch??false)
            };
          })
        :[];

      return json({
        market,
        symbol,
        trades,
        source:"binance",
        eventTime:Date.now()
      });
    }

    const interval=url.searchParams.get("interval")??"5m";
    const limit=normalizeLimit(url.searchParams.get("limit"));

    if(!INTERVALS.has(interval))throw new Error("Unsupported interval");

    const endpoint=futures?"/fapi/v1/klines":"/api/v3/klines";
    const upstream=await fetch(
      base+endpoint+
      "?symbol="+encodeURIComponent(symbol)+
      "&interval="+encodeURIComponent(interval)+
      "&limit="+limit,
      {headers:{Accept:"application/json"}}
    );
    const raw=await upstream.json();

    if(!upstream.ok){
      return json({
        error:"Binance market-data request failed",
        upstream_status:upstream.status,
        details:raw
      },502);
    }

    const candles=Array.isArray(raw)
      ?raw.map((k:unknown[])=>({
          openTime:Number(k[0]),
          open:String(k[1]),
          high:String(k[2]),
          low:String(k[3]),
          close:String(k[4]),
          volume:String(k[5]),
          closeTime:Number(k[6]),
          quoteVolume:String(k[7]),
          trades:Number(k[8]),
          isClosed:Date.now()>=Number(k[6]),
          symbol,
          interval,
          market
        }))
      :[];

    return json({market,symbol,interval,candles,source:"binance"});
  }catch(error){
    return json({
      error:error instanceof Error?error.message:"Invalid request"
    },400);
  }
});
