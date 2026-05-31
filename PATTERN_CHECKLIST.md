# Design Pattern Implementation Checklist

> Base reference: **Abstract Factory** (`CreationalPatterns/AbstractFactory`)
> Follow every step in order. Check off each item before moving to the next phase.

---

## Phase 1 — Source Files (6 languages)

Each source file lives at:
```
patterns/{Category}/{PatternName}/{lang}/{lang}.{ext}
```

**Category values:** `CreationalPatterns` | `StructuralPatterns` | `BehavioralPatterns`  
**Lang/ext pairs:** `typescript/.ts` · `python/.py` · `ruby/.rb` · `java/.java` · `csharp/.cs` · `cpp/.cpp`

---

### 1.1 — Header Block

Every file must open with a comment block containing:

- [ ] Pattern name + secondary patterns (if any)
- [ ] Run instruction (`Run: node file.js`, `Run: ruby ruby.rb`, etc.)
- [ ] **Participants table** — Abstract Factory, Concrete Factories, Abstract Products, Client
- [ ] **Patterns at work** — which patterns are demonstrated and how
- [ ] **Consequences demonstrated** — ✓ for upheld, ✗ for trade-off shown

---

### 1.2 — `// SECTION::` Comments (GoF viewer TOC)

The GoF viewer sidebar parses `// SECTION::` (or `# SECTION::` for Python/Ruby) comments to build the code TOC.

- [ ] Every logical block has a `// SECTION:: Label` comment above it
- [ ] Typical sections: `Abstract Products`, `[Biome] Concrete Products` × N, `Concrete Factories`, `Client`, `Entry Point`
- [ ] Section labels are short and scannable (appear as sidebar links)

**Language-specific comment syntax:**
| Language | Format |
|---|---|
| TypeScript | `// SECTION:: Label` |
| Python | `# SECTION:: Label` |
| Ruby | `# SECTION:: Label` |
| Java | `// SECTION:: Label` |
| C# | `// SECTION:: Label` |
| C++ | `// SECTION:: Label` |

---

### 1.3 — Entry Point Guard

The file must be importable by test files without executing the demo output.

- [ ] **TypeScript** — wrap `main` block in `if (require.main === module) { ... }`
- [ ] **Python** — wrap in `if __name__ == "__main__": ...`
- [ ] **Ruby** — wrap in `if __FILE__ == $PROGRAM_NAME ... end`
- [ ] **Java** — isolate in a `Main` class; tests import the other classes directly (no guard needed if entry point is its own class)
- [ ] **C#** — isolate in a `Program` class with `static void Main`; tests reference the namespace (no guard needed)
- [ ] **C++** — wrap `int main()` in `#ifndef TESTING` / `#endif // TESTING`

---

### 1.4 — Exports / Visibility for Tests

Test files must be able to import/include production classes without workarounds.

- [ ] **TypeScript** — `export` keyword on every interface and class
- [ ] **Python** — no special action (all top-level names importable by default)
- [ ] **Ruby** — no special action (`require_relative` exposes all constants)
- [ ] **Java** — all classes `public`; each in the default package or a shared package tests can reference
- [ ] **C#** — all classes and interfaces `public`; same namespace as tests or tests reference via `using`
- [ ] **C++** — `#define TESTING` in test file before `#include`-ing the source; source guards `main()` with `#ifndef TESTING`

---

### 1.5 — Captured Output File

- [ ] Run the program once and capture stdout
- [ ] Save as `patterns/{Category}/{PatternName}/output` (no extension)
- [ ] Verify the output file renders correctly in the GoF viewer Output panel

---

## Phase 2 — GoF Viewer Registration

- [ ] Open `client/src/app/pages/gof/gof.component.ts`
- [ ] Find the correct `groups` array entry (`Creational` / `Structural` / `Behavioral`)
- [ ] Add the pattern entry:
  ```typescript
  { name: 'Pattern Name', slug: 'PatternName', category: 'CreationalPatterns', done: true },
  ```
- [ ] `slug` must match the folder name exactly (case-sensitive)
- [ ] `done: true` — set this only when **all** source files and tests are complete

---

## Phase 3 — Unit Tests (6 languages)

Each unit test file lives at:
```
patterns/_tests/{Category}/{PatternName}/{lang}/unit.test.{ext}
```

