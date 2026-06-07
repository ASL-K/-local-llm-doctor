// =====================================================================
// src/models/matcher.ts
//
// 核心匹配算法。
// 输入：HardwareProfile + ModelTable
// 输出：每个模型的 MatchResult
//
// 算法核心（按用户视角倒推）：
//   1. 选主 GPU（vram 最大的）
//   2. 计算"目标显存" = 有 GPU 用 vram，无 GPU 用 memory.available
//   3. 对每个模型：
//      a. 找能跑起来的最高质量量化等级
//      b. 算"fitLevel"（显存富余度）
//      c. 算"estimatedTps"（查表 + 插值）
//   4. 返回所有 MatchResult（含 too_tight，让 recommend 层决定显示哪些）
//
// 边界处理：
//   - 完全跑不动：返回 null（不是 throw）
//   - 量化等级空：跳过
//   - tps 表里没硬件 key：返回 0（让输出显示 N/A）
// =====================================================================

import type { HardwareProfile, GpuInfo } from '../types.js';
import type {
  ModelEntry,
  ModelTable,
  MatchResult,
  QuantLevel,
  QuantLevelName,
  HardwareKey,
  FitLevel,
  Tier,
} from './types.js';

const QUANT_ORDER: QuantLevelName[] = ['Q2_K', 'Q3_K_M', 'Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0'];
const QUANT_RANK: Record<QuantLevelName, number> = {
  Q2_K: 1, Q3_K_M: 2, Q4_K_M: 3, Q5_K_M: 4, Q6_K: 5, Q8_0: 6,
};

/**
 * 内部：选主 GPU（vram 最大的）
 */
function selectGpu(gpus: GpuInfo[]): GpuInfo | null {
  if (gpus.length === 0) return null;
  return gpus.reduce((a, b) => (b.vram > a.vram ? b : a));
}

/**
 * 内部：把任意 GpuInfo 转成 HardwareKey（用于 tps 查表）
 * 简化策略：取最接近的硬件 key
 * v0.2 可以做精确的 vendor + model 匹配
 */
function matchHardwareKey(gpu: GpuInfo | null, cpu: HardwareProfile['cpu'], memory: HardwareProfile['memory']): HardwareKey {
  // Apple Silicon
  if (gpu?.vendor === 'apple') {
    if (gpu.vram >= 18) return 'm3_pro_18gb';
    // v0.1 简化：所有 Apple Silicon 算 m3_pro
    return 'm3_pro_18gb';
  }

  // NVIDIA：按显存分档
  if (gpu?.vendor === 'nvidia') {
    if (gpu.vram >= 24) return 'rtx_4090_24gb';
    if (gpu.vram >= 20) return 'rtx_3090_24gb';
    if (gpu.vram >= 12) return 'rtx_3060_12gb';
    if (gpu.vram >= 8) return 'rtx_4060_8gb';
    return 'cpu_4c_16gb'; // 8GB 以下不算 GPU 加速
  }

  // AMD / Intel GPU → 当 CPU 算
  // 按 CPU 核心数 + 内存分档
  if (cpu.cores >= 8 && memory.available >= 24) return 'cpu_8c_32gb';
  if (cpu.cores >= 4 && memory.available >= 12) return 'cpu_4c_16gb';
  return 'cpu_2c_8gb';
}

/**
 * 内部：选最高质量的"能跑起来"的量化等级
 * @returns 选中的量化等级和名，null = 完全跑不动
 */
function selectBestQuant(
  quantLevels: Partial<Record<QuantLevelName, QuantLevel>>,
  targetVram: number,
): { level: QuantLevelName; info: QuantLevel } | null {
  // 按质量从高到低排序（Q8_0 → Q2_K）
  const sorted = QUANT_ORDER
    .filter(lvl => quantLevels[lvl])
    .sort((a, b) => QUANT_RANK[b] - QUANT_RANK[a]);

  for (const level of sorted) {
    const info = quantLevels[level]!;
    if (targetVram >= info.vram_min) {
      return { level, info };
    }
  }
  return null;
}

/**
 * 内部：判定 fitLevel（显存富余度）
 * 用 round 避免浮点精度问题（24/20=1.1999999 应为 comfortable）
 */
function calcFitLevel(targetVram: number, vramMin: number): FitLevel {
  if (vramMin <= 0) return 'no';
  const ratio = targetVram / vramMin;
  // 2 位小数再比，避免 1.19999 误判
  const rounded = Math.round(ratio * 100) / 100;
  if (rounded >= 1.5) return 'perfect';
  if (rounded >= 1.2) return 'comfortable';
  if (rounded >= 1.05) return 'tight';
  return 'too_tight';
}

