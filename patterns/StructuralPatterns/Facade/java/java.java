// ============================================================
//  Facade — Third Party API Hub
//  Run: javac java.java && java Main
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Base         ThirdPartyClient (abstract — HTTP plumbing once)
//  Facade       PaymentFacade, AuthFacade, MessagingFacade
//  Consumer     PurchaseService
//  Client       Main
//
//  Consequences demonstrated
//  ────────────────────────────────────────────────────────
//  ✓ Simplified interface   — consumers call clean methods, never raw HTTP
//  ✓ Loose coupling         — TP auth, headers, base URLs never leak to callers
//  ✓ Single point of change — swap a TP? update one class, nothing else breaks
//  ✗ God-object risk        — facade grows unwieldy if every endpoint lands here
// ============================================================

import java.util.*;


// SECTION:: Base Client
// ═════════════════════════════════════════════════════════════
//  BASE — ThirdPartyClient
// ═════════════════════════════════════════════════════════════
//  Handles the HTTP plumbing once. Subclasses only define
//  their config (baseUrl, headers) and their domain methods.
//  request() is simulated here — prints what would go over the
//  wire and returns a mocked response.

abstract class ThirdPartyClient {

    protected abstract String              baseUrl();
    protected abstract Map<String, String> headers();

    protected Map<String, Object> request(String method, String url, Map<String, Object> body) {
        System.out.println("    → " + method + " " + baseUrl() + url);
        System.out.println("    → Headers: " + formatHeaders());
        if (body != null) System.out.println("    → Body:    " + formatBody(body));
        return mockResponse(url);
    }

    protected Map<String, Object> get(String url) {
        return request("GET", url, null);
    }

    protected Map<String, Object> post(String url, Map<String, Object> body) {
        return request("POST", url, body);
    }

    // Varargs helper so facades can write map("key", val, "key2", val2)
    protected static Map<String, Object> map(Object... pairs) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) m.put((String) pairs[i], pairs[i + 1]);
        return m;
    }

    private String formatHeaders() {
        StringJoiner sj = new StringJoiner("  |  ");
        headers().forEach((k, v) -> sj.add(k + ": •••"));
        return sj.toString();
    }

    private String formatBody(Map<String, Object> body) {
        StringJoiner sj = new StringJoiner(", ", "{ ", " }");
        body.forEach((k, v) -> sj.add(k + ": " + v));
        return sj.toString();
    }

    private Map<String, Object> mockResponse(String url) {
        Map<String, Object> res = new LinkedHashMap<>();
        if      (url.contains("validate"))     { res.put("user_id", "usr_4421"); res.put("email", "jane.doe@example.com"); }
        else if (url.contains("charge"))       { res.put("transaction_id", "txn_8821"); res.put("status", "success"); }
        else if (url.contains("refund"))       { res.put("refund_id", "ref_1143"); res.put("status", "refunded"); }
        else if (url.contains("dispatch"))     { res.put("message_id", "msg_3301"); res.put("status", "queued"); }
        else if (url.contains("users"))        { res.put("user_id", "usr_4421"); res.put("name", "Jane Doe"); res.put("email", "jane.doe@example.com"); }
        else if (url.contains("messages"))     { res.put("message_id", "msg_3301"); res.put("status", "delivered"); }
        else if (url.contains("transactions")) { res.put("transaction_id", "txn_8821"); res.put("amount", 4999); res.put("status", "settled"); }
        return res;
    }
}


// SECTION:: Payment Facade
// ═════════════════════════════════════════════════════════════
//  PAYMENT FACADE
// ═════════════════════════════════════════════════════════════
//  Wraps PaymentProcessorTP. Callers never see the base URL,
//  the merchant ID header, or the raw endpoint paths.

class PaymentFacade extends ThirdPartyClient {

    @Override
    protected String baseUrl() { return "https://api.paymentprocessortp.com"; }

    @Override
    protected Map<String, String> headers() {
        Map<String, String> h = new LinkedHashMap<>();
        h.put("Content-Type",  "application/json");
        h.put("Authorization", "Bearer " + env("BILLING_API_KEY",    "sk_live_demo"));
        h.put("X-Merchant-Id",             env("BILLING_MERCHANT_ID", "merch_xyz"));
        return h;
    }

    Map<String, Object> charge(String userId, double amount) {
        return post("/v1/charge", map("user_id", userId, "amount", amount));
    }

    Map<String, Object> refund(String transactionId) {
        return post("/v1/refund", map("transaction_id", transactionId));
    }

    Map<String, Object> getTransaction(String id) {
        return get("/v1/transactions/" + id);
    }

    private static String env(String key, String fallback) {
        return System.getenv().getOrDefault(key, fallback);
    }
}


// SECTION:: Auth Facade
// ═════════════════════════════════════════════════════════════
//  AUTH FACADE
// ═════════════════════════════════════════════════════════════
//  Wraps AuthProviderTP. Callers never see the bearer format,
//  client ID header, or the token validation endpoint.

