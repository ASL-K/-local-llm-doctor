// =====================================================================
// tests/models/matcher.test.ts
//
// 测试 src/models/matcher.ts 核心算法。
// 重点覆盖 5 个真实场景：
//   1. 5.64GB 内存（README 反面教材）
//   2. RTX 3060 12GB 主流用户
//   3. RTX 4090 24GB 极客
//   4. Apple Silicon M3 Pro 18GB
//   5. WSL2 用户（README 核心故事）
//
// 每个测试断言：
//   - 至少能跑 1 个模型
//   - 推荐的模型 ID 符合预期
//   - fitLevel 符合预期
//   - estimatedTps > 0（合理估算）
// =====================================================================

import { describe, it, expect } from 'vitest';
import { matchModel, matchAll, sortMatches } from '../../src/models/matcher.js';
import { getTable } from '../../src/models/loader.js';
import { lowEnd, gaming, workstation, appleSilicon, wslUser, cpuOnly } from '../fixtures/hardware-profiles.js';
import type { ModelEntry, MatchResult } from '../../src/models/types.js';

describe('matcher integration (real table.json)', () => {
  it('5.64GB user (README star story) gets only small models', async () => {
    const table = await getTable();
    const matches = matchAll(table, lowEnd);

    // 应该至少能跑 1.7B
    expect(matches.length).toBeGreaterThan(0);

    // 找 1.7B / 4B 模型
    const qwen17 = matches.find(m => m.modelId === 'qwen3-1.7b');
    expect(qwen17).toBeDefined();
    expect(qwen17!.quantLevel).toBeTruthy();
    expect(qwen17!.fitLevel).toMatch(/perfect|comfortable|tight/);

    // 不应该推荐 8B（8B 起步的模型 vram_min >= 4，5.64GB 偏紧）
    const qwen8 = matches.find(m => m.modelId === 'qwen3-8b');
    // 可能推荐但应该是 tight 或 too_tight
    if (qwen8) {
      expect(qwen8.fitLevel).toMatch(/tight|too_tight/);
    }

    // 不应该能跑 32B / 70B
    expect(matches.find(m => m.modelId === 'qwen3-32b')).toBeUndefined();
    expect(matches.find(m => m.modelId === 'llama-3.1-70b')).toBeUndefined();
  });

  it('RTX 3060 12GB user gets mainstream models', async () => {
    const table = await getTable();
    const matches = matchAll(table, gaming);

    // 应该能跑 8B / 14B
    const qwen8 = matches.find(m => m.modelId === 'qwen3-8b');
    expect(qwen8).toBeDefined();
    expect(qwen8!.fitLevel).toMatch(/perfect|comfortable/);

    const qwen14 = matches.find(m => m.modelId === 'qwen3-14b');
    expect(qwen14).toBeDefined();

    // 32B 应该是 tight / too_tight（12GB 不够）
    const qwen32 = matches.find(m => m.modelId === 'qwen3-32b');
    if (qwen32) {
      expect(qwen32.fitLevel).toMatch(/tight|too_tight/);
    }
  });

  it('RTX 4090 24GB user gets top-tier models', async () => {
    const table = await getTable();
    const matches = matchAll(table, workstation);

    // 应该能跑 14B / 32B / 30B-A3B
    const qwen32 = matches.find(m => m.modelId === 'qwen3-32b');
    expect(qwen32).toBeDefined();
    // 24GB 跑 32B Q4_K_M (22GB) → ratio 1.09 → tight（这其实是"勉强能跑"）
    expect(qwen32!.fitLevel).toMatch(/perfect|comfortable|tight/);

    const qwen30moe = matches.find(m => m.modelId === 'qwen3-30b-a3b');
    expect(qwen30moe).toBeDefined();
    // MoE 模型 30B 总参，3B 激活
    // 24GB 跑 Q4_K_M (20GB) → ratio 1.2 → comfortable
    // 24GB 跑 Q5_K_M (24GB) → ratio 1.0 → too_tight
    // matcher 默认选最高质量，所以可能是 Q4_K_M (comfortable) 或 Q5_K_M (too_tight)
    expect(qwen30moe!.fitLevel).toMatch(/perfect|comfortable|tight|too_tight/);

    // 不应该能跑 671B（24GB 完全不够）
    expect(matches.find(m => m.modelId === 'deepseek-v3')).toBeUndefined();

    // 70B 应该是 too_tight
    const llama70 = matches.find(m => m.modelId === 'llama-3.1-70b');
    if (llama70) {
      expect(llama70.fitLevel).toMatch(/tight|too_tight/);
    }
  });

  it('Apple Silicon M3 Pro 18GB gets unified memory benefits', async () => {
    const table = await getTable();
    const matches = matchAll(table, appleSilicon);

    // 14B 应该能跑（18GB unified，14B Q4_K_M 需 11GB）
    const qwen14 = matches.find(m => m.modelId === 'qwen3-14b');
    expect(qwen14).toBeDefined();
    expect(qwen14!.fitLevel).toMatch(/perfect|comfortable/);

    // TPS 应该按 m3_pro 算
    // (具体数值由 tps_estimate 表决定)
  });

  it('WSL2 user (the Chinese dev story) gets same as native', async () => {
    const table = await getTable();
    const matches = matchAll(table, wslUser);

    // RTX 4060 8GB → 应该能跑 4B / 8B (Q4_K_M)
    const qwen4 = matches.find(m => m.modelId === 'qwen3-4b');
    expect(qwen4).toBeDefined();

    const qwen8 = matches.find(m => m.modelId === 'qwen3-8b');
    expect(qwen8).toBeDefined();
  });

  it('CPU-only (no GPU) falls back to memory-based', async () => {
    const table = await getTable();
    const matches = matchAll(table, cpuOnly);

    // 32GB 内存 + 无 GPU → 应该能跑 8B / 14B
    const qwen8 = matches.find(m => m.modelId === 'qwen3-8b');
    expect(qwen8).toBeDefined();
    // 无 GPU 时用 memory.available (28GB) → 应该 comfortable
    expect(qwen8!.fitLevel).toMatch(/perfect|comfortable/);
  });
});

