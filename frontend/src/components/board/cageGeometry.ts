import type { CageDTO, Position } from '../../types/game';

export const GRID_SIZE = 9;
export const CELL_UNITS = 100;
export const BOARD_UNITS = GRID_SIZE * CELL_UNITS;
export const CAGE_INSET = 11;

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function lineEnd(boundary: number, outward: 1 | -1, alongInCage: boolean, diagonalInCage: boolean, inset: number): number {
  if (!alongInCage) {
    return boundary - outward * inset;
  }
  return diagonalInCage ? boundary + outward * inset : boundary;
}

export function cageSegments(cage: CageDTO, unit = CELL_UNITS, inset = CAGE_INSET): Segment[] {
  const members = new Set(cage.cells.map((cell) => cell.row * GRID_SIZE + cell.col));
  const has = (row: number, col: number): boolean =>
    row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE && members.has(row * GRID_SIZE + col);

  const segments: Segment[] = [];
  for (const { row: r, col: c } of cage.cells) {
    const left = c * unit;
    const right = left + unit;
    const top = r * unit;
    const bottom = top + unit;

    if (!has(r - 1, c)) {
      const y = top + inset;
      segments.push({
        x1: lineEnd(left, -1, has(r, c - 1), has(r - 1, c - 1), inset),
        y1: y,
        x2: lineEnd(right, 1, has(r, c + 1), has(r - 1, c + 1), inset),
        y2: y,
      });
    }
    if (!has(r + 1, c)) {
      const y = bottom - inset;
      segments.push({
        x1: lineEnd(left, -1, has(r, c - 1), has(r + 1, c - 1), inset),
        y1: y,
        x2: lineEnd(right, 1, has(r, c + 1), has(r + 1, c + 1), inset),
        y2: y,
      });
    }
    if (!has(r, c - 1)) {
      const x = left + inset;
      segments.push({
        x1: x,
        y1: lineEnd(top, -1, has(r - 1, c), has(r - 1, c - 1), inset),
        x2: x,
        y2: lineEnd(bottom, 1, has(r + 1, c), has(r + 1, c - 1), inset),
      });
    }
    if (!has(r, c + 1)) {
      const x = right - inset;
      segments.push({
        x1: x,
        y1: lineEnd(top, -1, has(r - 1, c), has(r - 1, c + 1), inset),
        x2: x,
        y2: lineEnd(bottom, 1, has(r + 1, c), has(r + 1, c + 1), inset),
      });
    }
  }
  return segments;
}

export function cageBoundaryPath(cage: CageDTO, unit = CELL_UNITS, inset = CAGE_INSET): string {
  return cageSegments(cage, unit, inset)
    .map((s) => `M${s.x1} ${s.y1}L${s.x2} ${s.y2}`)
    .join('');
}

export function cageLabelCell(cage: CageDTO): Position {
  return cage.cells.reduce((best, cell) =>
    cell.row < best.row || (cell.row === best.row && cell.col < best.col) ? cell : best,
  );
}
