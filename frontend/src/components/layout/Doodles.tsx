const INK = '#432E2A';

function Sun({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round">
      <circle cx="32" cy="32" r="12" fill="#FCE68A" />
      <path d="M27 30h.01M37 30h.01" strokeWidth={3.5} />
      <path d="M27 36q5 4 10 0" />
      <path d="M32 6v8M32 50v8M6 32h8M50 32h8M13.6 13.6l5.6 5.6M44.8 44.8l5.6 5.6M13.6 50.4l5.6-5.6M44.8 19.2l5.6-5.6" />
    </svg>
  );
}

function Star({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} stroke={INK} strokeWidth={2} strokeLinejoin="round">
      <path d="M16 3l3.8 8 8.7 1-6.4 6 1.7 8.6L16 22.3 8.2 26.6 9.9 18 3.5 12l8.7-1z" fill="#FCE68A" />
    </svg>
  );
}

function Cloud({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 80 44" className={className} stroke={INK} strokeWidth={2.25} strokeLinejoin="round">
      <path
        d="M18 38h46a12 12 0 0 0 0-24 16 16 0 0 0-30-4A11 11 0 0 0 18 18a10 10 0 0 0 0 20z"
        fill="#D6EEFF"
      />
    </svg>
  );
}

function Flower({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} stroke={INK} strokeWidth={2}>
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <ellipse key={angle} cx="20" cy="10" rx="5.5" ry="7.5" fill="#FFFFFF" transform={`rotate(${angle} 20 20)`} />
      ))}
      <circle cx="20" cy="20" r="5" fill="#FCE68A" />
    </svg>
  );
}

/** Decorative hand-drawn doodles in the page margins (wide screens only). */
export function Doodles() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden xl:block">
      <Sun className="absolute left-8 top-24 h-14 w-14 animate-float motion-reduce:animate-none" />
      <Star className="absolute left-12 top-60 h-7 w-7" />
      <Cloud className="absolute right-10 top-28 h-12 w-20 animate-float motion-reduce:animate-none [animation-delay:1.5s]" />
      <Flower className="absolute right-14 top-[55%] h-9 w-9" />
      <Cloud className="absolute bottom-10 left-8 h-10 w-16" />
      <Star className="absolute bottom-24 right-24 h-5 w-5" />
    </div>
  );
}
