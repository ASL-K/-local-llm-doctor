# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned (v0.3)
- Fix fallback reason text (3 branches: short / just enough / surplus)
- De-dup 3-tier recommendations (tier_dynamic calc based on hardware)
- Hide disk.type when "unknown" (Windows common)
- Disk filesystem detection (NTFS/ext4/APFS)

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
