import { Grid3x3 } from 'lucide-react';
import type { ReactNode } from 'react';

interface AppHeaderProps {
  /** Render the logo as the page heading (dashboard) or as plain text (in game). */
  logoAs?: 'h1' | 'span';
  children?: ReactNode;
}

export function AppHeader({ logoAs = 'span', children }: AppHeaderProps) {
  const Logo = logoAs;
  return (
    <header className="sticky top-0 z-30 border-b-2 border-dashed border-lilac-300 bg-white/90 shadow-[0_6px_18px_-12px_rgba(61,44,46,0.45)] backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Logo className="flex items-center gap-2 text-2xl font-normal uppercase tracking-wide text-ink sm:text-3xl">
          <Grid3x3 className="h-6 w-6 shrink-0 rounded-[5px] bg-blush-100 sm:h-7 sm:w-7" strokeWidth={2.25} aria-hidden="true" />
          Killer Sudoku
        </Logo>
        {children}
      </div>
    </header>
  );
}

export function navLinkClass(active: boolean): string {
  return `inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lilac-400 sm:text-xl ${
    active ? 'wavy-underline text-ink' : 'text-ink-soft hover:text-ink'
  }`;
}
