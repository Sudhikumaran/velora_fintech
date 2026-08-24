export function parseReceiptText(text) {
  const clean = String(text || '').replace(/\s+/g, ' ');
  const amountMatch = clean.match(/(?:₹|rs\.?|inr|usd|\$)?\s*([0-9]{1,3}(?:,[0-9]{2,3})+(?:\.[0-9]{1,2})|[0-9]+\.[0-9]{2})/i);
  const dateMatch = clean.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
  let date = '';
  if (dateMatch) {
    const parts = dateMatch[1].split(/[/-]/);
    if (parts[2]?.length === 4) {
      date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return {
    amount: amountMatch ? amountMatch[1].replace(/,/g, '') : '',
    date,
    description: clean.slice(0, 80),
  };
}

export async function ocrReceipt(file) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(file);
    return parseReceiptText(data?.text || '');
  } finally {
    await worker.terminate();
  }
}
