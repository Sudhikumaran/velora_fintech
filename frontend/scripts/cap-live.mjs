import { writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

function lanIp() {
  const nets = os.networkInterfaces();
  for (const addrs of Object.values(nets)) {
    for (const net of addrs || []) {
      const family = net.family === 'IPv4' || net.family === 4;
      if (family && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

const ip = lanIp();
const url = `http://${ip}:5173`;
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.capacitor-live');
writeFileSync(file, url, 'utf8');

console.log(`Live reload URL written to frontend/.capacitor-live`);
console.log(`  ${url}`);
console.log('');
console.log('1. Keep the Vite server running:  npm run dev');
console.log('2. Sync + rebuild the debug APK once so it points at your PC.');
console.log('3. Phone and PC must be on the same Wi‑Fi.');
console.log('Delete frontend/.capacitor-live and rebuild to use the hosted site again.');
