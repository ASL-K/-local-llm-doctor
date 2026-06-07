// =====================================================================
// src/index.ts — Main entry (v0.1.0)
//
// v0.1.0 完整流程：
//   1. detect hardware (5 detectors → 4 真实运行 + GPU 空数组)
//   2. load model table
//   3. match all models
//   4. recommend 3 tiers + fallback
//   5. 输出 JSON（v0.2 改终端美化）
//
// v0.1.0 输出格式：完整 JSON（开发者友好 + 方便写自动化测试）
// v0.2 输出格式：cli-table3 美化表格（终端用户友好）
// =====================================================================

import { detectHardware, selectPrimaryGpu } from './detect/index.js';
import { getTable } from './models/loader.js';
import { matchAll } from './models/matcher.js';
import { recommend } from './recommend/recommend.js';
import { logger } from './utils/logger.js';

/**
 * local-llm-doctor — main entry point
 */
export async function main(): Promise<void> {
  const start = Date.now();
  logger.info('local-llm-doctor v0.1.0');
  logger.info('正在检测硬件...');

  try {
    // 1. 检测硬件
    const hw = await detectHardware();
    const detectMs = Date.now() - start;
    logger.info(`✓ 硬件检测完成（${detectMs}ms）`);

    // 2. 加载模型表
    const table = await getTable();
    logger.info(`✓ 已加载 ${table.models.length} 个模型`);

    // 3. 匹配所有模型
    const matches = matchAll(table, hw);
    logger.info(`✓ 匹配完成（${matches.length} 个模型能跑）`);

    // 4. 3 档推荐
    const rec = recommend(matches, hw);

    const totalMs = Date.now() - start;
    logger.info(`✓ 推荐生成（总耗时 ${totalMs}ms）`);

    console.log();
    console.log('═'.repeat(60));
    console.log('  local-llm-doctor v0.1.0 — 我电脑能跑哪个 LLM？');
    console.log('═'.repeat(60));
    console.log();

    // 5. 输出 JSON（v0.1 阶段）
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
