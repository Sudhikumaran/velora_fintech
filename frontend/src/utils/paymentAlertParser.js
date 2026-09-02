const FAIL = /\b(failed|declined|unsuccessful|cancelled|canceled)\b/i;
const COLLECT = /\b(request(ed)? money|payment request|collect request|is trying to pay|please pay ₹|please pay rs)\b/i;
const OTP = /\b(otp|one[- ]time (password|code|pin)|verification code)\b/i;

const CREDIT = /\b(credited|received|received from|refund(?:ed)?|cashback credited|money added|deposited|has been credited)\b/i;
const DEBIT = /\b(paid|sent|debited|spent|withdrawn|purchase|payment of|you paid|successfully paid|has been debited|dr\.? amt|debit amt|payment successful|paid to)\b/i;
const BANK_TXN = /\b(upi|imps|neft|rtgs|pos|atm|a\/c|acct|account xx|card xx)\b/i;

const AMOUNT = /(?:₹|rs\.?|inr|dr\.? amt|debit amt|credit amt)\s*[:\-]?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)|([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:inr|rs\.?)/i;

const MERCHANT_MAP = [
  { test: /swiggy|zomato|eatclub|dominos|mcdonald|kfc|starbucks|cafe coffee/i, category: 'Food & Dining' },
  { test: /uber|ola|rapido|irctc|redbus|makemytrip|goibibo|indigo|air india/i, category: 'Transportation' },
  { test: /amazon|flipkart|myntra|ajio|meesho|nykaa/i, category: 'Shopping' },
  { test: /netflix|spotify|hotstar|youtube|prime video|sonyliv/i, category: 'Entertainment' },
  { test: /apollo|pharmeasy|1mg|practo|hospital|clinic/i, category: 'Healthcare' },
  { test: /airtel|jio|bsnl|act fibernet|hathway|electricity|bescom|tneb/i, category: 'Utilities' },
  { test: /rent|landlord|housing/i, category: 'Housing' },
];

const BANKS = [
  { test: /sbi|state bank/i, keys: ['sbi', 'state bank'] },
  { test: /hdfc/i, keys: ['hdfc'] },
  { test: /icici/i, keys: ['icici'] },
  { test: /axis/i, keys: ['axis'] },
  { test: /kotak/i, keys: ['kotak'] },
  { test: /indian bank/i, keys: ['indian bank'] },
  { test: /canara/i, keys: ['canara'] },
  { test: /pnb|punjab national/i, keys: ['pnb', 'punjab'] },
  { test: /bob|baroda/i, keys: ['baroda', 'bob'] },
  { test: /union bank/i, keys: ['union'] },
  { test: /yes bank/i, keys: ['yes bank'] },
  { test: /idfc/i, keys: ['idfc'] },
  { test: /federal/i, keys: ['federal'] },
];

function parseAmount(text) {
  const match = String(text || '').match(AMOUNT);
  if (!match) return null;
  const raw = match[1] || match[2];
  const value = parseFloat(String(raw).replace(/,/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseMerchant(text) {
  const raw = String(text || '').replace(/\s+/g, ' ');
  const patterns = [
    /(?:paid|sent|payment of .{0,24}|you paid .{0,24}|debited .*? by upi\/[0-9.]+\/) to ([A-Za-z0-9 .&'_-]{2,40})/i,
    /(?:info|info:)\s*([A-Za-z0-9 .&'_-]{2,40})/i,
    / at ([A-Za-z0-9 .&'_-]{2,40})(?:\s+on\b|\s+from\b|$)/i,
    / towards ([A-Za-z0-9 .&'_-]{2,40})/i,
    / received from ([A-Za-z0-9 .&'_-]{2,40})/i,
    /upi\/[a-z0-9]+\/([A-Za-z0-9 .&'_-]{2,40})/i,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m?.[1]) return m[1].replace(/\s+from\b.*$/i, '').replace(/\s+ref\b.*$/i, '').trim();
  }
  return '';
}

function inferCategory(merchant, type) {
  if (type === 'income') return 'Refund';
  const hay = merchant || '';
  const hit = MERCHANT_MAP.find((row) => row.test.test(hay));
  return hit?.category || 'Other';
}

function dayKey(when) {
  const d = when ? new Date(when) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parsePaymentNotification(note) {
  const title = note?.title || '';
  const text = [note?.text, note?.bigText, note?.subText].filter(Boolean).join(' ');
  const blob = `${title} ${text}`.trim();
  if (!blob) return null;
  if (FAIL.test(blob) || COLLECT.test(blob)) return null;
  if (OTP.test(blob) && !DEBIT.test(blob) && !CREDIT.test(blob) && !BANK_TXN.test(blob)) return null;

  const amount = parseAmount(blob);
  if (!amount) return null;

  const looksCredit = CREDIT.test(blob);
  const looksDebit = DEBIT.test(blob) || /debited|spent|paid ₹|paid rs|withdrawn/i.test(blob)
    || (BANK_TXN.test(blob) && !looksCredit);
  const type = looksCredit && !looksDebit ? 'income' : 'expense';
  const merchant = parseMerchant(blob);
  const description = merchant
    ? (type === 'income' ? `Received from ${merchant}` : `Paid to ${merchant}`)
    : (note?.packageName === 'sms' ? (type === 'income' ? 'Bank credit' : 'Bank payment') : (title || 'UPI payment'));
  const when = Number(note?.when) || Date.now();
  const fingerprint = `pay:${type}|${amount.toFixed(2)}|${(merchant || title).toLowerCase().slice(0, 40)}|${dayKey(when)}`;

  return {
    id: note?.id || fingerprint,
    type,
    amount,
    merchant,
    category: inferCategory(merchant, type),
    description: description.slice(0, 120),
    date: new Date(when).toISOString(),
    notes: `Auto-captured from ${packageLabel(note?.packageName)}`,
    source: 'import',
    sourceId: fingerprint,
    packageName: note?.packageName || '',
    rawText: blob,
  };
}

function packageLabel(pkg) {
  if (!pkg) return 'a payment alert';
  if (pkg === 'sms') return 'a bank SMS';
  if (pkg === 'share') return 'a shared payment';
  if (pkg.includes('paisa.user')) return 'Google Pay';
  if (pkg.includes('phonepe')) return 'PhonePe';
  if (pkg.includes('paytm')) return 'Paytm';
  if (pkg.includes('npci.upi')) return 'BHIM UPI';
  if (pkg.includes('whatsapp')) return 'WhatsApp';
  if (pkg.includes('sbi') || pkg.includes('hdfc') || pkg.includes('icici') || pkg.includes('axis') || pkg.includes('kotak')) return 'your bank app';
  if (pkg.includes('messaging') || pkg.includes('.mms')) return 'a bank SMS';
  return 'a payment app';
}

export function matchAccountId(accounts, text, fallbackId) {
  const list = Array.isArray(accounts) ? accounts.filter((a) => !a.isArchived) : [];
  const blob = String(text || '');
  const last4 = blob.match(/(?:xx+|x{2,}|\*|a\/c\s*(?:no\.?\s*)?)(\d{4})\b/i)?.[1]
    || blob.match(/\b(\d{4})\s*(?:debited|credited)/i)?.[1];
  if (last4) {
    const hit = list.find((a) => String(a.name || '').includes(last4) || String(a.description || '').includes(last4));
    if (hit) return hit._id;
  }
  const bank = BANKS.find((row) => row.test.test(blob));
  if (bank) {
    const hit = list.find((a) => {
      const name = `${a.name || ''} ${a.description || ''}`.toLowerCase();
      return bank.keys.some((key) => name.includes(key));
    });
    if (hit) return hit._id;
  }
  if (fallbackId && list.some((a) => a._id === fallbackId)) return fallbackId;
  const bankAcc = list.find((a) => a.type === 'bank' || a.type === 'savings');
  return bankAcc?._id || list[0]?._id || '';
}

export function matchToAccount(accounts, merchant, fromAccountId) {
  const list = (Array.isArray(accounts) ? accounts : []).filter((a) => !a.isArchived && a._id !== fromAccountId);
  const hay = String(merchant || '').toLowerCase().trim();
  if (!hay || hay.length < 3) return '';

  const byName = list.find((a) => {
    const name = String(a.name || '').toLowerCase();
    return name.length >= 3 && (hay.includes(name) || name.includes(hay));
  });
  if (byName) return byName._id;

  const byUpi = list.find((a) => {
    const upi = String(a.upiId || '').toLowerCase();
    return upi.length >= 3 && (hay.includes(upi) || upi.includes(hay));
  });
  if (byUpi) return byUpi._id;

  const bank = BANKS.find((row) => row.test.test(hay));
  if (bank) {
    const hit = list.find((a) => {
      const name = `${a.name || ''} ${a.description || ''}`.toLowerCase();
      return bank.keys.some((key) => name.includes(key));
    });
    if (hit) return hit._id;
  }
  return '';
}
