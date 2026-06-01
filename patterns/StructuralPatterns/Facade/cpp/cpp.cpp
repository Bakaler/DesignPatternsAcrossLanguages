// ============================================================
//  Facade — Third Party API Hub
//  Compile: g++ -std=c++17 -o cpp cpp.cpp && ./cpp
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Base         ThirdPartyClient (abstract — HTTP plumbing once)
//  Facade       PaymentFacade, AuthFacade, MessagingFacade
//  Consumer     PurchaseService
//  Client       main()
//
//  Consequences demonstrated
//  ────────────────────────────────────────────────────────
//  ✓ Simplified interface   — consumers call clean methods, never raw HTTP
//  ✓ Loose coupling         — TP auth, headers, base URLs never leak to callers
//  ✓ Single point of change — swap a TP? update one class, nothing else breaks
//  ✗ God-object risk        — facade grows unwieldy if every endpoint lands here
// ============================================================

#include <iostream>
#include <string>
#include <map>
#include <sstream>


// SECTION:: Base Client
// ═════════════════════════════════════════════════════════════
//  BASE — ThirdPartyClient
// ═════════════════════════════════════════════════════════════
//  Handles the HTTP plumbing once. Subclasses only define
//  their config (baseUrl, headers) and their domain methods.

using HttpBody = std::map<std::string, std::string>;

class ThirdPartyClient {
protected:
    virtual std::string baseUrl()  const = 0;
    virtual HttpBody    headers()  const = 0;

    HttpBody request(const std::string& method,
                     const std::string& url,
                     const HttpBody&    body = {}) const
    {
        std::cout << "    → " << method << " " << baseUrl() << url << "\n";
        std::cout << "    → Headers: ";
        bool first = true;
        for (auto& [k, _] : headers()) {
            if (!first) std::cout << "  |  ";
            std::cout << k << ": •••";
            first = false;
        }
        std::cout << "\n";
        if (!body.empty()) {
            std::cout << "    → Body:    { ";
            first = true;
            for (auto& [k, v] : body) {
                if (!first) std::cout << ", ";
                std::cout << k << ": " << v;
                first = false;
            }
            std::cout << " }\n";
        }
        return mockResponse(url);
    }

    HttpBody get(const std::string& url) const {
        return request("GET", url);
    }

    HttpBody post(const std::string& url, const HttpBody& body) const {
        return request("POST", url, body);
    }

public:
    virtual ~ThirdPartyClient() = default;

private:
    HttpBody mockResponse(const std::string& url) const {
        if (url.find("validate")     != std::string::npos) return {{"user_id","usr_4421"},{"email","jane.doe@example.com"}};
        if (url.find("charge")       != std::string::npos) return {{"transaction_id","txn_8821"},{"status","success"}};
        if (url.find("refund")       != std::string::npos) return {{"refund_id","ref_1143"},{"status","refunded"}};
        if (url.find("dispatch")     != std::string::npos) return {{"message_id","msg_3301"},{"status","queued"}};
        if (url.find("users")        != std::string::npos) return {{"user_id","usr_4421"},{"name","Jane Doe"},{"email","jane.doe@example.com"}};
        if (url.find("messages")     != std::string::npos) return {{"message_id","msg_3301"},{"status","delivered"}};
        if (url.find("transactions") != std::string::npos) return {{"transaction_id","txn_8821"},{"amount","4999"},{"status","settled"}};
        return {};
    }
};


// SECTION:: Payment Facade
// ═════════════════════════════════════════════════════════════
//  PAYMENT FACADE
// ═════════════════════════════════════════════════════════════
//  Wraps PaymentProcessorTP. Callers never see the base URL,
//  the merchant ID header, or the raw endpoint paths.

class PaymentFacade : public ThirdPartyClient {
protected:
    std::string baseUrl() const override { return "https://api.paymentprocessortp.com"; }
    HttpBody    headers() const override {
        return {
            {"Content-Type",  "application/json"},
            {"Authorization", "Bearer sk_live_demo"},
            {"X-Merchant-Id", "merch_xyz"},
        };
    }
public:
    HttpBody charge(const std::string& userId, int amount) {
        return post("/v1/charge", {{"user_id", userId}, {"amount", std::to_string(amount)}});
    }
    HttpBody refund(const std::string& transactionId) {
        return post("/v1/refund", {{"transaction_id", transactionId}});
    }
    HttpBody getTransaction(const std::string& id) {
        return get("/v1/transactions/" + id);
    }
};


