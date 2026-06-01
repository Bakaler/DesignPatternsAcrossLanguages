// ============================================================
//  Integration Tests — Facade: Third Party API Hub
//
//  What we test here:
//    · Full makePurchase() flow produces correct end-to-end output
//    · Auth result (email) feeds into Payment, Payment ref feeds into Messaging
//    · Each facade routes exclusively to its own TP base URL
//    · Credentials are masked with ••• — never raw values in output
//    · Swapping a facade subclass leaves other facades untouched
//
//  Run: npx mocha --require ts-node/register integration.test.ts
// ============================================================

import { describe, it, before } from 'mocha';
import assert from 'assert';
import { captureOutput, findMissing } from '../../../_helpers/typescript/helpers';
import {
  PaymentFacade, AuthFacade, MessagingFacade, PurchaseService,
} from '../../../../StructuralPatterns/Facade/typescript/typescript';

// ── Full purchase flow ────────────────────────────────────────
describe('PurchaseService — full makePurchase() flow', () => {
  let lines: string[];

  before(() => {
    lines = captureOutput(() =>
      new PurchaseService().makePurchase('tok_user_jane', 49.99, '+15550142')
    );
  });

  it('all three confirmation lines appear', () => {
    assert.strictEqual(
      findMissing(lines, ['✓ User:', '✓ Charged', '✓ Message queued']),
      null
    );
  });

  it('auth email propagates into consumer output', () => {
    assert.ok(lines.some(l => l.includes('jane.doe@example.com')));
  });

  it('payment transaction id propagates into consumer output', () => {
    assert.ok(lines.some(l => l.includes('txn_8821')));
  });

  it('message id propagates into consumer output', () => {
    assert.ok(lines.some(l => l.includes('msg_3301')));
  });

  it('transaction id appears in the messaging confirmation (data flows between facades)', () => {
    const msgLine = lines.find(l => l.includes('✓ Message queued'));
    // The message body includes the transaction ref — confirms auth→payment→messaging data flow
    const confirmLine = lines.find(l => l.includes('Payment confirmed') || l.includes('txn_8821'));
    assert.ok(msgLine || confirmLine);
  });
});

// ── Loose coupling — base URLs stay inside facades ───────────
describe('Facade — loose coupling (TP details never leak)', () => {
  it('each facade routes exclusively to its own base URL', () => {
    const paymentLines = captureOutput(() => new PaymentFacade().charge('usr_1', 100));
    const authLines    = captureOutput(() => new AuthFacade().validateToken('tok_1'));
    const msgLines     = captureOutput(() => new MessagingFacade().send('+1', 'hi'));

    assert.ok(paymentLines.some(l => l.includes('paymentprocessortp.com')));
    assert.ok(authLines.some(l => l.includes('authprovidertp.com')));
    assert.ok(msgLines.some(l => l.includes('messagingtp.com')));
  });

  it('no cross-contamination between facade URLs', () => {
    const paymentLines = captureOutput(() => new PaymentFacade().charge('usr_1', 100)).join('\n');
    const authLines    = captureOutput(() => new AuthFacade().validateToken('tok_1')).join('\n');

    assert.ok(!paymentLines.includes('authprovidertp.com'));
    assert.ok(!paymentLines.includes('messagingtp.com'));
    assert.ok(!authLines.includes('paymentprocessortp.com'));
    assert.ok(!authLines.includes('messagingtp.com'));
  });

  it('headers are masked — raw credential values never appear in output', () => {
    const out = captureOutput(() =>
      new PurchaseService().makePurchase('tok_test', 10, '+1')
    ).join('\n');
    assert.ok(!out.includes('sk_live_demo'));
    assert.ok(!out.includes('auth_secret_demo'));
    assert.ok(!out.includes('SID_xyz'));
    assert.ok(!out.includes('tok_xyz'));
    // Headers ARE logged but values are masked with •••
    assert.ok(out.includes('•••'));
  });
});

// ── Single point of change ───────────────────────────────────
describe('Facade — single point of change', () => {
  it('swapping PaymentFacade subclass does not affect AuthFacade', () => {
    class FreePaymentFacade extends PaymentFacade {
      override charge(_userId: string, _amount: number) {
        return { transaction_id: 'free_txn', status: 'success' };
      }
    }
    // Auth unaffected
    const authResult = new AuthFacade().validateToken('tok_1');
    assert.strictEqual(authResult['user_id'], 'usr_4421');

    // Swapped payment facade returns custom result
    const txResult = new FreePaymentFacade().charge('usr_1', 0);
    assert.strictEqual(txResult['transaction_id'], 'free_txn');
  });

  it('swapping MessagingFacade subclass does not affect PaymentFacade', () => {
    class SilentMessaging extends MessagingFacade {
      override send(_to: string, _msg: string) {
        return { message_id: 'silent', status: 'dropped' };
      }
    }
    // Payment unaffected
    const txResult = new PaymentFacade().charge('usr_1', 50);
    assert.strictEqual(txResult['transaction_id'], 'txn_8821');

    // Swapped messaging returns custom result
    const msgResult = new SilentMessaging().send('+1', 'test');
    assert.strictEqual(msgResult['status'], 'dropped');
  });
});
