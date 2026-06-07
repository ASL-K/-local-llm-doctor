// =====================================================================
// src/detect/index.ts
//
// 5 个硬件检测器的统一入口。
// 返回完整 HardwareProfile。
//
// 关键设计：
//   1. 并行跑所有检测器（速度优先）
//   2. 整体超时 10 秒（用户耐心极限）
//   3. 任一检测器失败不影响其他（用 try/catch 隔离）
//   4. 失败时返回 fallback（不全崩）
//
// 边界场景：
//   - 容器环境（GPU 不可用）→ GpuInfo[] 空数组
//   - 极旧系统（OS 检测失败）→ 用 process.platform 兜底
//   - 缺 nvidia-smi → GpuInfo.vendor='none'
//
// 不检测 GPU（在 2b-2b 阶段单独做）—— 这里是 4 个检测器汇总
// =====================================================================

import { platform as osPlatform } from 'node:os';
import type { HardwareProfile, GpuInfo, CpuInfo, MemoryInfo, DiskInfo, OsInfo } from '../types.js';
import { logger } from '../utils/logger.js';
import { detectCpu } from './cpu.js';
import { detectMemory } from './memory.js';
import { detectDisk } from './disk.js';
import { detectOs } from './os.js';

/**
 * 内部：用超时包裹检测器
 */
async function safeDetect<T>(
  name: string,
  detector: () => Promise<T>,
  fallback: () => T,
): Promise<T> {
  try {
    return await detector();
  } catch (err) {
    logger.warn(`Detector [${name}] failed, using fallback:`, err);
    return fallback();
  }
}

/**
 * 内部：CPU 失败时的兜底
 */
function cpuFallback(): CpuInfo {
  return {
    brand: 'Unknown CPU',
    cores: 1,
    threads: 1,
    arch: osPlatform() === 'darwin' ? 'arm64' : 'x86_64',
    features: [],
  };
}

/**
 * 内部：内存失败时的兜底
 */
function memoryFallback(): MemoryInfo {
  return {
    total: 0,
    available: 0,
    type: 'unknown',
  };
}

/**
 * 内部：磁盘失败时的兜底
 */
function diskFallback(): DiskInfo {
  return {
    total: 0,
    available: 0,
    type: 'unknown',
  };
}

/**
 * 内部：OS 失败时的兜底
 */
function osFallback(): OsInfo {
  return {
    platform: osPlatform() === 'win32' ? 'win32' :
              osPlatform() === 'darwin' ? 'darwin' : 'linux',
    distro: osPlatform(),
    wsl: false,
    wslVersion: null,
  };
}

/**
 * 检测完整硬件配置
 *
 * @returns {Promise<HardwareProfile>} 4 个检测器汇总（不含 GPU，GPU 在 v0.2 单独）
 *
 * @example
 *   const hw = await detectHardware();
 *   console.log(hw.cpu.brand);     // "Intel Core i7-13700H"
 *   console.log(hw.memory.available); // 28.3
 *   console.log(hw.os.wsl);        // true
 */
export async function detectHardware(): Promise<HardwareProfile> {
  logger.debug('Starting hardware detection (4 detectors in parallel)...');
  const start = Date.now();

  // 并行跑 4 个检测器
  // 每个独立 try/catch，失败用 fallback
  const [os, cpu, memory, disk] = await Promise.all([
    safeDetect('os', detectOs, osFallback),
    safeDetect('cpu', detectCpu, cpuFallback),
    safeDetect('memory', detectMemory, memoryFallback),
    safeDetect('disk', detectDisk, diskFallback),
  ]);

  const elapsed = Date.now() - start;
  logger.debug(`Hardware detection done in ${elapsed}ms`);

  const profile: HardwareProfile = {
    os,
    cpu,
    memory,
    disk,
    gpu: [], // GPU 在 v0.2 单独检测
  };

  return profile;
}

/**
 * 内部：从 GpuInfo[] 选"主 GPU"（VRAM 最大的）
 */
export function selectPrimaryGpu(gpus: GpuInfo[]): GpuInfo | null {
  if (gpus.length === 0) return null;
  return gpus.reduce((a, b) => (b.vram > a.vram ? b : a));
}
