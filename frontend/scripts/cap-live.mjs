import { spawn } from 'child_process';
import os from 'os';

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

console.log(`Syncing Android to live-reload ${url}`);
console.log('Keep `npm run dev` running. Phone and PC must be on the same Wi‑Fi.');
console.log('Rebuild the debug APK once after this sync.');

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['cap', 'sync', 'android'],
  {
    stdio: 'inherit',
    env: { ...process.env, CAPACITOR_LIVE_RELOAD_URL: url },
    shell: process.platform === 'win32',
  }
);

child.on('exit', (code) => process.exit(code ?? 1));
