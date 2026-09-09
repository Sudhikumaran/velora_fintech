import cron from 'node-cron';
import CalendarEvent from '../models/CalendarEvent.js';
import User from '../models/User.js';
import { sendCalendarDayReminder, isEmailConfigured } from './emailService.js';
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

/** Email each user their calendar events for “today” in their timezone. */
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
      })
        .sort({ date: 1 })
        .lean();

      if (!events.length) continue;

      const sent = await sendCalendarDayReminder({
        to: user.email,
        userName: user.name,
        currency: user.currency || 'INR',
        timeZone,
        dateLabel: formatDayLabel(start, timeZone),
        events,
      });

      if (sent) {
        console.log(`[CalendarMail] Sent day reminder to ${user.email} (${events.length} event(s)).`);
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

  // 7:30 AM IST — ahead of the 8 AM debt reminder.
  cron.schedule('30 7 * * *', () => runCalendarDayReminderJob(), { timezone: 'Asia/Kolkata' });
  console.log('[CalendarMail] Daily calendar reminder scheduled at 7:30 AM IST.');
}
