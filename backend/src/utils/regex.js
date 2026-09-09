/** Escape user input before it is used inside a MongoDB $regex filter. */
export function escapeRegex(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
