import type { Cell } from './cell';
import type { Cage } from './cage';

export interface BoardState {
  grid: Cell[][];
  cages: Cage[];
}