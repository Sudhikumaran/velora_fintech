import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Download, Search, Scale, ScrollText, ArrowLeft,
  ArrowUpRight, ArrowDownRight, Landmark,
} from 'lucide-react';
import { useLedgerStore } from '../store/ledgerStore';
import { useAccountStore } from '../store/accountStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { ACCOUNT_TYPES } from '../utils/constants';
import { exportToCSV, ledgerToCSV } from '../utils/csvExport';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Badge from '../components/ui/Badge';

const VIEWS = [
  { value: 'trial-balance', label: 'Trial Balance', icon: Scale },
  { value: 'journal', label: 'Journal', icon: ScrollText },
  { value: 'ledger', label: 'Account Ledger', icon: BookOpen },
];

const typeBadge = { income: 'income', expense: 'expense', transfer: 'transfer' };

function pad(n) {
  return String(n).padStart(2, '0');
}

function isoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function periodPresets() {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  return [
    { label: 'This month', startDate: isoDate(thisMonthStart), endDate: isoDate(now) },
    { label: 'Last month', startDate: isoDate(lastMonthStart), endDate: isoDate(lastMonthEnd) },
    { label: 'This year', startDate: isoDate(yearStart), endDate: isoDate(now) },
    { label: 'All time', startDate: '', endDate: '' },
  ];
}

function accountTypeLabel(type) {
  return ACCOUNT_TYPES.find((t) => t.value === type)?.label || type || '—';
}

