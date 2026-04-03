import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit3, Trash2, TrendingUp, TrendingDown, RefreshCw,
  ChevronRight, X, History, Gem,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Area, AreaChart,
} from 'recharts';
import { useInvestmentStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { INVESTMENT_TYPES, COLORS } from '../utils/constants';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';

const defaultForm = {
  name: '', type: 'stock', symbol: '', units: '', buyPrice: '',
  currentPrice: '', buyDate: new Date().toISOString().split('T')[0],
  platform: '', notes: '',
};

const TYPE_META = {
  'digi-gold':   { icon: '🪙', color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600',  label: 'Digi Gold' },
  'stock':       { icon: '📈', color: '#6366f1', bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600', label: 'Stock' },
  'crypto':      { icon: '₿',  color: '#f97316', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600', label: 'Crypto' },
  'mutual-fund': { icon: '💼', color: '#3b82f6', bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-600',   label: 'Mutual Fund' },
  'etf':         { icon: '📊', color: '#8b5cf6', bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600', label: 'ETF' },
  'real-estate': { icon: '🏠', color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600', label: 'Real Estate' },
  'bond':        { icon: '🏛️', color: '#14b8a6', bg: 'bg-teal-50 dark:bg-teal-900/20',    text: 'text-teal-600',   label: 'Bond' },
  'commodity':   { icon: '🛢️', color: '#ef4444', bg: 'bg-red-50 dark:bg-red-900/20',       text: 'text-red-600',    label: 'Commodity' },
  'other':       { icon: '💰', color: '#94a3b8', bg: 'bg-gray-50 dark:bg-gray-800',        text: 'text-gray-500',   label: 'Other' },
};

function InvestmentForm({ form, setForm, onSubmit, isEdit }) {
  const isDigiGold = form.type === 'digi-gold';

  // For Digi Gold: units=1, buyPrice=totalInvested, currentPrice=currentValue
  const totalInvested = isDigiGold ? form.buyPrice : '';
  const currentValue  = isDigiGold ? form.currentPrice : '';
  const gain = isDigiGold && totalInvested && currentValue
    ? parseFloat(currentValue) - parseFloat(totalInvested) : null;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Name</label>
          <input className="input-field" placeholder={isDigiGold ? 'e.g. Digi Gold - MoneyView' : 'e.g. Apple Inc.'} value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className={isDigiGold ? 'col-span-2' : ''}>
          <label className="label">Type</label>
          <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, units: e.target.value === 'digi-gold' ? 1 : form.units })}>
            {INVESTMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {isDigiGold ? (
          <>
            <div>
              <label className="label">Total Invested (₹)</label>
              <input type="number" step="0.01" min="0" className="input-field" placeholder="e.g. 500.00"
                value={totalInvested}
                onChange={(e) => setForm({ ...form, units: 1, buyPrice: e.target.value })} required />
            </div>
            <div>
              <label className="label">Current Value (₹)</label>
              <input type="number" step="0.01" min="0" className="input-field" placeholder="e.g. 520.00"
                value={currentValue}
                onChange={(e) => setForm({ ...form, currentPrice: e.target.value })} />
            </div>
            {gain !== null && (
              <div className="col-span-2 flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800">
                <span className="text-sm text-gray-500">Profit / Loss</span>
                <span className={`font-bold text-sm ${gain >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {gain >= 0 ? '+' : ''}₹{gain.toFixed(2)} ({totalInvested > 0 ? ((gain / parseFloat(totalInvested)) * 100).toFixed(2) : 0}%)
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <label className="label">Units / Quantity</label>
              <input type="number" step="any" min="0" className="input-field" placeholder="0"
                value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} required />
            </div>
            <div>
              <label className="label">Buy Price (per unit)</label>
              <input type="number" step="0.01" min="0" className="input-field" placeholder="0.00" value={form.buyPrice}
                onChange={(e) => setForm({ ...form, buyPrice: e.target.value })} required />
            </div>
            <div>
              <label className="label">Current Price (per unit)</label>
              <input type="number" step="0.01" min="0" className="input-field" placeholder="0.00" value={form.currentPrice}
                onChange={(e) => setForm({ ...form, currentPrice: e.target.value })} />
            </div>
            <div>
              <label className="label">Symbol (optional)</label>
              <input className="input-field uppercase" placeholder="e.g. AAPL" value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} />
            </div>
          </>
        )}

        <div>
          <label className="label">Date</label>
          <input type="date" className="input-field" value={form.buyDate}
            onChange={(e) => setForm({ ...form, buyDate: e.target.value })} />
        </div>
        <div>
          <label className="label">Platform</label>
          <input className="input-field" placeholder={isDigiGold ? 'e.g. MoneyView, Paytm' : 'e.g. Zerodha'}
            value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} />
        </div>
      </div>
      <button type="submit" className="btn-primary w-full">{isEdit ? 'Update Investment' : 'Add Investment'}</button>
    </form>
  );
}

// ── Price History Modal ──────────────────────────────────────────────────────
function PriceHistoryModal({ investment, onClose, onUpdatePrice }) {
  const { fetchPriceHistory, updatePrice } = useInvestmentStore();
  const { user } = useAuthStore();
  const [history, setHistory] = useState([]);
  const [days, setDays] = useState(30);
  const [newPrice, setNewPrice] = useState(investment?.currentPrice || '');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const isDigiGold = investment?.type === 'digi-gold';

  useEffect(() => {
    if (!investment) return;
    fetchPriceHistory(investment._id, days).then((d) => {
      if (d?.history) setHistory(d.history);
    });
  }, [investment?._id, days]);

  const handleUpdate = async () => {
    if (!newPrice) return;
    setSaving(true);
    await updatePrice(investment._id, parseFloat(newPrice), note);
    setSaving(false);
    setNote('');
    // refresh
    fetchPriceHistory(investment._id, days).then((d) => { if (d?.history) setHistory(d.history); });
    onUpdatePrice?.();
  };

  const chartData = history.map((h) => ({
    date: new Date(h.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    price: h.price,
    value: investment ? investment.units * h.price : 0,
  }));

  const firstPrice = history[0]?.price;
  const lastPrice  = history[history.length - 1]?.price;
  const priceChange = firstPrice ? lastPrice - firstPrice : 0;
  const priceChangePct = firstPrice ? ((priceChange / firstPrice) * 100).toFixed(2) : 0;

  return (
    <div className="space-y-5">
      {/* Update price */}
      <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4 space-y-3">
        <p className="text-sm font-bold text-gray-900 dark:text-white">
          {isDigiGold ? '📋 Log Today\'s Gold Price' : '📋 Update Current Price'}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{isDigiGold ? 'Gold price per gram' : 'Price per unit'}</label>
            <input type="number" step="0.01" min="0" className="input-field bg-white dark:bg-gray-800"
              placeholder={investment?.currentPrice || '0.00'}
              value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
          </div>
          <div>
            <label className="label">Note (optional)</label>
            <input className="input-field bg-white dark:bg-gray-800" placeholder="e.g. Market rate"
              value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <button onClick={handleUpdate} disabled={saving || !newPrice} className="btn-primary w-full py-2.5">
          {saving
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            : isDigiGold ? '💰 Log Price' : 'Update Price'
          }
        </button>
        {investment && (
          <div className="flex justify-between text-xs text-gray-500 pt-1">
            <span>Current: <strong className="text-gray-900 dark:text-white">{formatCurrency(investment.currentPrice, user?.currency)}</strong></span>
            <span>Holding value: <strong className="text-indigo-600">{formatCurrency(investment.units * investment.currentPrice, user?.currency)}</strong></span>
          </div>
        )}
      </div>

      {/* Chart range */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <History size={15} className="text-indigo-500" /> Price History
        </p>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${days === d ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {chartData.length > 1 ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Start', val: formatCurrency(firstPrice, user?.currency) },
              { label: 'Latest', val: formatCurrency(lastPrice, user?.currency) },
              { label: `${priceChange >= 0 ? '▲' : '▼'} Change`, val: `${priceChange >= 0 ? '+' : ''}${priceChangePct}%`, color: priceChange >= 0 ? 'text-emerald-600' : 'text-red-500' },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                <p className={`text-sm font-bold ${s.color || 'text-gray-900 dark:text-white'}`}>{s.val}</p>
              </div>
            ))}
          </div>

          {/* Line chart */}
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={isDigiGold ? '#f59e0b' : '#6366f1'} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={isDigiGold ? '#f59e0b' : '#6366f1'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
              <Tooltip
                formatter={(v) => [formatCurrency(v, user?.currency), 'Price']}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.1)', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="price" stroke={isDigiGold ? '#f59e0b' : '#6366f1'} strokeWidth={2}
                fill="url(#goldGrad)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </>
      ) : (
        <div className="flex flex-col items-center py-8 text-center">
          <History size={28} className="text-gray-200 dark:text-gray-700 mb-2" />
          <p className="text-sm text-gray-400">No history yet. Log today's price to start tracking.</p>
        </div>
      )}

      {/* Log table */}
      {history.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {[...history].reverse().slice(0, 15).map((h, i) => (
            <div key={i} className="flex justify-between items-center text-xs py-1.5 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60">
              <span className="text-gray-400">{new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
              {h.note && <span className="text-gray-400 italic truncate max-w-[100px]">{h.note}</span>}
              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(h.price, user?.currency)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Investments() {
  const { investments, fetchInvestments, createInvestment, updateInvestment, deleteInvestment, isLoading } = useInvestmentStore();
  const { user } = useAuthStore();
  const [modalOpen, setModalOpen]     = useState(false);
  const [editInv, setEditInv]         = useState(null);
  const [deleteId, setDeleteId]       = useState(null);
  const [historyInv, setHistoryInv]   = useState(null);
  const [form, setForm]               = useState(defaultForm);
  const [filterType, setFilterType]   = useState('all');
  const [quickPrice, setQuickPrice]   = useState({ open: false, inv: null, price: '' });
  const { updatePrice } = useInvestmentStore();

  useEffect(() => { fetchInvestments(); }, []);

  const openQuickPrice = (inv) => setQuickPrice({ open: true, inv, price: inv.currentPrice || inv.buyPrice });
  const handleQuickPrice = async () => {
    if (!quickPrice.price || !quickPrice.inv) return;
    await updatePrice(quickPrice.inv._id, parseFloat(quickPrice.price), '');
    await fetchInvestments();
    setQuickPrice({ open: false, inv: null, price: '' });
  };

  const openCreate = () => { setForm(defaultForm); setEditInv(null); setModalOpen(true); };
  const openEdit   = (inv) => {
    setForm({ name: inv.name, type: inv.type, symbol: inv.symbol || '', units: inv.units,
      buyPrice: inv.buyPrice, currentPrice: inv.currentPrice || inv.buyPrice,
      buyDate: inv.buyDate?.split('T')[0] || '', platform: inv.platform || '', notes: inv.notes || '' });
    setEditInv(inv); setModalOpen(true);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editInv) await updateInvestment(editInv._id, form);
    else await createInvestment(form);
    setModalOpen(false);
  };

  const filtered = filterType === 'all' ? investments : investments.filter((i) => i.type === filterType);
  const totalInvested = investments.reduce((s, i) => s + i.units * i.buyPrice, 0);
  const totalValue    = investments.reduce((s, i) => s + i.units * (i.currentPrice || i.buyPrice), 0);
  const totalGain     = totalValue - totalInvested;

  // Digi Gold investments
  const digiGoldInvs = investments.filter((i) => i.type === 'digi-gold');
  const digiGoldGrams = digiGoldInvs.reduce((s, i) => s + i.units, 0);
  const digiGoldValue = digiGoldInvs.reduce((s, i) => s + i.units * (i.currentPrice || i.buyPrice), 0);
  const digiGoldCost  = digiGoldInvs.reduce((s, i) => s + i.units * i.buyPrice, 0);

  const pieData = investments.reduce((acc, inv) => {
    const existing = acc.find((a) => a.name === inv.type);
    const val = inv.units * (inv.currentPrice || inv.buyPrice);
    if (existing) existing.value += val;
    else acc.push({ name: inv.type, value: val });
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investments"
        subtitle="Track your portfolio growth"
        action={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Investment</button>}
      />

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Invested', value: formatCurrency(totalInvested, user?.currency), color: 'text-indigo-600' },
          { label: 'Current Value',  value: formatCurrency(totalValue, user?.currency),    color: 'text-blue-600' },
          { label: `Total ${totalGain >= 0 ? 'Gain' : 'Loss'}`, value: formatCurrency(totalGain, user?.currency), color: totalGain >= 0 ? 'text-emerald-600' : 'text-red-500' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="card p-5">
            <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide font-semibold">{s.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Digi Gold highlight card */}
      {digiGoldInvs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 border border-amber-200 dark:border-amber-800"
          style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', boxShadow: '0 4px 20px rgba(245,158,11,.12)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 4px 12px rgba(245,158,11,.35)' }}>
                🪙
              </div>
              <div>
                <p className="font-bold text-amber-900 text-base">Digi Gold Holdings</p>
                <p className="text-sm text-amber-700">{digiGoldGrams.toFixed(4)} grams across {digiGoldInvs.length} holding{digiGoldInvs.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-amber-900">{formatCurrency(digiGoldValue, user?.currency)}</p>
              <p className={`text-sm font-semibold ${digiGoldValue - digiGoldCost >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {digiGoldValue - digiGoldCost >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(digiGoldValue - digiGoldCost), user?.currency)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {digiGoldInvs.map((inv) => (
              <button
                key={inv._id}
                onClick={() => setHistoryInv(inv)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/70 hover:bg-white rounded-xl text-xs font-semibold text-amber-800 transition-all border border-amber-200"
              >
                <History size={12} /> {inv.name} · {inv.units}g · {formatCurrency(inv.currentPrice, user?.currency)}/g
              </button>
            ))}
            {digiGoldInvs.length > 0 && (
              <button
                onClick={() => openQuickPrice(digiGoldInvs[0])}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 rounded-xl text-xs font-semibold text-white transition-all"
              >
                <RefreshCw size={12} /> Update Today's Price
              </button>
            )}
          </div>
        </motion.div>
      )}

      {investments.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Allocation pie */}
          <div className="card p-6 lg:col-span-1">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wide">Portfolio Allocation</h2>
            <ResponsiveContainer width="100%" height={175}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v, user?.currency)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {pieData.map((d, i) => {
                const meta = TYPE_META[d.name];
                return (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-600 dark:text-gray-400">{meta?.label || d.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">{((d.value / totalValue) * 100).toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Investment list */}
          <div className="lg:col-span-2 space-y-3">
            {/* Filter tabs */}
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterType === 'all' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500'}`}>All</button>
              {INVESTMENT_TYPES.map((t) => (
                investments.some((i) => i.type === t.value) ? (
                  <button key={t.value} onClick={() => setFilterType(t.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterType === t.value ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                    {TYPE_META[t.value]?.icon} {t.label}
                  </button>
                ) : null
              ))}
            </div>

            {filtered.map((inv, i) => {
              const meta = TYPE_META[inv.type] || TYPE_META.other;
              const invested = inv.units * inv.buyPrice;
              const current  = inv.units * (inv.currentPrice || inv.buyPrice);
              const gain     = current - invested;
              const gainPct  = invested > 0 ? ((gain / invested) * 100).toFixed(2) : '0.00';
              const isDigiGold = inv.type === 'digi-gold';

              return (
                <motion.div key={inv._id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="card p-4 group">
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 ${meta.bg} rounded-xl flex items-center justify-center text-lg shrink-0`}>
                      {meta.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{inv.name}</p>
                        {inv.symbol && <span className="text-xs font-mono text-gray-400">{inv.symbol}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                        <span>{isDigiGold ? `${inv.units}g` : `${inv.units} units`}</span>
                        <span>·</span>
                        <span>@ {formatCurrency(inv.buyPrice, user?.currency)}{isDigiGold ? '/g' : ''}</span>
                        {inv.platform && <><span>·</span><span>{inv.platform}</span></>}
                      </div>
                    </div>

                    {/* Values */}
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{formatCurrency(current, user?.currency)}</p>
                      <div className={`flex items-center gap-1 justify-end text-xs font-semibold ${gain >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {gain >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        <span>{gain >= 0 ? '+' : ''}{gainPct}%</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                      <button onClick={() => setHistoryInv(inv)} className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg" title={isDigiGold ? 'Log gold price' : 'Price history'}>
                        <History size={13} className="text-amber-500" />
                      </button>
                      <button onClick={() => openEdit(inv)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <Edit3 size={13} className="text-gray-400" />
                      </button>
                      <button onClick={() => setDeleteId(inv._id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (current / Math.max(current, invested)) * 100)}%` }}
                      transition={{ duration: 0.8, delay: i * 0.05 }}
                      className={`h-full rounded-full ${gain >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {!isLoading && investments.length === 0 && (
        <EmptyState
          icon={TrendingUp}
          title="No investments yet"
          description="Add stocks, crypto, mutual funds, Digi Gold and more to track your portfolio."
          action={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Investment</button>}
        />
      )}

      {/* Add / Edit modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editInv ? 'Edit Investment' : 'Add Investment'}>
        <InvestmentForm form={form} setForm={setForm} onSubmit={handleSubmit} isEdit={!!editInv} />
      </Modal>

      {/* Price history + daily tracker modal */}
      <Modal
        isOpen={!!historyInv}
        onClose={() => setHistoryInv(null)}
        title={historyInv?.type === 'digi-gold' ? `🪙 ${historyInv?.name} — Daily Tracker` : `📈 ${historyInv?.name} — Price History`}
        size="md"
      >
        {historyInv && (
          <PriceHistoryModal
            investment={historyInv}
            onClose={() => setHistoryInv(null)}
            onUpdatePrice={() => fetchInvestments()}
          />
        )}
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => { deleteInvestment(deleteId); setDeleteId(null); }}
        title="Delete Investment" message="Are you sure you want to delete this investment?" />

      {/* Quick Gold Price Update Mini Modal */}
      <AnimatePresence>
        {quickPrice.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setQuickPrice({ open: false, inv: null, price: '' })}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>🪙</div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Update Gold Price</h3>
                  <p className="text-xs text-gray-400">Today's rate per gram</p>
                </div>
              </div>
              <div className="mb-2">
                <label className="label">Current Value (₹)</label>
                <input
                  type="number" step="0.01" min="0"
                  className="input-field text-lg font-semibold"
                  placeholder="e.g. 520.00"
                  value={quickPrice.price}
                  onChange={(e) => setQuickPrice((p) => ({ ...p, price: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickPrice()}
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">
                  Previous value: {formatCurrency(quickPrice.inv?.currentPrice || quickPrice.inv?.buyPrice, user?.currency)}
                </p>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleQuickPrice} className="btn-primary flex-1">Save Price</button>
                <button onClick={() => setQuickPrice({ open: false, inv: null, price: '' })}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
