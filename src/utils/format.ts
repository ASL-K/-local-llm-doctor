// =====================================================================
// src/utils/format.ts
//
// 数字和单位格式化工具。
// 所有 vram / ram 单位都是 GB（不是 MB / KB）。
// =====================================================================

/**
 * 格式化 GB 数字。
 * - 自动切换到 MB（小于 0.01 GB）
 * - 负数加负号
 *
 * @example
 *   formatGB(5.64)         // "5.64 GB"
 *   formatGB(0.005)        // "5.12 MB"
 *   formatGB(24, 0)        // "24 GB"
 *   formatGB(-2.5)         // "-2.50 GB"
 */
export function formatGB(gb: number, decimals = 2): string {
  if (Number.isNaN(gb) || !Number.isFinite(gb)) {
    return 'N/A';
  }
  if (gb < 0) {
    return `-${formatGB(-gb, decimals)}`;
  }
  if (gb < 0.01 && gb > 0) {
    return `${(gb * 1024).toFixed(decimals)} MB`;
  }
  return `${gb.toFixed(decimals)} GB`;
}

/**
 * 格式化 MB 数字。
 * - 自动切换到 GB / KB
 */
export function formatMB(mb: number, decimals = 0): string {
  if (Number.isNaN(mb) || !Number.isFinite(mb)) {
    return 'N/A';
  }
  if (mb < 0) {
    return `-${formatMB(-mb, decimals)}`;
  }
  if (mb < 1 && mb > 0) {
    return `${(mb * 1024).toFixed(decimals)} KB`;
  }
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(decimals)} GB`;
  }
  return `${mb.toFixed(decimals)} MB`;
}

/**
 * 格式化百分比（0-1 → 0%-100%）。
 */
export function formatPercent(value: number, decimals = 1): string {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 'N/A';
  }
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * 格式化数字（加千分位）。
 */
export function formatNumber(value: number): string {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 'N/A';
  }
  return value.toLocaleString('en-US');
}

/**
 * 格式化 LLM 推理速度（tokens per second）。
 * - 小于 1 t/s 时切换到 tokens per minute
 */
export function formatTPS(tps: number): string {
  if (Number.isNaN(tps) || !Number.isFinite(tps) || tps < 0) {
    return 'N/A';
  }
  if (tps < 1) {
    return `${(tps * 60).toFixed(0)} tok/min`;
  }
  return `${tps.toFixed(0)} t/s`;
}

/**
 * 格式化耗时（ms → s → min）。
 */
export function formatDuration(ms: number): string {
  if (Number.isNaN(ms) || !Number.isFinite(ms) || ms < 0) {
    return 'N/A';
  }
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${(ms / 60_000).toFixed(1)}min`;
}

/**
 * 截断字符串到指定长度（中文按 2 个字符宽度算）。
 * 终端表格里防止溢出。
 */
export function truncate(str: string, maxWidth: number): string {
  if (!str) return '';
  if (maxWidth <= 0) return '';
  // 计算字符串真实宽度（英文 1，中文 2）
  const ellipsisWidth = 1;
  const strWidth = computeWidth(str);
  // 能完整放下：直接返回
  if (strWidth <= maxWidth) return str;
  // 放不下：尝试逐字加，加到放不下 + ellipsis 时停止
  let width = 0;
  let result = '';
  for (const ch of str) {
    const w = ch.charCodeAt(0) > 127 ? 2 : 1;
    // 加完这个字符 + ellipsis 仍 ≤ maxWidth → 加
    if (width + w + ellipsisWidth <= maxWidth) {
      result += ch;
      width += w;
    } else {
      result += '…';
      break;
    }
  }
  return result;
}

/**
 * 计算字符串显示宽度（中文 = 2，英文 = 1）。
 * 不导出，仅 truncate 内部用。
 */
function computeWidth(str: string): number {
  let w = 0;
  for (const ch of str) {
    w += ch.charCodeAt(0) > 127 ? 2 : 1;
  }
  return w;
}
