import type { Candlestick } from '@/types';

interface CandlestickChartProps {
  data: Candlestick[];
  height?: number;
  showVolume?: boolean;
  color?: { up: string; down: string };
}

export function CandlestickChart({
  data,
  height = 220,
  showVolume = true,
  color = { up: '#2ecc8f', down: '#ff5c7c' },
}: CandlestickChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-nova-dim" style={{ height }}>
        No chart data available
      </div>
    );
  }

  const width = 100;
  const padding = { top: 8, right: 8, bottom: showVolume ? 36 : 8, left: 8 };
  const chartHeight = height - padding.top - padding.bottom;
  const volumeHeight = showVolume ? 28 : 0;

  const prices = data.flatMap((c) => [c.high, c.low]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;
  const paddedRange = priceRange * 1.1;
  const paddedMin = minPrice - priceRange * 0.05;

  const volumes = data.map((c) => c.volume);
  const maxVolume = Math.max(...volumes) || 1;

  const candleWidth = (width - padding.left - padding.right) / data.length;
  const bodyWidth = candleWidth * 0.65;

  const priceToY = (price: number) =>
    padding.top + ((maxPrice + priceRange * 0.05 - price) / paddedRange) * chartHeight;

  const volumeToY = (vol: number) =>
    padding.top + chartHeight + ((1 - vol / maxVolume) * volumeHeight);

  const gridLines = 4;
  const gridYs = Array.from({ length: gridLines + 1 }, (_, i) =>
    padding.top + (i / gridLines) * chartHeight
  );
  const gridPrices = Array.from({ length: gridLines + 1 }, (_, i) =>
    maxPrice + priceRange * 0.05 - (i / gridLines) * paddedRange
  );

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height / 4}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        <defs>
          <linearGradient id="chartBgGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(91,140,255,0.03)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width={width} height={height / 4} fill="url(#chartBgGrad)" />

        {gridYs.map((y, i) => (
          <line
            key={`grid-${i}`}
            x1={padding.left}
            x2={width - padding.right}
            y1={y / 4}
            y2={y / 4}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="0.15"
            strokeDasharray="0.8 0.8"
          />
        ))}

        {data.map((c, i) => {
          const x = padding.left + i * candleWidth + candleWidth / 2;
          const isUp = c.close >= c.open;
          const cColor = isUp ? color.up : color.down;
          const bodyTop = priceToY(Math.max(c.open, c.close));
          const bodyBottom = priceToY(Math.min(c.open, c.close));
          const bodyH = Math.max(0.5, bodyBottom - bodyTop);

          return (
            <g key={i}>
              <line
                x1={x} x2={x}
                y1={priceToY(c.high) / 4} y2={priceToY(c.low) / 4}
                stroke={cColor} strokeWidth="0.25"
              />
              <rect
                x={x - bodyWidth / 2}
                y={bodyTop / 4}
                width={bodyWidth}
                height={bodyH / 4}
                fill={cColor}
                rx="0.15"
              />
              {showVolume && (
                <rect
                  x={x - bodyWidth / 2}
                  y={volumeToY(c.volume) / 4}
                  width={bodyWidth}
                  height={(padding.top + chartHeight - volumeToY(c.volume)) / 4}
                  fill={cColor} fillOpacity="0.2" rx="0.15"
                />
              )}
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute right-2 top-1 space-y-[calc((100%-44px)/4)]">
        {gridPrices.map((p, i) => (
          <div key={`pl-${i}`} className="text-[9px] font-mono text-nova-dim/60">
            {p >= 1000 ? p.toFixed(0) : p >= 1 ? p.toFixed(2) : p.toFixed(4)}
          </div>
        ))}
      </div>
    </div>
  );
}
