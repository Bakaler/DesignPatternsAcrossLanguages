// ============================================================
//  Integration Tests — Composite: Airline Network
//
//  What we test here:
//    · Full three-level tree builds and resolves correctly end-to-end
//    · Root getCapacity() equals the true sum of every airport
//    · Adding a new region does not break existing queries
//    · Mutations to a leaf propagate up to the root in one call
//    · Removing a region removes all its airports from root totals
//    · print() renders the full tree with correct structure
//
//  Run: npx mocha --require ts-node/register integration.test.ts
// ============================================================

import { describe, it, before } from 'mocha';
import assert from 'assert';
import { captureOutput } from '../../../_helpers/typescript/helpers';
import {
  Airport, RegionalNetwork, AirportNetwork,
} from '../../../../StructuralPatterns/Composite/typescript/typescript';

// ── Tree fixture ──────────────────────────────────────────────
//
//  Global Network
//    West Region
//      LAX  cap=4  routes: JFK, ORD, LHR
//      SFO  cap=3  routes: SEA, DEN
//    East Region
//      JFK  cap=5  routes: LAX, LHR, CDG, NRT
//      ORD  cap=3  routes: LAX, JFK
//
//  Total capacity:   4+3+5+3 = 15
//  Total routes:     3+2+4+2 = 11

function buildNetwork(): { network: AirportNetwork; west: RegionalNetwork; east: RegionalNetwork; lax: Airport; jfk: Airport } {
  const lax = new Airport('LAX', 4);
  lax.addRoute('JFK'); lax.addRoute('ORD'); lax.addRoute('LHR');

  const sfo = new Airport('SFO', 3);
  sfo.addRoute('SEA'); sfo.addRoute('DEN');

  const west = new RegionalNetwork('West Region');
  west.add(lax);
  west.add(sfo);

  const jfk = new Airport('JFK', 5);
  jfk.addRoute('LAX'); jfk.addRoute('LHR'); jfk.addRoute('CDG'); jfk.addRoute('NRT');

  const ord = new Airport('ORD', 3);
  ord.addRoute('LAX'); ord.addRoute('JFK');

  const east = new RegionalNetwork('East Region');
  east.add(jfk);
  east.add(ord);

  const network = new AirportNetwork('Global Network');
  network.add(west);
  network.add(east);

  return { network, west, east, lax, jfk };
}

const TOTAL_CAPACITY = 4 + 3 + 5 + 3; // 15
const TOTAL_ROUTES   = 3 + 2 + 4 + 2; // 11

// ── End-to-end totals ─────────────────────────────────────────
describe('Full network — totals', () => {
  let network: AirportNetwork;
  let west:    RegionalNetwork;

  before(() => ({ network, west } = buildNetwork()));

  it('root getCapacity() equals the sum of every airport', () => {
    assert.strictEqual(network.getCapacity(), TOTAL_CAPACITY);
  });

  it('root getRouteCount() equals the sum of every route', () => {
    assert.strictEqual(network.getRouteCount(), TOTAL_ROUTES);
  });

  it('region getCapacity() is independent of siblings', () => {
    assert.strictEqual(west.getCapacity(), 4 + 3);
  });
});

// ── Mutations propagate up ────────────────────────────────────
describe('Full network — mutations propagate to root', () => {
  it('adding an airport to a region increases root getCapacity()', () => {
    const { network, west } = buildNetwork();
    const before = network.getCapacity();
    west.add(new Airport('SEA', 2));
    assert.strictEqual(network.getCapacity(), before + 2);
  });

  it('removing an airport from a region decreases root getCapacity()', () => {
    const { network, west, lax } = buildNetwork();
    const before = network.getCapacity();
    west.remove(lax);
    assert.strictEqual(network.getCapacity(), before - lax.getCapacity());
  });

  it('removing a whole region removes all its airports from root totals', () => {
    const { network, west } = buildNetwork();
    const westCap    = west.getCapacity();
    const westRoutes = west.getRouteCount();
    const capBefore  = network.getCapacity();
    const routesBefore = network.getRouteCount();

    network.remove(west);

    assert.strictEqual(network.getCapacity(),    capBefore    - westCap);
    assert.strictEqual(network.getRouteCount(),  routesBefore - westRoutes);
  });
});

// ── Adding a new level doesn't break existing queries ─────────
describe('Full network — adding a new region', () => {
  it('inserting a new region still resolves from root correctly', () => {
    const { network } = buildNetwork();
    const before = network.getCapacity();

    const central = new RegionalNetwork('Central Region');
    central.add(new Airport('DFW', 4));
    central.add(new Airport('DEN', 3));
    network.add(central);

    assert.strictEqual(network.getCapacity(), before + 4 + 3);
  });
});

// ── print() renders the full tree ────────────────────────────
describe('Full network — print() output', () => {
  let lines: string[];

  before(() => {
    const { network } = buildNetwork();
    lines = captureOutput(() => network.print());
  });

  it('root network appears first', () => {
    assert.ok(lines[0].includes('Global Network'));
  });

  it('all regions appear in output', () => {
    assert.ok(lines.some(l => l.includes('West Region')));
    assert.ok(lines.some(l => l.includes('East Region')));
  });

  it('all airports appear in output', () => {
    ['LAX', 'SFO', 'JFK', 'ORD'].forEach(code => {
      assert.ok(lines.some(l => l.includes(code)), `expected ${code} in output`);
    });
  });

  it('airports are indented more than their parent region', () => {
    const westLine = lines.find(l => l.includes('West Region'));
    const laxLine  = lines.find(l => l.includes('LAX'));
    assert.ok(westLine && laxLine);

    const westIndent = westLine.length - westLine.trimStart().length;
    const laxIndent  = laxLine.length  - laxLine.trimStart().length;
    assert.ok(laxIndent > westIndent);
  });
});
