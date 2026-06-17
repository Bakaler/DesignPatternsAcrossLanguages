# Strategy Pattern — Game of Life Ruleset Explorer

## Intent

Define a family of algorithms, encapsulate each one, and make them interchangeable. Clients can select an algorithm at runtime. This pattern promotes loose coupling: the context doesn't care which strategy it uses; strategies don't know about each other; and new strategies can be added without changing existing code.

## Problem

Conway's Game of Life follows a simple rule: a live cell with 2 or 3 neighbors survives; a dead cell with exactly 3 neighbors is born. But what if you want to explore *other* rulesets? HighLife (which adds 6-neighbor births)? Seeds (birth-only at 2 neighbors)? Coagulations (3 or 5 survivors)?

If you hardcode each ruleset into the `GameOfLife` class, it becomes a bloated mess:
- Every new ruleset requires code changes
- The grid logic gets tangled with rule logic
- Testing different rule combinations is painful
- Runtime switching is clunky

**How do you make evolution rules swappable without coupling the grid to any particular ruleset?**

## Solution: Strategy Pattern

Encapsulate each ruleset as a **Strategy**: a separate object that knows how to determine if a cell lives, dies, or is born. The `GameOfLife` (Context) doesn't hardcode survival/birth logic—it delegates to its current Strategy.

When you want to switch rulesets, you simply pass in a different Strategy. No grid changes. No conditionals. Just plug-and-play rule families.

### Key Insight

The Context (grid) only needs to know: *"Does this cell survive with N neighbors?"* It doesn't care *how* the Strategy answers—that's the Strategy's job. By isolating the "how," you decouple evolution from rulesets and enable dynamic composition.

## Participants

| Role | Class(es) | Responsibility |
|---|---|---|
| **Strategy** (interface) | `LifeRule` | Defines the contract: `outcome(neighbors, isAlive)` |
| **Concrete Strategies** | `SurvivalRule`, `BirthRule` | Implement the rule logic (cells with N neighbors) |
| **Composition** | `Ruleset` | Combines multiple strategies (e.g., [Survival 2-3] + [Birth 3]) |
| **Context** | `GameOfLife` | Holds a Ruleset, calls strategies to evolve the grid |

## Behavior Flow

### Step 1: Set Up Strategies
```typescript
const survival = new SurvivalRule([2, 3]);  // Survive with 2 or 3 neighbors
const birth = new BirthRule([3]);            // Born with 3 neighbors
const ruleset = new Ruleset();
ruleset.addRule(survival);
ruleset.addRule(birth);
```

### Step 2: Create Context with Strategy
```typescript
const game = new GameOfLife(40, 40, ruleset);
```

### Step 3: Evolve Using Strategy
For each cell, the grid asks the ruleset:
```
cell is alive with 2 neighbors → survival.outcome(2, true) → true (survives)
cell is dead with 3 neighbors  → birth.outcome(3, false)   → true (born)
cell is alive with 1 neighbor  → survival.outcome(1, true) → false (dies)
```

### Step 4: Swap Strategies at Runtime
```typescript
// Later: switch to HighLife rules (B36/S23)
const highlifeRuleset = new Ruleset();
highlifeRuleset.addRule(new SurvivalRule([2, 3]));
highlifeRuleset.addRule(new BirthRule([3, 6]));  // Birth at 3 *or* 6!

game.setRuleset(highlifeRuleset);
game.evolve();  // Same grid, different rules → different result
```

## Consequences

| | |
|---|---|
| ✓ Open/Closed Principle | Add new rulesets without changing GameOfLife |
| ✓ Encapsulation | Each rule is self-contained; no monolithic conditionals |
| ✓ Runtime flexibility | Swap or compose strategies while grid runs |
| ✓ Testability | Test each rule in isolation; test grid with mock strategies |
| ✓ Code reuse | Combine rules in any composition (Ruleset is composable) |
| ✗ Slight overhead | More objects, more indirection (negligible for this scale) |

## Real-World Examples

| Domain | Context | Strategies |
|---|---|---|
| **Sorting** | Array | QuickSort, MergeSort, HeapSort (pick one) |
| **Pathfinding** | Game engine | Dijkstra, A*, BFS (choose based on cost) |
| **Payment** | Checkout | CreditCard, PayPal, ApplePay (user selects) |
| **Rendering** | Graphics engine | OpenGL, DirectX, Vulkan (set at startup) |
| **Compression** | File archiver | ZIP, RAR, 7z (choose per file) |
| **Game AI** | Enemy NPC | Aggressive, Defensive, Cowardly (swap mid-game) |

## Pattern Variants

### 1. **Strategy as Data** (Stateless)
Rules are simple functions or objects with no mutable state.
```typescript
const survival = new SurvivalRule([2, 3]);  // No state, reusable
```
**Pro:** Lightweight, no side effects
**Con:** Limited for complex logic

### 2. **Strategy with State** (Stateful)
Rules maintain internal state (e.g., memory of past generations).
```typescript
class AdaptiveRule implements LifeRule {
  generationMemory = [];
  outcome(neighbors, isAlive) { /* adjust based on history */ }
}
```
**Pro:** Enables adaptive/learning strategies
**Con:** Harder to test, risk of side effects

### 3. **Composition of Strategies** (used here)
Combine multiple strategies into a Ruleset.
```typescript
ruleset.addRule(survivalRule);
ruleset.addRule(birthRule);
// → Together they define one complete ruleset
```
**Pro:** Flexible, reusable building blocks
**Con:** Order may matter; need clear composition rules

## Game of Life Ruleset Presets

The demo includes four preset rulesets:

| Name | Rules | Behavior |
|---|---|---|
| **Conway** | B3/S23 | The original; creates stable structures & oscillators |
| **HighLife** | B36/S23 | Like Conway + 6-neighbor births; more prolific |
| **Seeds** | B2/S | Birth-only at 2; dies after one generation; chaotic |
| **Coagulations** | B3/S235 | Survive at 2, 3, or 5; tends toward slow clusters |

Each is a different Strategy applied to the same 40×40 grid.

## Key Takeaway

**Strategy decouples *what* to do from *how* to do it.** The grid doesn't care if you're following Conway's rules or HighLife—it just asks the ruleset and reacts. When you need to let clients (or users) choose behavior at runtime, encapsulate each option as a Strategy and swap freely.

## Files

```
typescript/typescript.ts          Implementation (Strategy + Ruleset + GameOfLife)
python/python.py                  Python implementation
java/java.java                    Java implementation
csharp/csharp.cs                  C# implementation
ruby/ruby.rb                      Ruby implementation

_tests/.../
  unit.test.*                     Rule behavior, Ruleset composition
  integration.test.*              Full game evolution, ruleset swaps
```

## Run

```bash
# TypeScript
npx ts-node typescript/typescript.ts

# Python
python python/python.py

# Java
javac java/java.java && java -cp . Strategy

# C#
dotnet run --project csharp/

# Ruby
ruby ruby/ruby.rb

# Tests (TypeScript example)
npx mocha --require ts-node/register _tests/BehavioralPatterns/Strategy/typescript/unit.test.ts
```

## Related

- **Interpreter** → [`../Interpreter/`](../Interpreter/README.md)
  Like Strategy, but evaluates expressions instead of switching algorithms. Both decouple logic into separate classes.
- **State** → Compare: State changes behavior as internal state changes; Strategy lets *clients* choose.
- **Template Method** → Compare: Template defines algorithm skeleton in base class; Strategy lets subclasses choose *alternative algorithms*.

