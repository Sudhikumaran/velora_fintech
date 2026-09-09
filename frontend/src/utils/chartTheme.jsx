import { formatCurrency } from './formatters';

// Chart chrome uses mid-slate tones that hold up on both the light and the dark
// background, so nothing here has to know which theme is active.
const AXIS_TICK = { fontSize: 11, fill: '#94a3b8' };
const GRID_STROKE = 'rgba(148, 163, 184, 0.22)';

export const CHART_PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
];

export const gridProps = {
  strokeDasharray: '3 3',
  stroke: GRID_STROKE,
  vertical: false,
};

export const xAxisProps = {
  tick: AXIS_TICK,
  axisLine: false,
  tickLine: false,
  tickMargin: 8,
};

export const yAxisProps = {
  tick: AXIS_TICK,
  axisLine: false,
  tickLine: false,
  tickMargin: 4,
  width: 52,
};

export const legendProps = {
  iconType: 'circle',
  iconSize: 8,
  wrapperStyle: { fontSize: 12, color: '#94a3b8', paddingTop: 8 },
};

/** Hover guide for bar charts — a soft band rather than the default grey block. */
export const barCursor = { fill: 'rgba(148, 163, 184, 0.10)' };

/** Hover guide for line and area charts. */
export const lineCursor = { stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' };

export function ChartTooltip({ active, payload, label, currency = 'USD' }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-lg">
      {label != null && label !== '' && (
        <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mb-1.5">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name ?? entry.dataKey} className="flex items-center gap-2 text-xs">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.color || entry.payload?.fill }}
            />
            <span className="text-gray-500 dark:text-gray-400">{entry.name}</span>
            <span className="ml-auto font-semibold text-gray-900 dark:text-white num">
              {typeof entry.value === 'number' ? formatCurrency(entry.value, currency) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Centered placeholder so an empty chart looks intentional, not broken. */
export function ChartEmpty({ height = 220, message = 'No data for this range' }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 text-center"
      style={{ height }}
    >
      <div className="w-10 h-10 rounded-full border border-dashed border-gray-300 dark:border-gray-700" />
      <p className="text-sm text-gray-400 dark:text-gray-500">{message}</p>
    </div>
  );
}
