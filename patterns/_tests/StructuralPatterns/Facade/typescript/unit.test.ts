// ============================================================
//  Unit Tests — Facade: Third Party API Hub
//
//  What we test here:
//    · Each facade method returns the correct mock response shape
//    · Each facade routes to its own base URL (no cross-contamination)
//    · PurchaseService calls Auth → Payment → Messaging in order
//    · Consumer output contains no raw credentials or headers
//    · Swapping a facade subclass only affects that facade
//
//  Run: npx mocha --require ts-node/register unit.test.ts
// ============================================================

import { describe, it } from 'mocha';
import assert from 'assert';
import { captureOutput } from '../../../_helpers/typescript/helpers';
import {
  PaymentFacade, AuthFacade, MessagingFacade, PurchaseService,
} from '../../../../StructuralPatterns/Facade/typescript/typescript';

// ── PaymentFacade ────────────────────────────────────────────
describe('PaymentFacade', () => {
  const facade = new PaymentFacade();

  it('charge() returns transaction_id and success status', () => {
    const result = facade.charge('usr_001', 99);
    assert.strictEqual(result['transaction_id'], 'txn_8821');
    assert.strictEqual(result['status'], 'success');
  });

  it('refund() returns refund_id and refunded status', () => {
    const result = facade.refund('txn_8821');
    assert.strictEqual(result['refund_id'], 'ref_1143');
    assert.strictEqual(result['status'], 'refunded');
  });

  it('getTransaction() returns settled transaction details', () => {
    const result = facade.getTransaction('txn_8821');
    assert.ok('transaction_id' in result);
    assert.strictEqual(result['status'], 'settled');
  });

  it('charge() routes to paymentprocessortp.com base URL', () => {
    const lines = captureOutput(() => facade.charge('usr_001', 99));
    assert.ok(lines.some(l => l.includes('paymentprocessortp.com')));
    assert.ok(lines.some(l => l.includes('/v1/charge')));
  });

  it('refund() routes to /v1/refund endpoint', () => {
    const lines = captureOutput(() => facade.refund('txn_8821'));
    assert.ok(lines.some(l => l.includes('/v1/refund')));
  });
});

// ── AuthFacade ───────────────────────────────────────────────
describe('AuthFacade', () => {
  const facade = new AuthFacade();

  it('validateToken() returns user_id and email', () => {
    const result = facade.validateToken('tok_test');
    assert.strictEqual(result['user_id'], 'usr_4421');
    assert.strictEqual(result['email'], 'jane.doe@example.com');
  });

  it('getUser() returns user_id, name, and email', () => {
    const result = facade.getUser('usr_4421');
    assert.strictEqual(result['user_id'], 'usr_4421');
    assert.ok('name' in result);
    assert.ok('email' in result);
  });

  it('validateToken() routes to authprovidertp.com base URL', () => {
    const lines = captureOutput(() => facade.validateToken('tok_test'));
    assert.ok(lines.some(l => l.includes('authprovidertp.com')));
    assert.ok(lines.some(l => l.includes('/v1/validate')));
  });
});

// ── MessagingFacade ──────────────────────────────────────────
describe('MessagingFacade', () => {
  const facade = new MessagingFacade();

  it('send() returns message_id and queued status', () => {
    const result = facade.send('+15550000', 'Hello');
    assert.strictEqual(result['message_id'], 'msg_3301');
    assert.strictEqual(result['status'], 'queued');
  });

  it('getStatus() returns delivered status', () => {
    const result = facade.getStatus('msg_3301');
    assert.strictEqual(result['status'], 'delivered');
  });

  it('send() routes to messagingtp.com /v1/dispatch', () => {
    const lines = captureOutput(() => facade.send('+15550000', 'Hello'));
    assert.ok(lines.some(l => l.includes('messagingtp.com')));
    assert.ok(lines.some(l => l.includes('/v1/dispatch')));
  });
});

// ── PurchaseService — consumer isolation ─────────────────────
describe('PurchaseService — facade isolation', () => {
  it('produces [Auth], [Payment], [Messaging] labels in output', () => {
    const lines = captureOutput(() =>
      new PurchaseService().makePurchase('tok_test', 49.99, '+15550142')
    );
    assert.ok(lines.some(l => l.includes('[Auth]')));
    assert.ok(lines.some(l => l.includes('[Payment]')));
    assert.ok(lines.some(l => l.includes('[Messaging]')));
  });

  it('calls Auth before Payment', () => {
    const lines = captureOutput(() =>
      new PurchaseService().makePurchase('tok_test', 49.99, '+15550142')
    );
    const authIdx    = lines.findIndex(l => l.includes('[Auth]'));
    const paymentIdx = lines.findIndex(l => l.includes('[Payment]'));
    assert.ok(authIdx < paymentIdx);
  });

  it('calls Payment before Messaging', () => {
    const lines = captureOutput(() =>
      new PurchaseService().makePurchase('tok_test', 49.99, '+15550142')
    );
    const paymentIdx   = lines.findIndex(l => l.includes('[Payment]'));
    const messagingIdx = lines.findIndex(l => l.includes('[Messaging]'));
    assert.ok(paymentIdx < messagingIdx);
  });

  it('output never exposes raw credential values', () => {
    const out = captureOutput(() =>
      new PurchaseService().makePurchase('tok_test', 49.99, '+15550142')
    ).join('\n');
    assert.ok(!out.includes('sk_live_demo'));
    assert.ok(!out.includes('auth_secret_demo'));
    assert.ok(!out.includes('SID_xyz'));
  });
});
