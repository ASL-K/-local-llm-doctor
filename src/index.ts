// =====================================================================
// src/index.ts — Main entry (v0.1.0)
// v0.1.0 阶段：跑 4 个硬件检测器，输出 JSON 格式的 HardwareProfile。
// 后续 v0.2+ 阶段会接 i18n + 3 档推荐 + 终端美化输出。
// =====================================================================

import { detectHardware, selectPrimaryGpu } from './detect/index.js';
import { logger } from './utils/logger.js';

/**
 * local-llm-doctor — main entry point
 */
export async function main(): Promise<void> {
  const start = Date.now();
  logger.info('local-llm-doctor v0.1.0');
  logger.info('正在检测硬件...');

  try {
    const hw = await detectHardware();
    const elapsed = Date.now() - start;

    logger.info(`检测完成（${elapsed}ms）`);
    console.log();

    // 输出 JSON（v0.1 阶段；v0.2 接 cli-table3 美化）
    const profile = {
      os: hw.os,
      cpu: hw.cpu,
      memory: hw.memory,
      disk: hw.disk,
      gpu: hw.gpu,
      primaryGpu: selectPrimaryGpu(hw.gpu),
    };

    console.log(JSON.stringify(profile, null, 2));
  } catch (err) {
    logger.error('Hardware detection failed:', err);
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
