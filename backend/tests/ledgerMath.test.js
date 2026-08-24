import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walkRunningBalance, remainingAfterGive, netFromDebitCredit } from '../src/utils/ledgerMath.js';
import { addFrequency } from '../src/utils/recurrence.js';

test('debit increases running balance', () => {
  const rows = walkRunningBalance(1000, [
    { debit: 500, credit: 0 },
    { debit: 0, credit: 200 },
  ]);
  assert.equal(rows[0].balance, 1500);
  assert.equal(rows[1].balance, 1300);
});

test('income planner remaining', () => {
  assert.equal(remainingAfterGive(50000, [{ amount: 12000 }, { amount: 5000 }]), 33000);
});

test('net debit credit', () => {
  assert.equal(netFromDebitCredit(100, 40), 60);
});

test('monthly recurrence advances a month', () => {
  const next = addFrequency(new Date('2026-01-31T00:00:00Z'), 'monthly');
  assert.equal(next.getUTCMonth() === 1 || next.getUTCMonth() === 2, true);
});
