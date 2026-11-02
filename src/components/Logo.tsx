export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" width={size} height={size} className="shrink-0">
      <rect width="40" height="40" rx="12" fill="#13294B" />
      <g stroke="#F6B36B" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M20 5v3M9.4 9.4l2.1 2.1M30.6 9.4l-2.1 2.1M5 20h2.5M32.5 20H35" />
      </g>
      <path d="M10 21a10 10 0 0 1 20 0z" fill="#F28A2E" />
      <path d="M5 21h30" stroke="#F28A2E" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 27c2.3 0 2.3-2 4.7-2s2.3 2 4.6 2 2.3-2 4.7-2 2.3 2 4.6 2 2.3-2 4.7-2 2.3 2 4.7 2" stroke="#F6B36B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M9 32.5c2 0 2-1.7 4-1.7s2 1.7 4 1.7 2-1.7 4-1.7 2 1.7 4 1.7 2-1.7 4-1.7 2 1.7 4 1.7" stroke="#6F95C4" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5 whitespace-nowrap">
      <LogoMark />
      <span className="text-xl font-bold tracking-tight">
        Pi<span className="text-orange">-</span>Volunteers
      </span>
    </span>
  );
}
