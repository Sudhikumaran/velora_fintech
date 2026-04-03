const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const MAX_SIZE_MB   = 5;

function validateFile(file, allowed) {
  if (allowed && !allowed.includes(file.type)) {
    throw new Error(`File type not allowed. Accepted: ${allowed.join(', ')}`);
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`File too large. Max size is ${MAX_SIZE_MB} MB.`);
  }
}

/**
 * Upload a file to Cloudinary using an unsigned upload preset.
 * @param {File}     file       - The file to upload
 * @param {string}   folder     - Cloudinary folder e.g. "velora/avatars"
 * @param {string[]} allowed    - Allowed MIME types
 * @param {Function} onProgress - Optional (percent: number) => void
 * @returns {Promise<string>}   - Secure URL of uploaded file
 */
export async function uploadToCloudinary(file, folder, allowed, onProgress) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env file.');
  }
  validateFile(file, allowed);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText);
        resolve(res.secure_url);
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.send(formData);
  });
}

/** Upload user profile avatar */
export async function uploadAvatar(userId, file, onProgress) {
  return uploadToCloudinary(
    file,
    `velora/avatars/${userId}`,
    ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    onProgress
  );
}

/** Upload transaction receipt (image or PDF) */
export async function uploadReceipt(userId, transactionId, file, onProgress) {
  return uploadToCloudinary(
    file,
    `velora/receipts/${userId}`,
    ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    onProgress
  );
}

/** No-op delete — Cloudinary free plan doesn't support delete via unsigned preset */
export async function deleteFile(_url) {
  // Deletion requires a signed API call (backend). Safe to skip on free plan.
}
