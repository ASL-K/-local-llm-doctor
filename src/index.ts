// =====================================================================
// src/index.ts — Main entry (v0.0.0 stub)
// Will be filled in by Day 5. For now, just proves the build works.
// =====================================================================

/**
 * local-llm-doctor — main entry point
 *
 * Flow:
 *   1. parse CLI args (commander)
 *   2. detect hardware (5 detectors)
 *   3. match models (table + algorithm)
 *   4. recommend tiers (conservative / balanced / aggressive)
 *   5. output (CLI table / markdown / JSON)
 */
export async function main(): Promise<void> {
  // v0.0.0 stub — replaced in Day 5
  console.log('local-llm-doctor v0.0.0');
  console.log('Boot OK. Full implementation in progress.');
}

// Auto-run when invoked as CLI
// (When imported as a library, user calls main() manually)
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
