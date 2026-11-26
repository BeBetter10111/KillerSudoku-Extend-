import { Grid3x3 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface AppHeaderProps {
  /** Render the brand as the page's top-level heading (dashboard only). */
  asHeading?: boolean;
  /** Navigation or actions shown on the right side of the bar. */
  children?: ReactNode;
}

export function AppHeader({ asHeading = false, children }: AppHeaderProps) {
  const brand = (
    <>
      <Grid3x3 className="h-6 w-6 shrink-0 text-ink" strokeWidth={2.2} aria-hidden="true" />
      Killer Sudoku
    </>
  );
  const brandClass = 'flex items-center gap-2 text-2xl uppercase tracking-wide text-ink sm:text-3xl';

  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        {asHeading ? <h1 className={brandClass}>{brand}</h1> : <span className={brandClass}>{brand}</span>}
        {children}
      </div>
    </header>
  );
}

/** Tab-style navigation link with a wavy underline when active. */
export function NavTab({
  active,
  children,
  ...props
}: { active: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`relative flex items-center gap-1.5 px-1 py-1 text-lg transition-colors ${
        active ? 'text-ink' : 'text-muted hover:text-ink'
      }`}
    >
      {children}
      {active && (
        <svg
          aria-hidden="true"
          viewBox="0 0 60 6"
          preserveAspectRatio="none"
          className="absolute -bottom-1 left-0 h-1.5 w-full text-cage"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <path d="M1 3 Q8 0 15 3 T30 3 T45 3 T59 3" />
        </svg>
      )}
    </button>
  );
}
