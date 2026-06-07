// =====================================================================
// tests/models/tier-dynamic.test.ts
//
// v0.3.2 新功能：tier_dynamic 算法
// 算法：基于 vramMin 决定档位（< 6GB / 6-14GB / >= 14GB）
// 替代 v0.1/v0.2 的 model.tierFlags 预定义
// =====================================================================

import { describe, it, expect } from 'vitest';
import { matchModel } from '../../src/models/matcher.js';
import { getTable } from '../../src/models/loader.js';
import type { HardwareProfile } from '../../src/types.js';

// 8GB 显存 + 32GB 内存：能跑中小模型，但跑不动 32B
const midUser: HardwareProfile = {
  os: { platform: 'linux', distro: 'Ubuntu', wsl: false, wslVersion: null },
  cpu: { brand: 'i7', cores: 8, threads: 16, arch: 'x86_64', features: [] },
  memory: { total: 32, available: 28, type: 'DDR5' },
  disk: { total: 1000, available: 500, type: 'SSD' },
  gpu: [{ vendor: 'nvidia', model: 'RTX 4060', vram: 8, metalSupported: false, cudaSupported: true }],
};

// 24GB 显存 + 64GB 内存：高配用户，能跑 32B / 70B
const richUser: HardwareProfile = {
  os: { platform: 'linux', distro: 'Ubuntu', wsl: false, wslVersion: null },
  cpu: { brand: 'i9', cores: 16, threads: 32, arch: 'x86_64', features: [] },
  memory: { total: 64, available: 60, type: 'DDR5' },
  disk: { total: 2000, available: 1500, type: 'SSD' },
  gpu: [{ vendor: 'nvidia', model: 'RTX 4090', vram: 24, metalSupported: false, cudaSupported: true }],
};

describe('tier_dynamic algorithm (v0.3.2)', () => {
  it('vramMin < 6GB → conservative (Q4_K_M 4GB for Qwen3-1.7B)', async () => {
    const table = await getTable();
    // 8GB 显存：Qwen3-1.7B 选 Q8_0 (4GB) → conservative
    const qwen17 = table.models.find(m => m.id === 'qwen3-1.7b')!;
    const result = matchModel(qwen17, midUser);
    expect(result!.vramMin).toBeLessThan(6);
    expect(result!.tierDynamic).toBe('conservative');
  });

  it('vramMin 6-14GB → balanced (Qwen3-14B Q4_K_M 11GB)', async () => {
    const table = await getTable();
    // 8GB 显存：Qwen3-14B 选 Q3_K_M (9GB) 或 Q2_K (7GB) → balanced
    const qwen14 = table.models.find(m => m.id === 'qwen3-14b')!;
    const result = matchModel(qwen14, midUser);
    // vramMin 应该是 7-11 之间 → balanced (< 14)
    expect(result!.vramMin).toBeLessThan(14);
    expect(result!.tierDynamic).toBe('balanced');
  });

  it('vramMin >= 14GB → aggressive (Qwen3-32B 24GB, rich user)', async () => {
    const table = await getTable();
    // 24GB 显存上 Qwen3-32B 选 Q4_K_M (22GB) → aggressive
    const qwen32 = table.models.find(m => m.id === 'qwen3-32b')!;
    const result = matchModel(qwen32, richUser);
    expect(result!.tierDynamic).toBe('aggressive');
  });

  it('Llama-3.3-70B Q2_K (vram_min 28GB) → aggressive on 40GB GPU', async () => {
    // v0.5.1: 删 llama-3.1-70b → 改用 llama-3.3-70b
    // 24GB 显存跑不动 70B（28GB），用 40GB（A100-40GB）
    const a100User: HardwareProfile = {
      os: { platform: 'linux', distro: 'Ubuntu', wsl: false, wslVersion: null },
      cpu: { brand: 'Xeon', cores: 32, threads: 64, arch: 'x86_64', features: [] },
      memory: { total: 128, available: 120, type: 'DDR5' },
      disk: { total: 5000, available: 4000, type: 'SSD' },
      gpu: [{ vendor: 'nvidia', model: 'A100-40GB', vram: 40, metalSupported: false, cudaSupported: true }],
    };
    const table = await getTable();
    const llama70 = table.models.find(m => m.id === 'llama-3.3-70b')!;
    const result = matchModel(llama70, a100User);
    expect(result).not.toBeNull();
    expect(result!.tierDynamic).toBe('aggressive');
  });

  it('tierFlags still present (backward compat)', async () => {
    const table = await getTable();
    const qwen17 = table.models.find(m => m.id === 'qwen3-1.7b')!;
    const result = matchModel(qwen17, richUser);
    // tierFlags 仍存在（向后兼容）
    expect(result!.tierFlags).toBeDefined();
    expect(result!.tierFlags.conservative).toBe(true);
  });
});
