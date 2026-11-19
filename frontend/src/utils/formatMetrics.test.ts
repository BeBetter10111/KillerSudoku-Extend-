import { describe, expect, it } from 'vitest';
import { formatCount, formatKilobytes, formatMillis } from './formatMetrics';

describe('formatMetrics', () => {
  it('formats milliseconds with sensible precision', () => {
    expect(formatMillis(0)).toBe('0.00 ms');
    expect(formatMillis(0.004)).toBe('<0.01 ms');
    expect(formatMillis(3.256)).toBe('3.26 ms');
    expect(formatMillis(125.44)).toBe('125.4 ms');
  });

  it('formats bytes as kilobytes with one decimal and separators', () => {
    expect(formatKilobytes(0)).toBe('0.0 KB');
    expect(formatKilobytes(65536)).toBe('64.0 KB');
    expect(formatKilobytes(1536)).toBe('1.5 KB');
    expect(formatKilobytes(5 * 1024 * 1024)).toBe('5,120.0 KB');
  });

  it('formats counters with thousands separators', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(1234567)).toBe('1,234,567');
  });

  it('never shows negative or non-finite values', () => {
    expect(formatMillis(-5)).toBe('0.00 ms');
    expect(formatKilobytes(Number.NaN)).toBe('0.0 KB');
    expect(formatCount(Number.POSITIVE_INFINITY)).toBe('0');
  });
});