/**
 * 内部：根据 vramMin 动态决定档位（v0.3.2 引入）
 * 算法：基于"该模型在最优量化下需要多少显存"决定档位
 *   - < 6GB  → 保守档（极小模型，5.64GB 这类用户也能跑）
 *   - 6-14GB → 平衡档（中等模型，主流用户）
 *   - >= 14GB → 激进档（大模型，高配用户）
 *
 * 阈值依据（v0.3.2 Windows 真实数据）：
 *   - 5.64GB / 3.87GB 用户的最小 vramMin 是 4GB（Q4_K_M）
 *   - 如果阈值 = 4：conservative 永远空
 *   - 阈值 = 6：Q4_K_M (4-5GB) 算 conservative，主流用户有内容
 *   - 阈值 = 12：Q4_K_M 11GB 算 balanced，大模型 Q5_K_M 24GB 算 aggressive
 *
 * 为什么用 vramMin（最优量化下的最小需求）而不是 active_b：
 *   - vramMin 已经反映"能不能舒服跑"
 *   - 1.7B Q4_K_M (4GB) 算 conservative
 *   - 14B Q4_K_M (11GB) 算 balanced
 *   - 32B Q4_K_M (22GB) 算 aggressive
 */
function calcTierDynamic(vramMin: number): Tier {
  if (vramMin < 6) return 'conservative';
  if (vramMin < 14) return 'balanced';
  return 'aggressive';
}

/**
 * 内部：构造 reason 字符串
 */
function buildReason(fitLevel: FitLevel, _model: ModelEntry, level: QuantLevelName, vramAvail: number, _vramMin: number): string {
  switch (fitLevel) {
    case 'perfect':
      return `${vramAvail.toFixed(1)}GB 充裕，能跑 ${level} 高质量版本`;
    case 'comfortable':
      return `${vramAvail.toFixed(1)}GB 充足，${level} 流畅运行`;
    case 'tight':
      return `${vramAvail.toFixed(1)}GB 偏紧，${level} 勉强能跑（建议关闭其他程序）`;
    case 'too_tight':
      return `${vramAvail.toFixed(1)}GB 几乎不够，${level} 有 OOM 风险`;
    default:
      return '未知';
  }
}

/**
 * 匹配单个模型
 * @returns MatchResult 或 null（完全跑不动）
 */
export function matchModel(model: ModelEntry, hardware: HardwareProfile): MatchResult | null {
  // 1. 选主 GPU
  const primaryGpu = selectGpu(hardware.gpu);
  const hasGpu = primaryGpu !== null && primaryGpu.vram >= 4;

  // 2. 计算 target_vram
  //   有 GPU → 用 vram（独立显存）
  //   无 GPU → 用 available memory（系统内存）
  const targetVram = hasGpu ? primaryGpu!.vram : hardware.memory.available;

  // 3. 选最优量化
  const best = selectBestQuant(model.quant_levels, targetVram);
  if (!best) return null;

  // 4. 判定 fitLevel
  const fitLevel = calcFitLevel(targetVram, best.info.vram_min);

  // 5. 估算 tps
  const hwKey = matchHardwareKey(primaryGpu, hardware.cpu, hardware.memory);
  const estimatedTps = model.tps_estimate[hwKey] ?? 0;

  // 6. 构造 reason
  const reason = buildReason(fitLevel, model, best.level, targetVram, best.info.vram_min);

  // 7. 动态档位（v0.3.2 新加）
  const tierDynamic = calcTierDynamic(best.info.vram_min);

  return {
    modelId: model.id,
    modelName: model.name,
    family: model.family,
    quantLevel: best.level,
    fitLevel,
    reason,
    estimatedTps,
    qualityScore: best.info.quality_score,
    vramMin: best.info.vram_min,
    vramAvailable: targetVram,
    bestFor: model.best_for,
    tierDynamic,
    tierFlags: {
      conservative: model.tier_conservative,
      balanced: model.tier_balanced,
      aggressive: model.tier_aggressive,
    },
    note: model.note,
  };
}

/**
 * 匹配所有模型
 * @returns MatchResult[]（不含 null，失败模型跳过）
 */
export function matchAll(table: ModelTable, hardware: HardwareProfile): MatchResult[] {
  const results: MatchResult[] = [];
  for (const model of table.models) {
    const r = matchModel(model, hardware);
    if (r !== null) {
      results.push(r);
    }
  }
  return results;
}

/**
 * 排序：按 fitLevel 优先级 + quality score
 *  - perfect > comfortable > tight > too_tight
 *  - 同级按 quality_score 降序
 */
export function sortMatches(matches: MatchResult[]): MatchResult[] {
  const fitRank: Record<FitLevel, number> = {
    perfect: 4, comfortable: 3, tight: 2, too_tight: 1, no: 0,
  };
  return [...matches].sort((a, b) => {
    const fa = fitRank[a.fitLevel];
    const fb = fitRank[b.fitLevel];
    if (fa !== fb) return fb - fa;
    return b.qualityScore - a.qualityScore;
  });
}
