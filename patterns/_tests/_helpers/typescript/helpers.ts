// ============================================================
//  TypeScript Test Helpers
//  Shared utilities across all TypeScript pattern tests
// ============================================================

/**
 * Captures all console.log calls made during fn() and returns them as lines.
 * Restores console.log even if fn() throws.
 */
export function captureOutput(fn: () => void): string[] {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.map(a => String(a)).join(' '));
  };
  try {
    fn();
  } finally {
    console.log = original;
  }
  return lines;
}

/**
 * Returns a mock loot table that always rolls the same fixed items.
 * Useful for making loot-roll assertions deterministic.
 */
export function fixedLootTable(name: string, items: string[]) {
  return { name, roll: () => items };
}

/**
 * Asserts that every string in `required` appears at least once in `lines`.
 * Returns the first missing string, or null if all are present.
 */
export function findMissing(lines: string[], required: string[]): string | null {
  for (const r of required) {
    if (!lines.some(l => l.includes(r))) return r;
  }
  return null;
}
