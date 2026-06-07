// =====================================================================
// src/output/format.ts
//
// 用 chalk 给输出上色。
// 颜色映射：
//   - fitLevel:  perfect=green / comfortable=cyan / tight=yellow / too_tight=red
//   - tier:      conservative=blue / balanced=magenta / aggressive=red
//   - metric:    主指标用 bold
//
// chalk v5 在 Windows PowerShell / WSL / macOS Terminal 都能正常显示 ANSI 颜色。
// 在老 Windows CMD 上可能显示乱码，v0.3 加 --no-color 选项。
// =====================================================================

import chalk from 'chalk';
import type { FitLevel } from '../models/types.js';

const FIT_LEVEL_COLORS: Record<FitLevel, (s: string) => string> = {
  perfect: chalk.green.bold,
  comfortable: chalk.cyan,
  tight: chalk.yellow,
  too_tight: chalk.red,
  no: chalk.gray,
};

const FIT_LEVEL_BADGE: Record<FitLevel, string> = {
  perfect: '✓ 完美',
  comfortable: '○ 舒适',
  tight: '△ 偏紧',
  too_tight: '✗ 太紧',
  no: '? 无法跑',
};

/**
 * 给 fitLevel 字符串上色
 */
export function colorizeFitLevel(level: FitLevel): string {
  const colorFn = FIT_LEVEL_COLORS[level];
  return colorFn(level);
}

/**
 * 给 fitLevel 加上人类可读 badge
 */
export function formatFitLevel(level: FitLevel): string {
  return `${FIT_LEVEL_COLORS[level](FIT_LEVEL_BADGE[level])} ${FIT_LEVEL_COLORS[level](level)}`;
}

/**
 * 给档位名上色（保守/平衡/激进）
 */
export function colorizeTier(tier: 'conservative' | 'balanced' | 'aggressive'): string {
  switch (tier) {
    case 'conservative':
      return chalk.blue(tier);
    case 'balanced':
      return chalk.magenta(tier);
    case 'aggressive':
      return chalk.red(tier);
  }
}

/**
 * 给"我电脑能跑哪个 LLM"标题加颜色
 */
export function colorizeTitle(s: string): string {
  return chalk.bold.cyan(s);
}

/**
 * 给"vram 数字"上色
 */
export function colorizeVram(gb: number): string {
  if (gb >= 16) return chalk.green.bold(`${gb}GB`);
  if (gb >= 8) return chalk.cyan(`${gb}GB`);
  if (gb >= 4) return chalk.yellow(`${gb}GB`);
  return chalk.gray(`${gb}GB`);
}

/**
 * "兜底"标签上色
 */
export function colorizeFallback(): string {
  return chalk.red.bold('⚠ 兜底建议');
}

/**
 * "成功"标签上色
 */
export function colorizeSuccess(): string {
  return chalk.green.bold('✓');
}
