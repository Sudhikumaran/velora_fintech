export const countedMatch = { excludeFromTotals: { $ne: true } };

export function countedAmount(txs, type) {
  return (txs || [])
    .filter((t) => t.type === type && !t.excludeFromTotals)
    .reduce((s, t) => s + Number(t.amount || 0), 0);
}
