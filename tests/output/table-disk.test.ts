// =====================================================================
// tests/output/table-disk.test.ts
//
// v0.3.3 隐性修复：disk.type === 'unknown' 时不显示类型
// Windows 上 systeminformation 经常不报 SSD/HDD
// 之前 v0.1 写死 "(SSD)" 是错的
// v0.2 line 96 加了 `!== 'unknown' ? (...)` 修复
// v0.3.3 加测试覆盖这个 case
// =====================================================================

import { describe, it, expect } from 'vitest';
import { renderHardware } from '../../src/output/table.js';
import { getTable } from '../../src/models/loader.js';
import { matchAll } from '../../src/models/matcher.js';
import { recommend } from '../../src/recommend/recommend.js';
import { renderFull } from '../../src/output/table.js';
import type { HardwareProfile } from '../../src/types.js';

const windowsUser: HardwareProfile = {
  os: { platform: 'win32', distro: 'Windows 11', wsl: false, wslVersion: null },
  cpu: { brand: 'i5-12500H', cores: 16, threads: 24, arch: 'x86_64', features: [] },
  memory: { total: 15.7, available: 3.87, type: 'unknown' },
  disk: { total: 274, available: 109, type: 'unknown' },  // Windows 常见
  gpu: [],
};

const wslUser: HardwareProfile = {
  os: { platform: 'linux', distro: 'Ubuntu (WSL)', wsl: true, wslVersion: '2' },
  cpu: { brand: 'i5-12500H', cores: 16, threads: 24, arch: 'x86_64', features: [] },
  memory: { total: 7.6, available: 5.64, type: 'unknown' },
  disk: { total: 1006, available: 944, type: 'SSD' },  // WSL 一般能报
  gpu: [],
};

describe('disk type display (v0.3.3)', () => {
  it('hides type when disk.type === "unknown" (Windows)', async () => {
    const out = renderHardware(windowsUser);
    // 关键：不应该出现 "(unknown)" 字样
    expect(out).not.toContain('(unknown)');
    // 应该看到 "总计 X / 可用 Y" 但没有 type 后缀
    expect(out).toMatch(/磁盘.*总计 274\.0 GB.*可用 109\.0 GB(?!.*\()/);
  });

  it('shows type when known (e.g. SSD on WSL)', async () => {
    const out = renderHardware(wslUser);
    expect(out).toContain('(SSD)');
  });
});

describe('renderFull with various disk types', () => {
  it('Windows user: no (unknown) in output', async () => {
    const table = await getTable();
    const matches = matchAll(table, windowsUser);
    const rec = recommend(matches, windowsUser);
    const out = renderFull(windowsUser, rec);
    expect(out).not.toContain('(unknown)');
  });

  it('WSL user: shows (SSD)', async () => {
    const table = await getTable();
    const matches = matchAll(table, wslUser);
    const rec = recommend(matches, wslUser);
    const out = renderFull(wslUser, rec);
    expect(out).toContain('(SSD)');
  });
});