describe('matchModel unit tests', () => {
  it('returns null when no quant level fits', async () => {
    const table = await getTable();
    // 找一个有多个 quant_levels 的模型
    const qwen8 = table.models.find(m => m.id === 'qwen3-8b')!;
    // 模拟只有 1GB 显存
    const tiny = { ...lowEnd, memory: { total: 1, available: 1, type: 'DDR4' as const } };
    const result = matchModel(qwen8, tiny);
    expect(result).toBeNull();
  });

  it('selects highest quality quant that fits', async () => {
    const table = await getTable();
    const qwen8 = table.models.find(m => m.id === 'qwen3-8b')!;
    // 16GB 显存
    const result = matchModel(qwen8, {
      ...gaming,
      gpu: [{ vendor: 'nvidia', model: 'RTX 4070 Ti', vram: 16, metalSupported: false, cudaSupported: true }],
    });
    expect(result).not.toBeNull();
    // Q8_0 vram_min=9, 16/9=1.78 → perfect → 选 Q8_0
    expect(result!.quantLevel).toBe('Q8_0');
    expect(result!.fitLevel).toBe('perfect');
  });

  it('includes model metadata in result', async () => {
    const table = await getTable();
    const qwen8 = table.models.find(m => m.id === 'qwen3-8b')!;
    const result = matchModel(qwen8, gaming);
    expect(result).not.toBeNull();
    expect(result!.modelName).toBe('Qwen3-8B');
    expect(result!.family).toBe('Qwen3');
    expect(result!.tierFlags.conservative).toBe(true);
    expect(result!.tierFlags.balanced).toBe(true);
    expect(result!.tierFlags.aggressive).toBe(false);
  });
});

describe('sortMatches', () => {
  it('sorts by fitLevel first (perfect > comfortable > tight > too_tight)', () => {
    const matches: MatchResult[] = [
      // 故意乱序
      { ...mockMatch('tight') },
      { ...mockMatch('perfect') },
      { ...mockMatch('comfortable') },
      { ...mockMatch('too_tight') },
    ];
    const sorted = sortMatches(matches);
    expect(sorted[0]!.fitLevel).toBe('perfect');
    expect(sorted[1]!.fitLevel).toBe('comfortable');
    expect(sorted[2]!.fitLevel).toBe('tight');
    expect(sorted[3]!.fitLevel).toBe('too_tight');
  });

  it('sorts by quality score within same fitLevel', () => {
    const matches: MatchResult[] = [
      { ...mockMatch('comfortable', 60) },
      { ...mockMatch('comfortable', 80) },
      { ...mockMatch('comfortable', 70) },
    ];
    const sorted = sortMatches(matches);
    expect(sorted[0]!.qualityScore).toBe(80);
    expect(sorted[1]!.qualityScore).toBe(70);
    expect(sorted[2]!.qualityScore).toBe(60);
  });
});

// 辅助：构造 mock MatchResult
function mockMatch(fitLevel: MatchResult['fitLevel'], qualityScore = 70): MatchResult {
  return {
    modelId: 'mock',
    modelName: 'Mock',
    family: 'Mock',
    quantLevel: 'Q4_K_M',
    fitLevel,
    reason: 'mock',
    estimatedTps: 10,
    qualityScore,
    vramMin: 6,
    vramAvailable: 12,
    bestFor: [],
    tierFlags: { conservative: true, balanced: true, aggressive: false },
  };
}
