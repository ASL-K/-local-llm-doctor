// =====================================================================
// src/output/table.ts
//
// v0.4.5 输出美化：4 个优化 + 顶部 banner 简洁版 + 总结 + emoji
//
//   1. 3 档标题不双语并列（[保守档] 开箱即用）
//   2. 第 1 列加宽（12 → 14）
//   3. 适配度列不双语（△ 偏紧 而不是 △ 偏紧 tight）
//   4. TPS 缺失 → N/A（而不是 -）
//   5. 顶部 banner 简洁版（box 改简洁 1 行）
//   6. 加 "你的电脑能跑 X 个模型" 总结
//   7. 加 emoji 图标（🖥️ / 💡 / 🚀 / ⚠️ / ✅）
// =====================================================================

import Table from 'cli-table3';
import type { HardwareProfile } from '../types.js';
import type { MatchResult, RecommendedModels } from '../models/types.js';
import { colorizeTier, colorizeTitle, colorizeFallback, colorizeSuccess } from './format.js';
import { t, type Lang, DEFAULT_LANG } from '../i18n/strings.js';

const REASON_MAX_WIDTH = 50;

// =====================================================================
// Emoji 图标
// =====================================================================
const EMOJI = {
  hw: '🖥️',     // 硬件
  rec: '💡',     // 推荐
  fall: '⚠️',    // 兜底
  check: '✅',   // 完成
  rocket: '🚀',  // 启动
  save: '📊',    // 总结
  tier1: '🌱',   // 保守档
  tier2: '⚖️',    // 平衡档
  tier3: '🚀',   // 激进档
  disk: '💾',    // 磁盘
  cpu: '🧠',     // CPU
  mem: '🧠',     // 内存
  gpu: '🎮',     // GPU
  os: '🖥️',     // OS
  api: '☁️',     // API
} as const;

/**
 * 内部：截断字符串（保持中文友好）
 */
function truncate(str: string, maxWidth: number): string {
  if (!str) return '';
  if (maxWidth <= 0) return '';
  const ellipsisWidth = 1;
  const strWidth = computeWidth(str);
  if (strWidth <= maxWidth) return str;
  // 计算 ellipsis
  let result = '';
  let w = 0;
  for (const ch of str) {
    const chWidth = isWideChar(ch) ? 2 : 1;
    if (w + chWidth + ellipsisWidth > maxWidth) {
      result += '…';
      break;
    }
    result += ch;
    w += chWidth;
  }
  return result;
}

/**
 * 内部：判断宽字符（CJK 算 2 宽）
 */
function isWideChar(ch: string): boolean {
  const code = ch.codePointAt(0) || 0;
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0x303e) ||
    (code >= 0x3041 && code <= 0x33ff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xa000 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6)
  );
}

function computeWidth(str: string): number {
  let w = 0;
  for (const ch of str) {
    w += isWideChar(ch) ? 2 : 1;
  }
  return w;
}

/**
 * 渲染硬件检测结果
 */
