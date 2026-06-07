// =====================================================================
// src/index.ts — Main entry (v0.4.2b)
//
// v0.4.2b 完整流程：
//   1. parse CLI args (--json / --debug / --lang <zh|en> / --help)
//   2. detect hardware (5 detectors parallel)
//   3. load model table
//   4. match all models
//   5. recommend 3 tiers + fallback
//   6. output:
//      - default: 美化表格 (cli-table3 + chalk colors)
//      - --json:  原始 JSON
//      - --debug: 表格 + 完整硬件 JSON
//      - --lang:  输出语言 (zh / en，默认 zh)
// =====================================================================

import { detectHardware, selectPrimaryGpu } from './detect/index.js';
import { getTable } from './models/loader.js';
import { matchAll } from './models/matcher.js';
import { recommend } from './recommend/recommend.js';
import { renderFull } from './output/table.js';
import { logger } from './utils/logger.js';
import { colorizeSuccess } from './output/format.js';
import { t, type Lang, DEFAULT_LANG, SUPPORTED_LANGS } from './i18n/strings.js';

/**
 * 解析命令行参数
 * 支持：
 *   --json         输出原始 JSON
 *   --debug        表格 + 完整硬件 JSON
 *   --lang <lang>  输出语言 (zh / en)，默认 zh
 *   --help         显示帮助
 */
function parseArgs(): {
  json: boolean;
  debug: boolean;
  help: boolean;
  lang: Lang;
} {
  const args = process.argv.slice(2);
  let lang: Lang = DEFAULT_LANG;

  const langIdx = args.findIndex(a => a === '--lang' || a === '-l');
  if (langIdx !== -1 && args[langIdx + 1]) {
    const requested = args[langIdx + 1]!.toLowerCase();
    if (SUPPORTED_LANGS.includes(requested as Lang)) {
      lang = requested as Lang;
    } else {
      // 不支持的语言：警告 + 落到默认
      console.error(`${colorizeSuccess()} Warning: unsupported language "${requested}", fallback to ${DEFAULT_LANG}`);
    }
  }

  return {
    json: args.includes('--json'),
    debug: args.includes('--debug'),
    help: args.includes('--help') || args.includes('-h'),
    lang,
  };
}

function printHelp(lang: Lang = DEFAULT_LANG): void {
  console.log(`${t('appName', lang)} v0.4.2 — ${t('title', lang)}

${t('cli.usage.title', lang)}:
  local-llm-doctor                  ${t('cli.usage.default', lang)}
  local-llm-doctor --json           ${t('cli.usage.json', lang)}
  local-llm-doctor --debug          ${t('cli.usage.debug', lang)}
  local-llm-doctor --lang <zh|en>   ${t('cli.usage.lang', lang)}
  local-llm-doctor --help           ${t('cli.usage.help', lang)}

${t('cli.example.title', lang)}:
  $ local-llm-doctor
  $ local-llm-doctor --json | jq '.recommendations.balanced[0]'
  $ local-llm-doctor --lang en
`);
}

/**
 * local-llm-doctor — main entry point
 */
export async function main(): Promise<void> {
  const opts = parseArgs();
  if (opts.help) {
    printHelp(opts.lang);
    return;
  }

  const start = Date.now();
  console.log(`${colorizeSuccess()} ${t('appName', opts.lang)} v0.4.2`);
  console.log(`${colorizeSuccess()} ${t('status.detecting', opts.lang)}`);

  try {
    // 1. 检测硬件
    const hw = await detectHardware();
    const detectMs = Date.now() - start;
    console.log(`${colorizeSuccess()} ${t('status.detectDone', opts.lang, { ms: detectMs })}`);

    // 2. 加载模型表
    const table = await getTable();
    console.log(`${colorizeSuccess()} ${t('status.modelsLoaded', opts.lang, { n: table.models.length })}`);

    // 3. 匹配所有模型
    const matches = matchAll(table, hw);
    console.log(`${colorizeSuccess()} ${t('status.matchDone', opts.lang, { n: matches.length })}`);

    // 4. 3 档推荐
    const rec = recommend(matches, hw, opts.lang);

    const totalMs = Date.now() - start;
    console.log(`${colorizeSuccess()} ${t('status.recommendDone', opts.lang, { ms: totalMs })}`);
    console.log();

    if (opts.json) {
      // JSON 模式（JSON 模式只输出中文，英文不混合，避免脚本错乱）
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
      // 默认美化表格（支持 --lang 切语言）
      console.log(renderFull(hw, rec, opts.lang, totalMs, table.models.length));

      if (opts.debug) {
        // 调试模式：表格 + 完整硬件 JSON
        console.log();
        console.log('── ' + t('section.debug', opts.lang) + ' ' + '─'.repeat(60));
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
