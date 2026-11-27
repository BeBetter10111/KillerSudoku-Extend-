import { Cloud, Flower2, Grid3x3, Star, Sun } from 'lucide-react';
import type { ReactNode } from 'react';

export type NavKey = 'play' | 'dashboard' | 'benchmark';

export const NAV_ITEMS: ReadonlyArray<{ value: NavKey; title: string }> = [
  { value: 'play', title: 'Play' },
  { value: 'dashboard', title: 'Dashboard' },
  { value: 'benchmark', title: 'Benchmark Lab' },
];

interface TopNavProps {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  /** Render the links as ARIA tabs controlling `panel-<key>` (dashboard screen). */
  asTabs?: boolean;
}

export function TopNav({ active, onNavigate, asTabs = false }: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-dashed border-cage-purple/60 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:py-4">
        <h1 className="flex items-center gap-2 whitespace-nowrap font-hand text-xl uppercase tracking-wide text-ink sm:text-3xl">
          <Grid3x3 className="h-6 w-6 shrink-0 rounded-sm bg-dusty-rose/70 text-ink" strokeWidth={2.2} aria-hidden="true" />
          Killer Sudoku
        </h1>
        <nav
          role={asTabs ? 'tablist' : undefined}
          aria-label="Main sections"
          className="flex items-center gap-2.5 font-hand text-sm sm:gap-6 sm:text-xl"
        >
          {NAV_ITEMS.map(({ value, title }) => {
            const selected = active === value;
            return (
              <button
                key={value}
                type="button"
                role={asTabs ? 'tab' : undefined}
                id={asTabs ? `tab-${value}` : undefined}
                aria-selected={asTabs ? selected : undefined}
                aria-controls={asTabs ? `panel-${value}` : undefined}
                aria-current={!asTabs && selected ? 'page' : undefined}
                onClick={() => onNavigate(value)}
                className={`whitespace-nowrap transition-colors ${
                  selected ? 'nav-active text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {title}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

/** Hand-drawn decorations scattered in the page margins (wide screens only). */
export function Doodles() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-0 hidden xl:block">
      <Sun className="absolute left-8 top-28 h-10 w-10 fill-doodle-yellow text-ink" strokeWidth={1.5} />
      <Star className="absolute left-12 top-72 h-6 w-6 fill-doodle-yellow text-ink" strokeWidth={1.5} />
      <Cloud className="absolute right-10 top-28 h-12 w-12 fill-doodle-sky text-ink" strokeWidth={1.2} />
      <Flower2 className="absolute right-12 top-[55%] h-7 w-7 fill-white text-ink" strokeWidth={1.5} />
      <Cloud className="absolute bottom-10 left-8 h-12 w-12 fill-doodle-sky text-ink" strokeWidth={1.2} />
    </div>
  );
}

export function PageShell({
  active,
  onNavigate,
  asTabs,
  tone = 'white',
  children,
}: TopNavProps & { tone?: 'white' | 'blush'; children: ReactNode }) {
  return (
    <div className={`relative min-h-screen font-doodle text-ink ${tone === 'blush' ? 'bg-pale-blush' : 'bg-white'}`}>
      <TopNav active={active} onNavigate={onNavigate} asTabs={asTabs} />
      <Doodles />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
