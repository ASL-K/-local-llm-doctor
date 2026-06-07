// =====================================================================
// tests/format.test.ts
//
// 测试 src/utils/format.ts 的所有格式化函数
// =====================================================================

import { describe, it, expect } from 'vitest';
import {
  formatGB,
  formatMB,
  formatPercent,
  formatNumber,
  formatTPS,
  formatDuration,
  truncate,
} from '../src/utils/format.js';

describe('formatGB', () => {
  it('formats positive GB with 2 decimals by default', () => {
    expect(formatGB(5.64)).toBe('5.64 GB');
    expect(formatGB(24)).toBe('24.00 GB');
  });

  it('respects custom decimal count', () => {
    expect(formatGB(24, 0)).toBe('24 GB');
    expect(formatGB(5.123456, 4)).toBe('5.1235 GB');
  });

  it('switches to MB for very small values', () => {
    expect(formatGB(0.005)).toBe('5.12 MB');
    expect(formatGB(0.0001)).toBe('0.10 MB');
  });

  it('handles negative values', () => {
    expect(formatGB(-2.5)).toBe('-2.50 GB');
  });

  it('handles NaN and Infinity', () => {
    expect(formatGB(NaN)).toBe('N/A');
    expect(formatGB(Infinity)).toBe('N/A');
    expect(formatGB(-Infinity)).toBe('N/A');
  });

  it('handles zero', () => {
    expect(formatGB(0)).toBe('0.00 GB');
  });
});

describe('formatMB', () => {
  it('formats MB by default', () => {
    expect(formatMB(512)).toBe('512 MB');
  });

  it('switches to GB for large values', () => {
    expect(formatMB(2048)).toBe('2 GB');
  });

  it('switches to KB for very small values', () => {
    expect(formatMB(0.5)).toBe('512 KB');
  });
});

describe('formatPercent', () => {
  it('formats 0-1 as percentage', () => {
    expect(formatPercent(0.5)).toBe('50.0%');
    expect(formatPercent(0.866)).toBe('86.6%');
  });

  it('respects decimals', () => {
    expect(formatPercent(0.12345, 2)).toBe('12.35%');
  });

  it('clamps to handle values > 1 gracefully', () => {
    // 不报错，显示原样
    expect(formatPercent(1.5)).toBe('150.0%');
  });
});

describe('formatNumber', () => {
  it('adds thousand separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('handles small numbers', () => {
    expect(formatNumber(42)).toBe('42');
  });
});

describe('formatTPS', () => {
  it('formats t/s for tps >= 1', () => {
    expect(formatTPS(25)).toBe('25 t/s');
    expect(formatTPS(1)).toBe('1 t/s');
  });

  it('switches to tok/min for tps < 1', () => {
    expect(formatTPS(0.5)).toBe('30 tok/min');
    expect(formatTPS(0.05)).toBe('3 tok/min');
  });

  it('handles N/A cases', () => {
    expect(formatTPS(NaN)).toBe('N/A');
    expect(formatTPS(-1)).toBe('N/A');
  });
});

describe('formatDuration', () => {
  it('formats ms', () => {
    expect(formatDuration(500)).toBe('500ms');
  });

  it('formats seconds', () => {
    expect(formatDuration(1500)).toBe('1.50s');
    expect(formatDuration(30000)).toBe('30.00s');
  });

  it('formats minutes', () => {
    expect(formatDuration(120000)).toBe('2.0min');
  });
});

describe('truncate', () => {
  it('passes through short strings', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates English strings to fit', () => {
    expect(truncate('hello world', 5)).toBe('hell…');
  });

  it('truncates Chinese strings (each char = 2 width)', () => {
    // '你好世界' 4 个字 = 8 宽度
    expect(truncate('你好世界', 6)).toBe('你好…');
    expect(truncate('你好世界', 8)).toBe('你好世界');
  });

  it('handles empty string', () => {
    expect(truncate('', 10)).toBe('');
  });
});
