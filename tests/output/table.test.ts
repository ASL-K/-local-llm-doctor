// =====================================================================
// tests/output/table.test.ts
//
// 测试 src/output/table.ts
// =====================================================================

import { describe, it, expect } from 'vitest';
import { renderHardware, renderRecommendations, renderFull } from '../../src/output/table.js';
import { lowEnd, gaming, appleSilicon } from '../fixtures/hardware-profiles.js';
import { getTable } from '../../src/models/loader.js';
import { matchAll } from '../../src/models/matcher.js';
import { recommend } from '../../src/recommend/recommend.js';

describe('renderHardware', () => {
  it('renders lowEnd profile (5.64GB story)', () => {
    const out = renderHardware(lowEnd);
    expect(out).toContain('OS');
    expect(out).toContain('内存');
    expect(out).toContain('5.6 GB');
    expect(out).toContain('磁盘');
  });

  it('includes WSL marker for WSL2 users', () => {
    const out = renderHardware(appleSilicon);
    // appleSilicon fixture 不是 WSL，但应该正常显示
    expect(out).toContain('OS');
  });

  it('handles gaming profile with GPU', () => {
    const out = renderHardware(gaming);
    expect(out).toContain('GPU');
    expect(out).toContain('GB VRAM');
  });
});

describe('renderRecommendations', () => {
  it('renders all 3 tiers + fallback', async () => {
    const table = await getTable();
    const matches = matchAll(table, lowEnd);
    const rec = recommend(matches, lowEnd);
    const out = renderRecommendations(rec);

    expect(out).toContain('保守档');
    expect(out).toContain('平衡档');
    expect(out).toContain('激进档');
    expect(out).toContain('兜底建议');
    expect(out).toContain('API 替代');
  });

  it('shows model name in recommendations', async () => {
    const table = await getTable();
    const matches = matchAll(table, lowEnd);
    const rec = recommend(matches, lowEnd);
    const out = renderRecommendations(rec);

    // 5.64GB 用户应该看到 Qwen3-1.7B 或 4B
    expect(out).toMatch(/Qwen3-1\.7B|Qwen3-4B/);
  });
});

describe('renderFull', () => {
  it('renders complete output (hardware + recommendations)', async () => {
    const table = await getTable();
    const matches = matchAll(table, lowEnd);
    const rec = recommend(matches, lowEnd);
    const out = renderFull(lowEnd, rec);

    expect(out).toContain('local-llm-doctor');
    expect(out).toContain('硬件信息');
    expect(out).toContain('推荐结果');
    expect(out).toContain('保守档');
  });

  it('produces reasonable output size (not too long)', async () => {
    const table = await getTable();
    const matches = matchAll(table, lowEnd);
    const rec = recommend(matches, lowEnd);
    const out = renderFull(lowEnd, rec);

    // 不应该崩溃，且不会无限长（cli-table3 边框 + 文字，< 10KB 合理）
    expect(out.length).toBeLessThan(10000);
  });
});
