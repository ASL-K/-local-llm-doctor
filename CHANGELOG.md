# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned (v0.6 / v1.0)
- npm publish 首次发布
- V2EX 首发帖
- GitHub Issue / PR 模板
- vs whichllm 详细对比文
- a100/h100 实测 tps（用户反馈驱动）

## [0.5.0] - 2026-06-07

### Added
- **a100_80gb / h100_80gb hardware key (v0.5.2)**
  - `HardwareKey` 加 2 个数据中心卡 key
  - `matchHardwareKey` vram>=80 时按 gpu.model 区分 A100 / H100
  - `loader.VALID_HARDWARE_KEYS` 加新 key
  - 5 个旗舰模型加 a100/h100 tps 数据（基于 llama.cpp 公开 benchmark）
    - Qwen3-235B-A22B: a100=8 t/s, h100=14 t/s
    - Llama-3.3-70B: a100=10 t/s, h100=18 t/s
    - DeepSeek-V3-0324: a100=3 t/s, h100=5 t/s
    - Gemma-3-27B: a100=22 t/s, h100=40 t/s
    - Qwen2.5-72B: a100=9 t/s, h100=16 t/s
  - 6 个新测试覆盖 A100/H100 用户
- **GitHub Action CI (v0.5.3)**
  - `.github/workflows/test.yml` Node 20 + tsc + vitest + build
  - 触发: push to main / pull_request / workflow_dispatch
  - CI 第一次跑就过（193/193 tests + tsc 0 错误 + build 成功）
- **README 完整化 (v0.5.4)**
  - 徽章: 115/115 → 193/193 tests
  - 徽章: Node 18+ → Node 20+
  - 新加 CI badge
  - 新加 v0.5 特性列表（9 项）
  - 新加 v0.4.6 真实输出示例
  - README 8.5KB → 11.0KB

### Changed
- **删 llama-3.1-70B (v0.5.1)**
  - 理由: v0.4.3 加的 llama-3.3-70b 是完全替代
  - 20 → 19 models
  - 3 个文件改动（table.json + 2 个测试）

### Design decisions (v0.5)
- tps 数据基于公开 benchmark（**不编造**：基于 llama.cpp GitHub README + 社区数据）
- 未知 80GB 显卡 → 默认 h100（最新卡）
- 小模型 1.7B/4B/8B 等不填 a100/h100（**没人跑这个**）
- 删旧 70B 而非保留双 70B（避免用户困惑"用哪个"）
- CI cache: 'npm'（节省 1-2 分钟/次）

### Fixed
- 44 个测试失败（v0.5.2 修：loader 校验 a100/h100 漏白名单）

### Real-hardware tested
- 5.87GB WSL2: 3 模型能跑（v0.4.6 真实跑验证）
- 3.87GB Windows 11: 2 模型能跑（v0.4.6 真实跑验证）
- A100-80GB (mock): 70B+ 模型 tps > 0（v0.5.2 测试）
- H100-80GB (mock): 67B MoE tps > 0（v0.5.2 测试）
- CI 真实跑（GitHub ubuntu-latest Node 20）：193/193 tests

### Stats
- 193/193 tests passing
- tsc 0 errors
- 32 commits
- 19 models
- 7 hardware keys
- 2 languages (zh/en)

## [0.4.0] - 2026-06-07

### Added
- **i18n: zh/en bilingual CLI output (v0.4.1 + v0.4.2)**
  - `src/i18n/strings.ts`: 80+ key 中英双语字典
  - `t(key, lang, params)`: 翻译 + 变量替换
  - `detectLang()`: 按 LANG 环境变量自动检测
  - `[missing:key]` 显式错误提示
  - DEFAULT_LANG='zh' 向后兼容
- **`--lang <zh|en>` CLI flag (v0.4.2b)**
  - `local-llm-doctor --lang en` → 英文
  - `local-llm-doctor --lang zh` → 中文（默认）
  - `-l` 短别名
  - 不支持的语言 → warning + fallback
  - printHelp 也接受 lang
- **table.ts 全部 i18n 化 (v0.4.2a)**
  - renderHardware / renderRecommendations / renderFull 加 lang 参数
  - 局部变量 `t = new Table()` 改名 `cliTable`（避免遮蔽 i18n t()）
  - 6 个 render 函数 + 30+ 字符串 i18n 化
- **5 new flagship models (v0.4.3)**
  - Qwen3-235B-A22B (MoE, 235B/22B active)
  - Llama-3.3-70B (70B dense)
  - DeepSeek-V3-0324 (MoE 671B/37B active)
  - Gemma-3-27B (27B dense, 跨档 balanced+aggressive)
  - Qwen2.5-72B (72B dense, Qwen3 没出 72B 的替代)
  - 15 → 20 models

### Design decisions (v0.4.1/2)
- 集中字典（单文件 8.7KB）vs 分散：选集中（加新语言加 1 列）
- `{name}` 变量占位（JavaScript / i18next 通用）
- JSON 模式不切语言（脚本友好，键名稳定）
- printHelp 也接受 lang（i18n 完整性）
- DEFAULT_LANG='zh' 不变（不读 env.LANG）
- tps_estimate 大模型全 0（诚实：不编造 70B+ 跑不动的数字）

### Real-hardware tested
- 5.87GB WSL2: 5 模型能跑
- 3.87GB Windows 11: 2 模型能跑
- 24GB RTX 4090: 3 档全有
- `--lang en` 模式全部英文输出（表格 + 文案）

### Stats
- 187/187 tests passing
- tsc 0 errors
- 25 commits

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