export function renderHardware(hw: HardwareProfile, lang: Lang = DEFAULT_LANG): string {
  const cliTable = new Table({
    head: [t('hw.col.item', lang), t('hw.col.value', lang)],
    colWidths: [15, 60],
    wordWrap: true,
  });

  // OS
  let osLine = hw.os.distro;
  if (hw.os.wsl) {
    osLine += ` (WSL${hw.os.wslVersion || ''})`;
  }
  cliTable.push([`${EMOJI.os} OS`, osLine]);

  // CPU
  cliTable.push([
    `${EMOJI.cpu} CPU`,
    t('hw.cpu', lang, { brand: hw.cpu.brand, cores: hw.cpu.cores, threads: hw.cpu.threads, arch: hw.cpu.arch }),
  ]);

  // 内存
  cliTable.push([
    `${EMOJI.mem} ${t('memory.label', lang)}`,
    t('hw.memory', lang, { total: hw.memory.total.toFixed(1), available: hw.memory.available.toFixed(1) }),
  ]);

  // 磁盘
  const diskKey = hw.disk.type !== 'unknown' ? 'hw.disk' : 'hw.disk.untype';
  const diskParams = { total: hw.disk.total.toFixed(1), available: hw.disk.available.toFixed(1) };
  const diskValue = hw.disk.type !== 'unknown'
    ? t(diskKey, lang, { ...diskParams, type: hw.disk.type })
    : t(diskKey, lang, diskParams);
  cliTable.push([`${EMOJI.disk} ${t('disk.label', lang)}`, diskValue]);

  // GPU
  if (hw.gpu.length === 0) {
    cliTable.push([`${EMOJI.gpu} GPU`, t('hw.gpu.none', lang)]);
  } else {
    const primary = hw.gpu.reduce((a, b) => (b.vram > a.vram ? b : a));
    const gpuLine =
      `${primary.model} (${primary.vendor}, ${primary.vram} GB VRAM` +
      (primary.cudaSupported ? t('hw.gpu.cuda', lang) : '') +
      (primary.metalSupported ? t('hw.gpu.metal', lang) : '') +
      ')';
    cliTable.push([`${EMOJI.gpu} GPU`, gpuLine]);
    if (hw.gpu.length > 1) {
      cliTable.push([`${EMOJI.gpu}×N`, t('hw.gpu.multi', lang, { n: hw.gpu.length })]);
    }
  }

  return cliTable.toString();
}

/**
 * 渲染适配度（v0.4.5：只中文，不双语）
 */
function renderFitLevel(fit: string, lang: Lang): string {
  const map: Record<string, { zh: string; en: string; icon: string }> = {
    perfect:     { zh: '完美',     en: 'perfect',     icon: '✓' },
    comfortable: { zh: '舒适',     en: 'comfortable', icon: '○' },
    tight:       { zh: '偏紧',     en: 'tight',       icon: '△' },
    too_tight:   { zh: '勉强',     en: 'too_tight',   icon: '⚠' },
  };
  const entry = map[fit];
  if (!entry) return fit;
  const text = lang === 'zh' ? entry.zh : entry.en;
  return `${entry.icon} ${text}`;
}

/**
 * 渲染单个档位的推荐表
 */
function renderTierTable(
  _tierKey: 'conservative' | 'balanced' | 'aggressive',
  matches: MatchResult[],
  lang: Lang = DEFAULT_LANG,
): string {
  const cliTable = new Table({
    head: [
      t('rec.col.model', lang),
      t('rec.col.quant', lang),
      t('rec.col.fit', lang),
      t('rec.col.tps', lang),
      t('rec.col.q', lang),
      t('rec.col.reason', lang),
    ],
    // v0.4.5：去掉第 1 列档位（标题已经标了，不再重复）
    colWidths: [22, 9, 12, 7, 4, REASON_MAX_WIDTH],
    wordWrap: true,
  });

  if (matches.length === 0) {
    cliTable.push([t('rec.empty', lang)]);
    return cliTable.toString();
  }

  for (const m of matches) {
    // v0.4.5：TPS=0 显示 N/A（而不是 '-'）
    const tpsValue = m.estimatedTps > 0 ? String(m.estimatedTps) : 'N/A';
    cliTable.push([
      m.modelName,
      m.quantLevel || '-',
      renderFitLevel(m.fitLevel, lang),
      tpsValue,
      String(m.qualityScore),
      truncate(m.reason, REASON_MAX_WIDTH),
    ]);
  }

  return cliTable.toString();
}

/**
 * 渲染 3 档推荐（v0.4.5：简洁标题）
 */
