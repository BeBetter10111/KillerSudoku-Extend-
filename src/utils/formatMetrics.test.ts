import { describe, expect, it } from 'vitest';
import { formatCount, formatKilobytes, formatMemory, formatMillis, formatPercent, formatSpeedup } from './formatMetrics';

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

describe('benchmark formatters', () => {
  it('switches memory to megabytes above one MiB', () => {
    expect(formatMemory(3 * 1024)).toBe('3.0 KB');
    expect(formatMemory(1024 * 1024)).toBe('1.0 MB');
    expect(formatMemory(529_804 * 1024)).toBe('517.4 MB');
  });

  it('formats percentages and speedups', () => {
    expect(formatPercent(99.6)).toBe('99.6%');
    expect(formatPercent(100, 0)).toBe('100%');
    expect(formatSpeedup(3.5, 0.24)).toBe('15x');
    expect(formatSpeedup(1.2, 0.8)).toBe('1.5x');
    expect(formatSpeedup(5, 0)).toBe('n/a');
  });
});
