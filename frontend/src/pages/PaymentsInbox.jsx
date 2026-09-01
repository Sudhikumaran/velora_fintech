import { Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePaymentReviewStore } from '../store/paymentReviewStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/formatters';
import { skipAllWaitingPayments } from '../utils/paymentCapture';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import VoiceAddButton from '../components/ui/VoiceAddButton';

export default function PaymentsInbox() {
  const navigate = useNavigate();
  const { queue, openAt } = usePaymentReviewStore();
  const currency = useAuthStore((s) => s.user?.currency || 'INR');

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader
        title="Waiting payments"
        subtitle={queue.length ? `${queue.length} payment${queue.length === 1 ? '' : 's'} to add` : 'Nothing waiting'}
        action={<VoiceAddButton />}
      />

      {!queue.length ? (
        <EmptyState
          icon={Inbox}
          title="No payments waiting"
          description="When you pay by UPI or bank, they show up here so you can pick a category and save."
        />
      ) : (
        <>
          <div className="flex justify-end">
            <button type="button" className="text-sm text-gray-500" onClick={() => skipAllWaitingPayments()}>
              Skip all
            </button>
          </div>
          <div className="space-y-2">
            {queue.map((item) => (
              <button
                key={item.sourceId}
                type="button"
                onClick={() => openAt(item.sourceId)}
                className="card w-full text-left p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{item.description || 'Payment'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.merchant ? `${item.merchant} · ` : ''}
                      {item.rememberedCategory || item.suggestedCategory || 'Pick a category'}
                      {item.type === 'transfer' ? ' · transfer' : ''}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white shrink-0">
                    {formatCurrency(item.amount, currency)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <button type="button" className="btn-secondary" onClick={() => navigate('/transactions')}>
        Go to transactions
      </button>
    </div>
  );
}
