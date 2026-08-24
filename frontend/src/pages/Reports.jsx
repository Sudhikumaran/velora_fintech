import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, localeForCurrency } from '../utils/formatters';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function Reports() {
  const { user } = useAuthStore();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/analytics/monthly-report', { params: { month, year } });
        setReport(data.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [month, year]);

  return (
    <div className="space-y-5 print:space-y-3">
      <PageHeader
        title="Monthly report"
        subtitle="Print or save as PDF from your browser"
        action={
          <button onClick={() => window.print()} className="btn-primary print:hidden">
            <Printer size={16} /> Print / PDF
          </button>
        }
      />

      <div className="card p-4 flex flex-wrap gap-3 print:hidden">
        <select className="input-field w-40" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{new Date(2026, i, 1).toLocaleString(localeForCurrency(user?.currency), { month: 'long' })}</option>
          ))}
        </select>
        <input type="number" className="input-field w-28" value={year} onChange={(e) => setYear(Number(e.target.value))} />
      </div>

      {loading || !report ? <div className="card"><LoadingSpinner center /></div> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Income', value: report.income, color: 'text-emerald-600' },
              { label: 'Expenses', value: report.expense, color: 'text-red-600' },
              { label: 'Net', value: report.net, color: report.net >= 0 ? 'text-indigo-600' : 'text-red-600' },
              { label: 'Savings rate', value: report.savingsRate, pct: true },
            ].map((s) => (
              <div key={s.label} className="card p-4">
                <p className="text-xs text-gray-400 uppercase font-semibold">{s.label}</p>
                <p className={`text-xl font-bold mt-1 ${s.color || ''}`}>
                  {s.pct ? `${Number(s.value || 0).toFixed(0)}%` : formatCurrency(s.value, user?.currency)}
                </p>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 font-semibold">Spending by category</div>
            <table className="w-full text-sm">
              <tbody>
                {(report.categories || []).map((c) => (
                  <tr key={c.name} className="border-t border-gray-50 dark:border-gray-800">
                    <td className="px-5 py-2.5">{c.name}</td>
                    <td className="px-5 py-2.5 text-right font-semibold">{formatCurrency(c.total, user?.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
