// ============================================================
//  Unit Tests — Composite: Airline Network
//
//  What we test here:
//    · Airport returns its own capacity and route count
//    · RegionalNetwork.getCapacity() sums its airports
//    · AirportNetwork.getCapacity() recurses through regions
//    · getRouteCount() propagates the same way as getCapacity()
//    · Client calls getCapacity() identically on leaf and composite
//    · remove() detaches a node and updates totals accordingly
//
//  Run: npx mocha --require ts-node/register unit.test.ts
// ============================================================

import { describe, it } from 'mocha';
import assert from 'assert';
import { captureOutput } from '../../../_helpers/typescript/helpers';
import {
  Airport, RegionalNetwork, AirportNetwork, AirNetworkComponent,
} from '../../../../StructuralPatterns/Composite/typescript/typescript';

// ── Airport (Leaf) ────────────────────────────────────────────
describe('Airport (Leaf)', () => {
  const lax = new Airport('LAX', 4);

  it('getName() returns the airport code', () => {
    assert.strictEqual(lax.getName(), 'LAX');
  });

  it('getCapacity() returns own capacity', () => {
    assert.strictEqual(lax.getCapacity(), 4);
  });

  it('getRouteCount() starts at 0', () => {
    assert.strictEqual(lax.getRouteCount(), 0);
  });

  it('getRouteCount() increments with each addRoute()', () => {
    const ap = new Airport('SFO', 3);
    ap.addRoute('JFK');
    ap.addRoute('ORD');
    assert.strictEqual(ap.getRouteCount(), 2);
  });

  it('print() outputs the airport name', () => {
    const lines = captureOutput(() => lax.print());
    assert.ok(lines.some(l => l.includes('LAX')));
  });

  it('print() outputs the capacity', () => {
    const lines = captureOutput(() => lax.print());
    assert.ok(lines.some(l => l.includes('4')));
  });
});

// ── RegionalNetwork (Composite) ───────────────────────────────
describe('RegionalNetwork (Composite)', () => {
  it('getName() returns the region name', () => {
    const r = new RegionalNetwork('West Region');
    assert.strictEqual(r.getName(), 'West Region');
  });

  it('getCapacity() sums its airports', () => {
    const r = new RegionalNetwork('West');
    r.add(new Airport('LAX', 4));
    r.add(new Airport('SFO', 3));
    assert.strictEqual(r.getCapacity(), 7);
  });

  it('getRouteCount() sums routes across airports', () => {
    const r   = new RegionalNetwork('West');
    const lax = new Airport('LAX', 4);
    const sfo = new Airport('SFO', 3);
    lax.addRoute('JFK'); lax.addRoute('ORD');
    sfo.addRoute('SEA');
    r.add(lax); r.add(sfo);
    assert.strictEqual(r.getRouteCount(), 3);
  });

  it('remove() detaches an airport and reduces getCapacity()', () => {
    const r   = new RegionalNetwork('West');
    const lax = new Airport('LAX', 4);
    const sfo = new Airport('SFO', 3);
    r.add(lax); r.add(sfo);
    assert.strictEqual(r.getCapacity(), 7);
    r.remove(lax);
    assert.strictEqual(r.getCapacity(), 3);
  });

  it('empty region has capacity 0 and routeCount 0', () => {
    const r = new RegionalNetwork('Empty');
    assert.strictEqual(r.getCapacity(),   0);
    assert.strictEqual(r.getRouteCount(), 0);
  });

  it('print() outputs the region name and airports', () => {
    const r = new RegionalNetwork('West');
    r.add(new Airport('LAX', 4));
    const lines = captureOutput(() => r.print());
    assert.ok(lines.some(l => l.includes('West')));
    assert.ok(lines.some(l => l.includes('LAX')));
  });
});

// ── AirportNetwork (Root Composite) ──────────────────────────
describe('AirportNetwork (Root Composite)', () => {
  it('getCapacity() recurses through regions into airports', () => {
    const west = new RegionalNetwork('West');
    west.add(new Airport('LAX', 4));
    west.add(new Airport('SFO', 3));

    const east = new RegionalNetwork('East');
    east.add(new Airport('JFK', 5));

    const net = new AirportNetwork('Global');
    net.add(west);
    net.add(east);

    assert.strictEqual(net.getCapacity(), 12);
  });

  it('getRouteCount() recurses through all levels', () => {
    const west = new RegionalNetwork('West');
    const lax  = new Airport('LAX', 4);
    lax.addRoute('JFK'); lax.addRoute('LHR');
    west.add(lax);

    const east = new RegionalNetwork('East');
    const jfk  = new Airport('JFK', 5);
    jfk.addRoute('LAX');
    east.add(jfk);

    const net = new AirportNetwork('Global');
    net.add(west);
    net.add(east);

    assert.strictEqual(net.getRouteCount(), 3);
  });

  it('remove() detaches a region and updates totals', () => {
    const west = new RegionalNetwork('West');
    west.add(new Airport('LAX', 4));

    const east = new RegionalNetwork('East');
    east.add(new Airport('JFK', 5));

    const net = new AirportNetwork('Global');
    net.add(west);
    net.add(east);
    assert.strictEqual(net.getCapacity(), 9);

    net.remove(west);
    assert.strictEqual(net.getCapacity(), 5);
  });
});

// ── Uniformity — core pattern guarantee ──────────────────────
describe('Uniformity (core pattern guarantee)', () => {
  it('getCapacity() call is identical on Airport and RegionalNetwork', () => {
    const leaf:      AirNetworkComponent = new Airport('LAX', 4);
    const composite: AirNetworkComponent = new RegionalNetwork('West');
    (composite as RegionalNetwork).add(new Airport('LAX', 4));

    // Same call, same result — caller never checks the type
    assert.strictEqual(leaf.getCapacity(), composite.getCapacity());
  });

  it('three-level tree resolves from root with one call', () => {
    const region = new RegionalNetwork('West');
    region.add(new Airport('LAX', 4));
    region.add(new Airport('SFO', 3));

    const network = new AirportNetwork('Global');
    network.add(region);

    assert.strictEqual(network.getCapacity(), 7);
  });
});
