export default function BrandMark({ className = 'w-8 h-8', rounded = 'rounded-xl' }) {
  return (
    <img
      src="/velora-icon.png"
      alt="Velora"
      className={`${className} ${rounded} object-cover shrink-0`}
    />
  );
}
