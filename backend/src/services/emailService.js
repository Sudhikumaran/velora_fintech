import nodemailer from 'nodemailer';

let transporter = null;

function smtpAuth() {
  const host = (process.env.SMTP_HOST || '').trim();
  const user = (process.env.SMTP_USER || '').trim();
  // Gmail app passwords are often pasted with spaces — strip them.
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
  return { host, user, pass };
}

function getTransporter() {
  if (transporter) return transporter;

  const { host, user, pass } = smtpAuth();
  if (!host || !user || !pass) return null;

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user, pass },
    connectionTimeout: 20_000,
    greetingTimeout: 15_000,
    socketTimeout: 25_000,
  });

  return transporter;
}

export function isEmailConfigured() {
  const { host, user, pass } = smtpAuth();
  return !!(host && user && pass);
}

export async function sendDebtDueReminder({ to, userName, debts }) {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn('[Email] SMTP not configured — skipping debt reminder.');
    return false;
  }

  const from = process.env.EMAIL_FROM || `Velora <${process.env.SMTP_USER}>`;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  const rows = debts.map((d) => {
    const label = d.isOverdue ? 'OVERDUE' : `Due in ${d.daysLeft} day${d.daysLeft === 1 ? '' : 's'}`;
    const amount = d.remainingAmount ?? d.amount;
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${d.person}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${d.description || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">₹${amount.toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;color:${d.isOverdue ? '#dc2626' : '#d97706'};">${label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${d.dueDateLabel}</td>
    </tr>`;
  }).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#4f46e5;">Velora — Debt Payment Reminder</h2>
      <p>Hi ${userName},</p>
      <p>You have ${debts.length} debt${debts.length > 1 ? 's' : ''} with upcoming or overdue payments:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;">Person</th>
            <th style="padding:8px 12px;text-align:left;">Description</th>
            <th style="padding:8px 12px;text-align:left;">Amount</th>
            <th style="padding:8px 12px;text-align:left;">Status</th>
            <th style="padding:8px 12px;text-align:left;">Due Date</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p><a href="${clientUrl}/debts" style="background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">View Debts</a></p>
      <p style="color:#9ca3af;font-size:12px;">This is an automated reminder from Velora Finance.</p>
    </div>`;

  await mailer.sendMail({
    from,
    to,
    subject: `Velora: ${debts.length} debt payment${debts.length > 1 ? 's' : ''} due soon`,
    html,
  });

  return true;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(amount, currency = 'INR') {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatMailDate(date, timeZone = 'Asia/Kolkata') {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone,
    });
  } catch {
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

/**
 * Receipt after a debt repayment / EMI is recorded.
 */
export async function sendDebtRepaymentReceipt({
  to,
  userName,
  currency = 'INR',
  timeZone = 'Asia/Kolkata',
  debt,
  payment,
}) {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn('[Email] SMTP not configured — skipping repayment receipt.');
    return false;
  }

  const from = process.env.EMAIL_FROM || `Velora <${process.env.SMTP_USER}>`;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const person = escapeHtml(debt.person);
  const description = escapeHtml(debt.description);
  const note = escapeHtml(payment.note);
  const safeName = escapeHtml(userName || 'there');
  const paidOff = debt.status === 'paid' || Number(debt.remainingAmount) <= 0;
  const isBorrowed = debt.type !== 'lent';
  const amountPaid = formatMoney(payment.amount, currency);
  const remaining = formatMoney(Math.max(0, debt.remainingAmount || 0), currency);
  const original = formatMoney(debt.amount, currency);
  const totalRepaid = formatMoney(
    Math.max(0, (Number(debt.amount) || 0) - (Number(debt.remainingAmount) || 0)),
    currency,
  );
  const paidOn = formatMailDate(payment.date, timeZone);

  const headline = paidOff
    ? (isBorrowed
      ? `You have fully paid your debt to ${person}.`
      : `${person} has fully repaid you.`)
    : (isBorrowed
      ? `You have paid ${amountPaid} towards your debt to ${person}.`
      : `You received ${amountPaid} from ${person}.`);

  const emiLine = debt.isEMI && payment.installment
    ? `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">Installment</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${payment.installment}${debt.tenure ? ` of ${debt.tenure}` : ''}</td>
      </tr>`
    : '';

  const noteLine = note
    ? `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">Note</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${note}</td>
      </tr>`
    : '';

  const statusBanner = paidOff
    ? `<p style="background:#ecfdf5;color:#047857;padding:12px 16px;border-radius:8px;">This debt is fully paid. Remaining balance is ${remaining}.</p>`
    : `<p style="background:#eef2ff;color:#4338ca;padding:12px 16px;border-radius:8px;">Remaining balance: <strong>${remaining}</strong></p>`;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#4f46e5;">Velora — Debt Payment Confirmation</h2>
      <p>Hi ${safeName},</p>
      <p>${headline}</p>
      ${statusBanner}
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tbody>
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">${isBorrowed ? 'Paid to' : 'Received from'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${person}</td>
          </tr>
          ${description ? `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">Description</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${description}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">Amount paid</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;"><strong>${amountPaid}</strong></td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">Paid on</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${paidOn}</td>
          </tr>
          ${emiLine}
          ${noteLine}
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">Original amount</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${original}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">Total repaid</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${totalRepaid}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">Remaining</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${remaining}</td>
          </tr>
        </tbody>
      </table>
      <p><a href="${clientUrl}/debts" style="background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">View Debts</a></p>
      <p style="color:#9ca3af;font-size:12px;">This is an automated confirmation from Velora Finance.</p>
    </div>`;

  const subject = paidOff
    ? `Velora: debt to ${debt.person} is fully paid`
    : `Velora: ${amountPaid} paid towards debt to ${debt.person}`;

  await mailer.sendMail({
    from,
    to,
    subject: isBorrowed ? subject : (paidOff
      ? `Velora: ${debt.person} has fully repaid you`
      : `Velora: you received ${amountPaid} from ${debt.person}`),
    html,
  });

  return true;
}

export async function sendPasswordReset({ to, userName, resetUrl }) {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn('[Email] SMTP not configured — password reset URL:', resetUrl);
    return false;
  }

  const from = process.env.EMAIL_FROM || `Velora <${process.env.SMTP_USER}>`;
  await mailer.sendMail({
    from,
    to,
    subject: 'Reset your Velora password',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="color:#4f46e5;">Reset your password</h2>
        <p>Hi ${userName || 'there'},</p>
        <p>Click the button below to choose a new password. This link expires in 1 hour.</p>
        <p><a href="${resetUrl}" style="background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Reset password</a></p>
        <p style="color:#9ca3af;font-size:12px;">If you did not request this, you can ignore this email.</p>
      </div>`,
  });
  return true;
}

export async function sendDailySpendReport({
  to,
  userName,
  currency = 'INR',
  dateLabel,
  expense = 0,
  income = 0,
  yesterdayExpense = 0,
  monthExpense = 0,
  dayOfMonth = 1,
  categories = [],
  transactions = [],
  txCount = 0,
}) {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn('[Email] SMTP not configured — skipping daily spend report.');
    return false;
  }

  const from = process.env.EMAIL_FROM || `Velora <${process.env.SMTP_USER}>`;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const spent = formatMoney(expense, currency);
  const earned = formatMoney(income, currency);
  const net = formatMoney(income - expense, currency);
  const monthSpent = formatMoney(monthExpense, currency);
  const dailyAvg = formatMoney(monthExpense / Math.max(1, dayOfMonth), currency);
  const vsYesterday = expense - yesterdayExpense;
  const vsLabel = vsYesterday > 0
    ? `${formatMoney(vsYesterday, currency)} more than yesterday`
    : vsYesterday < 0
      ? `${formatMoney(Math.abs(vsYesterday), currency)} less than yesterday`
      : 'Same as yesterday';
  const vsColor = vsYesterday > 0 ? '#dc2626' : vsYesterday < 0 ? '#047857' : '#6b7280';

  const categoryRows = categories.length
    ? categories.map((c) => {
      const pct = expense > 0 ? Math.round((c.total / expense) * 100) : 0;
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(c.name)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${formatMoney(c.total, currency)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">${pct}%</td>
      </tr>`;
    }).join('')
    : `<tr><td colspan="3" style="padding:12px;color:#6b7280;">No spending recorded today.</td></tr>`;

  const txRows = transactions.length
    ? transactions.map((t) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(t.description)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">${escapeHtml(t.category)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${formatMoney(t.amount, currency)}</td>
      </tr>`).join('')
    : '';

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#4f46e5;">Velora — Today's spend</h2>
      <p>Hi ${escapeHtml(userName || 'there')},</p>
      <p>Here is your spending summary for <strong>${escapeHtml(dateLabel)}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr>
          <td style="padding:14px 16px;background:#fef2f2;border-radius:8px;">
            <div style="color:#6b7280;font-size:12px;">Spent today</div>
            <div style="color:#dc2626;font-size:22px;font-weight:700;">${spent}</div>
            <div style="color:${vsColor};font-size:12px;margin-top:4px;">${vsLabel}</div>
          </td>
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;margin:8px 0 16px;">
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">Income today</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${earned}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">Net today</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${net}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">Transactions</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${txCount}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">Spent this month</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${monthSpent}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">Daily average this month</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${dailyAvg}</td>
        </tr>
      </table>
      <h3 style="color:#111827;font-size:16px;">By category</h3>
      <table style="width:100%;border-collapse:collapse;margin:8px 0 16px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;">Category</th>
            <th style="padding:8px 12px;text-align:left;">Amount</th>
            <th style="padding:8px 12px;text-align:left;">Share</th>
          </tr>
        </thead>
        <tbody>${categoryRows}</tbody>
      </table>
      ${txRows ? `
      <h3 style="color:#111827;font-size:16px;">Today's expenses</h3>
      <table style="width:100%;border-collapse:collapse;margin:8px 0 16px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;">Particulars</th>
            <th style="padding:8px 12px;text-align:left;">Category</th>
            <th style="padding:8px 12px;text-align:left;">Amount</th>
          </tr>
        </thead>
        <tbody>${txRows}</tbody>
      </table>` : ''}
      <p><a href="${clientUrl}/reports" style="background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Open reports</a></p>
      <p style="color:#9ca3af;font-size:12px;">This is your automated daily spend summary from Velora Finance.</p>
    </div>`;

  await mailer.sendMail({
    from,
    to,
    subject: `Velora: you spent ${spent} today · ${dateLabel}`,
    html,
  });

  return true;
}

const TYPE_LABELS = {
  bill: 'Bill',
  reminder: 'Reminder',
  goal: 'Goal',
  income: 'Income',
  note: 'Note',
};

const MAIL_ACCENT = '#4f46e5'; // same as debt / spend emails

function calendarEventDetailRows(event, currency, timeZone) {
  const typeLabel = TYPE_LABELS[event.type] || 'Event';
  const dateLabel = formatMailDate(event.date, timeZone);
  const notifyTime = event.notifyTime || '09:00';
  const amountRow = event.amount != null && Number.isFinite(Number(event.amount))
    ? `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">Amount</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${formatMoney(event.amount, currency)}</td>
      </tr>`
    : '';
  const descRow = event.description
    ? `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">Notes</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(event.description)}</td>
      </tr>`
    : '';
  const recurRow = event.isRecurring
    ? `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">Repeats</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(event.recurringFrequency || 'yes')}</td>
      </tr>`
    : '';

  return {
    typeLabel,
    dateLabel,
    notifyTime,
    rows: `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">Title</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;">${escapeHtml(event.title)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">Date</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(dateLabel)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">Reminder time</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(notifyTime)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">Type</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(typeLabel)}</td>
        </tr>
        ${amountRow}
        ${descRow}
        ${recurRow}`,
  };
}

/**
 * Confirmation email right after a calendar event is created.
 * Same HTML / from / SMTP pattern as debt reminders.
 */
export async function sendCalendarEventCreated({
  to,
  userName,
  currency = 'INR',
  timeZone = 'Asia/Kolkata',
  event,
}) {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn('[Email] SMTP not configured — skipping calendar event email.');
    return false;
  }

  const from = process.env.EMAIL_FROM || `Velora <${process.env.SMTP_USER}>`;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const { typeLabel, dateLabel, notifyTime, rows } = calendarEventDetailRows(event, currency, timeZone);

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:${MAIL_ACCENT};">Velora — Calendar Event Saved</h2>
      <p>Hi ${escapeHtml(userName || 'there')},</p>
      <p>Your calendar event was added successfully. Reminder email is set for <strong>${escapeHtml(notifyTime)}</strong> on that day.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;">Field</th>
            <th style="padding:8px 12px;text-align:left;">Value</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p><a href="${clientUrl}/calendar" style="background:${MAIL_ACCENT};color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">View Calendar</a></p>
      <p style="color:#9ca3af;font-size:12px;">This is an automated message from Velora Finance.</p>
    </div>`;

  await mailer.sendMail({
    from,
    to,
    subject: `Velora: ${typeLabel} "${event.title}" on ${dateLabel}`,
    html,
  });

  console.log(`[Email] Calendar create confirmation queued/sent to ${to}`);
  return true;
}

/**
 * Timed reminder when the event’s notifyTime is reached on the event date.
 */
export async function sendCalendarEventReminder({
  to,
  userName,
  currency = 'INR',
  timeZone = 'Asia/Kolkata',
  event,
}) {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn('[Email] SMTP not configured — skipping calendar timed reminder.');
    return false;
  }

  const from = process.env.EMAIL_FROM || `Velora <${process.env.SMTP_USER}>`;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const { typeLabel, dateLabel, notifyTime, rows } = calendarEventDetailRows(event, currency, timeZone);

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:${MAIL_ACCENT};">Velora — Calendar Reminder</h2>
      <p>Hi ${escapeHtml(userName || 'there')},</p>
      <p>This is your reminder for <strong>${escapeHtml(dateLabel)}</strong> at <strong>${escapeHtml(notifyTime)}</strong>:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;">Field</th>
            <th style="padding:8px 12px;text-align:left;">Value</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p><a href="${clientUrl}/calendar" style="background:${MAIL_ACCENT};color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">View Calendar</a></p>
      <p style="color:#9ca3af;font-size:12px;">This is an automated reminder from Velora Finance.</p>
    </div>`;

  await mailer.sendMail({
    from,
    to,
    subject: `Velora: ${typeLabel} reminder “${event.title}” · ${notifyTime}`,
    html,
  });

  return true;
}

/**
 * Digest of calendar events happening today (same layout as debt reminder).
 */
export async function sendCalendarDayReminder({
  to,
  userName,
  currency = 'INR',
  timeZone = 'Asia/Kolkata',
  dateLabel,
  events = [],
}) {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn('[Email] SMTP not configured — skipping calendar day reminder.');
    return false;
  }

  const from = process.env.EMAIL_FROM || `Velora <${process.env.SMTP_USER}>`;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  const rows = events.map((e) => {
    const typeLabel = TYPE_LABELS[e.type] || 'Event';
    const amount = e.amount != null && Number.isFinite(Number(e.amount))
      ? formatMoney(e.amount, currency)
      : '—';
    const time = e.notifyTime || '09:00';
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(e.title)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(typeLabel)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(time)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${amount}</td>
    </tr>`;
  }).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:${MAIL_ACCENT};">Velora — Today's Calendar</h2>
      <p>Hi ${escapeHtml(userName || 'there')},</p>
      <p>You have ${events.length} calendar event${events.length === 1 ? '' : 's'} on ${escapeHtml(dateLabel)}:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;">Event</th>
            <th style="padding:8px 12px;text-align:left;">Type</th>
            <th style="padding:8px 12px;text-align:left;">Time</th>
            <th style="padding:8px 12px;text-align:left;">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p><a href="${clientUrl}/calendar" style="background:${MAIL_ACCENT};color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">View Calendar</a></p>
      <p style="color:#9ca3af;font-size:12px;">This is an automated reminder from Velora Finance.</p>
    </div>`;

  await mailer.sendMail({
    from,
    to,
    subject: `Velora: ${events.length} calendar event${events.length === 1 ? '' : 's'} today · ${dateLabel}`,
    html,
  });

  return true;
}


