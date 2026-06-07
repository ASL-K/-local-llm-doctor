// =====================================================================
// src/output/table.ts
//
// 用 cli-table3 渲染硬件检测结果和 3 档推荐。
// 不含颜色（v0.2.2b 加 chalk 上色）。
//
// 边界处理：
//   - matchResult 为空时显示 "(无)"
//   - GPU 列表超过 1 个时只显示主 GPU
//   - 长 reason 文本截断到 50 字符（不破坏表格布局）
// =====================================================================

import Table from 'cli-table3';
import type { HardwareProfile } from '../types.js';
import type { MatchResult, RecommendedModels } from '../models/types.js';
import { formatFitLevel, colorizeTier, colorizeTitle, colorizeFallback } from './format.js';

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
    (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
    (code >= 0x2e80 && code <= 0x303e) || // CJK Radicals
    (code >= 0x3041 && code <= 0x33ff) || // Hiragana/Katakana
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Unified Ideographs Extension A
    (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
    (code >= 0xa000 && code <= 0xa4cf) || // Yi
    (code >= 0xac00 && code <= 0xd7a3) || // Hangul Syllables
    (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
    (code >= 0xfe30 && code <= 0xfe4f) || // CJK Compatibility Forms
    (code >= 0xff00 && code <= 0xff60) || // Fullwidth Forms
    (code >= 0xffe0 && code <= 0xffe6)    // Fullwidth Signs
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
export function renderHardware(hw: HardwareProfile): string {
  const t = new Table({
    head: ['项', '值'],
    colWidths: [15, 60],
    wordWrap: true,
  });

  // OS
  let osLine = hw.os.distro;
  if (hw.os.wsl) {
    osLine += ` (WSL${hw.os.wslVersion || ''})`;
  }
  t.push(['OS', osLine]);

  // CPU
  t.push(['CPU', `${hw.cpu.brand} (${hw.cpu.cores}核 ${hw.cpu.threads}线程, ${hw.cpu.arch})`]);

  // 内存
  t.push(['内存', `总计 ${hw.memory.total.toFixed(1)} GB / 可用 ${hw.memory.available.toFixed(1)} GB`]);

  // 磁盘
  t.push(['磁盘', `总计 ${hw.disk.total.toFixed(1)} GB / 可用 ${hw.disk.available.toFixed(1)} GB${hw.disk.type !== 'unknown' ? ` (${hw.disk.type})` : ''}`]);

  // GPU
  if (hw.gpu.length === 0) {
    t.push(['GPU', '无独立显卡（用 CPU/集成显卡）']);
  } else {
    // 显示主 GPU
    const primary = hw.gpu.reduce((a, b) => (b.vram > a.vram ? b : a));
    const gpuLine = `${primary.model} (${primary.vendor}, ${primary.vram} GB VRAM${primary.cudaSupported ? ', CUDA' : ''}${primary.metalSupported ? ', Metal' : ''})`;
    t.push(['GPU', gpuLine]);
    if (hw.gpu.length > 1) {
      t.push(['GPU×N', `共 ${hw.gpu.length} 张卡（仅显示主 GPU）`]);
    }
  }

  return t.toString();
}

/**
 * 渲染单个档位的推荐表
 */
function renderTierTable(tierName: '保守' | '平衡' | '激进', matches: MatchResult[]): string {
  const t = new Table({
    head: ['', '模型', '量化', '适配度', 'TPS~', 'Q', '原因'],
    colWidths: [10, 22, 8, 16, 6, 4, REASON_MAX_WIDTH],
    wordWrap: true,
  });

  if (matches.length === 0) {
    t.push(['(无推荐)']);
    return t.toString();
  }

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]!;
    // 第 1 列：1st 行显示"档位 + 中档名"，其余空
    const label = i === 0 ? `${colorizeTier(mapTierName(tierName))} (${tierName})` : '';
    t.push([
      label,
      m.modelName,
      m.quantLevel || '-',
      formatFitLevel(m.fitLevel),
      String(m.estimatedTps || 0),
      String(m.qualityScore),
      truncate(m.reason, REASON_MAX_WIDTH),
    ]);
  }

  return t.toString();
}

/** 内部：中档名 → 英文档位 */
function mapTierName(name: '保守' | '平衡' | '激进'): 'conservative' | 'balanced' | 'aggressive' {
  if (name === '保守') return 'conservative';
  if (name === '平衡') return 'balanced';
  return 'aggressive';
}

/**
 * 渲染 3 档推荐（conservative / balanced / aggressive）
 */
export function renderRecommendations(rec: RecommendedModels): string {
  const sections: string[] = [];

  sections.push('┌─ ' + colorizeTier('conservative') + ' 档（保守 / 开箱即用） ──────────────────────────────────┐');
  sections.push(renderTierTable('保守', rec.conservative));
  sections.push('');
  sections.push('├─ ' + colorizeTier('balanced') + ' 档（平衡 / 默认推荐） ──────────────────────────────────┤');
  sections.push(renderTierTable('平衡', rec.balanced));
  sections.push('');
  sections.push('├─ ' + colorizeTier('aggressive') + ' 档（激进 / 高配挑战） ──────────────────────────────────┤');
  sections.push(renderTierTable('激进', rec.aggressive));
  sections.push('');
  sections.push('└─ ' + colorizeFallback() + ' ─────────────────────────────────────────────────────┘');
  sections.push(renderFallback(rec.fallback));

  return sections.join('\n');
}

/**
 * 渲染兜底建议
 */
function renderFallback(fb: RecommendedModels['fallback']): string {
  const t = new Table({
    head: ['项', '值'],
    colWidths: [15, 60],
    wordWrap: true,
  });

  t.push(['原因', fb.reason]);
  t.push(['建议', fb.suggestion]);
  t.push(['最少需要', fb.minRequiredVram === null ? '无可行方案' : `${fb.minRequiredVram} GB`]);
  t.push(['API 替代', fb.apiAlternatives.join(' / ')]);

  return t.toString();
}

/**
 * 渲染完整输出（硬件 + 3 档推荐）
 */
export function renderFull(hw: HardwareProfile, rec: RecommendedModels): string {
  const sections: string[] = [];

  sections.push('╔══════════════════════════════════════════════════════════════╗');
  sections.push('║  ' + colorizeTitle('local-llm-doctor v0.2 — 我电脑能跑哪个 LLM？') + '     ║');
  sections.push('╚══════════════════════════════════════════════════════════════╝');
  sections.push('');
  sections.push('── 硬件信息 ─────────────────────────────────────────────────────────');
  sections.push(renderHardware(hw));
  sections.push('');
  sections.push('── 推荐结果 ─────────────────────────────────────────────────────────');
  sections.push(renderRecommendations(rec));

  return sections.join('\n');
}
