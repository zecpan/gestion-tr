function axisMaximum(values) {
  const maximum = Math.max(0, ...values);
  if (maximum === 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(maximum));
  const normalized = maximum / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function formatTick(value) {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

export default function GroupedBarChart({ title, categories, series, leftAxisLabel, rightAxisLabel = null, barGroupScale = 1, leftAxisMaximum = null, leftAxisTicks = null }) {
  const width = Math.max(760, categories.length * 64 + 150);
  const height = 390;
  const margin = { top: 24, right: rightAxisLabel ? 76 : 28, bottom: 100, left: 70 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const leftValues = series.filter((item) => item.axis !== "right").flatMap((item) => item.values);
  const rightValues = series.filter((item) => item.axis === "right").flatMap((item) => item.values);
  const leftMaximum = leftAxisMaximum ?? axisMaximum(leftValues);
  const leftTicks = leftAxisTicks ?? Array.from({ length: 5 }, (_, index) => leftMaximum * index / 4);
  const rightMaximum = rightValues.length ? axisMaximum(rightValues) : 1;
  const groupWidth = categories.length ? plotWidth / categories.length : plotWidth;
  const barWidth = Math.min(16, groupWidth / Math.max(2, series.length + 1)) * barGroupScale;
  const gap = Math.min(4, barWidth / 3);

  return <section className="chart-panel">
    <h3>{title}</h3>
    <div className="chart-legend" aria-hidden="true">{series.map((item) => <span className="chart-legend-item" key={item.key}>
      <span className="chart-swatch" style={{ backgroundColor: item.color }}/>{item.label}
      {item.axis === "right" ? <span className="muted">(axe droit)</span> : null}
    </span>)}</div>
    <div className="chart-scroll">
      <svg role="img" aria-label={title} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {leftTicks.map((tick, tickIndex) => {
          const tickFraction = tick / leftMaximum;
          const y = margin.top + plotHeight - tickFraction * plotHeight;
          return <g key={tickIndex}>
            <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke="#dbe4dd" strokeWidth="1"/>
            <text x={margin.left - 9} y={y + 4} textAnchor="end" fill="#5f6e65" fontSize="11">{formatTick(tick)}</text>
            {rightAxisLabel ? <text x={width - margin.right + 9} y={y + 4} textAnchor="start" fill="#5f6e65" fontSize="11">{formatTick(rightMaximum * tickFraction)}</text> : null}
          </g>;
        })}
        {categories.map((category, categoryIndex) => {
          const center = margin.left + groupWidth * (categoryIndex + 0.5);
          const totalBarWidth = series.length * barWidth + Math.max(0, series.length - 1) * gap;
          const firstBar = center - totalBarWidth / 2;
          return <g key={`${category}-${categoryIndex}`}>
            {series.map((item, seriesIndex) => {
              const value = Math.max(0, Number(item.values[categoryIndex]) || 0);
              const maximum = item.axis === "right" ? rightMaximum : leftMaximum;
              const barHeight = (value / maximum) * plotHeight;
              const x = firstBar + seriesIndex * (barWidth + gap);
              const y = margin.top + plotHeight - barHeight;
              return <g key={item.key}>
                <rect x={x} y={y} width={barWidth} height={barHeight} rx="2" fill={item.color}>
                  <title>{category} · {item.label}: {value}</title>
                </rect>
                <text className="bar-value" x={x + barWidth / 2} y={Math.max(14, y - 5)} textAnchor="middle"
                  fill="#435248" fontSize={Math.min(10, Math.max(8, barWidth * 0.7))} fontWeight="700" aria-hidden="true">{formatTick(value)}</text>
              </g>;
            })}
            <text x={center + 4} y={height - margin.bottom + 17} transform={`rotate(-45 ${center + 4} ${height - margin.bottom + 17})`}
              textAnchor="end" fill="#435248" fontSize="11">{category}</text>
          </g>;
        })}
        <text x={17} y={margin.top + plotHeight / 2} transform={`rotate(-90 17 ${margin.top + plotHeight / 2})`}
          textAnchor="middle" fill="#435248" fontSize="11">{leftAxisLabel}</text>
        {rightAxisLabel ? <text x={width - 13} y={margin.top + plotHeight / 2}
          transform={`rotate(90 ${width - 13} ${margin.top + plotHeight / 2})`} textAnchor="middle" fill="#435248" fontSize="11">{rightAxisLabel}</text> : null}
      </svg>
    </div>
  </section>;
}
