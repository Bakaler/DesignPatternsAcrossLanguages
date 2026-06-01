# ============================================================
#  Facade — Third Party API Hub
#  Run: python python.py
# ============================================================
#
#  Participants
#  ────────────────────────────────────────────────────────
#  Base         ThirdPartyClient (abstract — HTTP plumbing once)
#  Facade       PaymentFacade, AuthFacade, MessagingFacade
#  Consumer     PurchaseService
#  Client       Entry point
#
#  Consequences demonstrated
#  ────────────────────────────────────────────────────────
#  ✓ Simplified interface   — consumers call clean methods, never raw HTTP
#  ✓ Loose coupling         — TP auth, headers, base URLs never leak to callers
#  ✓ Single point of change — swap a TP? update one class, nothing else breaks
#  ✗ God-object risk        — facade grows unwieldy if every endpoint lands here
# ============================================================

from __future__ import annotations
from abc import ABC, abstractmethod
import os


# SECTION:: Base Client
# ═════════════════════════════════════════════════════════════
#  BASE — ThirdPartyClient
# ═════════════════════════════════════════════════════════════
#  Handles the HTTP plumbing once. Subclasses only define
#  their config (base_url, headers) and their domain methods.

class ThirdPartyClient(ABC):

    @property
    @abstractmethod
    def base_url(self) -> str: ...

    @property
    @abstractmethod
    def headers(self) -> dict[str, str]: ...

    def _request(self, method: str, url: str, body: dict | None = None) -> dict:
        print(f"    → {method} {self.base_url}{url}")
        print(f"    → Headers: {self._format_headers()}")
        if body:
            print(f"    → Body:    {self._format_body(body)}")
        return self._mock_response(url)

    def _get(self, url: str) -> dict:
        return self._request("GET", url)

    def _post(self, url: str, body: dict) -> dict:
        return self._request("POST", url, body)

    def _format_headers(self) -> str:
        return "  |  ".join(f"{k}: •••" for k in self.headers)

    def _format_body(self, body: dict) -> str:
        inner = ", ".join(f"{k}: {v}" for k, v in body.items())
        return "{ " + inner + " }"

    def _mock_response(self, url: str) -> dict:
        if "validate"     in url: return {"user_id": "usr_4421", "email": "jane.doe@example.com"}
        if "charge"       in url: return {"transaction_id": "txn_8821", "status": "success"}
        if "refund"       in url: return {"refund_id": "ref_1143", "status": "refunded"}
        if "dispatch"     in url: return {"message_id": "msg_3301", "status": "queued"}
        if "users"        in url: return {"user_id": "usr_4421", "name": "Jane Doe", "email": "jane.doe@example.com"}
        if "messages"     in url: return {"message_id": "msg_3301", "status": "delivered"}
        if "transactions" in url: return {"transaction_id": "txn_8821", "amount": 4999, "status": "settled"}
        return {}


# SECTION:: Payment Facade
# ═════════════════════════════════════════════════════════════
#  PAYMENT FACADE
# ═════════════════════════════════════════════════════════════
#  Wraps PaymentProcessorTP. Callers never see the base URL,
#  the merchant ID header, or the raw endpoint paths.

class PaymentFacade(ThirdPartyClient):

    @property
    def base_url(self) -> str:
        return "https://api.paymentprocessortp.com"

    @property
    def headers(self) -> dict[str, str]:
        return {
            "Content-Type":  "application/json",
            "Authorization": f"Bearer {os.getenv('BILLING_API_KEY', 'sk_live_demo')}",
            "X-Merchant-Id":          os.getenv("BILLING_MERCHANT_ID", "merch_xyz"),
        }

    def charge(self, user_id: str, amount: float) -> dict:
        return self._post("/v1/charge", {"user_id": user_id, "amount": amount})

    def refund(self, transaction_id: str) -> dict:
        return self._post("/v1/refund", {"transaction_id": transaction_id})

    def get_transaction(self, id: str) -> dict:
        return self._get(f"/v1/transactions/{id}")


# SECTION:: Auth Facade
# ═════════════════════════════════════════════════════════════
#  AUTH FACADE
# ═════════════════════════════════════════════════════════════
#  Wraps AuthProviderTP. Callers never see the bearer format,
#  client ID header, or the token validation endpoint.

