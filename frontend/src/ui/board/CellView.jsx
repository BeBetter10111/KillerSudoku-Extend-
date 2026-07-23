/**
 * @param {{ value: number | null }} props
 */
export default function CellView({ value }) {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        border: '1px solid #ccc',
        display: 'grid',
        placeItems: 'center',
        fontSize: 14,
      }}
    >
      {value ?? ''}
    </div>
  );
}