function Stat({ label, value, color }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold mt-1 tabular-nums ${color || 'text-gray-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}

function MoneyCell({ amount, currency, tone }) {
  if (!amount) return <span className="text-gray-300 dark:text-gray-700">—</span>;
  const color =
    tone === 'debit' ? 'text-emerald-600 dark:text-emerald-400' :
    tone === 'credit' ? 'text-red-600 dark:text-red-400' :
    'text-gray-900 dark:text-white';
  return <span className={`font-semibold tabular-nums ${color}`}>{formatCurrency(amount, currency)}</span>;
}

export default function Ledger() {
  const { data, isLoading, filters, setFilters, fetchLedger, clearLedger } = useLedgerStore();
  const { accounts, fetchAccounts } = useAccountStore();
  const { user } = useAuthStore();
  const currency = user?.currency;

  useEffect(() => { fetchAccounts(); }, []);

  useEffect(() => {
    const params = { ...filters };
    if (filters.view === 'trial-balance') {
      params.view = 'trial-balance';
      delete params.account;
    } else if (filters.view === 'journal') {
      params.view = 'journal';
      delete params.account;
    } else {
      params.view = 'ledger';
      if (!params.account) {
        clearLedger();
        return;
      }
    }
    fetchLedger(params);
  }, [filters.view, filters.account, filters.startDate, filters.endDate, filters.search]);

  const openAccountLedger = (accountId) => {
    setFilters({ view: 'ledger', account: accountId });
  };

  const filename = `velora-${filters.view}-${filters.startDate || 'all'}-to-${filters.endDate || 'now'}.csv`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ledger"
        subtitle="Double-entry books, trial balance, and running account balances"
        action={
          <button
            onClick={() => exportToCSV(ledgerToCSV(data), filename)}
            className="btn-secondary"
            disabled={!data}
            title="Export CSV"
          >
            <Download size={16} /> Export
          </button>
        }
      />

      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        {VIEWS.map((v) => {
          const Icon = v.icon;
          const active = filters.view === v.value;
          return (
            <button
              key={v.value}
              type="button"
              onClick={() => setFilters({ view: v.value })}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={15} />
              {v.label}
            </button>
          );
        })}
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {periodPresets().map((p) => {
            const active = filters.startDate === p.startDate && filters.endDate === p.endDate;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => setFilters({ startDate: p.startDate, endDate: p.endDate })}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filters.view === 'ledger' && (
            <select
              className="input-field text-sm"
              value={filters.account}
              onChange={(e) => setFilters({ account: e.target.value })}
            >
              <option value="">Select account</option>
              {accounts.filter((a) => !a.isArchived).map((a) => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
          )}
          <input
            type="date"
            className="input-field text-sm"
            value={filters.startDate}
            onChange={(e) => setFilters({ startDate: e.target.value })}
          />
          <input
            type="date"
            className="input-field text-sm"
            value={filters.endDate}
            onChange={(e) => setFilters({ endDate: e.target.value })}
          />
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="input-field text-sm"
              style={{ paddingLeft: '2.25rem' }}
              placeholder="Search particulars..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="card"><LoadingSpinner center /></div>
      ) : !data ? (
        <div className="card">
          <EmptyState
            icon={BookOpen}
            title={filters.view === 'ledger' ? 'Choose an account' : 'No ledger data'}
            description={
              filters.view === 'ledger'
                ? 'Select an account to open its debit and credit register.'
                : 'Add accounts and transactions to build your books.'
            }
          />
        </div>
      ) : data.view === 'trial-balance' ? (
        <TrialBalanceView data={data} currency={currency} search={filters.search} onOpenAccount={openAccountLedger} />
      ) : data.view === 'journal' ? (
        <JournalView data={data} currency={currency} />
      ) : (
        <AccountLedgerView
          data={data}
          currency={currency}
          onBack={() => setFilters({ view: 'trial-balance', account: '' })}
        />
      )}
    </div>
  );
}

function TrialBalanceView({ data, currency, onOpenAccount, search }) {
  const q = (search || '').toLowerCase();
  const rows = (data.accounts || []).filter((row) =>
    !q
    || row.account.name.toLowerCase().includes(q)
    || (row.account.type || '').toLowerCase().includes(q)
  );
  const totals = data.totals || { opening: 0, debit: 0, credit: 0, closing: 0, entries: 0 };

  if ((data.accounts || []).length === 0) {
    return (
      <div className="card">
        <EmptyState icon={Scale} title="No accounts yet" description="Create an account to start a trial balance." />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={Search} title="No matching accounts" description="Try a different search term." />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Opening" value={formatCurrency(totals.opening, currency)} />
        <Stat label="Total Debit" value={formatCurrency(totals.debit, currency)} color="text-emerald-600" />
        <Stat label="Total Credit" value={formatCurrency(totals.credit, currency)} color="text-red-600" />
        <Stat label="Closing" value={formatCurrency(totals.closing, currency)} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Account</th>
                <th className="text-left px-3 py-3">Type</th>
                <th className="text-right px-3 py-3">Opening</th>
                <th className="text-right px-3 py-3">Debit</th>
                <th className="text-right px-3 py-3">Credit</th>
                <th className="text-right px-5 py-3">Closing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {rows.map((row, i) => (
                <motion.tr
                  key={row.account._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => onOpenAccount(row.account._id)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: row.account.color }} />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{row.account.name}</p>
                        <p className="text-xs text-gray-400">{row.entryCount} {row.entryCount === 1 ? 'entry' : 'entries'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-gray-500">{accountTypeLabel(row.account.type)}</td>
                  <td className="px-3 py-3.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
                    {formatCurrency(row.openingBalance, currency)}
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <MoneyCell amount={row.totalDebit} currency={currency} tone="debit" />
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <MoneyCell amount={row.totalCredit} currency={currency} tone="credit" />
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold tabular-nums text-gray-900 dark:text-white">
                    {formatCurrency(row.closingBalance, currency)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-800/60 font-semibold text-gray-900 dark:text-white">
                <td className="px-5 py-3" colSpan={2}>Totals</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(totals.opening, currency)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-emerald-600">{formatCurrency(totals.debit, currency)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-red-600">{formatCurrency(totals.credit, currency)}</td>
                <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(totals.closing, currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}

function JournalView({ data, currency }) {
  const entries = data.entries || [];

  if (entries.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={ScrollText} title="No journal entries" description="No postings in this date range." />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Stat label="Vouchers" value={data.voucherCount} />
        <Stat label="Total Debit" value={formatCurrency(data.totalDebit, currency)} color="text-emerald-600" />
        <Stat label="Total Credit" value={formatCurrency(data.totalCredit, currency)} color="text-red-600" />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-3 py-3">Particulars</th>
                <th className="text-left px-3 py-3">Account</th>
                <th className="text-right px-3 py-3">Debit</th>
                <th className="text-right px-5 py-3">Credit</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((row, i) => {
                const isFirst = row.line === 'debit';
                return (
                  <tr
                    key={`${row._id}-${row.line}-${i}`}
                    className={`${isFirst ? 'border-t border-gray-100 dark:border-gray-800' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/40`}
                  >
                    <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">
                      {isFirst ? formatDate(row.date, 'short') : ''}
                    </td>
                    <td className="px-3 py-2.5">
                      {isFirst ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">{row.description}</span>
                          <Badge variant={typeBadge[row.type]} size="xs">{row.type}</Badge>
                        </div>
                      ) : (
                        <span className="text-gray-400 pl-4 text-xs">To {row.contra}</span>
                      )}
                    </td>
                    <td className={`px-3 py-2.5 ${row.line === 'credit' ? 'pl-8 text-gray-500' : 'font-medium text-gray-900 dark:text-white'}`}>
                      {row.accountName}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <MoneyCell amount={row.debit} currency={currency} tone="debit" />
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <MoneyCell amount={row.credit} currency={currency} tone="credit" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-800/60 font-semibold">
                <td className="px-5 py-3" colSpan={3}>Totals</td>
                <td className="px-3 py-3 text-right tabular-nums text-emerald-600">{formatCurrency(data.totalDebit, currency)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-red-600">{formatCurrency(data.totalCredit, currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}

function AccountLedgerView({ data, currency, onBack }) {
  const entries = data.entries || [];
  const account = data.account;

  return (
    <>
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-secondary px-3 py-2">
          <ArrowLeft size={15} /> Trial Balance
        </button>
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full" style={{ background: account?.color }} />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white leading-tight">{account?.name}</p>
            <p className="text-xs text-gray-400">{accountTypeLabel(account?.type)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Opening" value={formatCurrency(data.openingBalance, currency)} />
        <Stat
          label="Debit (in)"
          value={formatCurrency(data.totalDebit, currency)}
          color="text-emerald-600"
        />
        <Stat
          label="Credit (out)"
          value={formatCurrency(data.totalCredit, currency)}
          color="text-red-600"
        />
        <Stat label="Closing" value={formatCurrency(data.closingBalance, currency)} />
      </div>

      <div className="card overflow-hidden">
        {entries.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="No postings"
            description="This account has no entries in the selected period."
          />
        ) : (
          <div className="overflow-x-auto table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-left px-3 py-3">Particulars</th>
                  <th className="text-left px-3 py-3">Contra</th>
                  <th className="text-right px-3 py-3">Debit</th>
                  <th className="text-right px-3 py-3">Credit</th>
                  <th className="text-right px-5 py-3">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                <tr className="bg-indigo-50/40 dark:bg-indigo-900/10">
                  <td className="px-5 py-2.5 text-xs text-gray-400" colSpan={3}>Opening balance</td>
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5" />
                  <td className="px-5 py-2.5 text-right font-semibold tabular-nums text-gray-900 dark:text-white">
                    {formatCurrency(data.openingBalance, currency)}
                  </td>
                </tr>
                {entries.map((row, i) => (
                  <motion.tr
                    key={row._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(row.date, 'short')}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {row.type === 'income' ? (
                          <ArrowUpRight size={14} className="text-emerald-500 shrink-0" />
                        ) : row.type === 'expense' ? (
                          <ArrowDownRight size={14} className="text-red-500 shrink-0" />
                        ) : (
                          <BookOpen size={14} className="text-indigo-500 shrink-0" />
                        )}
                        <span className="font-medium text-gray-900 dark:text-white truncate">{row.description}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={typeBadge[row.type] || 'default'} size="xs">{row.contra}</Badge>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <MoneyCell amount={row.debit} currency={currency} tone="debit" />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <MoneyCell amount={row.credit} currency={currency} tone="credit" />
                    </td>
                    <td className="px-5 py-3 text-right font-bold tabular-nums text-gray-900 dark:text-white">
                      {formatCurrency(row.balance, currency)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-800/60 font-semibold">
                  <td className="px-5 py-3" colSpan={3}>Closing balance</td>
                  <td className="px-3 py-3 text-right tabular-nums text-emerald-600">{formatCurrency(data.totalDebit, currency)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-red-600">{formatCurrency(data.totalCredit, currency)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-gray-900 dark:text-white">
                    {formatCurrency(data.closingBalance, currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
