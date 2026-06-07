// =====================================================================
// tests/detect/memory.test.ts
//
// 测试 src/detect/memory.ts
// =====================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('systeminformation', () => ({
  default: {
    mem: vi.fn(),
  },
}));

import si from 'systeminformation';
import { detectMemory } from '../../src/detect/memory.js';
import { DetectionError } from '../../src/utils/errors.js';

// 辅助：构造 systeminformation 的 mem() 返回值（字节数）
function memBytes(totalGB: number, availableGB: number) {
  return {
    total: totalGB * 1024 ** 3,
    available: availableGB * 1024 ** 3,
  };
}

describe('detectMemory', () => {
  let originalPlatform: NodeJS.Platform;

  beforeEach(() => {
    vi.clearAllMocks();
    originalPlatform = process.platform;
  });

  it('detects typical 32GB DDR4 desktop', async () => {
    (si.mem as ReturnType<typeof vi.fn>).mockResolvedValue(memBytes(32, 28.3));

    const mem = await detectMemory();

    expect(mem.total).toBe(32);
    expect(mem.available).toBe(28.3);
    expect(mem.type).toBe('unknown'); // win32 / linux → unknown
  });

  it('detects typical 16GB laptop', async () => {
    (si.mem as ReturnType<typeof vi.fn>).mockResolvedValue(memBytes(16, 8.5));

    const mem = await detectMemory();

    expect(mem.total).toBe(16);
    expect(mem.available).toBe(8.5);
  });

  it('detects low-memory 5.64GB case (README star story)', async () => {
    (si.mem as ReturnType<typeof vi.fn>).mockResolvedValue(memBytes(15.7, 5.64));

    const mem = await detectMemory();

    expect(mem.total).toBe(15.7);
    expect(mem.available).toBeCloseTo(5.64, 2);
  });

  it('rounds fractional values to 2 decimals', async () => {
    (si.mem as ReturnType<typeof vi.fn>).mockResolvedValue(memBytes(15.789, 5.64123));

    const mem = await detectMemory();

    expect(mem.total).toBe(15.79);
    expect(mem.available).toBe(5.64);
  });

  it('detects Apple Silicon as unified memory', async () => {
    // 模拟 darwin
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    (si.mem as ReturnType<typeof vi.fn>).mockResolvedValue(memBytes(18, 8));

    const mem = await detectMemory();

    expect(mem.type).toBe('unified');
    expect(mem.total).toBe(18);

    // 恢复
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('detects server-grade 256GB', async () => {
    (si.mem as ReturnType<typeof vi.fn>).mockResolvedValue(memBytes(256, 250));

    const mem = await detectMemory();

    expect(mem.total).toBe(256);
    expect(mem.available).toBe(250);
  });

  it('handles zero available memory (full RAM in use)', async () => {
    (si.mem as ReturnType<typeof vi.fn>).mockResolvedValue(memBytes(16, 0));

    const mem = await detectMemory();

    expect(mem.available).toBe(0);
    expect(mem.total).toBe(16);
  });

  it('clamps available when OS reports more than total (defensive)', async () => {
    // 极端情况：OS 报告 20GB 可用，但 total 只有 16GB
    (si.mem as ReturnType<typeof vi.fn>).mockResolvedValue(memBytes(16, 20));

    const mem = await detectMemory();

    expect(mem.total).toBe(16);
    expect(mem.available).toBe(16); // clipped to total
  });

  it('throws DetectionError when systeminformation fails', async () => {
    (si.mem as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('EACCES'));

    await expect(detectMemory()).rejects.toThrow(DetectionError);
  });

  it('throws DetectionError on timeout', async () => {
    (si.mem as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {})
    );

    await expect(detectMemory()).rejects.toThrow(DetectionError);
  }, 10000);
});
