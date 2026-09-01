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
      } else if ((ch === ',' || ch === '\t' || ch === ';') && !quoted) {
        cells.push(cur.trim());
        cur = '';
      } else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  };

  const headers = split(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9/ ]/g, ' ').replace(/\s+/g, ' ').trim());
  const find = (names) => headers.findIndex((h) => names.some((n) => h === n || h.includes(n)));

  const idx = {
    date: find(['date', 'txn date', 'transaction date', 'value dt', 'value date', 'tran date']),
    type: find(['type', 'credit/debit', 'cr/dr', 'dr cr']),
    amount: find(['amount', 'value', 'txn amount']),
    debit: find(['debit', 'withdrawal', 'withdrawal amt', 'withdraw', 'dr amount']),
    credit: find(['credit', 'deposit', 'deposit amt', 'cr amount']),
    category: find(['category', 'narration category']),
    description: find(['description', 'particulars', 'narration', 'details', 'remarks', 'description/narration']),
    account: find(['account', 'account name']),
    notes: find(['notes', 'note', 'comments', 'ref', 'cheque']),
  };

  const pick = (cells, key) => (idx[key] >= 0 ? cells[idx[key]] : '');

  const normalizeDate = (s) => {
    const m = String(s || '').match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (!m) return s;
    let y = m[3];
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  };

  return lines.slice(1).map((line) => {
    const cells = split(line);
    const debit = pick(cells, 'debit').replace(/[^0-9.]/g, '');
    const credit = pick(cells, 'credit').replace(/[^0-9.]/g, '');
    let amount = pick(cells, 'amount').replace(/[^0-9.-]/g, '');
    let type = pick(cells, 'type').toLowerCase();

    if (debit && Number(debit) > 0) {
      amount = debit;
      type = 'expense';
    } else if (credit && Number(credit) > 0) {
      amount = credit;
      type = 'income';
    } else if (type.includes('credit') || type === 'cr' || type === 'in') type = 'income';
    else if (type.includes('debit') || type === 'dr' || type === 'out') type = 'expense';
    else if (!['income', 'expense', 'transfer'].includes(type)) type = 'expense';

    return {
      date: normalizeDate(pick(cells, 'date')),
      type,
      amount,
      category: pick(cells, 'category') || (type === 'income' ? 'Other' : 'Other'),
      description: pick(cells, 'description'),
      account: pick(cells, 'account'),
      notes: pick(cells, 'notes') || 'Bank statement import',
    };
  }).filter((r) => r.amount && Number(r.amount) > 0);
}

export function parseTransactionCsv(text) {
  return parseCsv(text);
}
