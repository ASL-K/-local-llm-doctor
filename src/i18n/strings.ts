// =====================================================================
// src/i18n/strings.ts
//
// v0.4.1 i18n 框架。
// 集中管理所有用户可见字符串（避免中文散落各文件）。
//
// 当前支持：
//   - zh (默认) — 中文
//   - en        — English
//
// 用法：
//   import { t } from '../i18n/strings.js';
//   console.log(t('fallback.surplus', 'zh'));  // "盈余 XGB"
//   console.log(t('fallback.surplus', 'en'));  // "surplus XGB"
//   console.log(t('fallback.surplus', 'zh', { value: 0.9 }));  // "盈余 0.9GB"
//
// 变量替换：用 `{name}` 占位符，调用时传 params。
// =====================================================================

export type Lang = 'zh' | 'en';

export const DEFAULT_LANG: Lang = 'zh';

export const SUPPORTED_LANGS: Lang[] = ['zh', 'en'];

export const LANG_LABELS: Record<Lang, string> = {
  zh: '中文',
  en: 'English',
};

// =====================================================================
// 字符串字典
// =====================================================================
// 格式：<key>: { zh: '...', en: '...' }
// 变量用 {name} 占位
// =====================================================================

type Dict = Record<string, Record<Lang, string>>;

const STRINGS: Dict = {
  // ---- 标题 ----
  'title': {
    zh: '我电脑能跑哪个 LLM？',
    en: 'Which LLM runs on my computer?',
  },
  'appName': {
    zh: 'local-llm-doctor',
    en: 'local-llm-doctor',
  },

  // ---- 头部进度消息 ----
  'status.detecting': {
    zh: '正在检测硬件...',
    en: 'Detecting hardware...',
  },
  'status.detectDone': {
    zh: '硬件检测完成（{ms}ms）',
    en: 'Hardware detected ({ms}ms)',
  },
  'status.modelsLoaded': {
    zh: '已加载 {n} 个模型',
    en: 'Loaded {n} models',
  },
  'status.matchDone': {
    zh: '匹配完成（{n} 个模型能跑）',
    en: 'Match complete ({n} models fit)',
  },
  'status.recommendDone': {
    zh: '推荐生成（总耗时 {ms}ms）',
    en: 'Recommendations ready (total {ms}ms)',
  },

  // ---- 硬件表 ----
  'hw.header': {
    zh: '硬件信息',
    en: 'Hardware',
  },
  'hw.col.item': {
    zh: '项',
    en: 'Item',
  },
  'hw.col.value': {
    zh: '值',
    en: 'Value',
  },
  'hw.os.wsl': {
    zh: '{distro} (WSL{ver})',
    en: '{distro} (WSL{ver})',
  },
  'hw.cpu': {
    zh: '{brand} ({cores}核 {threads}线程, {arch})',
    en: '{brand} ({cores}c {threads}t, {arch})',
  },
  'hw.memory': {
    zh: '总计 {total} GB / 可用 {available} GB',
    en: 'Total {total} GB / Available {available} GB',
  },
  'hw.disk': {
    zh: '总计 {total} GB / 可用 {available} GB ({type})',
    en: 'Total {total} GB / Available {available} GB ({type})',
  },
  'hw.disk.untype': {
    zh: '总计 {total} GB / 可用 {available} GB',
    en: 'Total {total} GB / Available {available} GB',
  },
  'hw.gpu.none': {
    zh: '无独立显卡（用 CPU/集成显卡）',
    en: 'No discrete GPU (using CPU / integrated graphics)',
  },
  'hw.gpu.cuda': {
    zh: ', CUDA',
    en: ', CUDA',
  },
  'hw.gpu.metal': {
    zh: ', Metal',
    en: ', Metal',
  },
  'hw.gpu.multi': {
    zh: '共 {n} 张卡（仅显示主 GPU）',
    en: '{n} cards total (showing primary)',
  },

  // ---- 3 档标题 ----
  'tier.conservative': {
    zh: '保守档',
    en: 'Conservative',
  },
  'tier.conservative.desc': {
    zh: '开箱即用',
    en: 'out-of-the-box',
  },
  'tier.balanced': {
    zh: '平衡档',
    en: 'Balanced',
  },
  'tier.balanced.desc': {
    zh: '默认推荐',
    en: 'recommended',
  },
  'tier.aggressive': {
    zh: '激进档',
    en: 'Aggressive',
  },
  'tier.aggressive.desc': {
    zh: '高配挑战',
    en: 'high-end',
  },

  // ---- 推荐表头 ----
  'rec.empty': {
    zh: '(无推荐)',
    en: '(no recommendations)',
  },
  'rec.tier.conservative': {
    zh: '保守',
    en: 'Conservative',
  },
  'rec.tier.balanced': {
    zh: '平衡',
    en: 'Balanced',
  },
  'rec.tier.aggressive': {
    zh: '激进',
    en: 'Aggressive',
  },
  'rec.col.tier': {
    zh: '档位',
    en: 'Tier',
  },
  'rec.col.model': {
    zh: '模型',
    en: 'Model',
  },
  'rec.col.quant': {
    zh: '量化',
    en: 'Quant',
  },
  'rec.col.fit': {
    zh: '适配度',
    en: 'Fit',
  },
  'rec.col.tps': {
    zh: 'TPS~',
    en: 'TPS~',
  },
  'rec.col.q': {
    zh: 'Q',
    en: 'Q',
  },
  'rec.col.reason': {
    zh: '原因',
    en: 'Reason',
  },

  // ---- debug ----
  'debug.header': {
    zh: '调试：完整硬件信息',
    en: 'Debug: full hardware info',
  },
  'section.hw': {
    zh: '硬件信息',
    en: 'Hardware',
  },
  'section.rec': {
    zh: '推荐结果',
    en: 'Recommendations',
  },
  'section.debug': {
    zh: '调试：完整硬件信息',
    en: 'Debug: full hardware info',
  },
  'gpu.label': {
    zh: 'GPU',
    en: 'GPU',
  },
  'gpu.multi.label': {
    zh: 'GPU×N',
    en: 'GPU×N',
  },
  'os.label': {
    zh: 'OS',
    en: 'OS',
  },
  'cpu.label': {
    zh: 'CPU',
    en: 'CPU',
  },
  'memory.label': {
    zh: '内存',
    en: 'Memory',
  },
  'disk.label': {
    zh: '磁盘',
    en: 'Disk',
  },
  'tps.unknown': {
    zh: '-',
    en: '-',
  },

  // ---- 适配度 badge ----
  'fit.perfect': {
    zh: '完美 perfect',
    en: '✓ perfect',
  },
  'fit.comfortable': {
    zh: '舒适 comfortable',
    en: '○ comfortable',
  },
  'fit.tight': {
    zh: '偏紧 tight',
    en: '△ tight',
  },
  'fit.too_tight': {
    zh: '勉强 too_tight',
    en: '⚠ too_tight',
  },

  // ---- 兜底建议 ----
  'fallback.header': {
    zh: '兜底建议',
    en: 'Fallback',
  },
  'fallback.col.item': {
    zh: '项',
    en: 'Item',
  },
  'fallback.col.value': {
    zh: '值',
    en: 'Value',
  },
  'fallback.col.reason': {
    zh: '原因',
    en: 'Reason',
  },
  'fallback.col.suggestion': {
    zh: '建议',
    en: 'Suggestion',
  },
  'fallback.col.min': {
    zh: '最少需要',
    en: 'Min required',
  },
  'fallback.col.api': {
    zh: 'API 替代',
    en: 'API alternatives',
  },
  'fallback.min.unavailable': {
    zh: '无可行方案',
    en: 'No feasible solution',
  },
  'fallback.min.value': {
    zh: '{n} GB',
    en: '{n} GB',
  },

  // ---- fallback reason 文案（v0.3.1 3 分支）----
  'fallback.cant_run': {
    zh: '你电脑的可用显存/内存仅 {n}GB，本地 LLM 全部跑不动',
    en: 'Your available VRAM/RAM is only {n}GB. No local LLM will run.',
  },
  'fallback.no_match': {
    zh: '无法生成建议',
    en: 'Cannot generate suggestion',
  },
  'fallback.no_match_suggestion': {
    zh: '请重试或报告 issue',
    en: 'Please retry or report an issue',
  },
  'fallback.surplus': {
    zh: '推荐模型需 {need}GB，你有 {have}GB（盈余 {gap}GB）',
    en: 'Need {need}GB, you have {have}GB (surplus {gap}GB)',
  },
  'fallback.just_enough': {
    zh: '推荐模型需 {need}GB，你有 {have}GB（刚好够，但无余裕）',
    en: 'Need {need}GB, you have {have}GB (just enough, no buffer)',
  },
  'fallback.short': {
    zh: '推荐模型需 {need}GB，你只有 {have}GB（还差 {gap}GB）',
    en: 'Need {need}GB, you only have {have}GB (short by {gap}GB)',
  },
  'fallback.suggestion.body': {
    zh: '建议：(1) 关闭其他程序释放内存 (2) 用更小的量化（如 Q2_K） (3) 升级硬件 (4) 用云 API',
    en: 'Suggestion: (1) close other apps to free RAM (2) use smaller quant (e.g. Q2_K) (3) upgrade hardware (4) use cloud API',
  },

  // ---- CLI 帮助 ----
  'cli.usage.title': {
    zh: '用法',
    en: 'Usage',
  },
  'cli.usage.default': {
    zh: '美化表格输出（默认）',
    en: 'Colorful table output (default)',
  },
  'cli.usage.json': {
    zh: '原始 JSON 输出（脚本友好）',
    en: 'Raw JSON output (script-friendly)',
  },
  'cli.usage.debug': {
    zh: '表格 + 完整硬件信息',
    en: 'Table + full hardware info',
  },
  'cli.usage.lang': {
    zh: '输出语言（zh / en）',
    en: 'Output language (zh / en)',
  },
  'cli.usage.help': {
    zh: '显示帮助',
    en: 'Show this help',
  },
  'cli.example.title': {
    zh: '示例',
    en: 'Examples',
  },
};

