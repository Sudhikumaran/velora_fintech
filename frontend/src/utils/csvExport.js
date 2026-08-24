export function exportToCSV(data, filename = 'export.csv') {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function transactionsToCSV(transactions) {
  return transactions.map((tx) => ({
    Date: new Date(tx.date).toLocaleDateString(),
    Type: tx.type,
    Category: tx.category || '',
    Description: tx.description || '',
    Amount: tx.amount,
    Account: tx.account?.name || '',
    Notes: tx.notes || '',
  }));
}

export function analyticsDailyReportToCSV(series) {
  if (!series?.length) return [];
  return series.map((row) => ({
    Date: row.date,
    Income: row.income,
    Expenses: row.expense,
    Net: row.net,
  }));
}

export function ledgerToCSV(data) {
  if (!data) return [];

  if (data.view === 'trial-balance') {
    return (data.accounts || []).map((row) => ({
      Account: row.account?.name || '',
      Type: row.account?.type || '',
      'Opening Balance': row.openingBalance,
      Debit: row.totalCredit,
      Credit: row.totalDebit,
      'Closing Balance': row.closingBalance,
      Entries: row.entryCount,
    }));
  }

  if (data.view === 'journal') {
    return (data.entries || []).map((row) => ({
      Date: new Date(row.date).toLocaleDateString(),
      Particulars: row.description || '',
      Account: row.accountName || '',
      Contra: row.contra || '',
      Debit: row.credit || '',
      Credit: row.debit || '',
      Type: row.type || '',
    }));
  }

  return (data.entries || []).map((row) => ({
    Date: new Date(row.date).toLocaleDateString(),
    Particulars: row.description || '',
    Contra: row.contra || '',
    Type: row.type || '',
    Debit: row.credit || '',
    Credit: row.debit || '',
    Balance: row.balance,
  }));
}

export function incomePlanToCSV(plan) {
  if (!plan?.entries?.length) return [];
  return plan.entries.map((row) => ({
    Date: new Date(row.date).toLocaleDateString(),
    Type: row.type,
    Name: row.name || '',
    Category: row.category || '',
    Received: row.type === 'received' ? row.amount : '',
    Give: row.type === 'give' ? row.amount : '',
    Status: row.type === 'give' ? (row.isDone ? 'Given' : 'Pending') : '',
    Balance: row.balance,
    Notes: row.notes || '',
  }));
}
