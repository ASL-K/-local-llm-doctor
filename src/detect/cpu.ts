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
    const [cpu, flags, system] = await withTimeout(
      Promise.all([si.cpu(), si.cpuFlags(), si.system()]),
      DETECTION_TIMEOUT_MS,
      'CPU detection',
    );

    // systeminformation 在 Apple Silicon 上可能返回 arch='ARM64' 大写
    const archLower = system.arch.toLowerCase();
    const arch: CpuInfo['arch'] =
      archLower === 'arm64' || archLower === 'aarch64'
        ? 'arm64'
        : archLower === 'x64' || archLower === 'x86_64'
          ? 'x86_64'
          : archLower === 'riscv64'
            ? 'riscv64'
            : 'x86_64'; // 默认兜底

    const features = extractFeatures(flags);

    // 计算 threads：
    //   - systeminformation 的 cpu.cores 是物理核数（或带超线程的逻辑核数）
    //   - physicalCores 是物理核数（不带超线程）
    //   - 如果 hyperthreading=true → threads = physicalCores * 2
    //   - 如果 hyperthreading=false（Apple Silicon）→ threads = physicalCores
    //   - 如果 physicalCores 缺失 → fallback 到 cores
    const physicalCores = cpu.physicalCores || cpu.cores || 1;
    const hasHyperthreading = cpu.hyperthreading === true;
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
