// =====================================================================
// src/output/table.ts
//
// v0.4.2a i18n 化：所有硬编码中文替换为 t() 调用。
// 注意：cli-table3 的 `new Table()` 局部变量名改成 `cliTable`，
//       避免和 i18n 的 `t()` 函数冲突。
//
// 函数签名：所有 render* 函数加 `lang: Lang` 参数（默认 'zh'，向后兼容）。
// =====================================================================

import Table from 'cli-table3';
import type { HardwareProfile } from '../types.js';
import type { MatchResult, RecommendedModels } from '../models/types.js';
import { formatFitLevel, colorizeTier, colorizeTitle, colorizeFallback } from './format.js';
import { t, type Lang, DEFAULT_LANG } from '../i18n/strings.js';

const REASON_MAX_WIDTH = 50;

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
  cliTable.push([t('os.label', lang), osLine]);

  // CPU
  cliTable.push([
    t('cpu.label', lang),
    t('hw.cpu', lang, { brand: hw.cpu.brand, cores: hw.cpu.cores, threads: hw.cpu.threads, arch: hw.cpu.arch }),
  ]);

  // 内存
  cliTable.push([
    t('memory.label', lang),
    t('hw.memory', lang, { total: hw.memory.total.toFixed(1), available: hw.memory.available.toFixed(1) }),
  ]);

  // 磁盘
  const diskKey = hw.disk.type !== 'unknown' ? 'hw.disk' : 'hw.disk.untype';
  const diskParams = { total: hw.disk.total.toFixed(1), available: hw.disk.available.toFixed(1) };
  const diskValue = hw.disk.type !== 'unknown'
    ? t(diskKey, lang, { ...diskParams, type: hw.disk.type })
    : t(diskKey, lang, diskParams);
  cliTable.push([t('disk.label', lang), diskValue]);

  // GPU
  if (hw.gpu.length === 0) {
    cliTable.push([t('gpu.label', lang), t('hw.gpu.none', lang)]);
  } else {
    // 显示主 GPU
    const primary = hw.gpu.reduce((a, b) => (b.vram > a.vram ? b : a));
    const gpuLine =
      `${primary.model} (${primary.vendor}, ${primary.vram} GB VRAM` +
      (primary.cudaSupported ? t('hw.gpu.cuda', lang) : '') +
      (primary.metalSupported ? t('hw.gpu.metal', lang) : '') +
      ')';
    cliTable.push([t('gpu.label', lang), gpuLine]);
    if (hw.gpu.length > 1) {
      cliTable.push([t('gpu.multi.label', lang), t('hw.gpu.multi', lang, { n: hw.gpu.length })]);
    }
  }

  return cliTable.toString();
}

/**
 * 渲染单个档位的推荐表
 */
function renderTierTable(
  tierKey: 'conservative' | 'balanced' | 'aggressive',
  matches: MatchResult[],
  lang: Lang = DEFAULT_LANG,
): string {
  const cliTable = new Table({
    head: [
      t('rec.col.tier', lang),
      t('rec.col.model', lang),
      t('rec.col.quant', lang),
      t('rec.col.fit', lang),
      t('rec.col.tps', lang),
      t('rec.col.q', lang),
      t('rec.col.reason', lang),
    ],
    colWidths: [12, 22, 8, 16, 6, 4, REASON_MAX_WIDTH],
    wordWrap: true,
  });

  if (matches.length === 0) {
    cliTable.push([t('rec.empty', lang)]);
    return cliTable.toString();
  }

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]!;
    // 第 1 列：1st 行显示"档位英文"，其余空
    const label = i === 0 ? colorizeTier(tierKey) : '';
    cliTable.push([
      label,
      m.modelName,
      m.quantLevel || '-',
      formatFitLevel(m.fitLevel),
      m.estimatedTps ? String(m.estimatedTps) : t('tps.unknown', lang),
      String(m.qualityScore),
      truncate(m.reason, REASON_MAX_WIDTH),
    ]);
  }

  return cliTable.toString();
}

/**
 * 渲染 3 档推荐
 */
export function renderRecommendations(rec: RecommendedModels, lang: Lang = DEFAULT_LANG): string {
  const sections: string[] = [];

  sections.push(
    '┌─ ' + colorizeTier('conservative') + ' ' + t('tier.conservative', lang) + ' (' + t('tier.conservative.desc', lang) + ') ' + '─'.repeat(Math.max(0, 64 - t('tier.conservative', lang).length - t('tier.conservative.desc', lang).length)) + '┐'
  );
  sections.push(renderTierTable('conservative', rec.conservative, lang));
  sections.push('');
  sections.push(
    '├─ ' + colorizeTier('balanced') + ' ' + t('tier.balanced', lang) + ' (' + t('tier.balanced.desc', lang) + ') ' + '─'.repeat(Math.max(0, 64 - t('tier.balanced', lang).length - t('tier.balanced.desc', lang).length)) + '┤'
  );
  sections.push(renderTierTable('balanced', rec.balanced, lang));
  sections.push('');
  sections.push(
    '├─ ' + colorizeTier('aggressive') + ' ' + t('tier.aggressive', lang) + ' (' + t('tier.aggressive.desc', lang) + ') ' + '─'.repeat(Math.max(0, 64 - t('tier.aggressive', lang).length - t('tier.aggressive.desc', lang).length)) + '┤'
  );
  sections.push(renderTierTable('aggressive', rec.aggressive, lang));
  sections.push('');
  sections.push('└─ ' + colorizeFallback() + ' ' + '─'.repeat(60) + '┘');
  sections.push(renderFallback(rec.fallback, lang));

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

  cliTable.push([t('fallback.col.reason', lang), fb.reason]);
  cliTable.push([t('fallback.col.suggestion', lang), fb.suggestion]);
  cliTable.push([
    t('fallback.col.min', lang),
    fb.minRequiredVram === null
      ? t('fallback.min.unavailable', lang)
      : t('fallback.min.value', lang, { n: fb.minRequiredVram }),
  ]);
  cliTable.push([t('fallback.col.api', lang), fb.apiAlternatives.join(' / ')]);

  return cliTable.toString();
}

/**
 * 渲染完整输出（硬件 + 3 档推荐）
 */
export function renderFull(hw: HardwareProfile, rec: RecommendedModels, lang: Lang = DEFAULT_LANG): string {
  const sections: string[] = [];

  sections.push('╔══════════════════════════════════════════════════════════════╗');
  sections.push('║  ' + colorizeTitle(t('appName', lang) + ' v0.4 — ' + t('title', lang)) + '  ║');
  sections.push('╚══════════════════════════════════════════════════════════════╝');
  sections.push('');
  sections.push('── ' + t('section.hw', lang) + ' ' + '─'.repeat(60));
  sections.push(renderHardware(hw, lang));
  sections.push('');
  sections.push('── ' + t('section.rec', lang) + ' ' + '─'.repeat(60));
  sections.push(renderRecommendations(rec, lang));

  return sections.join('\n');
}
