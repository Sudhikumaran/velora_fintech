import {
  Utensils, Car, ShoppingBag, ShoppingCart, Film, Heart, Home, Zap,
  GraduationCap, Plane, Sparkles, Gift, Shield, Landmark, RefreshCw,
  PawPrint, Briefcase, Users, Circle, Wallet, Laptop, TrendingUp,
  PiggyBank, Percent, Award, RotateCcw, ArrowLeftRight, CalendarClock,
  FileText, Building2,
} from 'lucide-react';
import { CATEGORY_COLORS } from './constants';

// A glyph per category so a long list can be scanned by shape instead of read
// word by word. Keys are matched case-insensitively against the stored label.
const ICONS = {
  'food & dining': Utensils,
  'food': Utensils,
  'groceries': ShoppingCart,
  'transportation': Car,
  'transport': Car,
  'shopping': ShoppingBag,
  'entertainment': Film,
  'healthcare': Heart,
  'health': Heart,
  'housing': Home,
  'rent': Home,
  'rental income': Building2,
  'utilities': Zap,
  'bills': FileText,
  'education': GraduationCap,
  'travel': Plane,
  'personal care': Sparkles,
  'gifts & donations': Gift,
  'gift': Gift,
  'insurance': Shield,
  'taxes': Landmark,
  'subscriptions': RefreshCw,
  'pets': PawPrint,
  'business': Briefcase,
  'home / family': Users,
  'family': Users,
  'salary': Wallet,
  'freelance': Laptop,
  'investment': TrendingUp,
  'investment returns': TrendingUp,
  'dividends': PiggyBank,
  'savings': PiggyBank,
  'interest': Percent,
  'bonus': Award,
  'refund': RotateCcw,
  'transfer': ArrowLeftRight,
  'emi': CalendarClock,
  'other': Circle,
};

// Stable per-category fallback colour so unknown categories still get a
// consistent tint instead of defaulting to grey.
const FALLBACK_COLORS = [
  '#0d9488', '#0f766e', '#ec4899', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
];

function hashIndex(text, buckets) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 100000;
  }
  return hash % buckets;
}

const ICON_BY_TYPE = {
  income: TrendingUp,
  expense: Circle,
  transfer: ArrowLeftRight,
};

export function getCategoryVisual(category, type = 'expense') {
  const key = String(category || '').trim().toLowerCase();

  if (type === 'transfer') {
    return { Icon: ICON_BY_TYPE.transfer, color: '#0d9488' };
  }

  // Guard against an icon name that a future lucide version drops: an
  // undefined component would crash the whole list rather than one row.
  const Icon = ICONS[key] || ICON_BY_TYPE[type] || Circle;
  if (typeof Icon !== 'function' && typeof Icon !== 'object') {
    return { Icon: Circle, color: CATEGORY_COLORS[category] || '#94a3b8' };
  }
  const color = CATEGORY_COLORS[category]
    || (key ? FALLBACK_COLORS[hashIndex(key, FALLBACK_COLORS.length)] : '#94a3b8');

  return { Icon, color };
}

/** Inline style for a tinted icon tile, kept subtle in both themes. */
export function categoryTileStyle(color) {
  return {
    color,
    backgroundColor: `${color}1a`,
  };
}
