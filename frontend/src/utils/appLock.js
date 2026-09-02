const PIN_KEY = 'velora_app_pin';
const UNLOCK_KEY = 'velora_unlocked';

export async function hashPin(pin) {
  const data = new TextEncoder().encode(`velora-lock:${pin}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hasAppPin() {
  return Boolean(localStorage.getItem(PIN_KEY));
}

export function isAppUnlocked() {
  if (!hasAppPin()) return true;
  return sessionStorage.getItem(UNLOCK_KEY) === '1';
}

export async function setAppPin(pin) {
  const hash = await hashPin(pin);
  localStorage.setItem(PIN_KEY, hash);
  sessionStorage.setItem(UNLOCK_KEY, '1');
}

export function clearAppPin() {
  localStorage.removeItem(PIN_KEY);
  sessionStorage.removeItem(UNLOCK_KEY);
}

export async function unlockWithPin(pin) {
  const stored = localStorage.getItem(PIN_KEY);
  if (!stored) return true;
  const hash = await hashPin(pin);
  if (hash !== stored) return false;
  sessionStorage.setItem(UNLOCK_KEY, '1');
  return true;
}

export function lockApp() {
  sessionStorage.removeItem(UNLOCK_KEY);
}
