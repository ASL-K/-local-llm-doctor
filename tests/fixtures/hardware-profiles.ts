// =====================================================================
// tests/fixtures/hardware-profiles.ts
//
// 5 个标准硬件 profile，用于：
//   1. 单元测试（mock 硬件检测返回值）
//   2. README 演示截图
//   3. 终端输出示例
//   4. 用户故事文档
//
// 每个 profile 对应一个真实用户画像：
//   - lowEnd       5.64GB 内存用户（README 反面教材）
//   - gaming       知乎/B 站典型 AI 本地部署用户
//   - workstation 重度用户/极客
//   - appleSilicon  Mac 开发者
//   - wslUser      中国 Windows 开发者最大群体
// =====================================================================

import type { HardwareProfile } from '../../src/types.js';

/**
 * lowEnd —— 5.64GB 内存用户
 *
 * 这是 README 首页的"反面教材"案例：
 * "我电脑 5.64GB 可用内存能不能跑 Qwen3-8B？"
 *
 * 答案：跑不动。建议升级内存或用 API。
 */
export const lowEnd: HardwareProfile = {
  os: {
    platform: 'win32',
    distro: 'Windows 11',
    wsl: false,
    wslVersion: null,
  },
  cpu: {
    brand: 'Intel Core i5-8250U',
    cores: 4,
    threads: 8,
    arch: 'x86_64',
    features: ['avx2', 'sse4_2'],
  },
  gpu: [
    {
      vendor: 'intel',
      model: 'Intel UHD 620',
      vram: 2,
      metalSupported: false,
      cudaSupported: false,
    },
  ],
  memory: {
    total: 15.7,
    available: 5.64,
    type: 'DDR4',
  },
  disk: {
    total: 256,
    available: 100,
    type: 'SSD',
  },
};

/**
 * gaming —— 知乎/B 站典型用户
 *
 * 16GB 显存 RTX 3060 + 32GB 内存
 * 能跑 Qwen3-8B / 14B / 30B-A3B (MoE)
 */
export const gaming: HardwareProfile = {
  os: {
    platform: 'win32',
    distro: 'Windows 11',
    wsl: false,
    wslVersion: null,
  },
  cpu: {
    brand: 'Intel Core i5-12400',
    cores: 6,
    threads: 12,
    arch: 'x86_64',
    features: ['avx2', 'avx512'],
  },
  gpu: [
    {
      vendor: 'nvidia',
      model: 'NVIDIA GeForce RTX 3060',
      vram: 12,
      metalSupported: false,
      cudaSupported: true,
    },
  ],
  memory: {
    total: 32,
    available: 28.3,
    type: 'DDR4',
  },
  disk: {
    total: 1024,
    available: 542,
    type: 'SSD',
  },
};

/**
 * workstation —— 极客/重度用户
 *
 * 24GB 显存 RTX 4090 + 64GB 内存
 * 能跑 Qwen3-32B 全精度 / 72B 量化
 */
export const workstation: HardwareProfile = {
  os: {
    platform: 'linux',
    distro: 'Ubuntu 24.04',
    wsl: false,
    wslVersion: null,
  },
  cpu: {
    brand: 'AMD Ryzen 9 7950X',
    cores: 16,
    threads: 32,
    arch: 'x86_64',
    features: ['avx2', 'avx512'],
  },
  gpu: [
    {
      vendor: 'nvidia',
      model: 'NVIDIA GeForce RTX 4090',
      vram: 24,
      metalSupported: false,
      cudaSupported: true,
    },
  ],
  memory: {
    total: 64,
    available: 60,
    type: 'DDR5',
  },
  disk: {
    total: 2048,
    available: 1500,
    type: 'SSD',
  },
};

/**
 * appleSilicon —— Mac 开发者
 *
 * M3 Pro 18GB 统一内存（显存和内存共享）
 * 适合跑 Qwen3-8B / 14B（充分利用统一内存）
 */
export const appleSilicon: HardwareProfile = {
  os: {
    platform: 'darwin',
    distro: 'macOS 14.4',
    wsl: false,
    wslVersion: null,
  },
  cpu: {
    brand: 'Apple M3 Pro',
    cores: 12,
    threads: 12,
    arch: 'arm64',
    features: ['neon', 'fp16'],
  },
  gpu: [
    {
      vendor: 'apple',
      model: 'Apple M3 Pro GPU',
      vram: 18,
      metalSupported: true,
      cudaSupported: false,
    },
  ],
  memory: {
    total: 18,
    available: 8,
    type: 'unified',
  },
  disk: {
    total: 1024,
    available: 700,
    type: 'SSD',
  },
};

/**
 * wslUser —— 中国 Windows 开发者最大群体
 *
 * Windows 11 + WSL 2 + RTX 4060 8GB
 * 真实痛点：WSL 1/2 检测 / 中文路径 / 中文用户名
 */
export const wslUser: HardwareProfile = {
  os: {
    platform: 'linux',
    distro: 'Ubuntu 22.04 (WSL2)',
    wsl: true,
    wslVersion: '2',
  },
  cpu: {
    brand: 'Intel Core i7-13700H',
    cores: 14,
    threads: 20,
    arch: 'x86_64',
    features: ['avx2', 'avx512'],
  },
  gpu: [
    {
      vendor: 'nvidia',
      model: 'NVIDIA GeForce RTX 4060 Laptop',
      vram: 8,
      metalSupported: false,
      cudaSupported: true,
    },
  ],
  memory: {
    total: 32,
    available: 26,
    type: 'DDR5',
  },
  disk: {
    total: 1024,
    available: 600,
    type: 'SSD',
  },
};

/**
 * 所有 profile 的数组（方便遍历测试）
 */
export const allProfiles: Record<string, HardwareProfile> = {
  lowEnd,
  gaming,
  workstation,
  appleSilicon,
  wslUser,
};

/**
 * 边界情况：纯 CPU 模式（无 GPU）
 */
export const cpuOnly: HardwareProfile = {
  os: { platform: 'linux', distro: 'Ubuntu 22.04', wsl: false, wslVersion: null },
  cpu: { brand: 'AMD Ryzen 5 5600', cores: 6, threads: 12, arch: 'x86_64', features: ['avx2'] },
  gpu: [],
  memory: { total: 32, available: 28, type: 'DDR4' },
  disk: { total: 1024, available: 500, type: 'SSD' },
};
