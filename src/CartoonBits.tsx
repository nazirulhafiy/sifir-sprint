export function CartoonBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <Cloud className="cloud absolute -left-4 top-8 h-16 w-28 text-cream" />
      <Cloud className="cloud-slow absolute right-2 top-20 h-12 w-24 text-cream" />
      <Cloud className="cloud absolute left-1/3 top-4 h-10 w-20 text-cream/90" />
      <svg
        className="absolute -right-6 top-36 h-16 w-16 text-butter"
        viewBox="0 0 64 64"
        fill="currentColor"
      >
        <path
          stroke="#141414"
          strokeWidth="4"
          d="M32 8c7 0 10 8 10 14 8 0 12 6 12 12 0 10-8 16-22 16S10 44 10 34c0-6 4-12 12-12 0-6 3-14 10-14z"
        />
      </svg>
    </div>
  )
}

function Cloud({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 70" fill="currentColor">
      <path
        stroke="#141414"
        strokeWidth="5"
        strokeLinejoin="round"
        d="M28 52c-12 0-20-8-20-18 0-11 9-18 20-16 4-12 16-18 28-14 8-8 22-8 30 2 12-2 24 6 24 18 0 12-10 20-24 20H28z"
      />
    </svg>
  )
}
