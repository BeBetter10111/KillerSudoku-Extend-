import { Grid3x3 } from 'lucide-react';
import type { ReactNode } from 'react';

export function navItemClass(active: boolean): string {
  return `rounded-md px-1 pb-1 text-lg transition-colors sm:text-xl ${
    active ? 'squiggle font-bold text-ink' : 'text-muted hover:text-ink'
  }`;
}

/** `asHeading` renders the title as the page h1 (dashboard); the arena uses plain text. */
export function TopNav({ children, asHeading = true }: { children?: ReactNode; asHeading?: boolean }) {
  const Title = asHeading ? 'h1' : 'p';
  return (
    <header className="sticky top-0 z-30 w-full border-b-2 border-dashed border-lavender bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Title className="flex items-center gap-2 font-display text-2xl font-bold uppercase tracking-wide text-ink sm:text-3xl">
          <Grid3x3 className="h-6 w-6 shrink-0 text-ink" strokeWidth={2.25} aria-hidden="true" />
          Killer Sudoku
        </Title>
        {children}
      </div>
    </header>
  );
}
