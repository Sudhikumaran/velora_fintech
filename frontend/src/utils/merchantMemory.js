import PaymentCapture from '../plugins/paymentCapture';
import { isNativeApp } from './native';

const KEY = 'velora_merchant_cats';

export function merchantKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/paid to |received from |bank payment|upi payment/gi, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 40);
}

export function getMerchantMemory() {
  try {
    const map = JSON.parse(localStorage.getItem(KEY) || '{}');
    return map && typeof map === 'object' ? map : {};
  } catch {
    return {};
  }
}

export function recallMerchantCategory(merchant) {
  const key = merchantKey(merchant);
  if (!key) return '';
  const map = getMerchantMemory();
  if (map[key]) return map[key];
  const hit = Object.keys(map).find((k) => k.length >= 3 && (key.includes(k) || k.includes(key)));
  return hit ? map[hit] : '';
}

export async function rememberMerchantCategory(merchant, category) {
  const key = merchantKey(merchant);
  if (!key || !category || category === 'Transfer') return;
  const map = getMerchantMemory();
  map[key] = category;
  localStorage.setItem(KEY, JSON.stringify(map));
  await syncMerchantMemory(map);
}

export async function syncMerchantMemory(map = getMerchantMemory()) {
  if (!isNativeApp()) return;
  try { await PaymentCapture.setMerchantMemory({ map }); } catch { /* old APK */ }
}
