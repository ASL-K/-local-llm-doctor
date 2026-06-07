// =====================================================================
// src/detect/os.ts
//
// 操作系统检测。
// 返回 OsInfo（src/types.ts）。
//
// 关键挑战：WSL 检测
//   - WSL 1：完整 Linux 内核（不是真 Windows 内核）
//   - WSL 2：Hyper-V 虚拟化 + 真 Linux 内核
//   - WSLg：WSL 2 + GUI 支持
//   - GitHub Codespaces / Gitpod：类似 WSL
//
// 检测方式：
//   - /proc/version 包含 "Microsoft" 或 "microsoft" → WSL
//   - /proc/sys/kernel/osrelease 含 "microsoft" → WSL
//   - WSL 2 还会有 /run/WSL 或 /proc/version 含 "microsoft-standard-WSL2"
//   - 终极 fallback: WSL_DISTRO_NAME / WSLENV 环境变量
//
// macOS 区分：
//   - darwin + arm64 → macOS Apple Silicon
//   - darwin + x64 → macOS Intel
//
// Windows 区分：
//   - si.osInfo() 返回 platform='Windows' + distro 类似 'Microsoft Windows 11 Pro'
//   - 解析出 10/11/2019 等
// =====================================================================

import { readFile } from 'node:fs/promises';
import { platform, release, hostname } from 'node:os';
import si from 'systeminformation';
import type { OsInfo } from '../types.js';
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

/**
 * 内部：检测是否在 WSL 内（Linux 平台特用）
 * 通过 /proc/version 含 "microsoft" 字符串判断
 */
async function detectWsl(): Promise<{ wsl: boolean; version: '1' | '2' | null }> {
  if (platform() !== 'linux') {
    return { wsl: false, version: null };
  }

  // 1. 优先看环境变量（最快）
  if (process.env.WSL_DISTRO_NAME || process.env.WSLENV) {
    // WSL 2 还会有 WSL_DISTRO_NAME
    // WSL 1 也有，但版本靠 /proc/version
  }

  // 2. 读 /proc/version（最可靠）
  try {
    const procVersion = await readFile('/proc/version', 'utf-8');
    const lower = procVersion.toLowerCase();

    if (lower.includes('microsoft')) {
      // 区分 WSL 1 vs 2
      // WSL 1 的 /proc/version 含 "Microsoft" 来自转化层
      // WSL 2 的 /proc/version 含 "microsoft-standard-WSL2"
      if (lower.includes('wsl2') || lower.includes('microsoft-standard-wsl')) {
        return { wsl: true, version: '2' };
      }
      // 默认按 1 处理（WSL 1）
      return { wsl: true, version: '1' };
    }
  } catch (err) {
    // /proc/version 读不到 → 不是 Linux
    logger.debug('Could not read /proc/version:', err);
  }

  return { wsl: false, version: null };
}

/**
 * 内部：构造 OS distro 字符串
 */
function buildDistroString(osInfo: si.Systeminformation.OsData, wsl: boolean): string {
  const pf = platform();
  if (pf === 'darwin') {
    // macOS 14.4 Sonoma
    return `macOS ${osInfo.release || 'Unknown'}`;
  }
  if (pf === 'win32') {
    // Windows 11 / Windows 10
    return osInfo.distro || 'Windows';
  }
  // Linux
  const distro = osInfo.distro || 'Linux';
  if (wsl) {
    return `${distro} (WSL)`;
  }
  return distro;
}

/**
 * 检测操作系统信息
 *
 * @returns {Promise<OsInfo>} 标准化 OS 信息
 * @throws {DetectionError} 5 秒超时或 systeminformation 失败
 *
 * @example
 *   const os = await detectOs();
 *   console.log(os.platform);    // 'linux'
 *   console.log(os.distro);      // 'Ubuntu 22.04 (WSL2)'
 *   console.log(os.wsl);         // true
 *   console.log(os.wslVersion);  // '2'
 */
export async function detectOs(): Promise<OsInfo> {
  logger.debug('Detecting OS...');
  try {
    // 并行：si.osInfo + WSL 检测
    const [osInfo, wslInfo] = await withTimeout(
      Promise.all([si.osInfo(), detectWsl()]),
      DETECTION_TIMEOUT_MS,
      'OS detection',
    );

    const result: OsInfo = {
      platform: platform() === 'win32' ? 'win32' :
                platform() === 'darwin' ? 'darwin' : 'linux',
      distro: buildDistroString(osInfo, wslInfo.wsl),
      wsl: wslInfo.wsl,
      wslVersion: wslInfo.version,
    };

    logger.debug(`OS detected: ${result.platform} / ${result.distro} (wsl=${result.wsl}, version=${result.wslVersion})`);
    return result;
  } catch (err) {
    logger.error('OS detection failed:', err);
    throw new DetectionError('os', err);
  }
}

/**
 * 内部辅助：hostname（v0.2 可能用）
 */
export function getHostname(): string {
  return hostname();
}

/**
 * 内部辅助：kernel version（v0.2 可能用）
 */
export function getKernel(): string {
  return release();
}
