export function resolveUserTimeZone(timezone) {
  if (timezone && timezone !== 'UTC' && timezone !== 'Etc/UTC' && timezone !== 'GMT') {
    return timezone;
  }
  return 'Asia/Kolkata';
}

export function calendarDateInZone(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function tzOffsetMs(instant, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const map = Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) % 24,
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - instant.getTime();
}

export function zonedDayRangeFromYmd(ymd, timeZone) {
  const [y, m, d] = ymd.split('-').map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  const offset = tzOffsetMs(new Date(utcMidnight + 12 * 3600 * 1000), timeZone);
  const start = new Date(utcMidnight - offset);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { ymd, start, end };
}

export function zonedDayRange(now, timeZone) {
  return zonedDayRangeFromYmd(calendarDateInZone(now, timeZone), timeZone);
}

export function addCalendarDays(ymd, days) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function monthToDateRange(now, timeZone) {
  const today = zonedDayRange(now, timeZone);
  const [y, m] = today.ymd.split('-');
  const monthStart = zonedDayRangeFromYmd(`${y}-${m}-01`, timeZone);
  return { start: monthStart.start, end: today.end, ymd: today.ymd, dayOfMonth: Number(today.ymd.slice(-2)) };
}

export function formatLongDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
