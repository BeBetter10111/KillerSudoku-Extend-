import type { Position } from './position';

export interface Cage {
  id: string;
  cells: Position[];
  targetSum: number;
}