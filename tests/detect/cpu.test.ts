// =====================================================================
// tests/detect/cpu.test.ts
//
// 测试 src/detect/cpu.ts
// 使用 vi.mock('systeminformation') 模拟返回值
// =====================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock systeminformation
vi.mock('systeminformation', () => ({
  default: {
    cpu: vi.fn(),
    cpuFlags: vi.fn(),
    system: vi.fn(),
  },
}));

import si from 'systeminformation';
import { detectCpu } from '../../src/detect/cpu.js';
import { DetectionError } from '../../src/utils/errors.js';

describe('detectCpu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects a typical x86_64 desktop CPU (Intel i7)', async () => {
    (si.cpu as ReturnType<typeof vi.fn>).mockResolvedValue({
      brand: 'Intel Core i7-13700H',
      cores: 14,
      physicalCores: 14,
      hyperthreading: true,
    });
    (si.cpuFlags as ReturnType<typeof vi.fn>).mockResolvedValue([
      'fpu', 'vme', 'de', 'pse', 'tsc', 'msr', 'pae', 'mce',
      'avx', 'avx2', 'avx512f', 'sse4_1', 'sse4_2', 'fma',
    ]);
    (si.system as ReturnType<typeof vi.fn>).mockResolvedValue({
      arch: 'x64',
    });

    const cpu = await detectCpu();

    expect(cpu.brand).toBe('Intel Core i7-13700H');
    expect(cpu.cores).toBe(14);
    expect(cpu.threads).toBe(28); // 14 物理核 * 2（超线程）
    expect(cpu.arch).toBe('x86_64');
    expect(cpu.features).toContain('avx2');
    expect(cpu.features).toContain('avx512f');
    expect(cpu.features).toContain('sse4_2');
  });

  it('detects Apple Silicon (M3 Pro)', async () => {
    (si.cpu as ReturnType<typeof vi.fn>).mockResolvedValue({
      brand: 'Apple M3 Pro',
      cores: 12,
      physicalCores: 12, // Apple Silicon 通常不开超线程
      hyperthreading: false,
    });
    (si.cpuFlags as ReturnType<typeof vi.fn>).mockResolvedValue([
      'neon', 'fp16', 'asimd', 'aes', 'sha1', 'sha2',
    ]);
    (si.system as ReturnType<typeof vi.fn>).mockResolvedValue({
      arch: 'ARM64',
    });

    const cpu = await detectCpu();

    expect(cpu.brand).toBe('Apple M3 Pro');
    expect(cpu.cores).toBe(12);
    expect(cpu.threads).toBe(12);
    expect(cpu.arch).toBe('arm64');
    expect(cpu.features).toContain('neon');
    expect(cpu.features).toContain('fp16');
  });

  it('handles missing brand gracefully', async () => {
    (si.cpu as ReturnType<typeof vi.fn>).mockResolvedValue({
      brand: '',
      cores: 4,
      physicalCores: 4,
      hyperthreading: false,
    });
    (si.cpuFlags as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (si.system as ReturnType<typeof vi.fn>).mockResolvedValue({
      arch: 'x64',
    });

    const cpu = await detectCpu();

    expect(cpu.brand).toBe('Unknown CPU');
    expect(cpu.cores).toBe(4);
  });

  it('handles missing physicalCores', async () => {
    (si.cpu as ReturnType<typeof vi.fn>).mockResolvedValue({
      brand: 'AMD Ryzen 5 5600',
      cores: 6,
      // 故意不设 physicalCores
      hyperthreading: true,
    });
    (si.cpuFlags as ReturnType<typeof vi.fn>).mockResolvedValue(['avx2']);
    (si.system as ReturnType<typeof vi.fn>).mockResolvedValue({
      arch: 'x64',
    });

    const cpu = await detectCpu();

    expect(cpu.cores).toBe(6);
    expect(cpu.threads).toBe(12); // fallback 到 cores=6, 6*2=12
  });

  it('detects aarch64 as arm64', async () => {
    (si.cpu as ReturnType<typeof vi.fn>).mockResolvedValue({
      brand: 'AWS Graviton3',
      cores: 64,
      physicalCores: 64,
      hyperthreading: false,
    });
    (si.cpuFlags as ReturnType<typeof vi.fn>).mockResolvedValue(['neon', 'asimd']);
    (si.system as ReturnType<typeof vi.fn>).mockResolvedValue({
      arch: 'aarch64',
    });

    const cpu = await detectCpu();

    expect(cpu.arch).toBe('arm64');
  });

  it('extracts only relevant features, filters out noise', async () => {
    (si.cpu as ReturnType<typeof vi.fn>).mockResolvedValue({
      brand: 'Test CPU',
      cores: 4,
      physicalCores: 4,
      hyperthreading: false,
    });
    (si.cpuFlags as ReturnType<typeof vi.fn>).mockResolvedValue([
      'fpu', 'vme', 'de', 'pse', 'tsc',  // 噪声 flags
      'avx', 'avx2', 'amx_tile',        // 真实相关的
      'some_unknown_flag',              // 未知的
    ]);
    (si.system as ReturnType<typeof vi.fn>).mockResolvedValue({
      arch: 'x64',
    });

    const cpu = await detectCpu();

    // 噪声 flags 不应被提取
    expect(cpu.features).not.toContain('fpu');
    expect(cpu.features).not.toContain('tsc');
    expect(cpu.features).not.toContain('some_unknown_flag');
    // 相关 flags 被提取
    expect(cpu.features).toContain('avx');
    expect(cpu.features).toContain('avx2');
    expect(cpu.features).toContain('amx_tile');
  });

  it('throws DetectionError when systeminformation fails', async () => {
    (si.cpu as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('permission denied'));
    (si.cpuFlags as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (si.system as ReturnType<typeof vi.fn>).mockResolvedValue({ arch: 'x64' });

    await expect(detectCpu()).rejects.toThrow(DetectionError);
  });

  it('throws DetectionError on timeout', async () => {
    // 模拟永不 resolve
    (si.cpu as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {})
    );
    (si.cpuFlags as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (si.system as ReturnType<typeof vi.fn>).mockResolvedValue({ arch: 'x64' });

    await expect(detectCpu()).rejects.toThrow(DetectionError);
  }, 10000); // 给测试 10s 留超时时间
});
