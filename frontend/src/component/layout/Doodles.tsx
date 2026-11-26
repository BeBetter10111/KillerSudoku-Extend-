/**
 * Hand-drawn decorations floating in the page margins. Purely decorative:
 * hidden from assistive tech and from narrow screens where there is no margin.
 */

const STROKE = '#432E2A';

function Sun({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke={STROKE} strokeWidth={2.2} strokeLinecap="round">
      <circle cx="32" cy="32" r="13" fill="#FCE68A" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <line
            key={i}
            x1={32 + Math.cos(a) * 19}
            y1={32 + Math.sin(a) * 19}
            x2={32 + Math.cos(a) * 26}
            y2={32 + Math.sin(a) * 26}
          />
        );
      })}
      <circle cx="27" cy="30" r="1.2" fill={STROKE} />
      <circle cx="37" cy="30" r="1.2" fill={STROKE} />
      <path d="M26.5 35.5 Q32 40 37.5 35.5" />
    </svg>
  );
}

function Cloud({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 80 48" className={className} fill="#D6EEFF" stroke={STROKE} strokeWidth={2.2} strokeLinejoin="round">
      <path d="M18 40 Q6 40 7 30 Q8 21 18 22 Q20 10 33 10 Q45 10 48 20 Q52 14 60 17 Q68 20 67 28 Q75 29 74 35 Q73 40 66 40 Z" />
    </svg>
  );
}

function Star({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="#FCE68A" stroke={STROKE} strokeWidth={2} strokeLinejoin="round">
      <path d="M20 4 L24.5 15 L36 15.5 L27 23 L30 35 L20 28.5 L10 35 L13 23 L4 15.5 L15.5 15 Z" />
    </svg>
  );
}

function Flower({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} stroke={STROKE} strokeWidth={1.8}>
      {Array.from({ length: 6 }, (_, i) => (
        <ellipse key={i} cx="20" cy="10" rx="5" ry="8" fill="#FFFFFF" transform={`rotate(${i * 60} 20 20)`} />
      ))}
      <circle cx="20" cy="20" r="4.5" fill="#FCE68A" />
    </svg>
  );
}

function Heart({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="#F3C4CB" stroke={STROKE} strokeWidth={2} strokeLinejoin="round">
      <path d="M20 33 C8 24 5 17 9 11.5 C13 7 18 9 20 13 C22 9 27 7 31 11.5 C35 17 32 24 20 33 Z" />
    </svg>
  );
}

export function Doodles() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden xl:block">
      <Sun className="absolute left-8 top-24 h-14 w-14" />
      <Star className="absolute left-16 top-72 h-7 w-7 -rotate-12" />
      <Heart className="absolute bottom-24 left-12 h-8 w-8 rotate-12" />
      <Cloud className="absolute right-10 top-28 h-12 w-20" />
      <Flower className="absolute right-16 top-1/2 h-9 w-9" />
      <Star className="absolute bottom-16 right-24 h-6 w-6 rotate-12" />
    </div>
  );
}
