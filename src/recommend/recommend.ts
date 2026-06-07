// =====================================================================
// src/recommend/recommend.ts
//
// 3 档推荐 + 兜底建议。
// 输入：所有 MatchResult（matcher.ts 的输出）
// 输出：RecommendedModels（3 档 + fallback）
//
// 设计原则：
//   1. 每档取前 3-5 个（够看，不啰嗦）
//   2. 同档按 fitLevel 优先 + qualityScore 排序（复用 sortMatches）
//   3. 兜底：3 档全空时给"硬件不够"的建议
//   4. 兜底：即使 3 档有内容，也提示"如果你愿意冒险可以试更大的"
//
// 不做的事：
//   - 不做 i18n（v0.2）
//   - 不做 UI（v0.2 cli-table3）
//   - 不做模型下载链接（v0.2）
// =====================================================================

import type { MatchResult, RecommendedModels, FallbackSuggestion } from '../models/types.js';
import { sortMatches } from '../models/matcher.js';
import type { HardwareProfile } from '../types.js';

const TOP_N_PER_TIER = 3;

/**
 * 按 tier 过滤 MatchResult
 */
function filterByTier(matches: MatchResult[], tier: 'conservative' | 'balanced' | 'aggressive'): MatchResult[] {
  return matches.filter(m => m.tierFlags[tier]);
}

/**
 * 取前 N 个（按 sortMatches 规则：fitLevel > qualityScore）
 */
function topN(matches: MatchResult[], n: number): MatchResult[] {
  return sortMatches(matches).slice(0, n);
}

/**
 * 构造兜底建议（3 档全空时）
 *
 * 策略：
 *   1. 找"vram 需求最小"的那个模型
 *   2. 算"还差多少 GB"
 *   3. 给具体建议（升级硬件 / 用 API / 换小模型）
 */
function buildFallback(
  allMatches: MatchResult[],
  hardware: HardwareProfile,
): FallbackSuggestion {
  // 找 3 档全空 + vram 需求最小的模型（这是"最容易实现"的）
  // 用 conservative 档为标杆（应该包含所有 1.7B / 4B）
  const allAvailable = allMatches.filter(m =>
    m.fitLevel === 'too_tight' || m.fitLevel === 'tight' || m.fitLevel === 'comfortable' || m.fitLevel === 'perfect'
  );

  if (allAvailable.length === 0) {
    // 完全跑不动：建议用 API
    const targetVram = hardware.gpu.length > 0
      ? Math.max(...hardware.gpu.map(g => g.vram))
      : hardware.memory.available;

    return {
      reason: `你电脑的可用显存/内存仅 ${targetVram.toFixed(1)}GB，本地 LLM 全部跑不动`,
      suggestion: '建议直接用云 API（OpenAI / Claude / DeepSeek）',
      minRequiredVram: 2, // Qwen3-1.7B Q4_K_M 最低 2GB
      apiAlternatives: ['OpenAI GPT-4o-mini', 'Anthropic Claude 3.5 Haiku', 'DeepSeek Chat', '智谱 GLM-4-Flash', '通义 Qwen-Turbo'],
    };
  }

  // 有 too_tight / tight 的模型：建议升级硬件 / 量化
  const sorted = sortMatches(allAvailable);
  const tightest = sorted[sorted.length - 1];
  if (!tightest) {
    // 理论上不会到这里（前面已判空），但 TS 需要兜底
    return {
      reason: '无法生成建议',
      suggestion: '请重试或报告 issue',
      minRequiredVram: null,
      apiAlternatives: [],
    };
  }
  const currentVram = hardware.gpu.length > 0
    ? Math.max(...hardware.gpu.map(g => g.vram))
    : hardware.memory.available;
  const gap = tightest.vramMin - currentVram;

  return {
    reason: `推荐模型需要至少 ${tightest.vramMin}GB 显存/内存，你只有 ${currentVram.toFixed(1)}GB（差 ${gap.toFixed(1)}GB）`,
    suggestion: `建议：(1) 关闭其他程序释放内存 (2) 用更小的量化（如 Q2_K） (3) 升级硬件 (4) 用云 API`,
    minRequiredVram: tightest.vramMin,
    apiAlternatives: ['OpenAI GPT-4o-mini', 'Anthropic Claude 3.5 Haiku', 'DeepSeek Chat'],
  };
}

/**
 * 3 档推荐主入口
 *
 * @param allMatches - matcher 输出的所有 MatchResult
 * @param hardware - 原始 hardware（用于兜底建议）
 * @returns RecommendedModels
 *
 * @example
 *   const matches = matchAll(table, hardware);
 *   const rec = recommend(matches, hardware);
 *   console.log(rec.balanced[0].modelName);  // "Qwen3-8B"
 */
export function recommend(allMatches: MatchResult[], hardware: HardwareProfile): RecommendedModels {
  const conservative = topN(filterByTier(allMatches, 'conservative'), TOP_N_PER_TIER);
  const balanced = topN(filterByTier(allMatches, 'balanced'), TOP_N_PER_TIER);
  const aggressive = topN(filterByTier(allMatches, 'aggressive'), TOP_N_PER_TIER);

  const fallback = buildFallback(allMatches, hardware);

  return {
    conservative,
    balanced,
    aggressive,
    fallback,
  };
}

/**
 * 内部辅助：找"vram 需求最小且能跑"的模型。
 * 算法：先按 vramMin 升序，再按 fitLevel 优先级降序，取第一个 fitLevel != 'too_tight' 的。
 *
 * 注：之前的 reverse + find 逻辑错了（"cheapest" 应该是 vram 需求最小，不是 quality 最高反过来）。
 */
export function findCheapestFit(matches: MatchResult[]): MatchResult | null {
  if (matches.length === 0) return null;

  // 1. 按 vramMin 升序（需求最小优先）
  const byVram = [...matches].sort((a, b) => a.vramMin - b.vramMin);
  // 2. 在能跑（fitLevel != 'too_tight'）的里取第一个
  return byVram.find(m => m.fitLevel !== 'too_tight') ?? null;
}
