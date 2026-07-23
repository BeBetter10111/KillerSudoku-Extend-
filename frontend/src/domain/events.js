export const EventType = Object.freeze({
  BOT_REVEALED: 'BOT_REVEALED',
  BOT_TIMEOUT: 'BOT_TIMEOUT',
  RESHAPE_WARNING: 'RESHAPE_WARNING',
  BOARD_RESHAPED: 'BOARD_RESHAPED',
});

/**
 * @param {{ eventType: string }} event
 * @returns {string}
 */
export function getEventType(event) {
  return event.eventType;
}
