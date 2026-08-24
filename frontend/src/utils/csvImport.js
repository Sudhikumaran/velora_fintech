function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];

  const split = (line) => {
    const cells = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') { cur += '"'; i += 1; }
        else quoted = !quoted;
      } else if (ch === ',' && !quoted) {
        cells.push(cur.trim());
        cur = '';
      } else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  };

  const headers = split(lines[0]).map((h) => h.toLowerCase());
  const alias = {
    date: ['date', 'txn date', 'transaction date'],
    type: ['type', 'credit/debit', 'cr/dr'],
    amount: ['amount', 'value', 'debit', 'credit'],
    category: ['category', 'narration category'],
    description: ['description', 'particulars', 'narration', 'details', 'remarks'],
    account: ['account', 'account name'],
    notes: ['notes', 'note', 'comments'],
  };

  const idx = {};
  Object.entries(alias).forEach(([key, names]) => {
    idx[key] = headers.findIndex((h) => names.includes(h));
  });

  return lines.slice(1).map((line) => {
    const cells = split(line);
    const pick = (key) => (idx[key] >= 0 ? cells[idx[key]] : '');
    let type = pick('type').toLowerCase();
    if (type.includes('credit') || type === 'cr' || type === 'in') type = 'income';
    else if (type.includes('debit') || type === 'dr' || type === 'out') type = 'expense';
    else if (!['income', 'expense', 'transfer'].includes(type)) type = 'expense';

    return {
      date: pick('date'),
      type,
      amount: pick('amount').replace(/[^0-9.-]/g, ''),
      category: pick('category'),
      description: pick('description'),
      account: pick('account'),
      notes: pick('notes'),
    };
  }).filter((r) => r.amount);
}

export function parseTransactionCsv(text) {
  return parseCsv(text);
}
