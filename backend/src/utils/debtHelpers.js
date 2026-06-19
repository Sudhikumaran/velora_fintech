export function getPaidEmiCount(debt) {
  if (!debt.isEMI || !debt.emiAmount) return 0;
  return Math.round((debt.amount - (debt.remainingAmount || 0)) / debt.emiAmount);
}

export function getNextEMIDate(debt) {
  if (!debt.isEMI || !debt.emiDay || !debt.emiStartDate) return null;
  const paidCount = getPaidEmiCount(debt);
  const start = new Date(debt.emiStartDate);
  return new Date(start.getFullYear(), start.getMonth() + paidCount, debt.emiDay);
}

export function getEffectiveDueDate(debt) {
  if (debt.status === 'paid') return debt.closedAt ? new Date(debt.closedAt) : null;
  if (debt.isEMI) return getNextEMIDate(debt);
  return debt.dueDate ? new Date(debt.dueDate) : null;
}

export function sortDebtsByDueDate(debts, { closedFirst = false } = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [...debts].sort((a, b) => {
    if (closedFirst) {
      const closedA = a.closedAt ? new Date(a.closedAt).getTime() : 0;
      const closedB = b.closedAt ? new Date(b.closedAt).getTime() : 0;
      return closedB - closedA;
    }

    const dueA = getEffectiveDueDate(a);
    const dueB = getEffectiveDueDate(b);

    if (!dueA && !dueB) return new Date(b.createdAt) - new Date(a.createdAt);
    if (!dueA) return 1;
    if (!dueB) return -1;

    const overdueA = dueA < today;
    const overdueB = dueB < today;
    if (overdueA && !overdueB) return -1;
    if (!overdueA && overdueB) return 1;

    return dueA.getTime() - dueB.getTime();
  });
}

export function getDaysUntilDue(debt) {
  const due = getEffectiveDueDate(debt);
  if (!due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  return Math.ceil((dueDay - today) / (1000 * 60 * 60 * 24));
}
