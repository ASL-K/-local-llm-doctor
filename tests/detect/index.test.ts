// =====================================================================
// tests/detect/index.test.ts
//
// 测试 src/detect/index.ts（汇总层）
// =====================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock 所有子检测器
vi.mock('../../src/detect/cpu.js', () => ({
  detectCpu: vi.fn(),
}));
vi.mock('../../src/detect/memory.js', () => ({
  detectMemory: vi.fn(),
}));
vi.mock('../../src/detect/disk.js', () => ({
  detectDisk: vi.fn(),
}));
vi.mock('../../src/detect/os.js', () => ({
  detectOs: vi.fn(),
}));
vi.mock('../../src/detect/gpu.js', () => ({
  detectGpu: vi.fn(),
}));

import { detectHardware, selectPrimaryGpu } from '../../src/detect/index.js';
import { detectCpu } from '../../src/detect/cpu.js';
import { detectMemory } from '../../src/detect/memory.js';
import { detectDisk } from '../../src/detect/disk.js';
import { detectOs } from '../../src/detect/os.js';
import { detectGpu } from '../../src/detect/gpu.js';

describe('detectHardware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 默认全部成功
    (detectCpu as ReturnType<typeof vi.fn>).mockResolvedValue({
      brand: 'Test CPU',
      cores: 8,
      threads: 16,
      arch: 'x86_64',
      features: ['avx2'],
    });
    (detectMemory as ReturnType<typeof vi.fn>).mockResolvedValue({
      total: 32,
      available: 28,
      type: 'DDR4',
    });
    (detectDisk as ReturnType<typeof vi.fn>).mockResolvedValue({
      total: 1024,
      available: 542,
      type: 'SSD',
    });
    (detectOs as ReturnType<typeof vi.fn>).mockResolvedValue({
      platform: 'linux',
      distro: 'Ubuntu 22.04',
      wsl: false,
      wslVersion: null,
    });
    (detectGpu as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it('returns complete HardwareProfile when all detectors succeed', async () => {
    const hw = await detectHardware();

    expect(hw.os.distro).toBe('Ubuntu 22.04');
    expect(hw.cpu.brand).toBe('Test CPU');
    expect(hw.cpu.cores).toBe(8);
    expect(hw.memory.total).toBe(32);
    expect(hw.disk.available).toBe(542);
    expect(hw.gpu).toEqual([]); // 2b-2b 阶段加 GPU
  });

  it('returns 5.64GB profile (the README star story) when configured', async () => {
    (detectMemory as ReturnType<typeof vi.fn>).mockResolvedValue({
      total: 15.7,
      available: 5.64,
      type: 'DDR4',
    });
    (detectOs as ReturnType<typeof vi.fn>).mockResolvedValue({
      platform: 'win32',
      distro: 'Windows 11',
      wsl: true,
      wslVersion: '2',
    });

    const hw = await detectHardware();

    expect(hw.memory.available).toBeCloseTo(5.64, 2);
    expect(hw.os.wsl).toBe(true);
    expect(hw.os.wslVersion).toBe('2');
  });

  it('returns Apple Silicon profile', async () => {
    (detectCpu as ReturnType<typeof vi.fn>).mockResolvedValue({
      brand: 'Apple M3 Pro',
      cores: 12,
      threads: 12,
      arch: 'arm64',
      features: ['neon'],
    });
    (detectMemory as ReturnType<typeof vi.fn>).mockResolvedValue({
      total: 18,
      available: 8,
      type: 'unified',
    });
    (detectOs as ReturnType<typeof vi.fn>).mockResolvedValue({
      platform: 'darwin',
      distro: 'macOS 14.4',
      wsl: false,
      wslVersion: null,
    });

    const hw = await detectHardware();

    expect(hw.cpu.arch).toBe('arm64');
    expect(hw.memory.type).toBe('unified');
    expect(hw.os.platform).toBe('darwin');
  });

  it('uses fallback when CPU detection fails', async () => {
    (detectCpu as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('EACCES'));

    const hw = await detectHardware();

    // CPU fallback
    expect(hw.cpu.brand).toBe('Unknown CPU');
    expect(hw.cpu.cores).toBe(1);
    // 其他成功
    expect(hw.memory.total).toBe(32);
  });

  it('uses fallback when memory detection fails', async () => {
    (detectMemory as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('EPERM'));

    const hw = await detectHardware();

    expect(hw.memory.total).toBe(0);
    expect(hw.memory.available).toBe(0);
    // 其他成功
    expect(hw.cpu.brand).toBe('Test CPU');
  });

  it('uses fallback when disk detection fails', async () => {
    (detectDisk as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('disk error'));

    const hw = await detectHardware();

    expect(hw.disk.total).toBe(0);
    expect(hw.disk.available).toBe(0);
  });

  it('uses fallback when OS detection fails', async () => {
    (detectOs as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('os error'));

    const hw = await detectHardware();

    // OS fallback 至少能拿到 platform
    expect(['linux', 'darwin', 'win32']).toContain(hw.os.platform);
  });

  it('handles ALL detectors failing gracefully', async () => {
    (detectCpu as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('cpu fail'));
    (detectMemory as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('mem fail'));
    (detectDisk as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('disk fail'));
    (detectOs as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('os fail'));

    const hw = await detectHardware();

    // 不抛错，全用 fallback
    expect(hw.cpu.brand).toBe('Unknown CPU');
    expect(hw.memory.total).toBe(0);
    expect(hw.disk.total).toBe(0);
    expect(hw.os.platform).toBeTruthy();
  });

  it('runs detectors in parallel (not sequential)', async () => {
    // 每个 mock 延迟 100ms
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
    (detectCpu as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      await delay(100);
      return { brand: 'X', cores: 1, threads: 1, arch: 'x86_64', features: [] };
    });
    (detectMemory as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      await delay(100);
      return { total: 1, available: 1, type: 'unknown' };
    });
    (detectDisk as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      await delay(100);
      return { total: 1, available: 1, type: 'unknown' };
    });
    (detectOs as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      await delay(100);
      return { platform: 'linux', distro: 'X', wsl: false, wslVersion: null };
    });
    (detectGpu as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      await delay(100);
      return [];
    });

    const start = Date.now();
    await detectHardware();
    const elapsed = Date.now() - start;

    // 并行：5 个 100ms → 总 ~100ms（容许误差 50ms）
    // 串行：5 个 100ms → 总 500ms
    expect(elapsed).toBeLessThan(250);
  });
});

describe('selectPrimaryGpu', () => {
  it('returns null for empty array', () => {
    expect(selectPrimaryGpu([])).toBe(null);
  });

  it('returns the GPU with largest VRAM', () => {
    const gpus = [
      { vendor: 'intel' as const, model: 'Intel UHD', vram: 2, metalSupported: false, cudaSupported: false },
      { vendor: 'nvidia' as const, model: 'RTX 4090', vram: 24, metalSupported: false, cudaSupported: true },
      { vendor: 'nvidia' as const, model: 'RTX 3060', vram: 12, metalSupported: false, cudaSupported: true },
    ];
    const primary = selectPrimaryGpu(gpus);
    expect(primary?.model).toBe('RTX 4090');
  });
});
