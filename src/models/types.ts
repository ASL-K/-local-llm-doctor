// =====================================================================
// src/models/types.ts
//
// 模型推荐表 + 匹配结果的所有 TypeScript 类型定义。
// 这是 matcher 算法和 recommend 层的"合同"。
//
// 设计原则：
//   1. table.json 的结构 → ModelTable 类型
//   2. matcher 输出 → MatchResult 类型
//   3. recommend 输出 → RecommendedModels 类型
//   4. 共享字段（QuantLevel / HardwareKey）单独抽出来
// =====================================================================

/**
 * 量化等级信息。
 * 包含"能跑起来的最小资源"和"该量化下的质量分"。
 */
export interface QuantLevel {
  /** 最小 VRAM 需求（GB）*/
  vram_min: number;
  /** 最小 RAM 需求（GB）*/
  ram_min: number;
  /** 该量化等级下的质量分（0-100）*/
  quality_score: number;
}

/**
 * 6 个标准量化等级 + 一些社区常用变体。
 * v0.1 我们只认这 6 个等级（清晰、可解释）。
 */
export type QuantLevelName = 'Q2_K' | 'Q3_K_M' | 'Q4_K_M' | 'Q5_K_M' | 'Q6_K' | 'Q8_0';

/**
 * 10 个标准硬件 key，用于 tps_estimate 查表。
 * 不在表里的硬件 → 显示 N/A（v0.4.5 改 N/A，不用 0）。
 *
 * v0.5.2 加 a100_80gb / h100_80gb 满足高显存用户。
 */
export type HardwareKey =
  | 'm3_pro_18gb'      // Apple M3 Pro 18GB unified
  | 'rtx_4090_24gb'    // NVIDIA RTX 4090
  | 'rtx_3090_24gb'    // NVIDIA RTX 3090
  | 'rtx_3060_12gb'    // NVIDIA RTX 3060
  | 'rtx_4060_8gb'     // NVIDIA RTX 4060
  | 'a100_80gb'        // NVIDIA A100 80GB（数据中心卡）
  | 'h100_80gb'        // NVIDIA H100 80GB（数据中心卡）
  | 'cpu_8c_32gb'      // 8 核 32GB（CPU 推理）
  | 'cpu_4c_16gb'      // 4 核 16GB
  | 'cpu_2c_8gb';      // 2 核 8GB（5.64GB 用户的故事）

/**
 * 单个模型条目（对应 table.json 的 models 数组里的一个对象）。
 */
export interface ModelEntry {
  /** 唯一 ID，全小写（如 'qwen3-8b'）*/
  id: string;
  /** 显示名（如 'Qwen3-8B'）*/
  name: string;
  /** 系列名（如 'Qwen3'）*/
  family: string;
  /** 总参数量（十亿）*/
  params_b: number;
  /** 激活参数量（dense 模型 = params_b）*/
  active_b: number;
  /** 模型类型：dense（全参数）或 moe（混合专家）*/
  type: 'dense' | 'moe';
  /** 上下文长度（K tokens）*/
  context_k: number;
  /** 量化等级表（key 是量化名，value 是最小资源）*/
  quant_levels: Partial<Record<QuantLevelName, QuantLevel>>;
  /** TPS 估算表（key 是硬件，value 是 t/s）*/
  tps_estimate: Partial<Record<HardwareKey, number>>;
  /** 适合的场景（中文标签）*/
  best_for: string[];
  /** License（SPDX 或社区协议名）*/
  license: string;
  /** HuggingFace 模型 ID（GGUF 版）*/
  huggingface_id: string;
  /** 适合保守档（vram 小也能跑）*/
  tier_conservative: boolean;
  /** 适合平衡档（默认推荐）*/
  tier_balanced: boolean;
  /** 适合激进档（高配用户挑战）*/
  tier_aggressive: boolean;
  /** 可选：特殊说明（MoE / 显存需求 / 模型备注）*/
  note?: string;
  /** 首次发布日期（YYYY-MM）*/
  release_date: string;
}

/**
 * 模型表（对应整个 table.json）。
 */
export interface ModelTable {
  /** 表版本（YYYY-MM-DD）*/
  version: string;
  models: ModelEntry[];
}

// =====================================================================
// MatchResult：matcher.ts 的输出
// =====================================================================

/**
 * 适配等级。
 *  - 'perfect'      VRAM 是 min 的 1.5x+ （富裕）
 *  - 'comfortable'  VRAM 是 min 的 1.2x+ （舒适）
 *  - 'tight'        VRAM 是 min 的 1.05x+ （紧但能跑）
 *  - 'too_tight'    VRAM 接近 min （能跑但有 OOM 风险）
 *  - 'no'           完全跑不动（null result）
 */
export type FitLevel = 'perfect' | 'comfortable' | 'tight' | 'too_tight' | 'no';

/**
 * 3 档推荐的"档名"。
 * - conservative: 极小模型（< 4GB 显存需求）
 * - balanced:     中等模型（4-12GB 显存需求）
 * - aggressive:   大模型（>= 12GB 显存需求）
 *
 * 档位**由 model 的 vramMin 动态决定**（v0.3.2 引入），
 * 不再依赖 model.tierFlags 预定义。
 */
export type Tier = 'conservative' | 'balanced' | 'aggressive';

/**
 * 匹配结果。
 *  - modelId / modelName：哪个模型
 *  - quantLevel：推荐的量化等级
 *  - fitLevel：适配等级
 *  - reason：为什么是这个等级（人类可读）
 *  - estimatedTps：估算速度
 *  - qualityScore：质量分
 *  - vramMin / vramAvailable：用于 debug 输出
 *  - tierDynamic：v0.3.2 新加，3 档由 vramMin 动态决定
 *  - tierFlags：保留 v0.1 / v0.2 字段（向后兼容），但不再影响 recommend
 */
export interface MatchResult {
  modelId: string;
  modelName: string;
  family: string;
  quantLevel: QuantLevelName | null;
  fitLevel: FitLevel;
  reason: string;
  estimatedTps: number;
  qualityScore: number;
  /** 该量化需要的最小 VRAM（GB）*/
  vramMin: number;
  /** 实际可用 VRAM（GB）*/
  vramAvailable: number;
  /** 适合场景（best_for）*/
  bestFor: string[];
  /** v0.3.2 动态档位（推荐层用这个）*/
  tierDynamic: Tier;
  /** v0.1/v0.2 model 预定义档位（保留兼容，不再影响推荐）*/
  tierFlags: {
    conservative: boolean;
    balanced: boolean;
    aggressive: boolean;
  };
  /** 可选：特殊说明 */
  note?: string;
}

// =====================================================================
// RecommendedModels：recommend.ts 的输出
// =====================================================================

/**
 * 3 档推荐 + 兜底。
 *  - conservative：保底，开箱即用
 *  - balanced：默认推荐，最优质量/速度比
 *  - aggressive：高配挑战
 *  - fallback：跑不动时给什么建议（升级硬件 / 用 API）
 */
export interface RecommendedModels {
  conservative: MatchResult[];
  balanced: MatchResult[];
  aggressive: MatchResult[];
  fallback: FallbackSuggestion;
}

/**
 * 兜底建议。
 *  - reason：为什么跑不动
 *  - suggestion：建议用户怎么做
 *  - minRequiredVram：至少需要多少 VRAM
 */
export interface FallbackSuggestion {
  reason: string;
  suggestion: string;
  /** 至少需要多少 VRAM 才能跑（GB），null = 完全不可行（如 671B 模型）*/
  minRequiredVram: number | null;
  /** 推荐改用什么（API 名称）*/
  apiAlternatives: string[];
}
