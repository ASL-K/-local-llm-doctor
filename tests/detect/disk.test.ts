// =====================================================================
// tests/detect/disk.test.ts
//
// 测试 src/detect/disk.ts
// =====================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('systeminformation', () => ({
  default: {
    fsSize: vi.fn(),
  },
}));

import si from 'systeminformation';
import { detectDisk } from '../../src/detect/disk.js';
import { DetectionError } from '../../src/utils/errors.js';

// 辅助：构造 fsSize 返回值
function fsEntry(
  mount: string,
  fstype: string,
  sizeGB: number,
  availableGB: number,
  usedGB?: number,
) {
  return {
    fs: fstype, // 新版 systeminformation 用 'fs' 字段
    type: fstype,
    size: sizeGB * 1024 ** 3,
    used: (usedGB ?? sizeGB - availableGB) * 1024 ** 3,
    available: availableGB * 1024 ** 3,
    use: ((usedGB ?? sizeGB - availableGB) / sizeGB) * 100,
    mount,
  };
}

describe('detectDisk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects a typical 1TB SSD with 542GB free', async () => {
    (si.fsSize as ReturnType<typeof vi.fn>).mockResolvedValue([
      fsEntry('/dev/sda1', 'ext4', 1024, 542),
    ]);

    const disk = await detectDisk();

    expect(disk.total).toBe(1024);
    expect(disk.available).toBe(542);
    expect(disk.type).toBe('SSD');
  });

  it('detects 5.64GB available (low disk space warning case)', async () => {
    (si.fsSize as ReturnType<typeof vi.fn>).mockResolvedValue([
      fsEntry('/dev/sda1', 'ext4', 256, 5.64),
    ]);

    const disk = await detectDisk();

    expect(disk.total).toBe(256);
    expect(disk.available).toBeCloseTo(5.64, 2);
  });

  it('selects the largest disk when multiple are present', async () => {
    (si.fsSize as ReturnType<typeof vi.fn>).mockResolvedValue([
      fsEntry('/dev/sda1', 'ext4', 256, 100),   // 小盘
      fsEntry('/dev/sdb1', 'ext4', 2048, 1500), // 大盘（更多可用）
      fsEntry('/dev/sdc1', 'ext4', 1024, 800),  // 中盘
    ]);

    const disk = await detectDisk();

    // 应该选 sdb1（1500GB available）
    expect(disk.total).toBe(2048);
    expect(disk.available).toBe(1500);
  });

  it('skips virtual filesystems (tmpfs, devtmpfs, overlay)', async () => {
    (si.fsSize as ReturnType<typeof vi.fn>).mockResolvedValue([
      fsEntry('tmpfs', 'tmpfs', 8, 8),
      fsEntry('overlay', 'overlay', 100, 50),
      fsEntry('sysfs', 'sysfs', 0, 0),
      // 真实盘
      fsEntry('/dev/sda1', 'ext4', 512, 300),
    ]);

    const disk = await detectDisk();

    expect(disk.total).toBe(512);
    expect(disk.available).toBe(300);
  });

  it('detects SSD for modern filesystems (apfs, ext4, btrfs, ntfs)', async () => {
    const ssdFs = ['apfs', 'ext4', 'btrfs', 'xfs', 'zfs', 'ntfs', 'refs'];
    for (const fstype of ssdFs) {
      (si.fsSize as ReturnType<typeof vi.fn>).mockResolvedValue([
        fsEntry('/dev/sda1', fstype, 1000, 500),
      ]);
      const disk = await detectDisk();
      expect(disk.type).toBe('SSD');
    }
  });

  it('detects HDD for legacy filesystems (hfs+, ext3, fat32)', async () => {
    const hddFs = ['hfs', 'hfs+', 'fat32', 'ext3', 'vfat'];
    for (const fstype of hddFs) {
      (si.fsSize as ReturnType<typeof vi.fn>).mockResolvedValue([
        fsEntry('/dev/sda1', fstype, 2000, 1000),
      ]);
      const disk = await detectDisk();
      expect(disk.type).toBe('HDD');
    }
  });

  it('returns unknown for unrecognized filesystems', async () => {
    (si.fsSize as ReturnType<typeof vi.fn>).mockResolvedValue([
      fsEntry('/dev/sda1', 'mystery-fs', 500, 200),
    ]);

    const disk = await detectDisk();

    expect(disk.type).toBe('unknown');
  });

  it('clamps available to total (defensive)', async () => {
    (si.fsSize as ReturnType<typeof vi.fn>).mockResolvedValue([
      fsEntry('/dev/sda1', 'ext4', 100, 150), // available > size
    ]);

    const disk = await detectDisk();

    expect(disk.total).toBe(100);
    expect(disk.available).toBe(100);
  });

  it('throws DetectionError when no real disk found', async () => {
    (si.fsSize as ReturnType<typeof vi.fn>).mockResolvedValue([
      fsEntry('tmpfs', 'tmpfs', 8, 8),
      fsEntry('overlay', 'overlay', 100, 50),
    ]);

    await expect(detectDisk()).rejects.toThrow(DetectionError);
  });

  it('throws DetectionError when systeminformation fails', async () => {
    (si.fsSize as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('EACCES'));

    await expect(detectDisk()).rejects.toThrow(DetectionError);
  });

  it('throws DetectionError on timeout', async () => {
    (si.fsSize as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {})
    );

    await expect(detectDisk()).rejects.toThrow(DetectionError);
  }, 10000);
});
