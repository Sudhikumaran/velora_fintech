import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
}

export function isEmailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
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
