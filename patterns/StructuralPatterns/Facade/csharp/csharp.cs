// ============================================================
//  Facade — Third Party API Hub
//  Run: dotnet script csharp.cs
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

using System;
using System.Collections.Generic;
using System.Text;


// SECTION:: Base Client
// ═════════════════════════════════════════════════════════════
//  BASE — ThirdPartyClient
// ═════════════════════════════════════════════════════════════
//  Handles the HTTP plumbing once. Subclasses only define
//  their config (BaseUrl, Headers) and their domain methods.

abstract class ThirdPartyClient {

    protected abstract string BaseUrl { get; }
    protected abstract Dictionary<string, string> Headers { get; }

    protected Dictionary<string, object> Request(string method, string url, Dictionary<string, object>? body = null) {
        Console.WriteLine($"    → {method} {BaseUrl}{url}");
        Console.WriteLine($"    → Headers: {FormatHeaders()}");
        if (body is not null) Console.WriteLine($"    → Body:    {FormatBody(body)}");
        return MockResponse(url);
    }

    protected Dictionary<string, object> Get(string url)                                => Request("GET",  url);
    protected Dictionary<string, object> Post(string url, Dictionary<string, object> b) => Request("POST", url, b);

    // Varargs helper: B("key", val, "key2", val2)
    protected static Dictionary<string, object> B(params object[] pairs) {
        var d = new Dictionary<string, object>();
        for (int i = 0; i < pairs.Length; i += 2) d[(string)pairs[i]] = pairs[i + 1];
        return d;
    }

    private string FormatHeaders() {
        var parts = new List<string>();
        foreach (var key in Headers.Keys) parts.Add($"{key}: •••");
        return string.Join("  |  ", parts);
    }

    private static string FormatBody(Dictionary<string, object> body) {
        var sb = new StringBuilder("{ ");
        foreach (var kv in body) sb.Append($"{kv.Key}: {kv.Value}, ");
        sb.Length -= 2;
        return sb + " }";
    }

    private static Dictionary<string, object> MockResponse(string url) {
        if (url.Contains("validate"))     return new() { ["user_id"] = "usr_4421",  ["email"] = "jane.doe@example.com" };
        if (url.Contains("charge"))       return new() { ["transaction_id"] = "txn_8821", ["status"] = "success" };
        if (url.Contains("refund"))       return new() { ["refund_id"] = "ref_1143", ["status"] = "refunded" };
        if (url.Contains("dispatch"))     return new() { ["message_id"] = "msg_3301", ["status"] = "queued" };
        if (url.Contains("users"))        return new() { ["user_id"] = "usr_4421", ["name"] = "Jane Doe", ["email"] = "jane.doe@example.com" };
        if (url.Contains("messages"))     return new() { ["message_id"] = "msg_3301", ["status"] = "delivered" };
        if (url.Contains("transactions")) return new() { ["transaction_id"] = "txn_8821", ["amount"] = 4999, ["status"] = "settled" };
        return new();
    }
}


// SECTION:: Payment Facade
// ═════════════════════════════════════════════════════════════
//  PAYMENT FACADE
// ═════════════════════════════════════════════════════════════
//  Wraps PaymentProcessorTP. Callers never see the base URL,
//  the merchant ID header, or the raw endpoint paths.

class PaymentFacade : ThirdPartyClient {
    protected override string BaseUrl => "https://api.paymentprocessortp.com";
    protected override Dictionary<string, string> Headers => new() {
        ["Content-Type"]  = "application/json",
        ["Authorization"] = $"Bearer {Env("BILLING_API_KEY",    "sk_live_demo")}",
        ["X-Merchant-Id"] =          Env("BILLING_MERCHANT_ID", "merch_xyz"),
    };

    public Dictionary<string, object> Charge(string userId, double amount) =>
        Post("/v1/charge", B("user_id", userId, "amount", amount));

    public Dictionary<string, object> Refund(string transactionId) =>
        Post("/v1/refund", B("transaction_id", transactionId));

    public Dictionary<string, object> GetTransaction(string id) =>
        Get($"/v1/transactions/{id}");

    private static string Env(string key, string fallback) =>
        Environment.GetEnvironmentVariable(key) ?? fallback;
}


// SECTION:: Auth Facade
// ═════════════════════════════════════════════════════════════
//  AUTH FACADE
// ═════════════════════════════════════════════════════════════
//  Wraps AuthProviderTP. Callers never see the bearer format,
//  client ID header, or the token validation endpoint.

