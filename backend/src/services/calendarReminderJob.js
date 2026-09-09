import cron from 'node-cron';
import CalendarEvent from '../models/CalendarEvent.js';
import User from '../models/User.js';
import {
  sendCalendarDayReminder,
  sendCalendarEventReminder,
  isEmailConfigured,
} from './emailService.js';
import { zonedDayRangeFromYmd, calendarDateInZone } from '../utils/zonedDate.js';

function formatDayLabel(date, timeZone) {
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone,
    });
  } catch {
    return new Date(date).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}

function clockInZone(now, timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const map = Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
    return `${map.hour}:${map.minute}`;
  } catch {
    const h = String(now.getUTCHours()).padStart(2, '0');
    const m = String(now.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
}

/**
 * Send reminder emails for today’s events whose notifyTime has been reached.
 * Uses <= current clock (not exact minute) so Vercel daily/evening crons still catch them,
 * same way debt reminders run from /api/jobs/run.
 */
export async function runCalendarTimedReminderJob() {
  if (!isEmailConfigured()) return { checked: 0, sent: 0 };

  let checked = 0;
  let sent = 0;

  try {
    const users = await User.find({}).select('name email currency timezone');
    const now = new Date();

    for (const user of users) {
      if (!user.email) continue;
      const timeZone = user.timezone || 'Asia/Kolkata';
      const ymd = calendarDateInZone(now, timeZone);
      const hhmm = clockInZone(now, timeZone);
      const { start, end } = zonedDayRangeFromYmd(ymd, timeZone);

      const candidates = await CalendarEvent.find({
        user: user._id,
        date: { $gte: start, $lte: end },
        sendEmailReminder: { $ne: false },
        lastReminderSentYmd: { $ne: ymd },
      }).sort({ notifyTime: 1 });

      for (const event of candidates) {
        checked += 1;
        const t = event.notifyTime || '09:00';
        if (t > hhmm) continue;

        try {
          const ok = await sendCalendarEventReminder({
            to: user.email,
            userName: user.name,
            currency: user.currency || 'INR',
            timeZone,
            event,
          });
          if (ok) {
            event.lastReminderSentYmd = ymd;
            await event.save();
            sent += 1;
            console.log(`[CalendarMail] Reminder sent to ${user.email} for “${event.title}” (notify ${t}, now ${hhmm}).`);
          }
        } catch (err) {
          console.error(`[CalendarMail] Timed reminder failed for ${event._id}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('[CalendarMail] Timed reminder job failed:', err.message);
  }

  return { checked, sent };
}

/** Digest of today’s events — optional bulk mail (also used by jobs/run). */
export async function runCalendarDayReminderJob() {
  if (!isEmailConfigured()) return;

  try {
    const users = await User.find({}).select('name email currency timezone');
    const now = new Date();

    for (const user of users) {
      if (!user.email) continue;
      const timeZone = user.timezone || 'Asia/Kolkata';
      const ymd = calendarDateInZone(now, timeZone);
      const { start, end } = zonedDayRangeFromYmd(ymd, timeZone);

      const events = await CalendarEvent.find({
        user: user._id,
        date: { $gte: start, $lte: end },
        sendEmailReminder: { $ne: false },
      })
        .sort({ notifyTime: 1, date: 1 })
        .lean();

      if (!events.length) continue;

      const ok = await sendCalendarDayReminder({
        to: user.email,
        userName: user.name,
        currency: user.currency || 'INR',
        timeZone,
        dateLabel: formatDayLabel(start, timeZone),
        events,
      });

      if (ok) {
        console.log(`[CalendarMail] Sent day digest to ${user.email} (${events.length} event(s)).`);
      }
    }
  } catch (err) {
    console.error('[CalendarMail] Day reminder job failed:', err.message);
  }
}

export function startCalendarReminderScheduler() {
  if (!isEmailConfigured()) {
    console.warn('[CalendarMail] SMTP not configured — calendar emails disabled.');
    return;
  }

  // Local/dev only (Vercel uses vercel.json crons → /api/jobs/*).
  cron.schedule('* * * * *', () => {
    runCalendarTimedReminderJob().catch((err) => {
      console.error('[CalendarMail] Timed scheduler error:', err.message);
    });
  });
  console.log('[CalendarMail] Local per-event reminder scheduler every minute (notifyTime).');
}