export function renderRecommendations(rec: RecommendedModels, lang: Lang = DEFAULT_LANG): string {
  const sections: string[] = [];

  const tierEmojis: Record<string, string> = {
    conservative: EMOJI.tier1,
    balanced: EMOJI.tier2,
    aggressive: EMOJI.tier3,
  };
  const tierNames: Record<string, string> = {
    conservative: t('tier.conservative', lang),
    balanced: t('tier.balanced', lang),
    aggressive: t('tier.aggressive', lang),
  };
  const tierDescs: Record<string, string> = {
    conservative: t('tier.conservative.desc', lang),
    balanced: t('tier.balanced.desc', lang),
    aggressive: t('tier.aggressive.desc', lang),
  };

  // 3 个 tier（v0.4.5：简洁标题 [保守档] 开箱即用）
  const tiers: Array<'conservative' | 'balanced' | 'aggressive'> = ['conservative', 'balanced', 'aggressive'];
  tiers.forEach((tier, idx) => {
    const sep = idx === 0 ? '┌─' : idx === tiers.length - 1 ? '└─' : '├─';
    const end = idx === 0 ? '─' : idx === tiers.length - 1 ? '┘' : '┤';
    sections.push(
      sep + ' ' +
      tierEmojis[tier] + ' ' +
      colorizeTier(tier) + ' │ ' +
      (tierDescs[tier] ?? '') +
      ' ' + '─'.repeat(Math.max(0, 56 - (tierDescs[tier]?.length ?? 0) - (tierNames[tier]?.length ?? 0))) +
      end
    );
    sections.push(renderTierTable(tier, rec[tier], lang));
    if (idx < tiers.length - 1) sections.push('');
  });

  // 兜底
  sections.push('');
  sections.push('├─ ' + EMOJI.fall + ' ' + colorizeFallback() + ' ' + '─'.repeat(50) + '┤');
  sections.push(renderFallback(rec.fallback));

  return sections.join('\n');
}

/**
 * 渲染兜底建议
 */
function renderFallback(fb: RecommendedModels['fallback'], lang: Lang = DEFAULT_LANG): string {
  const cliTable = new Table({
    head: [t('fallback.col.item', lang), t('fallback.col.value', lang)],
    colWidths: [15, 60],
    wordWrap: true,
  });

  cliTable.push([`${EMOJI.fall} ${t('fallback.col.reason', lang)}`, fb.reason]);
  cliTable.push([`💡 ${t('fallback.col.suggestion', lang)}`, fb.suggestion]);
  cliTable.push([
    `${EMOJI.save} ${t('fallback.col.min', lang)}`,
    fb.minRequiredVram === null
      ? t('fallback.min.unavailable', lang)
      : t('fallback.min.value', lang, { n: fb.minRequiredVram }),
  ]);
  cliTable.push([`${EMOJI.api} ${t('fallback.col.api', lang)}`, fb.apiAlternatives.join(' / ')]);

  return cliTable.toString();
}

/**
 * 渲染完整输出（v0.4.5：简洁 banner + 总结）
 */
export function renderFull(
  hw: HardwareProfile,
  rec: RecommendedModels,
  lang: Lang = DEFAULT_LANG,
  totalMs: number = 0,
  totalModelsInTable: number = 0,
): string {
  const sections: string[] = [];

  // v0.4.5：简洁顶部 banner（单行 + 副标题）
  sections.push(colorizeTitle(`${EMOJI.rocket} ${t('appName', lang)} v0.4 — ${t('title', lang)}`));
  sections.push(colorizeSuccess() + ` ✓ ${totalMs}ms · 你的电脑能跑 ${rec.conservative.length + rec.balanced.length + rec.aggressive.length} 个模型（${totalModelsInTable} 个总表里）`);
  sections.push('');

  // 硬件信息
  sections.push(`${EMOJI.hw} ${t('section.hw', lang)}`);
  sections.push(renderHardware(hw, lang));
  sections.push('');

  // 推荐结果
  sections.push(`${EMOJI.rec} ${t('section.rec', lang)}`);
  sections.push(renderRecommendations(rec, lang));

  return sections.join('\n');
}
