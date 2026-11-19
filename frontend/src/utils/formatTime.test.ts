import { describe, expect, it } from 'vitest';
import { formatClock, formatPrecise } from './formatTime';

describe('formatTime', () => {
  it('formats the live clock as m:ss and h:mm:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(5_999)).toBe('0:05');
    expect(formatClock(65_000)).toBe('1:05');
    expect(formatClock(3_725_000)).toBe('1:02:05');
    expect(formatClock(-100)).toBe('0:00');
  });

  it('formats precise result times with tenths', () => {
    expect(formatPrecise(0)).toBe('00:00.0');
    expect(formatPrecise(90_250)).toBe('01:30.2');
    expect(formatPrecise(605_700)).toBe('10:05.7');
  });
});
