// =====================================================================
// tests/recommend/fallback-reason.test.ts
//
// 测试 buildFallback 的 3 分支文案：
//   - gap < 0 （盈余）
//   - gap === 0 （刚好）
//   - gap > 0 （还差）
//
// 这是 v0.3.1 的回归测试（v0.2 真实跑发现的 bug：3.87GB 用户看到"差 -0.9GB"）
// =====================================================================

import { describe, it, expect } from 'vitest';
import { recommend } from '../../src/recommend/recommend.js';
import { getTable } from '../../src/models/loader.js';
import { matchAll } from '../../src/models/matcher.js';
import type { HardwareProfile } from '../../src/types.js';

// 构造一个有 3.87GB 可用内存的 profile（用户真实电脑数据）
const threePoint87: HardwareProfile = {
  os: { platform: 'win32', distro: 'Windows 11', wsl: false, wslVersion: null },
  cpu: { brand: 'i5-12500H', cores: 16, threads: 24, arch: 'x86_64', features: [] },
  memory: { total: 15.7, available: 3.87, type: 'unknown' },
  disk: { total: 274, available: 109, type: 'unknown' },
  gpu: [],
};

const fivePoint64: HardwareProfile = {
  os: { platform: 'linux', distro: 'Ubuntu (WSL)', wsl: true, wslVersion: '2' },
  cpu: { brand: 'i5-12500H', cores: 16, threads: 24, arch: 'x86_64', features: [] },
  memory: { total: 7.6, available: 5.64, type: 'unknown' },
  disk: { total: 1006, available: 944, type: 'SSD' },
  gpu: [],
};

const threeGB: HardwareProfile = {
  os: { platform: 'linux', distro: 'Ubuntu', wsl: false, wslVersion: null },
  cpu: { brand: 'Test', cores: 4, threads: 4, arch: 'x86_64', features: [] },
  memory: { total: 3, available: 3, type: 'unknown' },
  disk: { total: 100, available: 50, type: 'unknown' },
  gpu: [],
};

describe('fallback reason: 3 branches (v0.3.1 bugfix)', () => {
  it('"完全跑不动" branch: under 2GB RAM', async () => {
    const oneGB: HardwareProfile = {
      os: { platform: 'linux', distro: 'Ubuntu', wsl: false, wslVersion: null },
      cpu: { brand: 'Test', cores: 4, threads: 4, arch: 'x86_64', features: [] },
      memory: { total: 1, available: 1, type: 'unknown' },
      disk: { total: 100, available: 50, type: 'unknown' },
      gpu: [],
    };
    const table = await getTable();
    const matches = matchAll(table, oneGB);
    const rec = recommend(matches, oneGB);

    // 1GB < 2GB（最小模型 Q2_K）→ 走"完全跑不动"分支
    expect(rec.fallback.reason).toContain('跑不动');
    expect(rec.fallback.apiAlternatives.length).toBeGreaterThan(0);
  });

  it('gap === 0: says "刚好够" (just enough)', async () => {
    // 用 4GB 跑 Qwen3-1.7B Q4_K_M (vram_min 4GB) → gap = 0
    const fourGB: HardwareProfile = {
      os: { platform: 'linux', distro: 'Ubuntu', wsl: false, wslVersion: null },
      cpu: { brand: 'Test', cores: 4, threads: 4, arch: 'x86_64', features: [] },
      memory: { total: 4, available: 4, type: 'unknown' },
      disk: { total: 100, available: 50, type: 'unknown' },
      gpu: [],
    };
    const table = await getTable();
    const matches = matchAll(table, fourGB);
    const rec = recommend(matches, fourGB);

    // 4GB 用户 vs tightest vram_min 4GB → gap = 0
    expect(rec.fallback.reason).toContain('刚好够');
  });

  it('gap < 0: says "盈余" (surplus) - the v0.2 bug fix', async () => {
    const table = await getTable();
    const matches = matchAll(table, threePoint87);
    const rec = recommend(matches, threePoint87);

    // 3.87GB 用户：tightest vram_min 是 3GB（Q3_K_M）
    // gap = 3 - 3.87 = -0.87（实际有 0.87GB 盈余）
    expect(rec.fallback.reason).toContain('盈余');
    expect(rec.fallback.reason).not.toContain('还差');
    // 关键：不应该再说"差 -0.9GB"这种负数表达
    expect(rec.fallback.reason).not.toMatch(/差\s*-/);
  });

  it('5.64GB user: also has surplus', async () => {
    const table = await getTable();
    const matches = matchAll(table, fivePoint64);
    const rec = recommend(matches, fivePoint64);

    // 5.64GB vs tightest vram_min 3GB → gap -2.64
    expect(rec.fallback.reason).toContain('盈余');
  });

  it('3GB user: gap === 0 (刚好够)', async () => {
    const table = await getTable();
    const matches = matchAll(table, threeGB);
    const rec = recommend(matches, threeGB);

    // 3GB vs tightest vram_min 3GB → gap = 0
    expect(rec.fallback.reason).toContain('刚好够');
  });

  it('fallback.minRequiredVram is still set correctly', async () => {
    const table = await getTable();
    const matches = matchAll(table, threePoint87);
    const rec = recommend(matches, threePoint87);

    // minRequiredVram 应该是 tightest 模型的 vramMin
    expect(rec.fallback.minRequiredVram).toBeGreaterThan(0);
    expect(rec.fallback.minRequiredVram).toBeLessThanOrEqual(3);
  });

  it('fallback.suggestion and apiAlternatives unchanged', async () => {
    const table = await getTable();
    const matches = matchAll(table, threePoint87);
    const rec = recommend(matches, threePoint87);

    expect(rec.fallback.suggestion).toContain('关闭其他程序');
    expect(rec.fallback.apiAlternatives.length).toBeGreaterThan(0);
  });
});
