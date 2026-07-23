import { submitCellRequest } from '../infrastructure/api/gameApi.js';

/**
 * Application use-case: submit a cell value.
 * @param {number} row
 * @param {number} column
 * @param {number} value
 * @returns {Promise<void>}
 */
export async function submitCell(row, column, value) {
  await submitCellRequest(row, column, value);
}