class AuthFacade : ThirdPartyClient {
    protected override string BaseUrl => "https://api.authprovidertp.com";
    protected override Dictionary<string, string> Headers => new() {
        ["Content-Type"]  = "application/json",
        ["Authorization"] = $"Bearer {Env("AUTH_SECRET",    "auth_secret_demo")}",
        ["X-Client-Id"]   =          Env("AUTH_CLIENT_ID", "client_abc"),
    };

    public Dictionary<string, object> ValidateToken(string token) =>
        Post("/v1/validate", B("token", token));

    public Dictionary<string, object> GetUser(string userId) =>
        Get($"/v1/users/{userId}");

    private static string Env(string key, string fallback) =>
        Environment.GetEnvironmentVariable(key) ?? fallback;
}


// SECTION:: Messaging Facade
// ═════════════════════════════════════════════════════════════
//  MESSAGING FACADE
// ═════════════════════════════════════════════════════════════
//  Wraps MessagingTP. Callers never see the account SID,
//  auth token, or the dispatch endpoint structure.

class MessagingFacade : ThirdPartyClient {
    protected override string BaseUrl => "https://api.messagingtp.com";
    protected override Dictionary<string, string> Headers => new() {
        ["Content-Type"]  = "application/json",
        ["X-Account-SID"] = Env("MSG_ACCOUNT_SID", "SID_xyz"),
        ["X-Auth-Token"]  = Env("MSG_AUTH_TOKEN",  "tok_xyz"),
    };

    public Dictionary<string, object> Send(string to, string message) =>
        Post("/v1/dispatch", B("to", to, "body", message));

    public Dictionary<string, object> GetStatus(string messageId) =>
        Get($"/v1/messages/{messageId}");

    private static string Env(string key, string fallback) =>
        Environment.GetEnvironmentVariable(key) ?? fallback;
}


// SECTION:: Consumer
// ═════════════════════════════════════════════════════════════
//  CONSUMER — PurchaseService
// ═════════════════════════════════════════════════════════════
//  Knows nothing about HTTP, auth headers, or base URLs.
//  Each facade call reads like a plain domain method.

class PurchaseService {
    private readonly AuthFacade      auth      = new();
    private readonly PaymentFacade   payment   = new();
    private readonly MessagingFacade messaging = new();

    public void MakePurchase(string token, double amount, string phone) {
        Console.WriteLine("  [Auth]      Validating token...");
        var user = auth.ValidateToken(token);
        Console.WriteLine($"  ✓ User: {user["email"]}\n");

        Console.WriteLine($"  [Payment]   Charging ${amount}...");
        var tx = payment.Charge((string)user["user_id"], amount);
        Console.WriteLine($"  ✓ Charged — ref: {tx["transaction_id"]}\n");

        Console.WriteLine($"  [Messaging] Sending confirmation to {phone}...");
        var msg = messaging.Send(phone, $"Payment confirmed. Ref: {tx["transaction_id"]}");
        Console.WriteLine($"  ✓ Message queued — id: {msg["message_id"]}");
    }
}


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════

var SEP = new string('═', 64);

Console.WriteLine("╔══════════════════════════════════════════════════════════════╗");
Console.WriteLine("║           Facade — Third Party API Hub                      ║");
Console.WriteLine("╚══════════════════════════════════════════════════════════════╝");

Console.WriteLine($"\n{SEP}");
Console.WriteLine("  Scenario: PurchaseService.MakePurchase()");
Console.WriteLine($"{SEP}\n");

new PurchaseService().MakePurchase("tok_user_jane", 49.99, "+15550142");

Console.WriteLine($"\n{SEP}");
Console.WriteLine("  Without the Facade");
Console.WriteLine(SEP);
Console.WriteLine("");
Console.WriteLine("  PurchaseService would need to know:");
Console.WriteLine("    auth:      base URL, bearer format, client ID header name");
Console.WriteLine("    payment:   base URL, merchant ID header, charge endpoint path");
Console.WriteLine("    messaging: base URL, account SID + auth token, dispatch endpoint");
Console.WriteLine("    — plus JSON serialization and error handling per TP");
Console.WriteLine("");
Console.WriteLine("  With the facade:");
Console.WriteLine("    auth.ValidateToken(token)");
Console.WriteLine("    payment.Charge(userId, amount)");
Console.WriteLine("    messaging.Send(phone, message)");

Console.WriteLine("\n╔══════════════════════════════════════════════════════════════╗");
Console.WriteLine("║  Done                                                        ║");
Console.WriteLine("╚══════════════════════════════════════════════════════════════╝");
