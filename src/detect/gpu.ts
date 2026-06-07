// =====================================================================
// src/detect/gpu.ts
//
// GPU 硬件检测。
// 返回 GpuInfo[]（src/types.ts）。
//
// 多平台策略：
//   1. 优先用 systeminformation.graphics() 拿基础（型号 + vendor）
//   2. NVIDIA: 尝试 nvidia-smi 拿详细 VRAM
//   3. AMD:    尝试 rocm-smi（Linux）或 systeminformation.graphics 兜底
//   4. Apple:  systeminformation.graphics 已能拿到
//   5. 集显:   vram 通常算在系统内存里，标 0 + note
//
// 边界处理：
//   - 无 GPU：返回 []
//   - 多 GPU：返回所有（按 vram 降序）
//   - 拿不到 VRAM：vram=0 + 不参与 matcher
//   - nvidia-smi 不存在：try/catch fallback 到 systeminformation
// =====================================================================

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import si from 'systeminformation';
import type { GpuInfo } from '../types.js';
import { DetectionError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { platform } from 'node:os';

const execAsync = promisify(exec);
const DETECTION_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

/**
 * 内部：执行 shell 命令拿输出
 * @param cmd 完整命令
 * @param timeoutMs 超时
 * @returns stdout（去尾换行），失败返回 null
 */
async function runCommand(cmd: string, timeoutMs: number): Promise<string | null> {
  try {
    const { stdout } = await execAsync(cmd, { timeout: timeoutMs, windowsHide: true });
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * 内部：解析 nvidia-smi 输出
 * 输入格式（每行一张卡，--query-gpu=name,memory.total --format=csv,noheader,nounits）：
 *   "NVIDIA GeForce RTX 4090, 24576"  ← 单位是 MB（无后缀）
 *   "Tesla V100, 16384"
 * @returns [{ model, vramGB }, ...]
 */
function parseNvidiaSmi(output: string): Array<{ model: string; vramGB: number }> {
  const results: Array<{ model: string; vramGB: number }> = [];
  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // 用正则提取 "Model Name, N"  （N 是 MB，nounits 模式无后缀）
    const match = trimmed.match(/^(.+?),\s*(\d+)\s*$/);
    if (match) {
      const model = match[1]!.trim();
      const vramMB = Number(match[2]);
      const vramGB = vramMB / 1024; // MB → GB
      results.push({ model, vramGB });
    }
  }
  return results;
}

/**
 * 内部：通过 nvidia-smi 拿 NVIDIA 详细 VRAM
 * @returns GpuInfo[]，空数组表示没 nvidia-smi 或无 NVIDIA 卡
 */
async function detectNvidiaGpus(): Promise<GpuInfo[]> {
  // nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits
  // 输出: "NVIDIA GeForce RTX 4090, 24576"
  const output = await runCommand(
    'nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits 2>nul',
    3000,
  );
  if (!output) return [];

  const parsed = parseNvidiaSmi(output);
  return parsed.map(p => ({
    vendor: 'nvidia' as const,
    model: p.model,
    vram: Math.round(p.vramGB * 10) / 10, // 1 位小数
    metalSupported: false,
    cudaSupported: true,
  }));
}

/**
 * 检测所有 GPU
 *
 * @returns {Promise<GpuInfo[]>} GPU 列表（可能为空）
 * @throws {DetectionError} 5 秒超时或 systeminformation 失败
 *
 * @example
 *   const gpus = await detectGpu();
 *   console.log(gpus[0].model); // "NVIDIA GeForce RTX 4090"
 *   console.log(gpus[0].vram);  // 24
 */
export async function detectGpu(): Promise<GpuInfo[]> {
  logger.debug('Detecting GPU...');
  try {
    // 并行：systeminformation + nvidia-smi
    const [graphics, nvidiaGpus] = await withTimeout(
      Promise.all([si.graphics(), detectNvidiaGpus()]),
      DETECTION_TIMEOUT_MS,
      'GPU detection',
    );

    // 如果 nvidia-smi 拿到了数据，优先用（更准确）
    if (nvidiaGpus.length > 0) {
      logger.debug(`Found ${nvidiaGpus.length} NVIDIA GPU(s) via nvidia-smi`);
      return nvidiaGpus;
    }

    // 否则用 systeminformation.graphics 兜底
    if (!graphics.controllers || graphics.controllers.length === 0) {
      logger.debug('No GPU detected');
      return [];
    }

    const gpus: GpuInfo[] = graphics.controllers.map((c) => {
      const vendor = normalizeVendor(c.vendor);
      const isApple = platform() === 'darwin' && vendor === 'apple';
      const isNvidia = vendor === 'nvidia';

      // VRAM 推断
      //   - systeminformation.graphics 给的 vram 单位是 MB
      //   - 如果是 0 或缺失（集显常见），标 0
      //   - macOS Apple Silicon：vram 和 unified memory 共享，**用 total memory**
      let vramGB = 0;
      if (typeof c.memoryTotal === 'number' && c.memoryTotal > 0) {
        vramGB = Math.round((c.memoryTotal / 1024) * 10) / 10;
      } else if (isApple) {
        // 后续 v0.2 加：读 system memory 作为 unified memory
        vramGB = 0; // 暂时标 0，matcher 会 fallback 到 memory.available
      }

      return {
        vendor,
        model: c.model || 'Unknown GPU',
        vram: vramGB,
        metalSupported: isApple,
        cudaSupported: isNvidia,
      };
    });

    // 按 vram 降序（vram=0 的排最后）
    gpus.sort((a, b) => b.vram - a.vram);
    logger.debug(`Found ${gpus.length} GPU(s) via systeminformation`);
    return gpus;
  } catch (err) {
    logger.error('GPU detection failed:', err);
    throw new DetectionError('gpu', err);
  }
}

/**
 * 内部：规范化 vendor 字符串
 * systeminformation 返回 "NVIDIA Corporation" / "Intel Corporation" / "Apple" 等
 * 简化为 'nvidia' / 'amd' / 'intel' / 'apple' / 'unknown'
 */
function normalizeVendor(vendor: string | undefined): GpuInfo['vendor'] {
  if (!vendor) return 'none';
  const v = vendor.toLowerCase();
  if (v.includes('nvidia')) return 'nvidia';
  if (v.includes('amd') || v.includes('advanced micro')) return 'amd';
  if (v.includes('intel')) return 'intel';
  if (v.includes('apple')) return 'apple';
  // 'microsoft' / 'basic render' / 'unknown' / 其他 → 'none'
  return 'none';
}
