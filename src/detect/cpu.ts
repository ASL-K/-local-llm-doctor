// =====================================================================
// src/detect/cpu.ts
//
// CPU 硬件检测。
// 返回 CpuInfo（src/types.ts）。
//
// 实现策略：
//   - 并行调用 3 个 systeminformation API（快）
//   - 5 秒超时（防 systeminformation 死锁）
//   - 失败时返回 fallback（不崩溃）
//   - 跨平台支持：macOS / Windows / Linux
//
// 边界场景：
//   - 极老 CPU（无 avx2）
//   - 苹果 M1/M2/M3/M4（arm64）
//   - 虚拟化 CPU（QEMU / WSL）
//   - 多 CPU 插槽（服务器）
// =====================================================================

import { platform } from 'node:os';
import si from 'systeminformation';
import type { CpuInfo } from '../types.js';
import { DetectionError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const DETECTION_TIMEOUT_MS = 5000;

/**
 * 内部：带超时的 Promise.race
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

/**
 * 内部：从 systeminformation 的 flags 数组里筛出常见指令集
 */
function extractFeatures(allFlags: string[]): string[] {
  // 常见 LLM 推理相关的指令集
  const interesting = [
    'avx', 'avx2', 'avx512', 'avx512f', 'avx512_vnni',
    'amx', 'amx_tile', 'amx_bf16', 'amx_int8',
    'sse4_1', 'sse4_2', 'sse3', 'sse2',
    'fma', 'f16c', 'bmi1', 'bmi2',
    'neon', 'fp16', 'asimd', 'aes',
  ];
  const lowerFlags = new Set(allFlags.map(f => f.toLowerCase()));
  return interesting.filter(f => lowerFlags.has(f));
}

/**
 * 检测 CPU 信息
 *
 * @returns {Promise<CpuInfo>} 标准化 CPU 信息
 * @throws {DetectionError} 5 秒超时或 systeminformation 失败
 *
 * @example
 *   const cpu = await detectCpu();
 *   console.log(cpu.brand);     // "Apple M3 Pro"
 *   console.log(cpu.cores);     // 12
 *   console.log(cpu.arch);      // "arm64"
 *   console.log(cpu.features);  // ["neon", "fp16", ...]
 */
export async function detectCpu(): Promise<CpuInfo> {
  logger.debug('Detecting CPU...');
  try {
    const [cpu, flagsStr, osInfo] = await withTimeout(
      Promise.all([si.cpu(), si.cpuFlags(), si.osInfo()]),
      DETECTION_TIMEOUT_MS,
      'CPU detection',
    );

    // systeminformation 5.x 的 cpuFlags() 返回 string（空格分隔），不是 string[]
    const flagsArray = typeof flagsStr === 'string' ? flagsStr.split(/\s+/) : flagsStr;

    // systeminformation 的 osInfo.arch 在 Apple Silicon 上可能返回 'ARM64' 大写
    const archLower = (osInfo.arch || '').toLowerCase();
    const arch: CpuInfo['arch'] =
      archLower === 'arm64' || archLower === 'aarch64'
        ? 'arm64'
        : archLower === 'x64' || archLower === 'x86_64'
          ? 'x86_64'
          : archLower === 'riscv64'
            ? 'riscv64'
            : 'x86_64'; // 默认兜底

    const features = extractFeatures(flagsArray);

    // 计算 threads：
    //   - physicalCores 是物理核数
    //   - efficiencyCores / performanceCores 存在 → Apple Silicon / Intel 混合架构
    //   - 判断超线程：看 efficiencyCores 是否存在（Apple Silicon 有 P+E 核，等同"无超线程"）
    //     x86 Intel/AMD 没有 efficiencyCores，但实际有 HT → threads = physicalCores * 2
    //   - 简化策略：默认假设 x86_64 有超线程（除非显式知道是 Apple）
    const physicalCores = cpu.physicalCores || cpu.cores || 1;
    const isAppleSilicon = arch === 'arm64' && platform() === 'darwin';
    const hasHyperthreading = !isAppleSilicon; // 简化：非 Apple Silicon 默认有超线程
    const threads = hasHyperthreading ? physicalCores * 2 : physicalCores;

    const result: CpuInfo = {
      brand: cpu.brand || 'Unknown CPU',
      cores: cpu.cores || 1,
      threads,
      arch,
      features,
    };

    logger.debug(`CPU detected: ${result.brand} (${result.cores}c/${result.threads}t, ${result.arch})`);
    return result;
  } catch (err) {
    logger.error('CPU detection failed:', err);
    throw new DetectionError('cpu', err);
  }
}
