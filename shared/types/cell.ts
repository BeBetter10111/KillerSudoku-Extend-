/** 1-9 when filled, null when empty. */
export type CellValue = number | null;

export interface Cell {
  value: CellValue;
  /** Pencil-mark candidates (1-9). */
  notes: number[];
  /** True for pre-filled cells the player cannot edit. */
  isGiven: boolean;
}