// SECTION:: Auth Facade
// ═════════════════════════════════════════════════════════════
//  AUTH FACADE
// ═════════════════════════════════════════════════════════════
//  Wraps AuthProviderTP. Callers never see the bearer format,
//  client ID header, or the token validation endpoint.

class AuthFacade : public ThirdPartyClient {
protected:
    std::string baseUrl() const override { return "https://api.authprovidertp.com"; }
    HttpBody    headers() const override {
        return {
            {"Content-Type",  "application/json"},
            {"Authorization", "Bearer auth_secret_demo"},
            {"X-Client-Id",   "client_abc"},
        };
    }
public:
    HttpBody validateToken(const std::string& token) {
        return post("/v1/validate", {{"token", token}});
    }
    HttpBody getUser(const std::string& userId) {
        return get("/v1/users/" + userId);
    }
};


// SECTION:: Messaging Facade
// ═════════════════════════════════════════════════════════════
//  MESSAGING FACADE
// ═════════════════════════════════════════════════════════════
//  Wraps MessagingTP. Callers never see the account SID,
//  auth token, or the dispatch endpoint structure.

class MessagingFacade : public ThirdPartyClient {
protected:
    std::string baseUrl() const override { return "https://api.messagingtp.com"; }
    HttpBody    headers() const override {
        return {
            {"Content-Type",  "application/json"},
            {"X-Account-SID", "SID_xyz"},
            {"X-Auth-Token",  "tok_xyz"},
        };
    }
public:
    HttpBody send(const std::string& to, const std::string& message) {
        return post("/v1/dispatch", {{"to", to}, {"body", message}});
    }
    HttpBody getStatus(const std::string& messageId) {
        return get("/v1/messages/" + messageId);
    }
};


// SECTION:: Consumer
// ═════════════════════════════════════════════════════════════
//  CONSUMER — PurchaseService
// ═════════════════════════════════════════════════════════════
//  Knows nothing about HTTP, auth headers, or base URLs.
//  Each facade call reads like a plain domain method.

class PurchaseService {
    AuthFacade      auth;
    PaymentFacade   payment;
    MessagingFacade messaging;
public:
    void makePurchase(const std::string& token, int amount, const std::string& phone) {
        std::cout << "  [Auth]      Validating token...\n";
        auto user = auth.validateToken(token);
        std::cout << "  ✓ User: " << user["email"] << "\n\n";

        std::cout << "  [Payment]   Charging $" << amount << "...\n";
        auto tx = payment.charge(user["user_id"], amount);
        std::cout << "  ✓ Charged — ref: " << tx["transaction_id"] << "\n\n";

        std::cout << "  [Messaging] Sending confirmation to " << phone << "...\n";
        auto msg = messaging.send(phone, "Payment confirmed. Ref: " + tx["transaction_id"]);
        std::cout << "  ✓ Message queued — id: " << msg["message_id"] << "\n";
    }
};


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════

#ifndef TESTING
int main() {
    const std::string sep(64, '=');

    std::cout << "╔══════════════════════════════════════════════════════════════╗\n";
    std::cout << "║           Facade — Third Party API Hub                      ║\n";
    std::cout << "╚══════════════════════════════════════════════════════════════╝\n";

    std::cout << "\n" << sep << "\n";
    std::cout << "  Scenario: PurchaseService.makePurchase()\n";
    std::cout << sep << "\n\n";

    PurchaseService service;
    service.makePurchase("tok_user_jane", 4999, "+15550142");

    std::cout << "\n" << sep << "\n";
    std::cout << "  Without the Facade\n";
    std::cout << sep << "\n\n";
    std::cout << "  PurchaseService would need to know:\n";
    std::cout << "    auth:      base URL, bearer format, client ID header name\n";
    std::cout << "    payment:   base URL, merchant ID header, charge endpoint path\n";
    std::cout << "    messaging: base URL, account SID + auth token, dispatch endpoint\n";
    std::cout << "    — plus JSON serialization and error handling per TP\n\n";
    std::cout << "  With the facade:\n";
    std::cout << "    auth.validateToken(token)\n";
    std::cout << "    payment.charge(userId, amount)\n";
    std::cout << "    messaging.send(phone, message)\n";

    std::cout << "\n╔══════════════════════════════════════════════════════════════╗\n";
    std::cout << "║  Done                                                        ║\n";
    std::cout << "╚══════════════════════════════════════════════════════════════╝\n";

    return 0;
}
#endif // TESTING