// =====================================================================
// t() — 翻译 + 变量替换
// =====================================================================

/**
 * 翻译 key 为指定语言。
 *
 * @param key 字符串 key
 * @param lang 语言（zh / en）
 * @param params 变量替换（如 {n} → 5）
 * @returns 翻译后的字符串
 *
 * @example
 *   t('status.detectDone', 'zh', { ms: 234 })
 *   // → "硬件检测完成（234ms）"
 *
 *   t('status.detectDone', 'en', { ms: 234 })
 *   // → "Hardware detected (234ms)"
 */
export function t(key: string, lang: Lang = DEFAULT_LANG, params?: Record<string, string | number>): string {
  const entry = STRINGS[key];
  if (!entry) {
    // 找不到 key：返回 key 本身（让 bug 暴露）
    return `[missing:${key}]`;
  }
  const template = entry[lang] || entry[DEFAULT_LANG];

  if (!params) return template;

  // 变量替换：{name} → params.name
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    if (name in params) {
      return String(params[name]);
    }
    return match; // 找不到变量，保留原占位
  });
}

/**
 * 检测语言（按 process.env.LANG 或 LANG 环境变量）
 * Windows 默认 zh；Linux/Mac 按 LANG
 */
export function detectLang(): Lang {
  const envLang = process.env.LANG || process.env.LC_ALL || '';
  if (envLang.toLowerCase().startsWith('en')) return 'en';
  return DEFAULT_LANG;
}
