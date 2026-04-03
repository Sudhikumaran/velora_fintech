import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Loader2 } from 'lucide-react';
import { uploadAvatar } from '../../utils/cloudinaryStorage';

export default function AvatarUpload({ userId, currentAvatar, name, onUploaded }) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentAvatar || '');
  const [error, setError] = useState('');
  const inputRef = useRef();

  const initials = name ? name.trim().split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '?';

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    // Local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const url = await uploadAvatar(userId, file, setProgress);
      setPreview(url);
      onUploaded(url);
    } catch (err) {
      setError(err.message || 'Upload failed');
      setPreview(currentAvatar || '');
    } finally {
      setUploading(false);
      setProgress(0);
      e.target.value = '';
    }
  };

  return (
    <div className="flex items-center gap-5">
      {/* Avatar circle */}
      <div className="relative shrink-0">
        <div
          className="w-20 h-20 rounded-2xl overflow-hidden cursor-pointer border-2 border-gray-100 dark:border-gray-800 hover:border-indigo-400 transition-all"
          onClick={() => !uploading && inputRef.current.click()}
        >
          {preview ? (
            <img src={preview} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {initials}
            </div>
          )}
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all flex items-center justify-center opacity-0 hover:opacity-100 rounded-2xl">
            <Camera size={20} className="text-white" />
          </div>
        </div>

        {/* Progress ring */}
        <AnimatePresence>
          {uploading && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-2xl bg-black/50 flex flex-col items-center justify-center gap-1"
            >
              <Loader2 size={20} className="text-white animate-spin" />
              <span className="text-white text-xs font-bold">{progress}%</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <button
          type="button"
          onClick={() => inputRef.current.click()}
          disabled={uploading}
          className="btn-secondary text-sm"
        >
          <Camera size={14} />
          {uploading ? `Uploading ${progress}%…` : preview ? 'Change photo' : 'Upload photo'}
        </button>
        <p className="text-xs text-gray-400 mt-1.5">JPG, PNG, WEBP · Max 5 MB</p>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        {preview && !uploading && (
          <button
            type="button"
            onClick={() => { setPreview(''); onUploaded(''); }}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors mt-1 flex items-center gap-1"
          >
            <X size={11} /> Remove photo
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFile} />
    </div>
  );
}
