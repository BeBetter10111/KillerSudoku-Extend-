import { useState } from 'react';
import { startGame } from '../application/startGame.js';
import { submitCell } from '../application/submitCell.js';

/**
 * UI adapter hook — depends on application layer only.
 */
export function useGameSession() {
  const [session, setSession] = useState(null);

  async function start() {
    const next = await startGame();
    setSession(next);
  }

  async function submit(row, column, value) {
    await submitCell(row, column, value);
  }

  return { session, start, submit };
}
