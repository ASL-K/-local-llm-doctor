# local-llm-doctor

> **我电脑能跑哪个 LLM？一行命令告诉你，断网也能用。**
>
> Find which LLM actually runs on your hardware. Offline-first, no telemetry, no model downloads, < 300ms.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Node: 20+](https://img.shields.io/badge/node-20%2B-green.svg)
![TypeScript: 5.x](https://img.shields.io/badge/typescript-5.x-blue.svg)
![Tests: 193/193](https://img.shields.io/badge/tests-193%2F193-brightgreen.svg)
[![CI](https://github.com/ASL-K/-local-llm-doctor/actions/workflows/test.yml/badge.svg)](https://github.com/ASL-K/-local-llm-doctor/actions)

[English](#english) · [简体中文](#简体中文)

---

<a name="简体中文"></a>

## 简体中文

**local-llm-doctor** 是一个 CLI 工具，**告诉你电脑能跑哪个 LLM**。零依赖、零网络请求、< 300ms 出结果。

**v0.5 特性**：
- ✅ 5 个检测器（OS / CPU / 内存 / 磁盘 / GPU）
- ✅ 19 个模型（Qwen3 全系 + Llama 3.3 + DeepSeek-V3 + Gemma 3 + Phi-4 + Mistral + Yi + GLM-4）
- ✅ 3 档推荐：保守档（开箱即用）/ 平衡档（默认推荐）/ 激进档（高配挑战）
- ✅ 双语 CLI：`--lang zh`（默认）/ `--lang en`
- ✅ JSON 模式：脚本友好（`--json`）
- ✅ 兜底建议：API 替代 + 升级建议
- ✅ Windows / macOS / Linux 真实跑通（含 WSL 1/2 识别）
- ✅ GitHub Action CI：193/193 测试自动跑
- ✅ GPU 识别：RTX 4090 / 3090 / 3060 / 4060 + A100-80GB / H100-80GB

### 为什么需要它？

知乎/B 站/小红书搜"本地跑 LLM"，90% 的帖子都困在第一步：

- "我 8GB 内存能跑 7B 模型吗？"
- "RTX 3060 跑 Qwen3-32B 量化多少合适？"
- "WSL 跑模型和原生 Linux 有什么区别？"

你装了 Ollama / LM Studio，跑起来 OOM 才知道配置错了。**local-llm-doctor 在你下载模型前就告诉你答案**。

### ✨ 特性

| | local-llm-doctor | whichllm (3k⭐) | which-llm (1.2k⭐) |
|---|---|---|---|
| 断网可用 | ✅ **完全离线** | ❌ 需联网拉 HuggingFace | ❌ 需联网 |
| 速度 | ✅ **< 300ms** | ⏱ 5-15s（依赖外部 API）| ⏱ 3-10s |
| WSL 1/2 识别 | ✅ **自动识别** | ❌ 不支持 | ❌ 不支持 |
| 中文用户友好 | ✅ **中文界面** | ❌ 英文 | ❌ 英文 |
| 5GB 内存也能用 | ✅ | ⚠️ 装下但易崩 | ⚠️ 装下但易崩 |
| 3 档推荐 | ✅ **保守/平衡/激进** | ❌ 评分排序 | ❌ 评分排序 |
| 模型建议下载链接 | ❌ v0.2 | ✅ | ❌ |

### 📦 安装

需要 **Node.js 18+**（[下载](https://nodejs.org/)）。

```bash
# 方式 1：npx 直接跑（推荐试用）
npx local-llm-doctor

# 方式 2：全局安装
npm install -g local-llm-doctor
local-llm-doctor
```

### 🚀 使用

```bash
# 真实输出（作者本人的 5.87GB WSL2 电脑）：
$ local-llm-doctor

ℹ local-llm-doctor v0.1.0
ℹ 正在检测硬件...
ℹ ✓ 硬件检测完成（287ms）
ℹ ✓ 已加载 15 个模型
ℹ ✓ 匹配完成（5 个模型能跑）
ℹ ✓ 推荐生成（总耗时 292ms）

════════════════════════════════════════════════════════════
  local-llm-doctor v0.1.0 — 我电脑能跑哪个 LLM？
════════════════════════════════════════════════════════════

{
  "hardware": {
    "os": { "platform": "linux", "distro": "Ubuntu (WSL)", "wsl": true, "wslVersion": "2" },
    "cpu": { "brand": "Gen Intel® Core™ i5-12500H", "cores": 16, "threads": 16, "arch": "x86_64" },
    "memory": { "total": 7.63, "available": 5.81, "type": "unknown" },
    "disk": { "total": 1006.85, "available": 944.75, "type": "SSD" },
    "gpu": []
  },
  "summary": { "totalModelsInTable": 15, "modelsThatFit": 5, "elapsedMs": 292 },
  "recommendations": {
    "conservative": [
      {
        "modelName": "Qwen3-1.7B",
        "quantLevel": "Q8_0",
        "fitLevel": "comfortable",
        "reason": "5.8GB 充足，Q8_0 流畅运行",
        "estimatedTps": 6,
        "qualityScore": 60,
        "bestFor": ["中文对话", "轻量任务", "老电脑"]
      },
      {
        "modelName": "Qwen2.5-Coder-7B",
        "quantLevel": "Q4_K_M",
        "fitLevel": "tight",
        "reason": "5.8GB 偏紧，Q4_K_M 勉强能跑（建议关闭其他程序）",
        "estimatedTps": 0,
        "qualityScore": 73,
        "bestFor": ["代码生成", "代码补全"]
      },
      {
        "modelName": "Qwen3-4B",
        "quantLevel": "Q5_K_M",
        "fitLevel": "tight",
        "reason": "5.8GB 偏紧，Q5_K_M 勉强能跑（建议关闭其他程序）",
        "estimatedTps": 4,
        "qualityScore": 71,
        "bestFor": ["中文对话", "日常任务"]
      }
    ],
    "balanced": [ ... ],
    "aggressive": [ ... ],
    "fallback": {
      "reason": "推荐模型需要至少 5GB 显存/内存，你只有 5.8GB（差 -0.8GB）",
      "suggestion": "建议：(1) 关闭其他程序释放内存 (2) 用更小的量化（如 Q2_K） (3) 升级硬件 (4) 用云 API",
      "minRequiredVram": 5,
      "apiAlternatives": ["OpenAI GPT-4o-mini", "Anthropic Claude 3.5 Haiku", "DeepSeek Chat"]
    }
  }
}
```

> **v0.1 输出格式**：JSON（开发者友好 / 适合自动化）
> **v0.2 输出格式**：cli-table3 美化表格（终端用户友好）
> **v0.4 输出格式**：emoji + 简洁 + 总结（默认中文，--lang en 切英文）

#### v0.4 真实输出示例（5.87GB WSL2 Ubuntu）

```bash
$ local-llm-doctor

🚀 local-llm-doctor v0.4 — 我电脑能跑哪个 LLM？
✓ ✓ 437ms · 你的电脑能跑 3 个模型（20 个总表里）

🖥️ 硬件信息
┌───────────────┬────────────────────────────────────────────────────┐
│ 🖥️ OS         │ Ubuntu (WSL) (WSL2)                                 │
│ 🧠 CPU        │ Gen Intel® Core™ i5-12500H (16核 16线程, x86_64)  │
│ 🧠 内存       │ 总计 7.6 GB / 可用 5.9 GB                           │
│ 💾 磁盘       │ 总计 1006.9 GB / 可用 944.6 GB (SSD)               │
│ 🎮 GPU        │ 无独立显卡（用 CPU/集成显卡）                      │
└───────────────┴────────────────────────────────────────────────────┘

💡 推荐结果
┌─ 🌱 保守档 │ 开箱即用 ────────────────────────────────────────────┐
┌────────────────────┬─────────┬────────────┬───────┬────┬─────────────┐
│ 模型               │ 量化    │ 适配度     │ TPS~  │ Q  │ 原因        │
├────────────────────┼─────────┼────────────┼───────┼────┼─────────────┤
│ Qwen3-1.7B         │ Q8_0    │ ○ 舒适     │ 6     │ 60 │ 5.9GB 充足  │
│ Qwen2.5-Coder-7B   │ Q4_K_M  │ △ 偏紧     │ N/A   │ 73 │ 5.9GB 偏紧  │
│ Qwen3-4B           │ Q5_K_M  │ △ 偏紧     │ 4     │ 71 │ 5.9GB 偏紧  │
└────────────────────┴─────────┴────────────┴───────┴────┴─────────────┘
...
```

### 🎯 适合谁？

- ✅ 0 基础用户第一次跑 LLM（**5.64GB / 5.87GB 这种机器也能用**）
- ✅ WSL 1/2 用户（自动识别 + 中文友好）
- ✅ 想升级硬件但不知道买什么（"我 12GB → 16GB 够吗？"）
- ✅ CPU 推理用户（无独显也能跑 1.7B / 4B）
- ✅ 中文用户（界面 + 推荐 + 兜底都中文）
- ❌ 高端独显用户（v0.2 才支持 GPU 检测）

### 🛠️ 支持的模型

15 个主流 LLM，包括 Qwen3 系列（1.7B-32B）、Llama-3.3、DeepSeek-V3、GLM-4、Gemma-3、Phi-4、Qwen2.5-Coder、Mistral、Yi。

每个模型支持 1-6 种量化（Q2_K → Q8_0），按"能跑起来"的最高质量自动选。

### 🏗️ 架构

```
src/
├── detect/        # 5 个硬件检测器（OS/CPU/Memory/Disk/GPU）
├── models/        # 模型表 + 加载器 + 匹配算法
├── recommend/     # 3 档推荐 + 兜底
├── utils/         # 格式化、logger、错误类
└── index.ts       # CLI 入口
```

- 4 个检测器并行跑（**~200ms**）
- 加载 15 个模型表（**< 1ms**）
- 匹配所有模型（**< 1ms**）
- 3 档分组（**< 1ms**）
- **总耗时：~300ms**

### 🧪 测试

```bash
npm test
# 115 tests passing（覆盖 5 大用户场景 + 边界 + 真实硬件）
```

测试覆盖：
- 5.87GB 内存（README 故事）
- RTX 3060 12GB（主流用户）
- RTX 4090 24GB（极客）
- Apple Silicon M3 Pro 18GB（Mac 用户）
- WSL2 Ubuntu 16 核（**中文开发者主力**）
- CPU-only 32GB（无独显用户）
- 边界：所有检测器失败 / 表为空 / 模型无法跑

### 🗺️ Roadmap

- **v0.1**（**今天**）：核心 4 个检测器 + 15 模型 + 3 档推荐 + JSON 输出
- **v0.2**（下周）：GPU 检测（NVIDIA/AMD/Apple）+ cli-table3 美化 + i18n（英文）
- **v0.3**（2 周后）：模型下载链接（huggingface-hub 集成）+ CI benchmark
- **v0.4**（1 月后）：用户提交跑分（自动更新 tps_estimate）
- **v1.0**（3 月后）：自动装 Ollama / LM Studio + 一键启动

### 🤝 贡献

欢迎 PR！特别需要：
- 添加新模型到 `src/models/table.json`
- 添加新硬件到 `tps_estimate`
- 修 bug / 加测试
- 翻译 README / i18n

### 📄 License

MIT © [ASL-K](https://github.com/ASL-K)

---

<a name="english"></a>

## English

**local-llm-doctor** is a CLI tool that tells you **which LLM can run on your computer**. Zero dependencies, zero network requests, results in < 300ms.

### Why?

Most "run LLM locally" tutorials assume you have a 24GB GPU. Reality: 90% of laptops have 5-16GB RAM. We built this for everyone else.

### ✨ Features

- **Offline-first**: No network calls. No HuggingFace live fetch. No AA scraper.
- **WSL 1/2 aware**: Auto-detects WSL versions. Native Chinese support.
- **3 tiers, not rankings**: Conservative (always works) / Balanced (default) / Aggressive (high-end).
- **5GB RAM works**: We tested on a 5.87GB WSL2 laptop. You'll get real recommendations.
- **Fast**: < 300ms from `npx` to recommendations.

### 📦 Install

Requires **Node.js 18+**.

```bash
npx local-llm-doctor
# or
npm install -g local-llm-doctor
```

### 🚀 Usage

```bash
$ local-llm-doctor
```

The CLI will:
1. Detect your hardware (OS, CPU, memory, disk) — 200ms
2. Load model table (15 mainstream LLMs) — < 1ms
3. Match all models to your hardware — < 1ms
4. Generate 3-tier recommendations + fallback — < 1ms
5. Output JSON (v0.1) / table (v0.2) — < 1ms

### 🤝 Contributing

PRs welcome! Especially:
- Add models to `src/models/table.json`
- Add hardware profiles to `tps_estimate`
- Translations (i18n)
- Bug fixes / tests

### 📄 License

MIT © [ASL-K](https://github.com/ASL-K)
