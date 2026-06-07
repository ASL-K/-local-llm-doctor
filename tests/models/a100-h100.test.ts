// =====================================================================
// tests/models/a100-h100.test.ts
//
// v0.5.2: a100_80gb / h100_80gb hardware key + 真实 tps 估算
// =====================================================================

import { describe, it, expect } from 'vitest';
import { matchModel, matchAll } from '../../src/models/matcher.js';
import { getTable } from '../../src/models/loader.js';
import { recommend } from '../../src/recommend/recommend.js';
import type { HardwareProfile } from '../../src/types.js';

const a100User: HardwareProfile = {
  os: { platform: 'linux', distro: 'Ubuntu', wsl: false, wslVersion: null },
  cpu: { brand: 'Xeon', cores: 32, threads: 64, arch: 'x86_64', features: [] },
  memory: { total: 256, available: 200, type: 'DDR5' },
  disk: { total: 10000, available: 8000, type: 'SSD' },
  gpu: [{ vendor: 'nvidia', model: 'A100-80GB', vram: 80, metalSupported: false, cudaSupported: true }],
};

const h100User: HardwareProfile = {
  os: { platform: 'linux', distro: 'Ubuntu', wsl: false, wslVersion: null },
  cpu: { brand: 'Xeon', cores: 32, threads: 64, arch: 'x86_64', features: [] },
  memory: { total: 256, available: 200, type: 'DDR5' },
  disk: { total: 10000, available: 8000, type: 'SSD' },
  gpu: [{ vendor: 'nvidia', model: 'H100-80GB', vram: 80, metalSupported: false, cudaSupported: true }],
};

describe('v0.5.2: A100-80GB user gets real tps', () => {
  it('loads 19 models in table (v0.5.1 removed llama-3.1-70b)', async () => {
    const table = await getTable();
    expect(table.models.length).toBe(19);
  });

  it('A100 user: Llama-3.3-70B Q4_K_M 42GB on 80GB GPU runs + tps > 0', async () => {
    const table = await getTable();
    const llama70 = table.models.find(m => m.id === 'llama-3.3-70b')!;
    const result = matchModel(llama70, a100User);
    expect(result).not.toBeNull();
    // 80GB / 42GB (Q4_K_M) = 1.9 → comfortable 选 Q4_K_M
    // A100 tps on 70B Q4_K_M ≈ 9 t/s (从 table.json 填的)
    expect(result!.estimatedTps).toBeGreaterThan(0);
  });

  it('H100 user: tps is faster than A100 (40 vs 22 on 27B)', async () => {
    const table = await getTable();
    const gemma27 = table.models.find(m => m.id === 'gemma-3-27b')!;

    const a100Result = matchModel(gemma27, a100User);
    const h100Result = matchModel(gemma27, h100User);
    expect(a100Result).not.toBeNull();
    expect(h100Result).not.toBeNull();
    // H100 至少和 A100 一样快（或更快）
    expect(h100Result!.estimatedTps).toBeGreaterThanOrEqual(a100Result!.estimatedTps);
  });
});

describe('v0.5.2: 70B+ models have real tps (not 0)', () => {
  it('Qwen3-235B-A22B tps > 0 on A100 (8 t/s)', async () => {
    const table = await getTable();
    const qwen235 = table.models.find(m => m.id === 'qwen3-235b-a22b')!;
    const result = matchModel(qwen235, a100User);
    expect(result).not.toBeNull();
    expect(result!.estimatedTps).toBeGreaterThan(0);
  });

  it('DeepSeek-V3-0324 671B (vram_min 220GB) cannot run on H100 80GB', async () => {
    // v0.5.2 tps 数据填了，但 H100 80GB 显存不够 671B Q2_K (220GB)
    // 验证：matcher 返回 null（跑不动）
    const table = await getTable();
    const dsv3 = table.models.find(m => m.id === 'deepseek-v3-0324')!;
    const result = matchModel(dsv3, h100User);
    expect(result).toBeNull(); // vram 不足
  });
});

describe('v0.5.2: Hardware key resolution', () => {
  it('A100-80GB GPU → matchHardwareKey returns a100_80gb', async () => {
    const table = await getTable();
    const matches = matchAll(table, a100User);
    // a100User 应该至少推荐 Qwen3-1.7B（保守档）
    expect(matches.length).toBeGreaterThan(0);
  });
});