**Always import from source — never redefine stubs.**

---

### 3.1 — What to Cover (Unit)

- [ ] **Abstract product contracts** — each concrete product satisfies its interface (name, penalties, description, etc.)
- [ ] **Prototype cloning** — `clone()` returns a distinct object with identical field values; mutating clone does not affect original
- [ ] **Factory method isolation** — each factory method returns the correct concrete type; successive calls produce distinct clones
- [ ] **Weather/config structure** — base weather name correct; event keys present
- [ ] **Loot roll** — rolls at least one item
- [ ] **`registerEnemy` / prototype injection** — captures pool size *before* mutation, asserts `before + 1` (Singleton state accumulates across tests)
- [ ] **WorldGenerator spy** — anonymous/mock kit verifies each factory method called exactly once during construction
- [ ] **WorldGenerator accepts any conforming kit** — duck-typed alien kit does not throw

---

### 3.2 — Source Import Pattern

| Language | Import style |
|---|---|
| TypeScript | `import { ClassName } from '../../../../CreationalPatterns/…/typescript'` |
| Python | `sys.path.insert(0, …); from python import ClassName` |
| Ruby | `require_relative '../../../../CreationalPatterns/…/ruby/ruby'` |
| Java | Direct class reference (same default package or explicit `import`) |
| C# | `using` the production namespace |
| C++ | `#define TESTING` then `#include "../../../../CreationalPatterns/…/cpp/cpp.cpp"` |

---

### 3.3 — Singleton Caveat

Factories are often Singletons. Tests share the same instance across the suite.

- [ ] **Never** assert a hard-coded pool size after `registerEnemy` — always measure before and assert `before + 1`
- [ ] If test order matters, note it in a comment

---

## Phase 4 — Integration Tests (6 languages)

Each integration test file lives at:
```
patterns/_tests/{Category}/{PatternName}/{lang}/integration.test.{ext}
```

No mocks. All concrete classes interact as in production.

---

### 4.1 — What to Cover (Integration)

- [ ] **Full pipeline per biome** — terrain name, all N default enemies, weather name, loot table name appear in output
- [ ] **Product family consistency** — swapping factory changes *every* product; no cross-biome contamination
  - Desert output contains `Sand Dunes`; does NOT contain `Frozen Tundra`
  - Arctic output contains `Frozen Tundra`; does NOT contain `Sand Dunes`
  - Desert enemies do NOT appear in arctic output and vice versa
- [ ] **Loot table isolation** — `Desert Loot Table` never appears in arctic output (and vice versa)
- [ ] **Weather event isolation** — `heat_wave` key in desert; `whiteout` key in arctic; no cross-contamination
- [ ] **Prototype registration propagates** — enemy absent before `registerEnemy`, present after; next `generate()` includes it
- [ ] **Registration is isolated** — registering to one factory does NOT affect other factories
- [ ] **`clone()` is called** — registered enemy's `clone()` is invoked during `generate()`

---

### 4.2 — Output Capture Pattern

Each language needs a way to capture `console.log` / `puts` / `print` output for assertions:

| Language | Technique |
|---|---|
| TypeScript | Redirect `console.log`; restore after (or use a `captureOutput` helper) |
| Python | `capsys.readouterr()` (pytest) or `io.StringIO` + `sys.stdout` swap |
| Ruby | `StringIO` + `$stdout` swap, restore in `after` block |
| Java | `ByteArrayOutputStream` + `System.setOut(new PrintStream(baos))` |
| C# | `Console.SetOut(new StringWriter(sb))` |
| C++ | `std::ostringstream oss; std::cout.rdbuf(oss.rdbuf());` then restore |

---

## Phase 5 — Test Output Sidecar Files (optional but shown in GoF viewer)

- [ ] Run unit tests and capture pass/fail summary
- [ ] Save as `patterns/_tests/{Category}/{PatternName}/{lang}/unit.output`
- [ ] Run integration tests and capture pass/fail summary
- [ ] Save as `patterns/_tests/{Category}/{PatternName}/{lang}/integration.output`

Format example (`unit.output`):
```
  Terrain Products
    ✓ SandTerrain satisfies the Terrain contract
    ✓ IceTerrain satisfies the Terrain contract
    ✓ MudTerrain satisfies the Terrain contract

  Enemy Prototype Cloning
    ✓ Scorpion clone is a distinct object with identical stats
    …

  6 passing (12ms)
```

