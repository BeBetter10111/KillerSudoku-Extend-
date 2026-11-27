import { describe, expect, it } from 'vitest';
import { emptyProgress, isUnlocked, lockReason } from './progression';

describe('progression', () => {
  it('only Easy is unlocked at the start', () => {
    const p = emptyProgress();
    expect(isUnlocked(p, 'CLASSIC', 'EASY')).toBe(true);
    expect(isUnlocked(p, 'CLASSIC', 'MEDIUM')).toBe(false);
    expect(isUnlocked(p, 'CLASSIC', 'HARD')).toBe(false);
    expect(lockReason(p, 'CLASSIC', 'MEDIUM')).toBe('Play Easy 0/3 times to unlock');
  });

  it('unlocks Medium after 3 Easy plays and Hard after 5 Medium plays, per mode', () => {
    const p = emptyProgress();
    p.CLASSIC.EASY = 3;
    p.CLASSIC.MEDIUM = 4;
    expect(isUnlocked(p, 'CLASSIC', 'MEDIUM')).toBe(true);
    expect(isUnlocked(p, 'CLASSIC', 'HARD')).toBe(false);
    expect(lockReason(p, 'CLASSIC', 'HARD')).toBe('Play Medium 4/5 times to unlock');
    expect(isUnlocked(p, 'BOT_CHALLENGE', 'MEDIUM')).toBe(false);
    p.CLASSIC.MEDIUM = 5;
    expect(isUnlocked(p, 'CLASSIC', 'HARD')).toBe(true);
    expect(lockReason(p, 'CLASSIC', 'HARD')).toBeNull();
  });
});
