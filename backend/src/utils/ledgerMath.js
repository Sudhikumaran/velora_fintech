/**
 * Running-balance helpers used by the ledger and by unit tests.
 * Debit increases an asset-style account; credit decreases it.
 */
export function netFromDebitCredit(debit = 0, credit = 0) {
  return Number(debit || 0) - Number(credit || 0);
}

export function walkRunningBalance(opening, entries) {
  let balance = Number(opening || 0);
  return entries.map((entry) => {
    const debit = Number(entry.debit || 0);
    const credit = Number(entry.credit || 0);
    balance += netFromDebitCredit(debit, credit);
    return { ...entry, balance };
  });
}

export function remainingAfterGive(received, giveItems) {
  const totalGive = (giveItems || []).reduce((s, item) => s + Number(item.amount || 0), 0);
  return Number(received || 0) - totalGive;
}