class AuthFacade(ThirdPartyClient):

    @property
    def base_url(self) -> str:
        return "https://api.authprovidertp.com"

    @property
    def headers(self) -> dict[str, str]:
        return {
            "Content-Type":  "application/json",
            "Authorization": f"Bearer {os.getenv('AUTH_SECRET', 'auth_secret_demo')}",
            "X-Client-Id":            os.getenv("AUTH_CLIENT_ID", "client_abc"),
        }

    def validate_token(self, token: str) -> dict:
        return self._post("/v1/validate", {"token": token})

    def get_user(self, user_id: str) -> dict:
        return self._get(f"/v1/users/{user_id}")


# SECTION:: Messaging Facade
# ═════════════════════════════════════════════════════════════
#  MESSAGING FACADE
# ═════════════════════════════════════════════════════════════
#  Wraps MessagingTP. Callers never see the account SID,
#  auth token, or the dispatch endpoint structure.

class MessagingFacade(ThirdPartyClient):

    @property
    def base_url(self) -> str:
        return "https://api.messagingtp.com"

    @property
    def headers(self) -> dict[str, str]:
        return {
            "Content-Type":  "application/json",
            "X-Account-SID": os.getenv("MSG_ACCOUNT_SID", "SID_xyz"),
            "X-Auth-Token":  os.getenv("MSG_AUTH_TOKEN",  "tok_xyz"),
        }

    def send(self, to: str, message: str) -> dict:
        return self._post("/v1/dispatch", {"to": to, "body": message})

    def get_status(self, message_id: str) -> dict:
        return self._get(f"/v1/messages/{message_id}")


# SECTION:: Consumer
# ═════════════════════════════════════════════════════════════
#  CONSUMER — PurchaseService
# ═════════════════════════════════════════════════════════════
#  Knows nothing about HTTP, auth headers, or base URLs.
#  Each facade call reads like a plain domain method.

class PurchaseService:

    def __init__(self) -> None:
        self._auth      = AuthFacade()
        self._payment   = PaymentFacade()
        self._messaging = MessagingFacade()

    def make_purchase(self, token: str, amount: float, phone: str) -> None:
        print("  [Auth]      Validating token...")
        user = self._auth.validate_token(token)
        print(f"  ✓ User: {user['email']}\n")

        print(f"  [Payment]   Charging ${amount}...")
        tx = self._payment.charge(user["user_id"], amount)
        print(f"  ✓ Charged — ref: {tx['transaction_id']}\n")

        print(f"  [Messaging] Sending confirmation to {phone}...")
        msg = self._messaging.send(phone, f"Payment confirmed. Ref: {tx['transaction_id']}")
        print(f"  ✓ Message queued — id: {msg['message_id']}")


# SECTION:: Client
# ═════════════════════════════════════════════════════════════
#  CLIENT
# ═════════════════════════════════════════════════════════════

if __name__ == "__main__":
    SEP = "═" * 64

    print("╔══════════════════════════════════════════════════════════════╗")
    print("║           Facade — Third Party API Hub                      ║")
    print("╚══════════════════════════════════════════════════════════════╝")

    print(f"\n{SEP}")
    print("  Scenario: PurchaseService.make_purchase()")
    print(f"{SEP}\n")

    PurchaseService().make_purchase("tok_user_jane", 49.99, "+15550142")

    print(f"\n{SEP}")
    print("  Without the Facade")
    print(SEP)
    print("")
    print('  PurchaseService would need to know:')
    print('    auth:      base URL, bearer format, client ID header name')
    print('    payment:   base URL, merchant ID header, charge endpoint path')
    print('    messaging: base URL, account SID + auth token, dispatch endpoint')
    print('    — plus JSON serialization and error handling per TP')
    print("")
    print("  With the facade:")
    print("    auth.validate_token(token)")
    print("    payment.charge(user_id, amount)")
    print("    messaging.send(phone, message)")

    print("\n╔══════════════════════════════════════════════════════════════╗")
    print("║  Done                                                        ║")
    print("╚══════════════════════════════════════════════════════════════╝")
