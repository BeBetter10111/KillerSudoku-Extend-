import BoardView from '../board/BoardView.jsx';

/**
 * @param {{
 *   session: import('../../domain/types.js').GameSession | null,
 *   onStart: () => void,
 *   onSubmitCell: (row: number, column: number, value: number) => void,
 * }} props
 */
export default function GameLayout({ session, onStart, onSubmitCell }) {
  void onSubmitCell;

  return (
    <main style={{ padding: '2rem', fontFamily: 'Georgia, serif' }}>
      <h1 style={{ margin: '0 0 0.5rem' }}>Killer Sudoku</h1>
      <p style={{ margin: '0 0 1.5rem', color: '#555' }}>
        Extended killer sudoku — structural scaffold
      </p>
      <button type="button" onClick={onStart} style={{ marginBottom: '1rem' }}>
        Start game
      </button>
      <BoardView session={session} />
    </main>
  );
}
