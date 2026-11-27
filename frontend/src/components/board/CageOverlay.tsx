import { memo, useMemo } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { BOARD_UNITS, GRID_SIZE, cageBoundaryPath, cageLabelCell } from './cageGeometry';

export const CageOverlay = memo(function CageOverlay() {
  const cages = useGameStore((state) => state.cages);
  const isAlertActive = useGameStore((state) => state.isReshapeAlertActive);

  const shapes = useMemo(
    () =>
      cages.map((cage) => ({
        id: cage.id,
        path: cageBoundaryPath(cage),
        label: cageLabelCell(cage),
        targetSum: cage.targetSum,
      })),
    [cages],
  );

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true" data-testid="cage-overlay">
      <svg viewBox={`0 0 ${BOARD_UNITS} ${BOARD_UNITS}`} className="absolute inset-0 h-full w-full" fill="none">
        {shapes.map((shape) => (
          <path
            key={shape.id}
            d={shape.path}
            strokeLinecap="round"
            strokeDasharray="6 6"
            strokeWidth={isAlertActive ? 4 : 2.5}
            data-alert={isAlertActive}
            className={
              isAlertActive ? 'animate-cage-alert stroke-amber-400 motion-reduce:animate-none' : 'stroke-cage/70'
            }
          />
        ))}
      </svg>
      {shapes.map((shape) => (
        <span
          key={shape.id}
          data-testid="cage-sum"
          data-row={shape.label.row}
          data-col={shape.label.col}
          className={`absolute p-[0.9%] font-mono text-[9px] font-bold leading-none sm:text-[11px] ${
            isAlertActive ? 'text-crimson' : 'text-ink'
          }`}
          style={{
            left: `${(shape.label.col / GRID_SIZE) * 100}%`,
            top: `${(shape.label.row / GRID_SIZE) * 100}%`,
          }}
        >
          {shape.targetSum}
        </span>
      ))}
    </div>
  );
});
