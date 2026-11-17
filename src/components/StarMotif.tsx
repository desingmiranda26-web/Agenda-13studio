interface StarProps {
  className?: string;
}

export function FourPointStar({ className = 'w-5 h-5' }: StarProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 0L14.85 9.15L24 12L14.85 14.85L12 24L9.15 14.85L0 12L9.15 9.15L12 0Z" />
    </svg>
  );
}
