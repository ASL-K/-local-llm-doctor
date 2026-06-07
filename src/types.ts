// =====================================================================
// src/types.ts — Shared TypeScript types
// Day 1 stub. Day 2+ modules will import from here.
// =====================================================================

/**
 * Standardized hardware profile — the output of all 5 detectors.
 * Used by matcher.ts to determine which models fit.
 */
export interface HardwareProfile {
  os: OsInfo;
  cpu: CpuInfo;
  gpu: GpuInfo[]; // 数组：可能有多个 GPU（集显 + 独显）
  memory: MemoryInfo;
  disk: DiskInfo;
}

export interface OsInfo {
  /** darwin | win32 | linux */
  platform: 'darwin' | 'win32' | 'linux';
  /** 发行版描述：'macOS 14.4' | 'Windows 11' | 'Ubuntu 22.04' */
  distro: string;
  /** 是否在 WSL 内 */
  wsl: boolean;
  /** WSL 1 / 2 / null（不在 WSL 时为 null）*/
  wslVersion: '1' | '2' | null;
}

export interface CpuInfo {
  /** 完整品牌字符串：'Apple M3 Pro' | 'Intel i7-13700H' */
  brand: string;
  /** 物理核数 */
  cores: number;
  /** 逻辑核数（带超线程）*/
  threads: number;
  /** CPU 架构 */
  arch: 'x86_64' | 'arm64' | 'riscv64';
  /** 支持的指令集：['avx2', 'avx512', 'amx'] */
  features: string[];
}

export interface GpuInfo {
  vendor: 'nvidia' | 'amd' | 'apple' | 'intel' | 'none';
  /** 显存/共享内存（GB）*/
  vram: number;
  /** 完整型号：'RTX 4090' | 'M3 Pro' | 'RX 7900 XT' */
  model: string;
  metalSupported: boolean;
  cudaSupported: boolean;
}

export interface MemoryInfo {
  /** 总内存（GB）*/
  total: number;
  /** 可用内存（GB）*/
  available: number;
  type: 'DDR4' | 'DDR5' | 'LPDDR5' | 'unified' | 'unknown';
}

export interface DiskInfo {
  /** 总空间（GB）*/
  total: number;
  /** 可用空间（GB）*/
  available: number;
  type: 'SSD' | 'HDD' | 'unknown';
}

// ---- CLI options (Day 4 会被 commander 填充) ----
export interface CliOptions {
  json: boolean;
  markdown: boolean;
  lang: 'en' | 'zh-CN';
  noEmoji: boolean;
  debug: boolean;
  topN: number;
}
