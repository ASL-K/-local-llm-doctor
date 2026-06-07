// =====================================================================
// tests/recommend/recommend.test.ts
//
// 测试 src/recommend/recommend.ts
// 覆盖 5 个真实场景
// =====================================================================

import { describe, it, expect } from 'vitest';
import { recommend, findCheapestFit } from '../../src/recommend/recommend.js';
import { getTable } from '../../src/models/loader.js';
import { matchAll } from '../../src/models/matcher.js';
import { lowEnd, gaming, workstation, appleSilicon, cpuOnly } from '../fixtures/hardware-profiles.js';

describe('recommend 3-tier + fallback', () => {
  it('5.64GB user (README star story) gets conservative + balanced', async () => {
    const table = await getTable();
    const matches = matchAll(table, lowEnd);
    const rec = recommend(matches, lowEnd);

    // conservative 应该有至少 1 个
    expect(rec.conservative.length).toBeGreaterThan(0);

    // 5.64GB 应该推荐 Qwen3-1.7B 或 4B
    const allIds = rec.conservative.map(m => m.modelId);
    expect(allIds.some(id => id.includes('qwen3-1.7b') || id.includes('qwen3-4b'))).toBe(true);

    // 兜底必须有
    expect(rec.fallback).toBeDefined();
    expect(rec.fallback.reason).toBeTruthy();
  });

  it('RTX 3060 12GB user gets conservative + balanced (no aggressive)', async () => {
    const table = await getTable();
    const matches = matchAll(table, gaming);
    const rec = recommend(matches, gaming);

    // 12GB 显存：能跑 1.7B-14B（conservative + balanced），但跑不动 32B / 70B（aggressive）
    // v0.3.2 tier_dynamic 算法：vramMin < 6=conservative, 6-14=balanced, >= 14=aggressive
    expect(rec.conservative.length).toBeGreaterThan(0);
    expect(rec.balanced.length).toBeGreaterThan(0);
    // aggressive 期望 0：12GB 跑不动 14GB+ 显存需求的模型
    expect(rec.aggressive.length).toBe(0);

    // 每档最多 3 个（TOP_N_PER_TIER）
    expect(rec.conservative.length).toBeLessThanOrEqual(3);
    expect(rec.balanced.length).toBeLessThanOrEqual(3);

    // 兜底应该建议 API（12GB 跑 70B 不够）
    expect(rec.fallback.apiAlternatives.length).toBeGreaterThan(0);
  });

  it('RTX 4090 24GB gets top tier recommendations', async () => {
    const table = await getTable();
    const matches = matchAll(table, workstation);
    const rec = recommend(matches, workstation);

    // 3 档都应该有
    expect(rec.conservative.length).toBeGreaterThan(0);
    expect(rec.balanced.length).toBeGreaterThan(0);
    expect(rec.aggressive.length).toBeGreaterThan(0);

    // aggressive 应该包括 14B / 30B-A3B（24GB 跑 32B Q4_K_M 是 tight，不算 aggressive）
    const aggrIds = rec.aggressive.map(m => m.modelId);
    expect(aggrIds.some(id => id.includes('14b') || id.includes('30b') || id.includes('32b'))).toBe(true);
  });

  it('Apple Silicon M3 Pro gets unified memory benefits', async () => {
    const table = await getTable();
    const matches = matchAll(table, appleSilicon);
    const rec = recommend(matches, appleSilicon);

    // 18GB unified 应该有 14B 之类的
    expect(rec.balanced.length).toBeGreaterThan(0);
    const balIds = rec.balanced.map(m => m.modelId);
    expect(balIds.some(id => id.includes('14b') || id.includes('8b'))).toBe(true);
  });

  it('CPU-only 32GB falls back to memory', async () => {
    const table = await getTable();
    const matches = matchAll(table, cpuOnly);
    const rec = recommend(matches, cpuOnly);

    // CPU 32GB 应该能跑 14B
    expect(rec.balanced.length).toBeGreaterThan(0);
    const balIds = rec.balanced.map(m => m.modelId);
    expect(balIds.some(id => id.includes('14b') || id.includes('8b'))).toBe(true);
  });
});

describe('recommend empty scenarios', () => {
  it('returns fallback when allMatches is empty', async () => {
    const rec = recommend([], lowEnd);
    expect(rec.conservative).toEqual([]);
    expect(rec.balanced).toEqual([]);
    expect(rec.aggressive).toEqual([]);
    expect(rec.fallback.reason).toContain('跑不动');
    expect(rec.fallback.apiAlternatives.length).toBeGreaterThan(0);
  });
});

describe('findCheapestFit', () => {
  it('returns null for empty matches', () => {
    expect(findCheapestFit([])).toBe(null);
  });

  it('returns the cheapest (smallest VRAM) non-too_tight model', async () => {
    const table = await getTable();
    const matches = matchAll(table, lowEnd);
    const cheapest = findCheapestFit(matches);
    expect(cheapest).not.toBeNull();
    // cheapest 应该是 1.7B / 4B / 8B 中 vram 需求最小且能跑的
    // 5.64GB 用户 1.7B Q2_K (2GB) 应该 perfect
    expect(cheapest!.vramMin).toBeLessThanOrEqual(4);
  });
});
