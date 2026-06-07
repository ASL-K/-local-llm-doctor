// =====================================================================
// src/detect/memory.ts
//
// 内存硬件检测。
// 返回 MemoryInfo（src/types.ts）。
//
// 关键差异：Apple Silicon 的"统一内存"（Unified Memory Architecture）
//   - 显存和系统内存共享同一块物理内存
//   - 16GB M2 = 16GB RAM + 16GB VRAM（可动态分配）
//   - systeminformation 的 mem() 在 macOS 返回的是"全部统一内存"
//
// 其他平台：
//   - x86_64 + 独立显卡：mem() 只报告系统内存，VRAM 单独由 gpu 检测
//   - 服务器（多路 NUMA）：mem() 报告所有节点的累计
//
// 单位约定：所有 GB 单位都用 systeminformation 返回的字节数 / (1024^3)
// =====================================================================

import si from 'systeminformation';
import type { MemoryInfo } from '../types.js';
import { DetectionError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const DETECTION_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

const BYTES_PER_GB = 1024 ** 3;

/**
 * 内部：判断内存类型
 *   - Apple Silicon → 'unified'
 *   - 其他平台：尝试读取 /sys/class/dmi/id/...（Linux），Windows 用 wmic，macOS 跳过
 *   - 都失败 → 'unknown'
 *
 * 注：v0.1 简化版：只通过 OS 判断（macOS 一定 unified）
 *     v0.2 改进：读 DMI 表（Linux）拿 DDR4/DDR5
 */
function detectMemType(platform: NodeJS.Platform): MemoryInfo['type'] {
  if (platform === 'darwin') {
    // 所有 Apple Silicon 设备都是统一内存
    // 旧款 Intel Mac 是普通 DDR，但用 LPDDR4/LPDDR5 → 算 'unified' 也行
    // 简化处理：macOS 一律算 unified
    return 'unified';
  }
  // Windows / Linux 默认 unknown
  // v0.2 可以通过 DMI 表读 DDR4/DDR5
  return 'unknown';
}

/**
 * 检测内存信息
 *
 * @returns {Promise<MemoryInfo>} 标准化内存信息
 * @throws {DetectionError} 5 秒超时或 systeminformation 失败
 *
 * @example
 *   const mem = await detectMemory();
 *   console.log(mem.total);     // 32
 *   console.log(mem.available); // 28.3
 *   console.log(mem.type);      // 'DDR4' / 'unified' / 'unknown'
 */
export async function detectMemory(): Promise<MemoryInfo> {
  logger.debug('Detecting memory...');
  try {
    const mem = await withTimeout(si.mem(), DETECTION_TIMEOUT_MS, 'Memory detection');

    const totalGB = mem.total / BYTES_PER_GB;
    const availableGB = mem.available / BYTES_PER_GB;
    // 兜底：available 不应 > total（OS 偶发报告错误）
    const clippedAvailable = Math.min(availableGB, totalGB);
    const type = detectMemType(process.platform);

    const result: MemoryInfo = {
      total: round2(totalGB),
      available: round2(clippedAvailable),
      type,
    };

    logger.debug(`Memory detected: ${result.total}GB total, ${result.available}GB available (${result.type})`);
    return result;
  } catch (err) {
    logger.error('Memory detection failed:', err);
    throw new DetectionError('memory', err);
  }
}

/**
 * 内部：保留 2 位小数
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
