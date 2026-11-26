import { Eraser, Pencil } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo } from 'react';
import { submitCell } from '../../services/socketClient';
import { useGameStore } from '../../store/useGameStore';
import { CageOverlay } from './CageOverlay';
import { Cell, type CellHighlight } from './Cell';

const GRID_SIZE = 9;
const BOX_SIZE = 3;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const ARROW_STEPS: Record<string, readonly [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

function enterDigit(value: number): void {
  const { selectedCell, grid, gameStatus, notesMode, toggleNoteNumber } = useGameStore.getState();
  if (gameStatus !== 'PLAYING' || selectedCell === null) {
    return;
  }
  const cell = grid[selectedCell.row]?.[selectedCell.col];
  if (!cell || cell.given || cell.solved) {
    return;
  }
  if (notesMode) {
    if (cell.currentValue === 0) {
      toggleNoteNumber(value);
    }
  } else if (cell.currentValue !== value) {
    submitCell(selectedCell.row, selectedCell.col, value);
  }
}

function moveSelection(deltaRow: number, deltaCol: number): void {
  const { selectedCell, selectCell } = useGameStore.getState();
  if (selectedCell === null) {
    selectCell({ row: 0, col: 0 });
    return;
  }
  selectCell({
    row: Math.min(GRID_SIZE - 1, Math.max(0, selectedCell.row + deltaRow)),
    col: Math.min(GRID_SIZE - 1, Math.max(0, selectedCell.col + deltaCol)),
  });
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.ctrlKey || event.metaKey || event.altKey || isEditableTarget(event.target)) {
    return;
  }
  const store = useGameStore.getState();
  if (store.grid.length === 0) {
    return;
  }
  const step = ARROW_STEPS[event.key];
  if (step) {
    moveSelection(step[0], step[1]);
  } else if (/^[1-9]$/.test(event.key)) {
    enterDigit(Number(event.key));
  } else if (event.key === 'Backspace' || event.key === 'Delete') {
    store.clearNotes();
  } else if (event.key === 'n' || event.key === 'N') {
    store.toggleNotesMode();
  } else {
    return;
  }
  event.preventDefault();
}

function highlightFor(row: number, col: number, value: number, selected: { row: number; col: number } | null, selectedValue: number): CellHighlight {
  if (selected === null) {
    return 'none';
  }
  if (selected.row === row && selected.col === col) {
    return 'selected';
  }
  if (selectedValue !== 0 && value === selectedValue) {
    return 'same';
  }
  const sameBox =
    Math.floor(row / BOX_SIZE) === Math.floor(selected.row / BOX_SIZE) &&
    Math.floor(col / BOX_SIZE) === Math.floor(selected.col / BOX_SIZE);
  return selected.row === row || selected.col === col || sameBox ? 'peer' : 'none';
}

function Numpad() {
  const grid = useGameStore((state) => state.grid);
  const notesMode = useGameStore((state) => state.notesMode);
  const toggleNotesMode = useGameStore((state) => state.toggleNotesMode);
  const clearNotes = useGameStore((state) => state.clearNotes);

  const placedCounts = useMemo(() => {
    const counts = new Array<number>(GRID_SIZE + 1).fill(0);
    for (const line of grid) {
      for (const cell of line) {
        if (cell.given || cell.solved) {
          counts[cell.currentValue] += 1;
        }
      }
    }
    return counts;
  }, [grid]);

  return (
    <div className="flex flex-col gap-2.5" data-testid="numpad">
      <div className="grid grid-cols-9 gap-1.5 sm:gap-2 lg:grid-cols-3 lg:gap-2.5">
        {DIGITS.map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={placedCounts[digit] >= GRID_SIZE}
            onClick={() => enterDigit(digit)}
            className={`sketch-btn aspect-[3/4] px-0 py-0 text-2xl font-normal disabled:opacity-30 sm:text-3xl lg:aspect-auto lg:h-14 ${
              notesMode ? 'bg-sunny-100 hover:bg-sunny-300' : ''
            }`}
          >
            {digit}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={notesMode}
          onClick={toggleNotesMode}
          className={`sketch-btn px-3 py-2 font-normal ${notesMode ? 'bg-sunny-300 hover:bg-sunny-300' : ''}`}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Notes {notesMode ? 'ON' : 'OFF'}
        </button>
        <button
          type="button"
          onClick={clearNotes}
          className="sketch-btn px-3 py-2 font-normal"
        >
          <Eraser className="h-4 w-4" aria-hidden="true" />
          Erase notes
        </button>
      </div>
    </div>
  );
}

interface SudokuBoardProps {
  className?: string;
  /** Extra content shown under the number pad (e.g. the algorithm panel). */
  aside?: ReactNode;
}

export function SudokuBoard({ className = '', aside }: SudokuBoardProps) {
  const grid = useGameStore((state) => state.grid);
  const selectedCell = useGameStore((state) => state.selectedCell);
  const notes = useGameStore((state) => state.notes);
  const lastErrorCell = useGameStore((state) => state.lastErrorCell);
  const botPosition = useGameStore((state) => state.botPosition);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = useCallback((row: number, col: number) => {
    useGameStore.getState().selectCell({ row, col });
  }, []);

  if (grid.length === 0) {
    return null;
  }

  const selectedValue = selectedCell ? grid[selectedCell.row][selectedCell.col].currentValue : 0;

  return (
    <div className={`flex w-full flex-col items-center gap-5 lg:flex-row lg:items-start lg:justify-center ${className}`}>
      <div
        role="group"
        aria-label="Killer Sudoku board"
        className="relative aspect-square w-full max-w-[560px] touch-manipulation overflow-hidden rounded-2xl border-[3px] border-ink bg-white shadow-sketch-lg"
      >
        <div className="grid h-full w-full grid-cols-9 grid-rows-9">
          {grid.map((line) =>
            line.map((cell) => {
              const isErrorCell =
                lastErrorCell !== null && lastErrorCell.row === cell.row && lastErrorCell.col === cell.col;
              return (
                <Cell
                  key={`${cell.row}-${cell.col}`}
                  row={cell.row}
                  col={cell.col}
                  value={cell.currentValue}
                  given={cell.given}
                  wrong={cell.currentValue !== 0 && !cell.given && !cell.solved}
                  notes={notes[`${cell.row},${cell.col}`]}
                  highlight={highlightFor(cell.row, cell.col, cell.currentValue, selectedCell, selectedValue)}
                  highlightValue={selectedValue}
                  errorSignal={isErrorCell ? lastErrorCell : null}
                  isBot={botPosition !== null && botPosition.row === cell.row && botPosition.col === cell.col}
                  onSelect={handleSelect}
                />
              );
            }),
          )}
        </div>
        <CageOverlay />
      </div>
      <div className="flex w-full max-w-[560px] flex-col gap-5 lg:w-80 lg:shrink-0">
        <Numpad />
        {aside}
      </div>
    </div>
  );
}
