import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaymentReviewStore } from '../../store/paymentReviewStore';
import { useAccountStore } from '../../store/accountStore';
import { useTransactionStore } from '../../store/transactionStore';
import { useAuthStore } from '../../store/authStore';
import { useBudgetStore } from '../../store/financeStore';
import { TRANSACTION_CATEGORIES } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { finishPaymentReview } from '../../utils/paymentCapture';
import { rememberMerchantCategory } from '../../utils/merchantMemory';
import { bumpTodaySpend } from '../../utils/todaySpend';
import { tapHaptic } from '../../utils/native';
import { ocrReceipt } from '../../utils/receiptOcr';
import Modal from './Modal';
import ReceiptUpload from './ReceiptUpload';
import CategorySelect from './CategorySelect';

function toDateInput(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptySplit(description = '') {
  return { amount: '', category: '', description };
}

function draftFromItem(item, accounts) {
  const remembered = item?.rememberedCategory || '';
  return {
    type: item?.toAccountId ? 'transfer' : (item?.type === 'income' ? 'income' : 'expense'),
    amount: item?.amount != null ? String(item.amount) : '',
    date: toDateInput(item?.date),
    description: item?.description || '',
    account: item?.accountId || accounts[0]?._id || '',
    toAccount: item?.toAccountId || '',
    category: remembered,
    receiptUrl: '',
    splits: [],
  };
}

function categoriesFor(type, extra) {
  const key = type === 'transfer' ? 'expense' : type;
  const base = TRANSACTION_CATEGORIES[key] || TRANSACTION_CATEGORIES.expense;
  const storageKey = `velora_custom_categories_${key}`;
  let custom = [];
  try { custom = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { custom = []; }
  const rest = [...base, ...custom].filter((c) => c !== extra);
  return extra ? [extra, ...rest] : rest;
}

function splitTotal(splits) {
  return splits.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
}

function budgetNudge(budgets, category, extra) {
  if (!category) return null;
  const budget = (budgets || []).find((b) => b.isActive && b.category === category);
  if (!budget?.limit) return null;
  const next = Number(budget.spent || 0) + Number(extra || 0);
  const pct = (next / budget.limit) * 100;
  if (pct < (budget.alertThreshold || 80)) return null;
  return {
    over: pct >= 100,
    pct,
    spent: next,
    limit: budget.limit,
    category,
  };
}

export default function PaymentReviewModal() {
  const navigate = useNavigate();
  const { queue, open, dismiss, reopen, removeCurrent } = usePaymentReviewStore();
  const { accounts, fetchAccounts } = useAccountStore();
  const { budgets, fetchBudgets } = useBudgetStore();
  const currency = useAuthStore((s) => s.user?.currency || 'INR');
  const item = queue[0] || null;
  const [form, setForm] = useState(() => draftFromItem(item, accounts));
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchBudgets(); }, []);

  useEffect(() => {
    setForm(draftFromItem(item, accounts));
    if (open && item) tapHaptic();
  }, [item?.sourceId, open]);

  useEffect(() => {
    if (!form.account && accounts.length) {
      setForm((f) => ({ ...f, account: item?.accountId || accounts[0]._id }));
    }
  }, [accounts, item?.accountId, form.account]);

  const categories = useMemo(
    () => categoriesFor(form.type, item?.suggestedCategory || form.category),
    [form.type, form.category, item?.suggestedCategory]
  );
  const quick = categories.slice(0, 8);
  const usingSplits = form.type !== 'transfer' && form.splits.length > 0;
  const assigned = usingSplits ? splitTotal(form.splits) : parseFloat(form.amount) || 0;
  const target = parseFloat(form.amount) || 0;
  const remaining = Math.round((target - assigned) * 100) / 100;
  const splitsReady = usingSplits
    && remaining === 0
    && form.splits.every((row) => row.category && parseFloat(row.amount) > 0);
  const canSave = form.account && (usingSplits ? splitsReady : (form.type === 'transfer' ? form.toAccount : form.category));

  const nudges = useMemo(() => {
    if (form.type !== 'expense') return [];
    if (usingSplits) {
      return form.splits
        .map((row) => budgetNudge(budgets, row.category, row.amount))
        .filter(Boolean);
    }
    const one = budgetNudge(budgets, form.category, form.amount);
    return one ? [one] : [];
  }, [budgets, form.type, form.category, form.amount, form.splits, usingSplits]);

  if (!item && !queue.length) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!item || !canSave) return;
    setSaving(true);
    try {
      const splits = usingSplits
        ? form.splits.map((row) => ({
          category: row.category,
          amount: parseFloat(row.amount),
          description: (row.description || '').trim(),
          notes: (row.description || '').trim(),
        }))
        : [];
      const created = await useTransactionStore.getState().createTransaction({
        account: form.account,
        toAccount: form.type === 'transfer' ? form.toAccount : undefined,
        type: form.type,
        amount: Number(form.amount),
        category: form.type === 'transfer' ? 'Transfer' : (splits[0]?.category || form.category),
        description: form.description.trim() || form.category || 'Payment',
        date: form.date,
        notes: item.notes || '',
        receiptUrl: form.receiptUrl || '',
        splits,
        source: item.source || 'import',
        sourceId: item.sourceId,
      });
      if (!created || created.skipped) {
        if (created?.skipped) {
          await finishPaymentReview(item.sourceId, item.noteId);
          removeCurrent();
        }
        return;
      }
      if (form.type === 'expense') {
        const merchant = item.merchant || form.description;
        if (splits.length) {
          await rememberMerchantCategory(merchant, splits[0].category);
        } else {
          await rememberMerchantCategory(merchant, form.category);
        }
        bumpTodaySpend(Number(form.amount));
      }
      await finishPaymentReview(item.sourceId, item.noteId);
      removeCurrent();
      fetchAccounts();
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!item) return;
    await finishPaymentReview(item.sourceId, item.noteId);
    removeCurrent();
  };

  const rememberCategory = (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    const storageKey = `velora_custom_categories_${form.type === 'transfer' ? 'expense' : form.type}`;
    let custom = [];
    try { custom = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { custom = []; }
    if (!custom.includes(trimmed) && !(TRANSACTION_CATEGORIES[form.type === 'transfer' ? 'expense' : form.type] || []).includes(trimmed)) {
      localStorage.setItem(storageKey, JSON.stringify([...custom, trimmed]));
    }
  };

  const startSplit = () => {
    const half = target ? String(Math.round((target / 2) * 100) / 100) : '';
    setForm((f) => ({
      ...f,
      splits: [
        emptySplit(f.description),
        { ...emptySplit(''), amount: half },
      ],
    }));
  };

  return (
    <>
      <Modal
        isOpen={open && !!item}
        onClose={dismiss}
        title={queue.length > 1 ? `Add this payment · ${queue.length} waiting` : 'Add this payment'}
        headerAction={
          <button type="submit" form="payment-review-form" disabled={saving || !canSave} className="btn-primary w-full min-h-12 text-base disabled:opacity-50">
            {saving ? 'Saving…' : 'Save payment'}
          </button>
        }
      >
        <form id="payment-review-form" onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-gray-500">
              Amount, date, and description are filled. Pick a category — or split the same payment across categories.
            </p>
            {queue.length > 1 && (
              <button type="button" className="text-xs text-indigo-600 font-semibold shrink-0" onClick={() => { dismiss(); navigate('/payments'); }}>
                See all
              </button>
            )}
          </div>

          <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            {['expense', 'income', 'transfer'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: t, category: t === 'transfer' ? 'Transfer' : (item?.rememberedCategory || ''), splits: t === 'transfer' ? [] : f.splits }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize ${
                  form.type === t
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {item?.rememberedCategory && form.type !== 'transfer' && (
            <p className="text-xs text-indigo-600">Last time {item.merchant || 'this merchant'} was <strong>{item.rememberedCategory}</strong>.</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount</label>
              <input type="number" step="0.01" min="0.01" className="input-field text-lg font-semibold" value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input-field" value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
            </div>
          </div>

          <div>
            <label className="label">{form.type === 'transfer' ? 'From account' : 'Paid from'}</label>
            <select className="input-field" value={form.account} onChange={(e) => setForm((f) => ({ ...f, account: e.target.value }))} required>
              <option value="">Select account</option>
              {accounts.filter((a) => !a.isArchived).map((a) => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
          </div>

          {form.type === 'transfer' && (
            <div>
              <label className="label">To account</label>
              <select className="input-field" value={form.toAccount} onChange={(e) => setForm((f) => ({ ...f, toAccount: e.target.value }))} required>
                <option value="">Select account</option>
                {accounts.filter((a) => !a.isArchived && a._id !== form.account).map((a) => (
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Description</label>
            <input className="input-field" value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Who did you pay?" />
          </div>

          {form.type !== 'transfer' && !usingSplits && (
            <div>
              <label className="label">Category</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {quick.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, category: c }))}
                    className={`px-3 py-1.5 rounded-full text-sm border ${
                      form.category === c
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <CategorySelect
                value={form.category}
                categories={categories}
                onChange={(name) => {
                  rememberCategory(name);
                  setForm((f) => ({ ...f, category: name }));
                }}
              />
            </div>
          )}

          {form.type !== 'transfer' && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Split this payment</p>
                {usingSplits ? (
                  <button type="button" className="text-xs text-gray-500" onClick={() => setForm((f) => ({ ...f, splits: [] }))}>Remove split</button>
                ) : (
                  <button type="button" className="text-xs text-indigo-600 font-semibold" onClick={startSplit}>Split amount</button>
                )}
              </div>
              {usingSplits && (
                <>
                  <p className="text-xs text-gray-500">
                    Example: ₹50 at the same shop → ₹30 Food (lunch) and ₹20 Other (parking).
                  </p>
                  {form.splits.map((row, i) => (
                    <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2 bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Part {i + 1}</p>
                        {form.splits.length > 1 && (
                          <button type="button" className="text-red-500 text-sm" onClick={() => setForm((f) => ({ ...f, splits: f.splits.filter((_, j) => j !== i) }))}>✕</button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="label">Category</label>
                          <CategorySelect
                            value={row.category}
                            categories={categories}
                            onChange={(name) => {
                              rememberCategory(name);
                              const splits = [...form.splits];
                              splits[i] = { ...splits[i], category: name };
                              setForm((f) => ({ ...f, splits }));
                            }}
                          />
                        </div>
                        <div>
                          <label className="label">Amount</label>
                          <input type="number" step="0.01" min="0.01" className="input-field" placeholder="0.00" value={row.amount}
                            onChange={(e) => {
                              const splits = [...form.splits];
                              splits[i] = { ...splits[i], amount: e.target.value };
                              setForm((f) => ({ ...f, splits }));
                            }} />
                        </div>
                      </div>
                      <div>
                        <label className="label">Description</label>
                        <input className="input-field" placeholder="What was this part for?" value={row.description}
                          onChange={(e) => {
                            const splits = [...form.splits];
                            splits[i] = { ...splits[i], description: e.target.value };
                            setForm((f) => ({ ...f, splits }));
                          }} />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-xs">
                    <button type="button" className="text-indigo-600 font-semibold"
                      onClick={() => setForm((f) => ({ ...f, splits: [...f.splits, emptySplit('')] }))}>
                      + Add another part
                    </button>
                    <span className={remaining === 0 ? 'text-green-600' : 'text-amber-600'}>
                      {remaining === 0 ? 'Split totals match' : `${formatCurrency(Math.abs(remaining), currency)} ${remaining > 0 ? 'left' : 'over'}`}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {nudges.map((n) => (
            <div key={n.category} className={`text-sm rounded-xl px-3 py-2 ${n.over ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200'}`}>
              {n.over
                ? `${n.category} will go over budget (${formatCurrency(n.spent, currency)} of ${formatCurrency(n.limit, currency)}).`
                : `${n.category} will be at ${n.pct.toFixed(0)}% of this month's budget.`}
            </div>
          ))}

          <ReceiptUpload
            transactionId={null}
            currentUrl={form.receiptUrl}
            onUploaded={(url) => setForm((f) => ({ ...f, receiptUrl: url }))}
            onOcr={async (file) => {
              try {
                const parsed = await ocrReceipt(file);
                setForm((f) => ({
                  ...f,
                  amount: parsed.amount || f.amount,
                  date: parsed.date || f.date,
                  description: f.description || parsed.description,
                }));
              } catch { /* optional */ }
            }}
          />

          <button type="button" onClick={handleSkip} className="w-full text-sm text-gray-500 py-2">
            Skip this payment
          </button>
        </form>
      </Modal>

      {!open && queue.length > 0 && (
        <div className="fixed z-[180] left-3 right-3 lg:left-auto lg:right-6 lg:w-80 bottom-24 lg:bottom-6 rounded-2xl bg-indigo-600 text-white px-4 py-3 shadow-lg">
          <button type="button" onClick={reopen} className="w-full text-left">
            <p className="font-semibold text-sm">
              {queue.length === 1 ? 'Payment waiting' : `${queue.length} payments waiting`}
            </p>
            <p className="text-xs text-indigo-100 mt-0.5 truncate">
              {item ? `${formatCurrency(item.amount, currency)} · ${item.description || 'Tap to add'}` : 'Tap to add'}
            </p>
          </button>
          <button
            type="button"
            className="text-xs underline mt-1"
            onClick={() => navigate('/payments')}
          >
            Open inbox
          </button>
        </div>
      )}
    </>
  );
}
