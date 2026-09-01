import { Mic } from 'lucide-react';
import toast from 'react-hot-toast';
import PaymentCapture from '../../plugins/paymentCapture';
import { isNativeApp } from '../../utils/native';
import { parseVoiceExpense } from '../../utils/voiceParse';
import { queueForReview, getAutoPayAccountId } from '../../utils/paymentCapture';

export default function VoiceAddButton({ className = 'btn-secondary' }) {
  const listen = async () => {
    let text = '';
    try {
      if (isNativeApp()) {
        const result = await PaymentCapture.startVoiceInput();
        text = result?.text || '';
      } else if (window.SpeechRecognition || window.webkitSpeechRecognition) {
        text = await new Promise((resolve, reject) => {
          const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
          const rec = new Rec();
          rec.lang = 'en-IN';
          rec.onresult = (ev) => resolve(ev.results[0][0].transcript);
          rec.onerror = () => reject(new Error('voice'));
          rec.start();
        });
      } else {
        toast.error('Voice input needs the Android app');
        return;
      }
    } catch {
      toast.error('Could not hear that. Try again.');
      return;
    }

    const parsed = parseVoiceExpense(text);
    if (!parsed) {
      toast.error(`Could not find an amount in “${text || '…'}”`);
      return;
    }

    const sourceId = `pay:voice|${parsed.amount.toFixed(2)}|${parsed.description.toLowerCase().slice(0, 40)}|${new Date().toISOString().slice(0, 10)}|${Date.now()}`;
    queueForReview({
      id: sourceId,
      sourceId,
      type: 'expense',
      amount: parsed.amount,
      merchant: parsed.merchant,
      category: parsed.category || 'Other',
      description: parsed.description,
      date: new Date().toISOString(),
      notes: `Voice: ${text}`,
      source: 'import',
      accountId: getAutoPayAccountId(),
    }, text, sourceId);
    toast.success('Check the amount, pick a category, and save');
  };

  return (
    <button type="button" className={className} onClick={listen}>
      <Mic size={15} /> Voice add
    </button>
  );
}
