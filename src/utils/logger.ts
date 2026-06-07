// =====================================================================
// src/utils/logger.ts
//
// 轻量级 logger，支持 debug 模式。
// 后续 CLI 加 --debug 时打开。
// =====================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let debugEnabled = false;

/** 打开/关闭 debug 模式 */
export function setDebug(value: boolean): void {
  debugEnabled = value;
}

/** 当前是否为 debug 模式 */
export function isDebugMode(): boolean {
  return debugEnabled;
}

// ANSI 颜色码
const COLORS = {
  debug: '\x1b[90m', // 灰
  info: '\x1b[36m', // 青
  warn: '\x1b[33m', // 黄
  error: '\x1b[31m', // 红
  reset: '\x1b[0m',
} as const;

// 日志级别符号
const SYMBOLS: Record<LogLevel, string> = {
  debug: '·',
  info: 'ℹ',
  warn: '⚠',
  error: '✖',
};

/** 检测 stdout 是否支持颜色（Windows cmd 不支持） */
function supportsColor(): boolean {
  // 简化判断：Windows 非 tty 不支持
  if (process.platform === 'win32') {
    return Boolean(process.stdout.isTTY) && !('WT_SESSION' in process.env);
  }
  return Boolean(process.stdout.isTTY) || Boolean(process.env.FORCE_COLOR);
}

const colorEnabled = supportsColor();

function colorize(level: LogLevel, msg: string): string {
  if (!colorEnabled) return msg;
  return `${COLORS[level]}${msg}${COLORS.reset}`;
}

function prefix(level: LogLevel): string {
  return colorize(level, SYMBOLS[level]);
}

/**
 * Logger 实例
 *
 * @example
 *   logger.info('Starting detection...');
 *   logger.debug('CPU info:', cpu);
 *   logger.warn('WSL detection uncertain');
 *   logger.error('Hardware detection failed');
 */
export const logger = {
  debug(...args: unknown[]): void {
    if (debugEnabled) {
      console.log(prefix('debug'), ...args);
    }
  },

  info(...args: unknown[]): void {
    console.log(prefix('info'), ...args);
  },

  warn(...args: unknown[]): void {
    console.warn(prefix('warn'), ...args);
  },

  error(...args: unknown[]): void {
    console.error(prefix('error'), ...args);
  },
};
