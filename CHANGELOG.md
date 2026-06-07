# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned (v0.4)
- i18n: English output mode (--lang en)
- CI: GitHub Actions auto-run 158 tests on push
- More models: Qwen3-110B/720B, Llama-4
- Download time estimator (按网速算"7B 下载要 X 分钟")
- npm publish (首次发布)
- V2EX 首发帖

## [0.3.0] - 2026-06-07

### Fixed
- **fallback reason: 3 branches (v0.3.1)**
  - v0.2 bug: 3.87GB Windows 用户看到"差 -0.9GB"（负数表达错）
  - 3 分支文案：
    - gap < 0:  "盈余 XGB"（有盈余）
    - gap === 0: "刚好够，但无余裕"（无浮点误差，无 OOM 缓冲）
    - gap > 0:  "还差 XGB"（缺）
  - 7 个新测试覆盖 1GB / 3GB / 3.87GB / 4GB / 5.64GB 场景
- **tier_dynamic algo (v0.3.2)**
  - v0.2 bug: 3 档完全一样（5.64GB 用户 3 档都是同 2 个模型）
  - 原因: v0.1/v0.2 用 model.tierFlags（model 自己声明档位），
    table.json 里所有 model 3 个 flag 都设成 true → 等于没区分
  - 修法: 用 vramMin 动态决定档位
    - < 6GB   → conservative（极小模型）
    - 6-14GB  → balanced（中等模型）
    - >= 14GB → aggressive（大模型）
  - 阈值依据: 5.64GB / 3.87GB 用户的最小 vramMin 是 4GB（Q4_K_M），
    阈值 = 4 时 conservative 永远空；阈值 = 6 时主流用户有内容
  - 5 个新测试覆盖 3 档 + 边界 + 向后兼容
  - 向后兼容: `MatchResult.tierFlags` 字段保留，recommend 改用 `tierDynamic`
- **disk type display (v0.3.3)**
  - v0.2 line 96 已隐性修好 (`!== 'unknown' ? (...) : ''`)
  - v0.3.3 加 4 个测试覆盖这个 case
  - Windows 上 systeminformation 不报 SSD/HDD，不显示 (unknown)

### Real-hardware tested
- 3.87GB Windows 11: conservative 3 + balanced 0 + aggressive 0 (改善)
- 5.64GB WSL2 Ubuntu: conservative 3 + balanced 0 + aggressive 0 (改善)
- 158/158 tests passing, tsc 0 errors

## [0.2.0] - 2026-06-07

### Added
- **GPU detector** (`src/detect/gpu.ts`): NVIDIA / AMD / Intel / Apple support
  - Primary: systeminformation.graphics() (cross-platform)
  - Fallback: nvidia-smi --query-gpu=name,memory.total (NVIDIA only)
  - 5-second overall timeout, 3-second nvidia-smi timeout
  - Vendor normalization: nvidia/amd/intel/apple/none
  - Sort by VRAM descending (gpus[0] = primary)
- **cli-table3 rendering** (`src/output/table.ts`): hardware + 3-tier + fallback
  - 3 separate tables (conservative/balanced/aggressive)
  - 7 columns: model / quant / fitLevel / TPS~ / Q / reason
  - CJK-friendly truncate() with 11 Unicode ranges
  - Multi-GPU handling: show primary + "N cards total"
- **chalk color** (`src/output/format.ts`): fitLevel / tier / vram / labels
  - fitLevel: perfect=green / comfortable=cyan / tight=yellow / too_tight=red
  - tier: conservative=blue / balanced=magenta / aggressive=red
- **CLI flags** (`src/index.ts`): --json / --debug / --help
  - Default: colored table output
  - --json: raw JSON (script-friendly)
  - --debug: table + full hardware JSON
- **Test fixtures** (`tests/output/format.test.ts`): 6 color function tests
- **dep**: cli-table3, chalk

### Changed
- `src/detect/index.ts`: now runs **5 detectors** in parallel (was 4)
- `src/index.ts`: default output changed from JSON to table
- `bin/local-llm-doctor.js`: use pathToFileURL() for Windows ESM compatibility
  (fixes ERR_UNSUPPORTED_ESM_URL_SCHEME)
- `package.json` build script: use `node node_modules/typescript/bin/tsc`
  instead of bare `tsc` (Windows PATH issue)

### Tested
- 142/142 tests passing
- TypeScript 0 errors
- Real hardware: WSL2 Ubuntu 16c + 5.87GB RAM (qwen3-1.7B conservative)
- Real hardware: Windows 11 i5-12500H + 3.87GB RAM (qwen3-4B + qwen3-1.7B)

## [0.1.0] - 2026-06-07

### Added
- **Hardware detection** (4 detectors in parallel)
  - CPU: brand, cores, threads, arch, features (avx2/avx512f/...)
  - Memory: total, available, type (DDR4/unified/unknown)
  - Disk: total, available, type (SSD/HDD/unknown)
  - OS: platform, distro, WSL 1/2 detection via /proc/version
- **Model table** (`src/models/table.json`): 15 mainstream LLMs
  - Qwen3 series (1.7B-32B), Llama-3.3, DeepSeek-V3, GLM-4, Gemma-3, Phi-4,
    Qwen2.5-Coder-7B, Mistral-7B, Yi-1.5-9B
  - Each model: 6 quant levels (Q2_K-Q8_0), 8 hardware tps_estimates
  - MoE: params_b vs active_b distinction (e.g. Qwen3-30B-A3B)
- **Matcher** (`src/models/matcher.ts`): O(15) algorithm
  - Select primary GPU (largest VRAM)
  - Target VRAM = GPU vram OR memory.available (CPU-only fallback)
  - Best quant selection (highest quality that fits)
  - FitLevel: perfect(>=1.5) / comfortable(>=1.2) / tight(>=1.05) / too_tight
  - HardwareKey inference (Apple / 4x NVIDIA / 3x CPU)
- **Recommender** (`src/recommend/recommend.ts`): 3-tier + fallback
  - Conservative (always works) / Balanced (default) / Aggressive (high-end)
  - Top 3 per tier
  - Fallback: 2 scenarios (totally no fit / too tight)
  - findCheapestFit: smallest vramMin that fits
- **JSON output** (`src/index.ts`): raw hardware + summary + recommendations
- **run.bat** (Windows launcher): 5-step verification with friendly errors
- **README** (bilingual): 7.5KB Chinese + English
- **.github-friendly**: .gitignore / .editorconfig / .prettierrc / .eslintrc

### Tested
- 115/115 tests passing
- TypeScript 0 errors
- Real hardware: WSL2 Ubuntu 16c + 5.87GB RAM (293ms)

## [0.0.0] - 2026-06-07

### Added
- Project initialization (package.json, tsconfig, LICENSE, etc.)
- CLI entry stub (bin/local-llm-doctor.js)
- TypeScript types stub (src/types.ts)
- Node version check (>= 18 enforced)
- ESLint + Prettier + EditorConfig
- CODE_OF_CONDUCT (zh-CN) + .gitattributes (LF normalization)
- Git repository initialized at ASL-K/-local-llm-doctor
