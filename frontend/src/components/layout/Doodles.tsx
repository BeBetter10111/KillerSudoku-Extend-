const INK = '#3d2c2e';

function Sun({ className }: { className: string }) {
  const rays = Array.from({ length: 8 }, (_, index) => (index * Math.PI) / 4);
  return (
    <svg viewBox="0 0 48 48" className={className}>
      {rays.map((angle) => (
        <line
          key={angle}
          x1={24 + Math.cos(angle) * 14}
          y1={24 + Math.sin(angle) * 14}
          x2={24 + Math.cos(angle) * 20}
          y2={24 + Math.sin(angle) * 20}
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
      <circle cx="24" cy="24" r="10" fill="#fde68a" stroke={INK} strokeWidth="2" />
      <circle cx="20.5" cy="22" r="1.2" fill={INK} />
      <circle cx="27.5" cy="22" r="1.2" fill={INK} />
      <path d="M20 26.5 Q24 30 28 26.5" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Cloud({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 64 40" className={className}>
      <path
        d="M14 34 H50 A9 9 0 0 0 50 16 A12 12 0 0 0 28 10 A10 10 0 0 0 12 20 A7 7 0 0 0 14 34 Z"
        fill="#d8ecfb"
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Star({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className}>
      <path
        d="M16 3 L19.6 11.6 L28.8 12.3 L21.8 18.3 L24 27.3 L16 22.4 L8 27.3 L10.2 18.3 L3.2 12.3 L12.4 11.6 Z"
        fill="#fde68a"
        stroke={INK}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Flower({ className }: { className: string }) {
  const petals = Array.from({ length: 6 }, (_, index) => (index * Math.PI) / 3);
  return (
    <svg viewBox="0 0 32 32" className={className}>
      {petals.map((angle) => (
        <circle
          key={angle}
          cx={16 + Math.cos(angle) * 7}
          cy={16 + Math.sin(angle) * 7}
          r="4.6"
          fill="#ffffff"
          stroke={INK}
          strokeWidth="1.6"
        />
      ))}
      <circle cx="16" cy="16" r="4" fill="#f4c443" stroke={INK} strokeWidth="1.6" />
    </svg>
  );
}

function Heart({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className}>
      <path
        d="M16 27 C6 20 3.5 15 3.5 11 A6.5 6.5 0 0 1 16 8.5 A6.5 6.5 0 0 1 28.5 11 C28.5 15 26 20 16 27 Z"
        fill="#ffe4e9"
        stroke={INK}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Hand-drawn decorations pinned to the page margins. Purely decorative. */
export function Doodles() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden xl:block">
      <Sun className="absolute left-6 top-24 h-12 w-12" />
      <Cloud className="absolute right-8 top-24 h-12 w-[4.5rem]" />
      <Star className="absolute left-12 top-[42%] h-7 w-7 -rotate-12" />
      <Flower className="absolute right-12 top-[52%] h-8 w-8" />
      <Cloud className="absolute bottom-8 left-6 h-10 w-16" />
      <Heart className="absolute bottom-16 right-10 h-8 w-8 rotate-12" />
    </div>
  );
}