class AuthFacade extends ThirdPartyClient {

    @Override
    protected String baseUrl() { return "https://api.authprovidertp.com"; }

    @Override
    protected Map<String, String> headers() {
        Map<String, String> h = new LinkedHashMap<>();
        h.put("Content-Type",  "application/json");
        h.put("Authorization", "Bearer " + env("AUTH_SECRET",    "auth_secret_demo"));
        h.put("X-Client-Id",               env("AUTH_CLIENT_ID", "client_abc"));
        return h;
    }

    Map<String, Object> validateToken(String token) {
        return post("/v1/validate", map("token", token));
    }

    Map<String, Object> getUser(String userId) {
        return get("/v1/users/" + userId);
    }

    private static String env(String key, String fallback) {
        return System.getenv().getOrDefault(key, fallback);
    }
}


// SECTION:: Messaging Facade
// ═════════════════════════════════════════════════════════════
//  MESSAGING FACADE
// ═════════════════════════════════════════════════════════════
//  Wraps MessagingTP. Callers never see the account SID,
//  auth token, or the dispatch endpoint structure.

class MessagingFacade extends ThirdPartyClient {

    @Override
    protected String baseUrl() { return "https://api.messagingtp.com"; }

    @Override
    protected Map<String, String> headers() {
        Map<String, String> h = new LinkedHashMap<>();
        h.put("Content-Type",  "application/json");
        h.put("X-Account-SID", env("MSG_ACCOUNT_SID", "SID_xyz"));
        h.put("X-Auth-Token",  env("MSG_AUTH_TOKEN",  "tok_xyz"));
        return h;
    }

    Map<String, Object> send(String to, String message) {
        return post("/v1/dispatch", map("to", to, "body", message));
    }

    Map<String, Object> getStatus(String messageId) {
        return get("/v1/messages/" + messageId);
    }

    private static String env(String key, String fallback) {
        return System.getenv().getOrDefault(key, fallback);
    }
}


// SECTION:: Consumer
// ═════════════════════════════════════════════════════════════
//  CONSUMER — PurchaseService
// ═════════════════════════════════════════════════════════════
//  Knows nothing about HTTP, auth headers, or base URLs.
//  Each facade call reads like a plain domain method.

class PurchaseService {

    private final AuthFacade      auth      = new AuthFacade();
    private final PaymentFacade   payment   = new PaymentFacade();
    private final MessagingFacade messaging = new MessagingFacade();

    void makePurchase(String token, double amount, String phone) {

        System.out.println("  [Auth]      Validating token...");
        var user = auth.validateToken(token);
        System.out.println("  ✓ User: " + user.get("email") + "\n");

        System.out.println("  [Payment]   Charging $" + amount + "...");
        var tx = payment.charge((String) user.get("user_id"), amount);
        System.out.println("  ✓ Charged — ref: " + tx.get("transaction_id") + "\n");

        System.out.println("  [Messaging] Sending confirmation to " + phone + "...");
        var msg = messaging.send(phone, "Payment confirmed. Ref: " + tx.get("transaction_id"));
        System.out.println("  ✓ Message queued — id: " + msg.get("message_id"));
    }
}


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════

class Main {
    private static final String SEP = "═".repeat(64);

    public static void main(String[] args) {
        System.out.println("╔══════════════════════════════════════════════════════════════╗");
        System.out.println("║           Facade — Third Party API Hub                      ║");
        System.out.println("╚══════════════════════════════════════════════════════════════╝");

        // ── Scenario: full purchase flow ───────────────────────────────────
        System.out.println("\n" + SEP);
        System.out.println("  Scenario: PurchaseService.makePurchase()");
        System.out.println(SEP + "\n");

        new PurchaseService().makePurchase("tok_user_jane", 49.99, "+15550142");

        // ── Without-facade comparison ──────────────────────────────────────
        System.out.println("\n" + SEP);
        System.out.println("  Without the Facade");
        System.out.println(SEP);
        System.out.println("");
        System.out.println("  PurchaseService would need to know:");
        System.out.println("    auth:      base URL, bearer format, client ID header name");
        System.out.println("    payment:   base URL, merchant ID header, charge endpoint path");
        System.out.println("    messaging: base URL, account SID + auth token, dispatch endpoint");
        System.out.println("    — plus JSON serialization and error handling per TP");
        System.out.println("");
        System.out.println("  With the facade:");
        System.out.println("    auth.validateToken(token)");
        System.out.println("    payment.charge(userId, amount)");
        System.out.println("    messaging.send(phone, message)");

        System.out.println("\n╔══════════════════════════════════════════════════════════════╗");
        System.out.println("║  Done                                                        ║");
        System.out.println("╚══════════════════════════════════════════════════════════════╝");
    }
}
