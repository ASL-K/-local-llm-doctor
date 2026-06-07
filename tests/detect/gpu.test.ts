// =====================================================================
// tests/detect/gpu.test.ts
//
// 测试 src/detect/gpu.ts
// =====================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { platform } from 'node:os';

vi.mock('systeminformation', () => ({
  default: {
    graphics: vi.fn(),
  },
}));

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return { ...actual, platform: vi.fn() };
});

import si from 'systeminformation';
import { exec } from 'node:child_process';
import { detectGpu } from '../../src/detect/gpu.js';
import { DetectionError } from '../../src/utils/errors.js';

// Helper: mock exec 回调失败
function mockExecFail() {
  (exec as ReturnType<typeof vi.fn>).mockImplementation(
    ((
      _cmd: string,
      _opts: unknown,
      callback?: (err: Error, result: { stdout: string; stderr: string }) => void,
    ) => {
      if (callback) callback(new Error('command not found'), { stdout: '', stderr: '' });
    }) as never,
  );
}

// Helper: mock exec 回调成功 + 多行 stdout
function mockExecSuccess(stdout: string) {
  (exec as ReturnType<typeof vi.fn>).mockImplementation(
    ((
      _cmd: string,
      _opts: unknown,
      callback?: (err: Error | null, result: { stdout: string; stderr: string }) => void,
    ) => {
      if (callback) callback(null, { stdout, stderr: '' });
    }) as never,
  );
}

describe('detectGpu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 默认 Linux 平台
    (platform as ReturnType<typeof vi.fn>).mockReturnValue('linux');
    // 默认 nvidia-smi 不可用
    mockExecFail();
  });

  it('returns single NVIDIA GPU with VRAM from systeminformation', async () => {
    (si.graphics as ReturnType<typeof vi.fn>).mockResolvedValue({
      controllers: [
        {
          vendor: 'NVIDIA Corporation',
          model: 'GeForce RTX 4090',
          memoryTotal: 24576, // MB
          memoryUsed: 0,
        },
      ],
      displays: [],
    });

    const gpus = await detectGpu();

    expect(gpus).toHaveLength(1);
    expect(gpus[0]!.vendor).toBe('nvidia');
    expect(gpus[0]!.model).toBe('GeForce RTX 4090');
    expect(gpus[0]!.vram).toBe(24);
    expect(gpus[0]!.cudaSupported).toBe(true);
  });

  it('returns multiple NVIDIA GPUs', async () => {
    (si.graphics as ReturnType<typeof vi.fn>).mockResolvedValue({
      controllers: [
        { vendor: 'NVIDIA Corporation', model: 'GeForce RTX 4090', memoryTotal: 24576 },
        { vendor: 'NVIDIA Corporation', model: 'GeForce RTX 3060', memoryTotal: 12288 },
      ],
      displays: [],
    });

    const gpus = await detectGpu();

    expect(gpus).toHaveLength(2);
    // 按 vram 降序
    expect(gpus[0]!.model).toBe('GeForce RTX 4090');
    expect(gpus[1]!.model).toBe('GeForce RTX 3060');
  });

  it('returns AMD GPU with 8GB VRAM', async () => {
    (si.graphics as ReturnType<typeof vi.fn>).mockResolvedValue({
      controllers: [
        { vendor: 'Advanced Micro Devices, Inc.', model: 'Radeon RX 7900 XT', memoryTotal: 20480 },
      ],
      displays: [],
    });

    const gpus = await detectGpu();

    expect(gpus[0]!.vendor).toBe('amd');
    expect(gpus[0]!.vram).toBe(20);
  });

  it('returns Intel integrated GPU with 0 VRAM', async () => {
    (si.graphics as ReturnType<typeof vi.fn>).mockResolvedValue({
      controllers: [
        { vendor: 'Intel Corporation', model: 'Iris Xe Graphics', memoryTotal: 0 },
      ],
      displays: [],
    });

    const gpus = await detectGpu();

    expect(gpus[0]!.vendor).toBe('intel');
    expect(gpus[0]!.vram).toBe(0); // 集显没有独立 VRAM
  });

  it('returns Apple Silicon with metalSupported=true', async () => {
    (platform as ReturnType<typeof vi.fn>).mockReturnValue('darwin');
    (si.graphics as ReturnType<typeof vi.fn>).mockResolvedValue({
      controllers: [
        { vendor: 'Apple', model: 'Apple M3 Pro', memoryTotal: 0 },
      ],
      displays: [],
    });

    const gpus = await detectGpu();

    expect(gpus[0]!.vendor).toBe('apple');
    expect(gpus[0]!.metalSupported).toBe(true);
  });

  it('returns empty array when no GPU', async () => {
    (si.graphics as ReturnType<typeof vi.fn>).mockResolvedValue({
      controllers: [],
      displays: [],
    });

    const gpus = await detectGpu();

    expect(gpus).toEqual([]);
  });

  it('falls back to nvidia-smi when systeminformation lacks VRAM', async () => {
    // systeminformation 没拿到 VRAM
    (si.graphics as ReturnType<typeof vi.fn>).mockResolvedValue({
      controllers: [
        { vendor: 'NVIDIA Corporation', model: 'Unknown', memoryTotal: 0 },
      ],
      displays: [],
    });

    // nvidia-smi 拿到详细
    mockExecSuccess('NVIDIA GeForce RTX 4080, 16384');

    const gpus = await detectGpu();

    expect(gpus).toHaveLength(1);
    expect(gpus[0]!.model).toBe('NVIDIA GeForce RTX 4080');
    expect(gpus[0]!.vram).toBe(16);
  });

  it('handles nvidia-smi with multiple GPUs', async () => {
    (si.graphics as ReturnType<typeof vi.fn>).mockResolvedValue({
      controllers: [
        { vendor: 'NVIDIA Corporation', model: 'RTX 4090', memoryTotal: 0 },
      ],
      displays: [],
    });

    mockExecSuccess('NVIDIA GeForce RTX 4090, 24576\nNVIDIA GeForce RTX 3080, 10240');

    const gpus = await detectGpu();

    expect(gpus).toHaveLength(2);
    expect(gpus[0]!.model).toBe('NVIDIA GeForce RTX 4090');
    expect(gpus[1]!.model).toBe('NVIDIA GeForce RTX 3080');
  });

  it('throws DetectionError on systeminformation failure', async () => {
    (si.graphics as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('permission denied'));

    await expect(detectGpu()).rejects.toThrow(DetectionError);
  });

  it('throws DetectionError on timeout', async () => {
    (si.graphics as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}),
    );

    await expect(detectGpu()).rejects.toThrow(DetectionError);
  }, 10000);
});