---

## Phase 6 — About Page Entry

- [ ] Open `client/src/app/pages/about/about.component.ts`
- [ ] Decide: `mainFeatures` (prominent, large card) vs `secondaryFeatures` (smaller grid card)
- [ ] Add the entry object with sequential ID number
- [ ] `body` supports HTML — links must use `target="_blank" rel="noopener"`
- [ ] Verify link colors render correctly (requires `::ng-deep .feature-body a` in `about.component.css` — already in place)
- [ ] Check numbering of subsequent entries if you insert in the middle

---

## Phase 7 — Cheatsheet Testing Header (if pattern has test frameworks worth linking)

For each of the 6 language cheatsheet pages:

- [ ] Open `client/src/app/pages/{lang}/{lang}.component.html`
- [ ] Find the `testing-header-stack` div for the pattern's test section
- [ ] Add `<a href="…" target="_blank" rel="noopener">FrameworkName</a>` links
- [ ] Verify `.testing-*` CSS comes from global `styles.css` (do NOT add to component CSS — rules already live in `src/styles.css`)

---

## Phase 8 — Final Verification

- [ ] GoF viewer: pattern appears in the sidebar under the correct category
- [ ] GoF viewer: `done: true` (tile is not greyed out)
- [ ] GoF viewer: all 6 language tabs load source code
- [ ] GoF viewer: Output panel shows captured output for each language
- [ ] GoF viewer: Unit and Integration test tabs appear for all 6 languages
- [ ] GoF viewer: Test output sidecars display in the Output panel when in test mode
- [ ] GoF viewer: SECTION:: sidebar TOC renders all sections
- [ ] About page: new feature card appears and renders correctly
- [ ] About page: any links in `body` open in new tab and display correct color (not browser-default blue/purple)
- [ ] Cheatsheet pages: framework links in `testing-header-stack` work and use correct color (inherits from `var(--muted)`)
- [ ] No `.testing-*` CSS duplicated in any component CSS file (global only)

---

## Quick Reference — Directory Structure

```
patterns/
├── {Category}/
│   └── {PatternName}/
│       ├── output                        ← captured stdout (no extension)
│       ├── typescript/typescript.ts
│       ├── python/python.py
│       ├── ruby/ruby.rb
│       ├── java/java.java
│       ├── csharp/csharp.cs
│       └── cpp/cpp.cpp
└── _tests/
    └── {Category}/
        └── {PatternName}/
            ├── typescript/
            │   ├── unit.test.ts
            │   ├── unit.output
            │   ├── integration.test.ts
            │   └── integration.output
            ├── python/
            │   ├── unit.test.py
            │   └── integration.test.py
            ├── ruby/
            │   ├── unit.test.rb
            │   └── integration.test.rb
            ├── java/
            │   ├── unit.test.java
            │   └── integration.test.java
            ├── csharp/
            │   ├── unit.test.cs
            │   └── integration.test.cs
            └── cpp/
                ├── unit.test.cpp
                └── integration.test.cpp

client/src/app/pages/gof/gof.component.ts   ← add PatternDef entry, set done: true
client/src/app/pages/about/about.component.ts ← add mainFeatures / secondaryFeatures entry
client/src/styles.css                         ← shared .testing-* CSS lives here (do not duplicate)
```

---

## Common Mistakes to Avoid

| Mistake | Correct approach |
|---|---|
| Test file named `test_unit.py`, `UnitTest.java`, `unit_spec.rb` | Must be exactly `unit.test.{ext}` / `integration.test.{ext}` |
| Redefining classes/interfaces in test file | Import from source |
| Hardcoding pool size after `registerEnemy` | Capture size before, assert `before + 1` |
| Adding `.testing-*` CSS to component CSS file | Global `styles.css` only |
| Entry point runs on import (no guard) | Add language-appropriate guard (see §1.3) |
| `done: false` in `gof.component.ts` after completing work | Set `done: true` |
| `::ng-deep` missing for `[innerHTML]` links in About | Already handled — don't remove it |
| C++ test file missing `#define TESTING` before `#include` | `#define TESTING` must precede the `#include` |
| Java `.class` files committed to git | Add `*.class` to `.gitignore` inside the java folder |
