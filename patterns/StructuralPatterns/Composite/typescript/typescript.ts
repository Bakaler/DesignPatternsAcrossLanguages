// ============================================================
//  Composite — Airline Network
//  Run: npx ts-node typescript.ts
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Component    AirNetworkComponent (interface)
//  Leaf         Airport
//  Composite    RegionalNetwork, AirportNetwork
//  Client       Entry point
//
//  Consequences demonstrated
//  ────────────────────────────────────────────────────────
//  ✓ Uniformity   — getCapacity() works identically at every level
//  ✓ Recursion    — composites delegate down; client writes zero loops
//  ✓ Extensibility — add a continent level without touching existing code
//  ✗ Over-general  — every node must implement add/remove even if leaf
// ============================================================


// SECTION:: Component
// ═════════════════════════════════════════════════════════════
//  COMPONENT — AirNetworkComponent
// ═════════════════════════════════════════════════════════════
//  Shared interface every node in the tree must satisfy.
//  The client never checks whether it is talking to a leaf
//  or a composite — it just calls the interface.

export interface AirNetworkComponent {
  getName(): string;
  getCapacity(): number;         // leaf: own slots  |  composite: sum of children
  getRouteCount(): number;       // leaf: own routes |  composite: recursive sum
  print(indent?: number): void;
}


// SECTION:: Leaf
// ═════════════════════════════════════════════════════════════
//  LEAF — Airport
// ═════════════════════════════════════════════════════════════
//  Terminal node. Owns its own capacity and outgoing routes.

export class Airport implements AirNetworkComponent {
  private routes: string[] = [];

  constructor(
    private name: string,
    private capacity: number,
  ) {}

  addRoute(destination: string): void { this.routes.push(destination); }

  getName():       string { return this.name; }
  getCapacity():   number { return this.capacity; }
  getRouteCount(): number { return this.routes.length; }

  print(indent = 0): void {
    const pad = '  '.repeat(indent);
    console.log(`${pad}[airport] ${this.name}  (cap: ${this.capacity}, routes: ${this.routes.length})`);
  }
}


// SECTION:: Composite
// ═════════════════════════════════════════════════════════════
//  COMPOSITE — RegionalNetwork
// ═════════════════════════════════════════════════════════════
//  Mid-level composite. Holds a collection of Airports.
//  Delegates every query down to its children.

export class RegionalNetwork implements AirNetworkComponent {
  private airports: Airport[] = [];

  constructor(private name: string) {}

  add(airport: Airport):    void { this.airports.push(airport); }
  remove(airport: Airport): void { this.airports = this.airports.filter(a => a !== airport); }

  getName():       string { return this.name; }
  getCapacity():   number { return this.airports.reduce((sum, a) => sum + a.getCapacity(),   0); }
  getRouteCount(): number { return this.airports.reduce((sum, a) => sum + a.getRouteCount(), 0); }

  print(indent = 0): void {
    const pad = '  '.repeat(indent);
    console.log(`${pad}[region] ${this.name}/`);
    this.airports.forEach(a => a.print(indent + 1));
  }
}


// SECTION:: Root Composite
// ═════════════════════════════════════════════════════════════
//  COMPOSITE — AirportNetwork
// ═════════════════════════════════════════════════════════════
//  Top-level composite. Holds a collection of RegionalNetworks.
//  Same interface, one level higher. The entry point for all
//  client queries — no client code changes when the depth grows.

export class AirportNetwork implements AirNetworkComponent {
  private regions: RegionalNetwork[] = [];

  constructor(private name: string) {}

  add(region: RegionalNetwork):    void { this.regions.push(region); }
  remove(region: RegionalNetwork): void { this.regions = this.regions.filter(r => r !== region); }

  getName():       string { return this.name; }
  getCapacity():   number { return this.regions.reduce((sum, r) => sum + r.getCapacity(),   0); }
  getRouteCount(): number { return this.regions.reduce((sum, r) => sum + r.getRouteCount(), 0); }

  print(indent = 0): void {
    const pad = '  '.repeat(indent);
    console.log(`${pad}[network] ${this.name}/`);
    this.regions.forEach(r => r.print(indent + 1));
  }
}


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════

if (require.main === module) {
const SEP = '═'.repeat(64);

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║           Composite — Airline Network                        ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

// ── Build the three-level tree ────────────────────────────────
const network = new AirportNetwork('Global Network');

const west = new RegionalNetwork('West Region');
const lax = new Airport('LAX', 4);
const sfo = new Airport('SFO', 3);
lax.addRoute('JFK'); lax.addRoute('ORD'); lax.addRoute('LHR');
sfo.addRoute('SEA'); sfo.addRoute('DEN');
west.add(lax);
west.add(sfo);

const east = new RegionalNetwork('East Region');
const jfk = new Airport('JFK', 5);
const ord = new Airport('ORD', 3);
jfk.addRoute('LAX'); jfk.addRoute('LHR'); jfk.addRoute('CDG'); jfk.addRoute('NRT');
ord.addRoute('LAX'); ord.addRoute('JFK');
east.add(jfk);
east.add(ord);

network.add(west);
network.add(east);

// ── Print the tree ────────────────────────────────────────────
console.log(`\n${SEP}`);
console.log('  Network tree');
console.log(`${SEP}\n`);
network.print();

// ── Same call at every level ──────────────────────────────────
console.log(`\n${SEP}`);
console.log('  Client queries — same call regardless of node type');
console.log(`${SEP}\n`);

const nodes: [string, AirNetworkComponent][] = [
  ['Global Network', network],
  ['West Region',    west],
  ['East Region',    east],
  ['LAX (leaf)',     lax],
  ['JFK (leaf)',     jfk],
];

nodes.forEach(([label, node]) => {
  console.log(`  ${label.padEnd(16)} getCapacity()=${String(node.getCapacity()).padStart(2)}   getRouteCount()=${node.getRouteCount()}`);
});

console.log(`\n${SEP}`);
console.log('  Without Composite');
console.log(`${SEP}`);
console.log('');
console.log('  Every caller would need:');
console.log('    if (node instanceof Airport)        return node.capacity');
console.log('    if (node instanceof RegionalNetwork){ loop airports }');
console.log('    if (node instanceof AirportNetwork) { loop regions + loop airports }');
console.log('    if (new level added)                add another branch...');
console.log('');
console.log('  With Composite:');
console.log('    node.getCapacity()  — works at every level, always');

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  Done                                                        ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
} // require.main === module
