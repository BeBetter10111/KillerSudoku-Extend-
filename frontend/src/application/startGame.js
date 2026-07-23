import { startGameRequest } from '../infrastructure/api/gameApi.js';
import { createEmptySession } from '../domain/types.js';

/**
 * Application use-case: start a new game session.
 * @returns {Promise<import('../domain/types.js').GameSession>}
 */
export async function startGame() {
  await startGameRequest();
  return createEmptySession();
}
