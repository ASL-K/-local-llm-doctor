// =====================================================================
// tests/output/format.test.ts
//
// 测试 src/output/format.ts 颜色映射
// =====================================================================

import { describe, it, expect } from 'vitest';
import {
  colorizeFitLevel,
  formatFitLevel,
  colorizeTier,
  colorizeTitle,
  colorizeFallback,
  colorizeSuccess,
  colorizeVram,
} from '../../src/output/format.js';

describe('colorizeFitLevel', () => {
  it('returns a non-empty string for each level', () => {
    expect(colorizeFitLevel('perfect').length).toBeGreaterThan(0);
    expect(colorizeFitLevel('comfortable').length).toBeGreaterThan(0);
    expect(colorizeFitLevel('tight').length).toBeGreaterThan(0);
    expect(colorizeFitLevel('too_tight').length).toBeGreaterThan(0);
  });
});

describe('formatFitLevel', () => {
  it('includes badge and level', () => {
    const out = formatFitLevel('perfect');
    expect(out).toContain('perfect');
  });
});

describe('colorizeTier', () => {
  it('handles all 3 tiers', () => {
    expect(colorizeTier('conservative').length).toBeGreaterThan(0);
    expect(colorizeTier('balanced').length).toBeGreaterThan(0);
    expect(colorizeTier('aggressive').length).toBeGreaterThan(0);
  });
});

describe('colorizeVram', () => {
  it('high vram (>= 16) uses bold', () => {
    const out = colorizeVram(24);
    expect(out).toContain('24GB');
  });

  it('medium vram (8-15) shows GB', () => {
    expect(colorizeVram(8)).toContain('8GB');
  });

  it('low vram (4-7) shows GB', () => {
    expect(colorizeVram(5)).toContain('5GB');
  });

  it('very low vram (< 4) shows GB', () => {
    expect(colorizeVram(2)).toContain('2GB');
  });
});

describe('label functions', () => {
  it('colorizeTitle returns a string', () => {
    expect(colorizeTitle('test').length).toBeGreaterThan(0);
  });

  it('colorizeFallback returns warning string', () => {
    expect(colorizeFallback()).toContain('兜底');
  });

  it('colorizeSuccess returns check mark', () => {
    expect(colorizeSuccess()).toContain('✓');
  });
});
