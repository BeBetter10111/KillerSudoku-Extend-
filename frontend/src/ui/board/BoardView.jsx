import CellView from './CellView.jsx';

/**
 * @param {{ session: import('../../domain/types.js').GameSession | null }} props
 */
export default function BoardView({ session }) {
  const size = session?.board?.size ?? 9;
  const cells = Array.from({ length: size * size }, (_, i) => ({
    key: i,
    value: null,
  }));

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${size}, 32px)`,
        gap: 0,
        width: 'fit-content',
      }}
      aria-label="Killer Sudoku board"
    >
      {cells.map((cell) => (
        <CellView key={cell.key} value={cell.value} />
      ))}
    </div>
  );
}
