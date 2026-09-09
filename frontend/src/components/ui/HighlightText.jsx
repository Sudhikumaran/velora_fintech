/** Highlight the first case-insensitive match of `query` inside `text`. */
export default function HighlightText({ text, query, className = '' }) {
  const value = text == null ? '' : String(text);
  const q = (query || '').trim();
  if (!q || !value) return <span className={className}>{value}</span>;

  const lower = value.toLowerCase();
  const needle = q.toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx < 0) return <span className={className}>{value}</span>;

  return (
    <span className={className}>
      {value.slice(0, idx)}
      <mark className="search-hit">{value.slice(idx, idx + q.length)}</mark>
      {value.slice(idx + q.length)}
    </span>
  );
}
