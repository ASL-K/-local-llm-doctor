#!/usr/bin/env node
// =====================================================================
// local-llm-doctor — CLI entry
// Copyright (c) 2026 ASL-K. MIT License.
// =====================================================================

import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

// ---- 1. Node version check ----
const NODE_MAJOR = Number(process.versions.node.split('.')[0]);
if (NODE_MAJOR < 18) {
  console.error(`\x1b[31m✖\x1b[0m local-llm-doctor 需要 Node.js 18 或更高版本`);
  console.error(`  当前 Node 版本: ${process.versions.node}`);
  console.error(`\x1b[36m→\x1b[0m 请升级 Node: https://nodejs.org/`);
  process.exit(1);
}

// ---- 2. Resolve compiled entry ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path: ./bin/local-llm-doctor.js -> ./dist/index.js
const distPath = path.resolve(__dirname, '..', 'dist', 'index.js');

// ---- 3. Hand off to compiled TS output ----
// Windows 兼容：必须用 pathToFileURL 把 "c:\..." 转换成 "file:///c:/..."
// 否则 ESM 加载器抛 ERR_UNSUPPORTED_ESM_URL_SCHEME
try {
  const distUrl = pathToFileURL(distPath).href;
  await import(distUrl);
} catch (err) {
  if (err && typeof err === 'object' && 'code' in err && err.code === 'ERR_MODULE_NOT_FOUND') {
    console.error(`\x1b[31m✖\x1b[0m 找不到 dist/index.js`);
    console.error(`  说明：项目还没编译。请先运行：npm run build`);
    console.error(`  当前查找路径: ${distPath}`);
    process.exit(1);
  }
  console.error(`\x1b[31m✖\x1b[0m 启动失败:`);
  console.error(err);
  process.exit(1);
}
