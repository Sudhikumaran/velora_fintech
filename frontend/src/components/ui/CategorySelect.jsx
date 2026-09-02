import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';

export default function CategorySelect({
  value,
  onChange,
  categories = [],
  placeholder = 'Select category',
  allowCreate = true,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [newName, setNewName] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  const filtered = categories.filter((c) => c.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    const t = setTimeout(() => searchRef.current?.focus(), 30);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      clearTimeout(t);
    };
  }, [open]);

  const pick = (name) => {
    onChange(name);
    setOpen(false);
    setQuery('');
    setNewName('');
  };

  const create = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setOpen(false);
    setQuery('');
    setNewName('');
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input-field w-full text-left flex items-center justify-between gap-2"
      >
        <span className={`truncate ${value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
          {value || placeholder}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-800">
            <input
              ref={searchRef}
              className="input-field"
              placeholder="Search categories"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-44 overflow-y-auto overscroll-contain py-1">
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-400">No matching category</p>
            )}
            {filtered.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => pick(c)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  value === c ? 'text-indigo-600 font-medium bg-indigo-50/70 dark:bg-indigo-900/20' : 'text-gray-800 dark:text-gray-100'
                }`}
              >
                <span className="truncate">{c}</span>
                {value === c && <Check size={14} className="shrink-0" />}
              </button>
            ))}
          </div>
          {allowCreate && (
            <div className="p-2 border-t border-gray-100 dark:border-gray-800 flex gap-2">
              <input
                className="input-field flex-1 min-w-0"
                placeholder="New category"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), create())}
              />
              <button type="button" onClick={create} className="btn-secondary px-3 shrink-0" disabled={!newName.trim()}>
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
