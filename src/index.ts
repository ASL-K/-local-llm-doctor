// =====================================================================
// src/index.ts — Main entry (v0.2)
//
// v0.2 完整流程：
//   1. parse CLI args (--json / --debug)
//   2. detect hardware (5 detectors parallel)
//   3. load model table
//   4. match all models
//   5. recommend 3 tiers + fallback
//   6. output:
//      - default: 美化表格 (cli-table3 + chalk colors)
//      - --json:  原始 JSON
//      - --debug: 表格 + 完整硬件 JSON
// =====================================================================

import { detectHardware, selectPrimaryGpu } from './detect/index.js';
import { getTable } from './models/loader.js';
import { matchAll } from './models/matcher.js';
import { recommend } from './recommend/recommend.js';
import { renderFull } from './output/table.js';
import { logger } from './utils/logger.js';
import { colorizeSuccess } from './output/format.js';

/**
 * 解析命令行参数
 * 支持：
 *   --json    输出原始 JSON
 *   --debug   表格 + 完整硬件 JSON
 *   --help    显示帮助
 */
function parseArgs(): { json: boolean; debug: boolean; help: boolean } {
  const args = process.argv.slice(2);
  return {
    json: args.includes('--json'),
    debug: args.includes('--debug'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

function printHelp(): void {
  console.log(`local-llm-doctor v0.2 — 我电脑能跑哪个 LLM？

Usage:
  local-llm-doctor              美化表格输出（默认）
  local-llm-doctor --json       原始 JSON 输出（脚本友好）
  local-llm-doctor --debug      表格 + 完整硬件信息
  local-llm-doctor --help       显示帮助

示例:
  $ local-llm-doctor
  $ local-llm-doctor --json | jq '.recommendations.balanced[0]'
`);
}

/**
 * local-llm-doctor — main entry point
 */
export async function main(): Promise<void> {
  const opts = parseArgs();
  if (opts.help) {
    printHelp();
    return;
  }

  const start = Date.now();
  console.log(`${colorizeSuccess()} local-llm-doctor v0.2`);
  console.log(`${colorizeSuccess()} 正在检测硬件...`);

  try {
    // 1. 检测硬件
    const hw = await detectHardware();
    const detectMs = Date.now() - start;
    console.log(`${colorizeSuccess()} 硬件检测完成（${detectMs}ms）`);

    // 2. 加载模型表
    const table = await getTable();
    console.log(`${colorizeSuccess()} 已加载 ${table.models.length} 个模型`);

    // 3. 匹配所有模型
    const matches = matchAll(table, hw);
    console.log(`${colorizeSuccess()} 匹配完成（${matches.length} 个模型能跑）`);

    // 4. 3 档推荐
    const rec = recommend(matches, hw);

    const totalMs = Date.now() - start;
    console.log(`${colorizeSuccess()} 推荐生成（总耗时 ${totalMs}ms）`);
    console.log();

    if (opts.json) {
      // JSON 模式
      const output = {
        hardware: {
          os: hw.os,
          cpu: { brand: hw.cpu.brand, cores: hw.cpu.cores, threads: hw.cpu.threads, arch: hw.cpu.arch },
          memory: { total: hw.memory.total, available: hw.memory.available, type: hw.memory.type },
          disk: { total: hw.disk.total, available: hw.disk.available, type: hw.disk.type },
          gpu: hw.gpu,
          primaryGpu: selectPrimaryGpu(hw.gpu),
        },
        summary: {
          totalModelsInTable: table.models.length,
          modelsThatFit: matches.length,
          tiers: {
            conservative: rec.conservative.length,
            balanced: rec.balanced.length,
            aggressive: rec.aggressive.length,
          },
          elapsedMs: totalMs,
        },
        recommendations: {
          conservative: rec.conservative,
          balanced: rec.balanced,
          aggressive: rec.aggressive,
          fallback: rec.fallback,
        },
      };
      console.log(JSON.stringify(output, null, 2));
    } else {
      // 默认美化表格
      console.log(renderFull(hw, rec));

      if (opts.debug) {
        // 调试模式：表格 + 完整硬件 JSON
        console.log();
        console.log('── 调试：完整硬件信息 ────────────────────────────────────────────────────');
        console.log(JSON.stringify(hw, null, 2));
      }
    }
  } catch (err) {
    logger.error('local-llm-doctor failed:', err);
    process.exit(1);
  }
}

// Auto-run when invoked as CLI
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('local-llm-doctor') ||
    process.argv[1].endsWith('local-llm-doctor.js') ||
    process.argv[1].endsWith('index.js'));

if (isMain) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
