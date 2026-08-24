const CRYPTO_IDS = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', DOGE: 'dogecoin',
  ADA: 'cardano', XRP: 'ripple', MATIC: 'matic-network', BNB: 'binancecoin',
  USDT: 'tether', USDC: 'usd-coin', DOT: 'polkadot', AVAX: 'avalanche-2',
};

async function yahooPrice(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Velora' } });
  if (!res.ok) return null;
  const json = await res.json();
  const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
  return Number.isFinite(price) ? price : null;
}

async function coingeckoPrice(symbol) {
  const id = CRYPTO_IDS[String(symbol).toUpperCase()];
  if (!id) return yahooPrice(`${symbol}-USD`);
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd,inr`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  return json?.[id]?.usd ?? json?.[id]?.inr ?? null;
}

export async function quoteInvestment(investment) {
  const symbol = (investment.symbol || '').trim();
  if (!symbol) return null;
  try {
    if (investment.type === 'crypto') return await coingeckoPrice(symbol);
    const yahooSymbol = symbol.includes('.') ? symbol : symbol;
    return await yahooPrice(yahooSymbol);
  } catch {
    return null;
  }
}
