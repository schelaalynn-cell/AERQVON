const allowedIntervals = new Set([
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "6h",
  "12h",
  "1d",
  "1w",
]);

const allowedMarkets = new Set([
  "spot",
  "margin",
  "futures",
  "perpetual",
]);

const allowedStreams = new Set([
  "kline",
  "ticker",
]);

Deno.serve((req) => {
  const upgrade = req.headers.get("upgrade") ?? "";

  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("WebSocket endpoint", { status: 426 });
  }

  const url = new URL(req.url);

  const market = (url.searchParams.get("market") ?? "spot").toLowerCase();
  const symbol = (url.searchParams.get("symbol") ?? "").trim().toLowerCase();
  const stream = (url.searchParams.get("stream") ?? "kline").toLowerCase();
  const interval = url.searchParams.get("interval") ?? "5m";

  if (
    !allowedMarkets.has(market) ||
    !/^[a-z0-9]{3,30}$/.test(symbol) ||
    !allowedStreams.has(stream)
  ) {
    return new Response("Invalid market, symbol, or stream", { status: 400 });
  }

  if (stream === "kline" && !allowedIntervals.has(interval)) {
    return new Response("Invalid kline interval", { status: 400 });
  }

  const binanceBase =
    market === "futures" || market === "perpetual"
      ? "wss://fstream.binance.com/ws"
      : "wss://stream.binance.com:9443/ws";

  const upstreamStream =
    stream === "ticker"
      ? `${symbol}@ticker`
      : `${symbol}@kline_${interval}`;

  const upstreamUrl = `${binanceBase}/${upstreamStream}`;

  const { socket, response } = Deno.upgradeWebSocket(req);

  let upstream: WebSocket | null = null;

  socket.onopen = () => {
    upstream = new WebSocket(upstreamUrl);

    upstream.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "stream_ready",
          market,
          symbol: symbol.toUpperCase(),
          stream,
          ...(stream === "kline" ? { interval } : {}),
          source: "binance",
        }),
      );
    };

    upstream.onmessage = (event) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(event.data);
      }
    };

    upstream.onerror = () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "stream_error",
            market,
            symbol: symbol.toUpperCase(),
            stream,
            source: "binance",
          }),
        );
      }
    };

    upstream.onclose = () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1011, "Upstream closed");
      }
    };
  };

  socket.onmessage = (event) => {
    if (
      event.data === "ping" &&
      socket.readyState === WebSocket.OPEN
    ) {
      socket.send("pong");
    }
  };

  socket.onerror = () => {
    try {
      upstream?.close();
    } catch {}
  };

  socket.onclose = () => {
    try {
      upstream?.close();
    } catch {}
  };

  return response;
});
