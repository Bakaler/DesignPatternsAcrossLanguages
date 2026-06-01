// ============================================================
//  Facade — Third Party API Hub
//  Run: npx ts-node typescript.ts
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Base         ThirdPartyClient (abstract — HTTP plumbing once)
//  Facade       PaymentFacade, AuthFacade, MessagingFacade
//  Consumer     PurchaseService
//  Client       Entry point
//
//  Consequences demonstrated
//  ────────────────────────────────────────────────────────
//  ✓ Simplified interface   — consumers call clean methods, never raw HTTP
//  ✓ Loose coupling         — TP auth, headers, base URLs never leak to callers
//  ✓ Single point of change — swap a TP? update one class, nothing else breaks
//  ✗ God-object risk        — facade grows unwieldy if every endpoint lands here
// ============================================================


// SECTION:: Base Client
// ═════════════════════════════════════════════════════════════
//  BASE — ThirdPartyClient
// ═════════════════════════════════════════════════════════════
//  Handles the HTTP plumbing once. Subclasses only define
//  their config (baseUrl, headers) and their domain methods.

export type HttpBody = Record<string, unknown>;

export abstract class ThirdPartyClient {
  protected abstract baseUrl: string;
  protected abstract headers: Record<string, string>;

  protected request(method: string, url: string, body?: HttpBody): HttpBody {
    console.log(`    → ${method} ${this.baseUrl}${url}`);
    console.log(`    → Headers: ${this.formatHeaders()}`);
    if (body) console.log(`    → Body:    ${this.formatBody(body)}`);
    return this.mockResponse(url);
  }

  protected get(url: string)                  { return this.request('GET',  url); }
  protected post(url: string, body: HttpBody) { return this.request('POST', url, body); }

  private formatHeaders(): string {
    return Object.keys(this.headers)
      .map(k => `${k}: •••`)
      .join('  |  ');
  }

  private formatBody(body: HttpBody): string {
    const inner = Object.entries(body).map(([k, v]) => `${k}: ${v}`).join(', ');
    return `{ ${inner} }`;
  }

  private mockResponse(url: string): HttpBody {
    if (url.includes('validate'))     return { user_id: 'usr_4421', email: 'jane.doe@example.com' };
    if (url.includes('charge'))       return { transaction_id: 'txn_8821', status: 'success' };
    if (url.includes('refund'))       return { refund_id: 'ref_1143', status: 'refunded' };
    if (url.includes('dispatch'))     return { message_id: 'msg_3301', status: 'queued' };
    if (url.includes('users'))        return { user_id: 'usr_4421', name: 'Jane Doe', email: 'jane.doe@example.com' };
    if (url.includes('messages'))     return { message_id: 'msg_3301', status: 'delivered' };
    if (url.includes('transactions')) return { transaction_id: 'txn_8821', amount: 4999, status: 'settled' };
    return {};
  }
}


// SECTION:: Payment Facade
// ═════════════════════════════════════════════════════════════
//  PAYMENT FACADE
// ═════════════════════════════════════════════════════════════
//  Wraps PaymentProcessorTP. Callers never see the base URL,
//  the merchant ID header, or the raw endpoint paths.

export class PaymentFacade extends ThirdPartyClient {
  protected baseUrl = 'https://api.paymentprocessortp.com';
  protected headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${process.env['BILLING_API_KEY']    ?? 'sk_live_demo'}`,
    'X-Merchant-Id':           process.env['BILLING_MERCHANT_ID'] ?? 'merch_xyz',
  };

  charge(userId: string, amount: number) {
    return this.post('/v1/charge', { user_id: userId, amount });
  }

  refund(transactionId: string) {
    return this.post('/v1/refund', { transaction_id: transactionId });
  }

  getTransaction(id: string) {
    return this.get(`/v1/transactions/${id}`);
  }
}


// SECTION:: Auth Facade
// ═════════════════════════════════════════════════════════════
//  AUTH FACADE
// ═════════════════════════════════════════════════════════════
//  Wraps AuthProviderTP. Callers never see the bearer format,
//  client ID header, or the token validation endpoint.

export class AuthFacade extends ThirdPartyClient {
  protected baseUrl = 'https://api.authprovidertp.com';
  protected headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${process.env['AUTH_SECRET']    ?? 'auth_secret_demo'}`,
    'X-Client-Id':             process.env['AUTH_CLIENT_ID'] ?? 'client_abc',
  };

  validateToken(token: string) {
    return this.post('/v1/validate', { token });
  }

  getUser(userId: string) {
    return this.get(`/v1/users/${userId}`);
  }
}


// SECTION:: Messaging Facade
// ═════════════════════════════════════════════════════════════
//  MESSAGING FACADE
// ═════════════════════════════════════════════════════════════
//  Wraps MessagingTP. Callers never see the account SID,
//  auth token, or the dispatch endpoint structure.

export class MessagingFacade extends ThirdPartyClient {
  protected baseUrl = 'https://api.messagingtp.com';
  protected headers = {
    'Content-Type':  'application/json',
    'X-Account-SID': process.env['MSG_ACCOUNT_SID'] ?? 'SID_xyz',
    'X-Auth-Token':  process.env['MSG_AUTH_TOKEN']  ?? 'tok_xyz',
  };

  send(to: string, message: string) {
    return this.post('/v1/dispatch', { to, body: message });
  }

  getStatus(messageId: string) {
    return this.get(`/v1/messages/${messageId}`);
  }
}


// SECTION:: Consumer
// ═════════════════════════════════════════════════════════════
//  CONSUMER — PurchaseService
// ═════════════════════════════════════════════════════════════
//  Knows nothing about HTTP, auth headers, or base URLs.
//  Each facade call reads like a plain domain method.

export class PurchaseService {
  private auth      = new AuthFacade();
  private payment   = new PaymentFacade();
  private messaging = new MessagingFacade();

  makePurchase(token: string, amount: number, phone: string): void {
    console.log('  [Auth]      Validating token...');
    const user = this.auth.validateToken(token);
    console.log(`  ✓ User: ${user['email']}\n`);

    console.log(`  [Payment]   Charging $${amount}...`);
    const tx = this.payment.charge(user['user_id'] as string, amount);
    console.log(`  ✓ Charged — ref: ${tx['transaction_id']}\n`);

    console.log(`  [Messaging] Sending confirmation to ${phone}...`);
    const msg = this.messaging.send(phone, `Payment confirmed. Ref: ${tx['transaction_id']}`);
    console.log(`  ✓ Message queued — id: ${msg['message_id']}`);
  }
}


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════

if (require.main === module) {
const SEP = '═'.repeat(64);

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║           Facade — Third Party API Hub                      ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

console.log(`\n${SEP}`);
console.log('  Scenario: PurchaseService.makePurchase()');
console.log(`${SEP}\n`);

new PurchaseService().makePurchase('tok_user_jane', 49.99, '+15550142');

console.log(`\n${SEP}`);
console.log('  Without the Facade');
console.log(SEP);
console.log('');
console.log('  PurchaseService would need to know:');
console.log('    auth:      base URL, bearer format, client ID header name');
console.log('    payment:   base URL, merchant ID header, charge endpoint path');
console.log('    messaging: base URL, account SID + auth token, dispatch endpoint');
console.log('    — plus JSON serialization and error handling per TP');
console.log('');
console.log('  With the facade:');
console.log('    auth.validateToken(token)');
console.log('    payment.charge(userId, amount)');
console.log('    messaging.send(phone, message)');

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  Done                                                        ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
} // require.main === module
