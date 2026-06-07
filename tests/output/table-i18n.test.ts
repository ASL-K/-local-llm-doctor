// =====================================================================
// tests/output/table-i18n.test.ts
//
// v0.4.2a: 验证 table.ts 的 lang 参数真的输出英文
// =====================================================================

import { describe, it, expect } from 'vitest';
import { renderHardware, renderRecommendations, renderFull } from '../../src/output/table.js';
import { getTable } from '../../src/models/loader.js';
import { matchAll } from '../../src/models/matcher.js';
import { recommend } from '../../src/recommend/recommend.js';
import type { HardwareProfile } from '../../src/types.js';

const wslUser: HardwareProfile = {
  os: { platform: 'linux', distro: 'Ubuntu', wsl: true, wslVersion: '2' },
  cpu: { brand: 'i5-12500H', cores: 16, threads: 24, arch: 'x86_64', features: [] },
  memory: { total: 7.6, available: 5.64, type: 'unknown' },
  disk: { total: 1006, available: 944, type: 'SSD' },
  gpu: [],
};

describe('renderHardware: lang parameter (v0.4.2a)', () => {
  it('zh: shows Chinese labels', () => {
    const out = renderHardware(wslUser, 'zh');
    expect(out).toContain('OS');
    expect(out).toContain('CPU');
    expect(out).toContain('内存');
    expect(out).toContain('磁盘');
    expect(out).toContain('总计');
    expect(out).toContain('可用');
  });

  it('en: shows English labels', () => {
    const out = renderHardware(wslUser, 'en');
    expect(out).toContain('OS');
    expect(out).toContain('CPU');
    expect(out).toContain('Memory');
    expect(out).toContain('Disk');
    expect(out).toContain('Total');
    expect(out).toContain('Available');
    // 不应该出现中文
    expect(out).not.toContain('总计');
    expect(out).not.toContain('可用');
    expect(out).not.toContain('内存');
    expect(out).not.toContain('磁盘');
  });

  it('en: CPU line uses English format (cores/threads, no Chinese)', () => {
    const out = renderHardware(wslUser, 'en');
    expect(out).toContain('16c');
    expect(out).toContain('24t');
    expect(out).not.toContain('核');
    expect(out).not.toContain('线程');
  });

  it('default lang = zh (backward compat)', () => {
    const out = renderHardware(wslUser);
    expect(out).toContain('内存');
  });
});

describe('renderRecommendations: lang parameter (v0.4.2a)', () => {
  it('zh: shows Chinese tier names', async () => {
    const table = await getTable();
    const matches = matchAll(table, wslUser);
    const rec = recommend(matches, wslUser, 'zh');
    const out = renderRecommendations(rec, 'zh');
    expect(out).toContain('保守');
    expect(out).toContain('平衡');
    expect(out).toContain('激进');
  });

  it('en: shows English tier names', async () => {
    const table = await getTable();
    const matches = matchAll(table, wslUser);
    const rec = recommend(matches, wslUser, 'en');
    const out = renderRecommendations(rec, 'en');
    expect(out).toContain('Conservative');
    expect(out).toContain('Balanced');
    expect(out).toContain('Aggressive');
    expect(out).toContain('out-of-the-box');
    expect(out).toContain('recommended');
    expect(out).toContain('high-end');
  });

  it('en: shows English column headers', async () => {
    const table = await getTable();
    const matches = matchAll(table, wslUser);
    const rec = recommend(matches, wslUser, 'en');
    const out = renderRecommendations(rec, 'en');
    expect(out).toContain('Tier');
    expect(out).toContain('Model');
    expect(out).toContain('Quant');
    expect(out).toContain('Fit');
    expect(out).toContain('Reason');
  });
});

describe('renderFull: lang parameter (v0.4.2a)', () => {
  it('en: full English output', async () => {
    const table = await getTable();
    const matches = matchAll(table, wslUser);
    const rec = recommend(matches, wslUser, 'en');
    const out = renderFull(wslUser, rec, 'en');
    expect(out).toContain('Hardware');
    expect(out).toContain('Recommendations');
    expect(out).toContain('Memory');
    expect(out).toContain('Conservative');
    // 关键：整段输出不应该有中文
    expect(out).not.toContain('硬件信息');
    expect(out).not.toContain('推荐结果');
  });
});
