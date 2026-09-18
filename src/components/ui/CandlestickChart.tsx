import { useId, useMemo } from 'react';
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
  const gradientId = useId().replace(/:/g, '');

  const validData = useMemo(
    () =>
      data.filter(
        (c) =>
          Number.isFinite(c.timestamp) &&
          Number.isFinite(c.open) &&
          Number.isFinite(c.high) &&
          Number.isFinite(c.low) &&
          Number.isFinite(c.close) &&
          Number.isFinite(c.volume) &&
          c.high >= c.low,
      ),
    [data],
  );

  if (validData.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-aerqvon-dim"
        style={{ height }}
      >
        No chart data available
      </div>
    );
  }

  const width = 1000;
  const padding = {
    top: 10,
    right: 62,
    bottom: showVolume ? 42 : 12,
    left: 8,
  };

  const chartWidth = width - padding.left - padding.right;
  const volumeHeight = showVolume ? 30 : 0;
  const priceHeight =
    height - padding.top - padding.bottom - volumeHeight;

  const prices = validData.flatMap((c) => [c.high, c.low]);
  const rawMin = Math.min(...prices);
  const rawMax = Math.max(...prices);
  const rawRange = rawMax - rawMin;

  const safeRange =
    Number.isFinite(rawRange) && rawRange > 0
      ? rawRange
      : Math.max(Math.abs(rawMax) * 0.01, 1);

  const pricePadding = safeRange * 0.05;
  const minPrice = rawMin - pricePadding;
  const maxPrice = rawMax + pricePadding;
  const priceRange = maxPrice - minPrice;

  const maxVolume = Math.max(
    ...validData.map((c) => Math.max(0, c.volume)),
    1,
  );

  const candleSlot = chartWidth / validData.length;
  const candleWidth = Math.max(
    1.5,
    Math.min(candleSlot * 0.65, 14),
  );

  const priceToY = (price: number) =>
    padding.top +
    ((maxPrice - price) / priceRange) * priceHeight;

  const volumeToY = (volume: number) =>
    padding.top +
    priceHeight +
    (1 - Math.max(0, volume) / maxVolume) * volumeHeight;

  const gridLines = 4;

  const gridPrices = Array.from(
    { length: gridLines + 1 },
    (_, i) =>
      maxPrice -
      (i / gridLines) * priceRange,
  );

  const formatPrice = (value: number) => {
    if (value >= 1000) return value.toFixed(0);
    if (value >= 1) return value.toFixed(2);
    return value.toFixed(4);
  };

  const formatVolume = (value: number) => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }

    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }

    return value.toFixed(value < 1 ? 2 : 0);
  };

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="block h-full w-full"
        role="img"
        aria-label="Candlestick price chart"
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="rgba(91,140,255,0.04)"
            />
            <stop
              offset="100%"
              stopColor="transparent"
            />
          </linearGradient>
        </defs>

        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill={`url(#${gradientId})`}
        />

        {gridPrices.map((price, i) => {
          const y = priceToY(price);

          return (
            <g key={`grid-${i}`}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
                strokeDasharray="5 6"
              />

              <text
                x={width - padding.right + 7}
                y={y + 3}
                fontSize="11"
                fill="rgba(255,255,255,0.45)"
                textAnchor="start"
              >
                {formatPrice(price)}
              </text>
            </g>
          );
        })}

        {showVolume && (
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + priceHeight}
            y2={padding.top + priceHeight}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        )}

        {validData.map((candle, index) => {
          const x =
            padding.left +
            index * candleSlot +
            candleSlot / 2;

          const isUp = candle.close >= candle.open;
          const candleColor = isUp ? color.up : color.down;

          const highY = priceToY(candle.high);
          const lowY = priceToY(candle.low);
          const openY = priceToY(candle.open);
          const closeY = priceToY(candle.close);

          const bodyTop = Math.min(openY, closeY);
          const bodyHeight = Math.max(
            Math.abs(closeY - openY),
            1.5,
          );

          const volumeY = volumeToY(candle.volume);
          const volumeBarHeight = Math.max(
            0,
            padding.top +
              priceHeight +
              volumeHeight -
              volumeY,
          );

          return (
            <g key={`${candle.timestamp}-${index}`}>
              <line
                x1={x}
                x2={x}
                y1={highY}
                y2={lowY}
                stroke={candleColor}
                strokeWidth="1.5"
              />

              <rect
                x={x - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={candleColor}
                rx="1"
              />

              {showVolume && (
                <rect
                  x={x - candleWidth / 2}
                  y={volumeY}
                  width={candleWidth}
                  height={volumeBarHeight}
                  fill={candleColor}
                  fillOpacity="0.22"
                  rx="1"
                />
              )}
            </g>
          );
        })}

        {showVolume && (
          <>
            <text
              x={padding.left}
              y={height - 8}
              fontSize="10"
              fill="rgba(255,255,255,0.35)"
            >
              Volume
            </text>

            <text
              x={width - padding.right + 7}
              y={padding.top + priceHeight + 10}
              fontSize="10"
              fill="rgba(255,255,255,0.35)"
            >
              {formatVolume(maxVolume)}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
