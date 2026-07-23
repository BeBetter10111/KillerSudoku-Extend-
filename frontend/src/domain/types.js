/**
 * @typedef {{ row: number, column: number, value: number | null }} Cell
 * @typedef {{ cells: Cell[], targetSum: number }} Cage
 * @typedef {{ size: number }} Board
 * @typedef {{ board: Board, cages: Cage[] }} GameSession
 */

/** @returns {Board} */
export function createEmptyBoard(size = 9) {
  return { size };
}

/** @returns {GameSession} */
export function createEmptySession() {
  return {
    board: createEmptyBoard(),
    cages: [],
  };
}
