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
