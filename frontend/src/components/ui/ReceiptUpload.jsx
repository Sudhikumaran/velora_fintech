import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, X, Eye, Loader2, FileText } from 'lucide-react';
import { uploadReceipt, deleteFile } from '../../utils/cloudinaryStorage';
import { useAuthStore } from '../../store/authStore';

export default function ReceiptUpload({ transactionId, currentUrl, onUploaded }) {
  const { user } = useAuthStore();
  const [url, setUrl] = useState(currentUrl || '');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef();

  const isPdf = url?.toLowerCase().includes('.pdf') || url?.includes('%2F') && url?.includes('.pdf');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const txId = transactionId || `temp-${Date.now()}`;
      const downloadUrl = await uploadReceipt(user._id, txId, file, setProgress);
      setUrl(downloadUrl);
      onUploaded?.(downloadUrl);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
      e.target.value = '';
    }
  };

  const handleRemove = async () => {
    if (url) await deleteFile(url);
    setUrl('');
    onUploaded?.('');
  };

  return (
    <div>
      <label className="label">Receipt / Attachment</label>

      {url ? (
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0">
            {isPdf ? <FileText size={16} className="text-indigo-500" /> : (
              <img src={url} alt="receipt" className="w-full h-full object-cover rounded-xl" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">Receipt attached</p>
            <p className="text-xs text-gray-400">{isPdf ? 'PDF document' : 'Image'}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors" title="View">
              <Eye size={14} className="text-gray-400" />
            </a>
            <button type="button" onClick={handleRemove}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Remove">
              <X size={14} className="text-red-400" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400 hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-600 transition-all"
        >
          {uploading ? (
            <><Loader2 size={15} className="animate-spin" /> Uploading {progress}%…</>
          ) : (
            <><Paperclip size={15} /> Attach receipt or document</>
          )}
        </button>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF · Max 5 MB</p>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleFile} />
    </div>
  );
}
