// =====================================================================
// src/detect/disk.ts
//
// 磁盘硬件检测。
// 返回 DiskInfo（src/types.ts）。
//
// 关键决策：
//   1. 默认报"最大单盘可用空间"（用户最常问"我能下载几个 G 的模型"）
//   2. 跳过 tmpfs / devtmpfs / squashfs（不算真实磁盘）
//   3. SSD / HDD 判断基于 fstype：
//      - 'apfs' / 'ext4' / 'btrfs' / 'ntfs' → SSD（现代主流）
//      - 其他 → 'unknown'（避免误判）
//   4. Windows 上 systeminformation 的 fsSize 路径是 'C:\\' 格式
//      - 后续 v0.2 加 --disk PATH 参数
//
// 边界场景：
//   - 多个盘：选可用空间最大的
//   - 只读盘：跳过
//   - 网络盘：跳过
//   - 容器环境：可能只有 / 一个盘
// =====================================================================

import si from 'systeminformation';
import type { DiskInfo } from '../types.js';
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
 * 内部：跳过虚拟/网络/只读文件系统
 */
function shouldSkip(mount: string, fstype: string, size: number): boolean {
  // 跳过 0 字节的虚拟文件系统
  if (size <= 0) return true;

  // Linux 虚拟文件系统
  const skipFstypes = [
    'tmpfs', 'devtmpfs', 'sysfs', 'proc', 'devpts',
    'cgroup', 'cgroup2', 'pstore', 'bpf', 'autofs',
    'mqueue', 'hugetlbfs', 'debugfs', 'tracefs',
    'fusectl', 'configfs', 'ramfs', 'overlay', 'squashfs',
    'nsfs', 'binfmt_misc', 'fuse.gvfsd-fuse', 'fuse.snapfuse',
  ];
  if (skipFstypes.includes(fstype)) return true;

  // macOS 虚拟文件系统
  if (mount.startsWith('/dev') && fstype === 'devfs') return true;
  if (mount.startsWith('/sys') || mount.startsWith('/private/var')) {
    return true;
  }

  // Windows 上的网络盘（Z: 通常是映射盘）
  if (/^[A-Z]:$/.test(mount) && size < 1024 * BYTES_PER_GB) {
    // 小于 1TB 的盘可能是恢复分区，跳过
    // 但这逻辑有点弱，v0.2 用其他方式
  }

  return false;
}

/**
 * 内部：判断文件系统类型是否像 SSD
 */
function detectDiskType(fstype: string): DiskInfo['type'] {
  // 现代主流 SSD 文件系统
  const ssdFsTypes = ['apfs', 'ext4', 'btrfs', 'xfs', 'zfs', 'ntfs', 'refs'];
  if (ssdFsTypes.includes(fstype)) return 'SSD';

  // 老式 HDD 文件系统（hfs / fat32 / ext3 / ext2）
  const hddFsTypes = ['hfs', 'hfs+', 'fat', 'fat16', 'fat32', 'ext2', 'ext3', 'vfat'];
  if (hddFsTypes.includes(fstype)) return 'HDD';

  return 'unknown';
}

/**
 * 检测磁盘信息
 *
 * @returns {Promise<DiskInfo>} 标准化磁盘信息（最大单盘的可用空间 + 类型）
 * @throws {DetectionError} 5 秒超时或 systeminformation 失败
 *
 * @example
 *   const disk = await detectDisk();
 *   console.log(disk.available); // 542 (GB)
 *   console.log(disk.type);      // 'SSD'
 */
export async function detectDisk(): Promise<DiskInfo> {
  logger.debug('Detecting disk...');
  try {
    const fsList = await withTimeout(si.fsSize(), DETECTION_TIMEOUT_MS, 'Disk detection');

    // 过滤：跳过虚拟 / 网络 / 0 字节盘
    const realDisks = fsList.filter(fs => !shouldSkip(fs.mount, fs.type, fs.size));

    if (realDisks.length === 0) {
      throw new Error('No real disk found (only virtual filesystems?)');
    }

    // 选可用空间最大的
    const biggest = realDisks.reduce((a, b) => (b.available > a.available ? b : a));

    const totalGB = biggest.size / BYTES_PER_GB;
    const availableGB = biggest.available / BYTES_PER_GB;
    // 兜底：available 不应 > size
    const clippedAvailable = Math.min(availableGB, totalGB);

    const result: DiskInfo = {
      total: round2(totalGB),
      available: round2(clippedAvailable),
      type: detectDiskType(biggest.type),
    };

    logger.debug(`Disk detected: ${result.available}GB free of ${result.total}GB (${result.type}, mount=${biggest.mount})`);
    return result;
  } catch (err) {
    logger.error('Disk detection failed:', err);
    throw new DetectionError('disk', err);
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
