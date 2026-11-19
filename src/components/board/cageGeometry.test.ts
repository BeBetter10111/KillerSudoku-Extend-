import { describe, expect, it } from 'vitest';
import type { CageDTO } from '../../types/game';
import { cageBoundaryPath, cageLabelCell, cageSegments } from './cageGeometry';

const cage = (cells: Array<[number, number]>): CageDTO => ({
  id: 1,
  cells: cells.map(([row, col]) => ({ row, col })),
  targetSum: 10,
});

describe('cageGeometry', () => {
  it('puts the label in the top-left cell regardless of cell order', () => {
    expect(cageLabelCell(cage([[3, 4], [2, 5], [2, 4], [3, 3]]))).toEqual({ row: 2, col: 4 });
  });

  it('draws six edges for a horizontal domino and joins them without a gap', () => {
    const segments = cageSegments(cage([[1, 1], [1, 2]]), 100, 10);
    expect(segments).toHaveLength(6);

    const topLeft = segments.find((s) => s.y1 === 110 && s.y2 === 110 && s.x1 === 110);
    expect(topLeft).toBeDefined();
    expect(topLeft?.x2).toBe(200);
    const topRight = segments.find((s) => s.y1 === 110 && s.x1 === 200);
    expect(topRight?.x2).toBe(290);
  });

  it('turns concave corners of an L shape into a connected outline', () => {
    const segments = cageSegments(cage([[0, 0], [1, 0], [1, 1]]), 100, 10);
    const topOfCornerCell = segments.find((s) => s.y1 === 110 && s.y2 === 110 && s.x2 === 190);
    expect(topOfCornerCell?.x1).toBe(90);
    const rightOfTopCell = segments.find((s) => s.x1 === 90 && s.x2 === 90);
    expect(rightOfTopCell).toBeDefined();
    expect(rightOfTopCell?.y2).toBe(110);
  });

  it('draws a closed inset box for a single cell', () => {
    const segments = cageSegments(cage([[4, 4]]), 100, 10);
    expect(segments).toHaveLength(4);
    expect(cageBoundaryPath(cage([[4, 4]]), 100, 10)).toBe(
      'M410 410L490 410M410 490L490 490M410 410L410 490M490 410L490 490',
    );
  });
});
