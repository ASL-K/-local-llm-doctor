// =====================================================================
// src/models/loader.ts
//
// 加载和校验模型推荐表。
// 职责：
//   1. 读 src/models/table.json
//   2. 校验必填字段
//   3. 校验量化等级 + 硬件 key 是合法值
//   4. 暴露单例 + 测试用注入
// =====================================================================

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { ModelTable, QuantLevelName, HardwareKey } from './types.js';
import { ModelNotFoundError } from '../utils/errors.js';

const VALID_QUANT_LEVELS: QuantLevelName[] = ['Q2_K', 'Q3_K_M', 'Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0'];
const VALID_HARDWARE_KEYS: HardwareKey[] = [
  'm3_pro_18gb', 'rtx_4090_24gb', 'rtx_3090_24gb', 'rtx_3060_12gb',
  'rtx_4060_8gb', 'cpu_8c_32gb', 'cpu_4c_16gb', 'cpu_2c_8gb',
];

/**
 * 默认 table.json 路径（dist/models/table.json，编译后）
 */
function getDefaultTablePath(): string {
  // 兼容 ESM: import.meta.url 指向当前文件
  // src/models/loader.ts → ../models/table.json
  // dist/models/loader.js → ../models/table.json
  const here = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(here), 'table.json');
}

/**
 * 内部：深度校验 ModelTable
 * @throws Error 校验失败时
 */
function validateTable(table: unknown): asserts table is ModelTable {
  if (!table || typeof table !== 'object') {
    throw new Error('Table must be an object');
  }
  const t = table as Record<string, unknown>;

  if (typeof t.version !== 'string') {
    throw new Error('Table.version must be a string');
  }

  if (!Array.isArray(t.models)) {
    throw new Error('Table.models must be an array');
  }

  for (let i = 0; i < t.models.length; i++) {
    const m = t.models[i] as Record<string, unknown>;
    const where = `models[${i}]`;

    // 必填字段
    for (const field of ['id', 'name', 'family', 'params_b', 'active_b', 'type',
                         'context_k', 'quant_levels', 'tps_estimate',
                         'best_for', 'license', 'huggingface_id',
                         'tier_conservative', 'tier_balanced', 'tier_aggressive',
                         'release_date']) {
      if (!(field in m)) {
        throw new Error(`${where} missing field: ${field}`);
      }
    }

    if (m.type !== 'dense' && m.type !== 'moe') {
      throw new Error(`${where}.type must be 'dense' or 'moe'`);
    }

    // quant_levels 必须是合法量化名
    const ql = m.quant_levels as Record<string, unknown>;
    for (const lvl of Object.keys(ql)) {
      if (!VALID_QUANT_LEVELS.includes(lvl as QuantLevelName)) {
        throw new Error(`${where}.quant_levels has invalid level: ${lvl}`);
      }
    }

    // tps_estimate 必须是合法 hardware key
    const tps = m.tps_estimate as Record<string, unknown>;
    for (const hw of Object.keys(tps)) {
      if (!VALID_HARDWARE_KEYS.includes(hw as HardwareKey)) {
        throw new Error(`${where}.tps_estimate has invalid hardware key: ${hw}`);
      }
    }
  }
}

/**
 * 加载模型表（从默认路径）
 * @throws ModelNotFoundError 文件不存在
 * @throws Error 校验失败
 */
export async function loadTable(): Promise<ModelTable> {
  return loadTableFromPath(getDefaultTablePath());
}

/**
 * 加载模型表（指定路径，测试用）
 */
export async function loadTableFromPath(filePath: string): Promise<ModelTable> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new ModelNotFoundError(filePath);
  }
  const table = JSON.parse(raw);
  validateTable(table);
  return table;
}

/**
 * 内部缓存：避免每次匹配都重新读 + 解析
 */
let cachedTable: ModelTable | null = null;

/**
 * 加载（或返回缓存）模型表
 */
export async function getTable(): Promise<ModelTable> {
  if (cachedTable) return cachedTable;
  cachedTable = await loadTable();
  return cachedTable;
}

/**
 * 测试用：清除缓存
 */
export function clearTableCache(): void {
  cachedTable = null;
}

/**
 * 测试用：注入自定义表
 */
export function setTableForTesting(table: ModelTable): void {
  cachedTable = table;
}
