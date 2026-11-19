const clampNonNegative = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0);

export function formatMillis(ms: number): string {
  const value = clampNonNegative(ms);
  if (value > 0 && value < 0.01) {
    return '<0.01 ms';
  }
  return `${value.toFixed(value >= 100 ? 1 : 2)} ms`;
}

export function formatKilobytes(bytes: number): string {
  const kilobytes = clampNonNegative(bytes) / 1024;
  return `${kilobytes.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} KB`;
}

export function formatCount(value: number): string {
  return Math.round(clampNonNegative(value)).toLocaleString('en-US');
}

export function formatMemory(bytes: number): string {
  const value = clampNonNegative(bytes);
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;
  }
  return formatKilobytes(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${clampNonNegative(value).toFixed(digits)}%`;
}

export function formatSpeedup(naive: number, optimized: number): string {
  if (!(naive > 0) || !(optimized > 0)) {
    return 'n/a';
  }
  const ratio = naive / optimized;
  return `${ratio >= 10 ? ratio.toFixed(0) : ratio.toFixed(1)}x`;
}
