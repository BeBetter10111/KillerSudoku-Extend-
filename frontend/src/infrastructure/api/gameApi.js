const API_BASE = '/api';

/**
 * REST adapter stub — infrastructure outbound.
 * @returns {Promise<void>}
 */
export async function startGameRequest() {
  // Placeholder until backend REST is live
  return Promise.resolve();
}

/**
 * @param {number} row
 * @param {number} column
 * @param {number} value
 * @returns {Promise<void>}
 */
export async function submitCellRequest(row, column, value) {
  // Placeholder: POST `${API_BASE}/games/cells`
  void API_BASE;
  void row;
  void column;
  void value;
  return Promise.resolve();
}
