// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { submitCell } from '../../services/socketClient';
import { useGameStore } from '../../store/useGameStore';
import { algorithmMetrics, boardState, emit, gridWith, revealedBot, startGame } from '../../test/fixtures';
import { SudokuBoard } from './SudokuBoard';

vi.mock('../../services/socketClient', () => ({ submitCell: vi.fn(() => true) }));

const cellAt = (row: number, col: number): HTMLElement =>
  document.querySelector(`button[data-row="${row}"][data-col="${col}"]`) as HTMLElement;

const press = (key: string): void => {
  act(() => {
    fireEvent.keyDown(window, { key });
  });
};

const select = (row: number, col: number): void => {
  act(() => {
    fireEvent.click(cellAt(row, col));
  });
};

beforeEach(() => {
  vi.mocked(submitCell).mockClear();
  useGameStore.getState().resetGame();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SudokuBoard', () => {
  it('renders nothing before a game starts and 81 labelled cells afterwards', () => {
    const { container } = render(<SudokuBoard />);
    expect(container.innerHTML).toBe('');

    startGame();
    expect(document.querySelectorAll('button[data-row]')).toHaveLength(81);
    expect(cellAt(0, 0).getAttribute('aria-label')).toBe('Row 1, column 1, 5, given');
    expect(cellAt(4, 4).getAttribute('aria-label')).toBe('Row 5, column 5, empty');
  });

  it('highlights the selection, its row/column/box peers and equal numbers', () => {
    render(<SudokuBoard />);
    startGame({ cells: gridWith({ '5,5': 7, '8,8': 7 }) });
    select(5, 5);

    expect(cellAt(5, 5).dataset.highlight).toBe('selected');
    expect(cellAt(5, 0).dataset.highlight).toBe('peer');
    expect(cellAt(0, 5).dataset.highlight).toBe('peer');
    expect(cellAt(3, 3).dataset.highlight).toBe('peer');
    expect(cellAt(8, 8).dataset.highlight).toBe('same');
    expect(cellAt(7, 1).dataset.highlight).toBe('none');
  });

  it('moves with the arrow keys and stays inside the grid', () => {
    render(<SudokuBoard />);
    startGame();
    press('ArrowDown');
    expect(useGameStore.getState().selectedCell).toEqual({ row: 0, col: 0 });
    press('ArrowRight');
    press('ArrowDown');
    press('ArrowUp');
    press('ArrowUp');
    press('ArrowUp');
    press('ArrowLeft');
    press('ArrowLeft');
    expect(useGameStore.getState().selectedCell).toEqual({ row: 0, col: 0 });

    for (let i = 0; i < 12; i++) {
      press('ArrowDown');
      press('ArrowRight');
    }
    expect(useGameStore.getState().selectedCell).toEqual({ row: 8, col: 8 });
  });

  it('submits digits typed on an empty selected cell to the server', () => {
    render(<SudokuBoard />);
    startGame();
    select(2, 3);
    press('7');

    expect(submitCell).toHaveBeenCalledTimes(1);
    expect(submitCell).toHaveBeenCalledWith(2, 3, 7);
    expect(Object.keys(useGameStore.getState().notes)).toHaveLength(0);
  });

  it('never submits for given or filled cells, without a selection, or after the game ended', () => {
    render(<SudokuBoard />);
    startGame({ cells: gridWith({ '4,4': 6 }) });
    press('3');
    select(0, 0);
    press('3');
    select(4, 4);
    press('3');
    expect(submitCell).not.toHaveBeenCalled();

    select(5, 5);
    emit({ type: 'GAME_LOST', payload: { won: false, finalTimeMs: 1, reason: 'HP_DEPLETED' } });
    press('3');
    expect(submitCell).not.toHaveBeenCalled();
  });

  it('ignores keystrokes aimed at form fields and modified shortcuts', () => {
    render(
      <>
        <input aria-label="name" />
        <SudokuBoard />
      </>,
    );
    startGame();
    select(2, 3);
    const input = screen.getByLabelText('name');
    act(() => {
      fireEvent.keyDown(input, { key: '5' });
      fireEvent.keyDown(window, { key: '5', ctrlKey: true });
    });
    expect(submitCell).not.toHaveBeenCalled();
  });

  it('writes pencil marks in notes mode and clears them with Backspace', () => {
    render(<SudokuBoard />);
    startGame();
    select(2, 3);
    press('n');
    expect(useGameStore.getState().notesMode).toBe(true);
    press('4');
    press('1');
    press('9');

    expect(submitCell).not.toHaveBeenCalled();
    expect(useGameStore.getState().notes['2,3']).toEqual([1, 4, 9]);
    const marks = within(cellAt(2, 3)).getAllByText(/^[1-9]$/).filter((el) => !el.className.includes('invisible'));
    expect(marks.map((el) => el.textContent)).toEqual(['1', '4', '9']);

    press('Backspace');
    expect(useGameStore.getState().notes['2,3']).toBeUndefined();
    press('N');
    expect(useGameStore.getState().notesMode).toBe(false);
  });

  it('supports the on-screen numpad, notes toggle and erase button', () => {
    render(<SudokuBoard />);
    startGame();
    select(6, 6);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: '8' }));
    });
    expect(submitCell).toHaveBeenCalledWith(6, 6, 8);

    const toggle = screen.getByRole('button', { name: /Notes OFF/ });
    act(() => {
      fireEvent.click(toggle);
    });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: '2' }));
    });
    expect(useGameStore.getState().notes['6,6']).toEqual([2]);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Erase notes/ }));
    });
    expect(useGameStore.getState().notes['6,6']).toBeUndefined();
  });

  it('disables numpad digits that are already placed nine times', () => {
    const values: Record<string, number> = {};
    for (let i = 0; i < 9; i++) {
      values[`${i},${i}`] = 5;
    }
    render(<SudokuBoard />);
    startGame({ cells: gridWith(values) });
    expect((screen.getByRole('button', { name: '5' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '4' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('marks the rejected cell until another cell is selected', () => {
    render(<SudokuBoard />);
    startGame();
    select(1, 1);
    emit({ type: 'MOVE_REJECTED', payload: { position: { row: 1, col: 1 }, value: 4, correct: false } });
    expect(cellAt(1, 1).dataset.error).toBe('true');
    expect(cellAt(1, 1).querySelector('.animate-shake')).not.toBeNull();
    expect(cellAt(2, 2).dataset.error).toBe('false');

    emit({ type: 'MOVE_REJECTED', payload: { position: { row: 1, col: 1 }, value: 5, correct: false } });
    expect(cellAt(1, 1).querySelector('.animate-shake')).not.toBeNull();

    select(2, 2);
    expect(cellAt(1, 1).dataset.error).toBe('false');
  });

  it('shows the glowing bot indicator and mini countdown only on the revealed bot cell', () => {
    render(<SudokuBoard />);
    startGame();
    expect(document.querySelectorAll('[data-bot="true"]')).toHaveLength(0);

    emit({ type: 'BOT_UPDATED', payload: revealedBot({ row: 5, col: 2 }, 12400, 30000) });
    expect(document.querySelectorAll('[data-bot="true"]')).toHaveLength(1);
    const botCell = cellAt(5, 2);
    expect(botCell.dataset.bot).toBe('true');
    expect(within(botCell).getByTestId('bot-badge').textContent).toBe('13s');
    expect(botCell.querySelector('.animate-bot-glow')).not.toBeNull();
    expect(botCell.getAttribute('aria-label')).toContain('bot here');
    expect(within(cellAt(5, 3)).queryByTestId('bot-badge')).toBeNull();

    emit({ type: 'BOT_UPDATED', payload: { active: true, revealed: false, position: null, remainingTimeoutMs: 30000, maxTimeoutMs: 30000 } });
    expect(document.querySelectorAll('[data-bot="true"]')).toHaveLength(0);
  });

  it('renders cage sums in each cage top-left cell and pulses borders during the reshape alert', () => {
    render(<SudokuBoard />);
    startGame();
    const sums = screen.getAllByTestId('cage-sum');
    expect(sums.map((el) => [el.textContent, el.dataset.row, el.dataset.col])).toEqual([
      ['9', '0', '0'],
      ['14', '2', '3'],
    ]);
    const paths = document.querySelectorAll('[data-testid="cage-overlay"] path');
    expect(paths).toHaveLength(2);
    expect(paths[0].getAttribute('class')).not.toContain('animate-cage-alert');

    emit({ type: 'ALERT_WARNING', payload: { secondsRemaining: 10 } });
    const alertPaths = document.querySelectorAll('[data-testid="cage-overlay"] path');
    expect(alertPaths[0].getAttribute('class')).toContain('animate-cage-alert');
    expect(alertPaths[0].getAttribute('class')).toContain('stroke-amber-400');

    emit({ type: 'CAGE_RESHAPED', payload: { cages: boardState().cages.slice(0, 1), metrics: algorithmMetrics() } });
    expect(screen.getAllByTestId('cage-sum')).toHaveLength(1);
    expect(document.querySelectorAll('[data-testid="cage-overlay"] path')[0].getAttribute('class')).not.toContain(
      'animate-cage-alert',
    );
  });
});
