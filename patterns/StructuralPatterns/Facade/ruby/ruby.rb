# ============================================================
#  Facade — Third Party API Hub
#  Run: ruby ruby.rb
# ============================================================
#
#  Participants
#  ────────────────────────────────────────────────────────
#  Base         ThirdPartyClient (abstract-ish — HTTP plumbing once)
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


# SECTION:: Base Client
# ═════════════════════════════════════════════════════════════
#  BASE — ThirdPartyClient
# ═════════════════════════════════════════════════════════════
#  Handles the HTTP plumbing once. Subclasses only define
#  their config (base_url, headers) and their domain methods.

class ThirdPartyClient
  def base_url = raise NotImplementedError, "#{self.class}#base_url"
  def headers  = raise NotImplementedError, "#{self.class}#headers"

  def request(method, url, body = nil)
    puts "    → #{method} #{base_url}#{url}"
    puts "    → Headers: #{format_headers}"
    puts "    → Body:    #{format_body(body)}" if body
    mock_response(url)
  end

  def get(url)        = request("GET",  url)
  def post(url, body) = request("POST", url, body)

  private

  def format_headers
    headers.keys.map { |k| "#{k}: •••" }.join("  |  ")
  end

  def format_body(body)
    inner = body.map { |k, v| "#{k}: #{v}" }.join(", ")
    "{ #{inner} }"
  end

  def mock_response(url)
    return { user_id: "usr_4421", email: "jane.doe@example.com" }                      if url.include?("validate")
    return { transaction_id: "txn_8821", status: "success" }                            if url.include?("charge")
    return { refund_id: "ref_1143", status: "refunded" }                                if url.include?("refund")
    return { message_id: "msg_3301", status: "queued" }                                 if url.include?("dispatch")
    return { user_id: "usr_4421", name: "Jane Doe", email: "jane.doe@example.com" }    if url.include?("users")
    return { message_id: "msg_3301", status: "delivered" }                              if url.include?("messages")
    return { transaction_id: "txn_8821", amount: 4999, status: "settled" }              if url.include?("transactions")
    {}
  end
end


# SECTION:: Payment Facade
# ═════════════════════════════════════════════════════════════
#  PAYMENT FACADE
# ═════════════════════════════════════════════════════════════
#  Wraps PaymentProcessorTP. Callers never see the base URL,
#  the merchant ID header, or the raw endpoint paths.

class PaymentFacade < ThirdPartyClient
  def base_url = "https://api.paymentprocessortp.com"

  def headers
    {
      "Content-Type"  => "application/json",
      "Authorization" => "Bearer #{ENV.fetch('BILLING_API_KEY', 'sk_live_demo')}",
      "X-Merchant-Id" => ENV.fetch("BILLING_MERCHANT_ID", "merch_xyz"),
    }
  end

  def charge(user_id, amount)
    post("/v1/charge", { user_id: user_id, amount: amount })
  end

  def refund(transaction_id)
    post("/v1/refund", { transaction_id: transaction_id })
  end

  def get_transaction(id)
    get("/v1/transactions/#{id}")
  end
end


# SECTION:: Auth Facade
# ═════════════════════════════════════════════════════════════
#  AUTH FACADE
# ═════════════════════════════════════════════════════════════
#  Wraps AuthProviderTP. Callers never see the bearer format,
#  client ID header, or the token validation endpoint.

class AuthFacade < ThirdPartyClient
  def base_url = "https://api.authprovidertp.com"

  def headers
    {
      "Content-Type"  => "application/json",
      "Authorization" => "Bearer #{ENV.fetch('AUTH_SECRET', 'auth_secret_demo')}",
      "X-Client-Id"   => ENV.fetch("AUTH_CLIENT_ID", "client_abc"),
    }
  end

  def validate_token(token)
    post("/v1/validate", { token: token })
  end

  def get_user(user_id)
    get("/v1/users/#{user_id}")
  end
end


# SECTION:: Messaging Facade
# ═════════════════════════════════════════════════════════════
#  MESSAGING FACADE
# ═════════════════════════════════════════════════════════════
#  Wraps MessagingTP. Callers never see the account SID,
#  auth token, or the dispatch endpoint structure.

class MessagingFacade < ThirdPartyClient
  def base_url = "https://api.messagingtp.com"

  def headers
    {
      "Content-Type"  => "application/json",
      "X-Account-SID" => ENV.fetch("MSG_ACCOUNT_SID", "SID_xyz"),
      "X-Auth-Token"  => ENV.fetch("MSG_AUTH_TOKEN",  "tok_xyz"),
    }
  end

  def send(to, message)
    post("/v1/dispatch", { to: to, body: message })
  end

  def get_status(message_id)
    get("/v1/messages/#{message_id}")
  end
end


# SECTION:: Consumer
# ═════════════════════════════════════════════════════════════
#  CONSUMER — PurchaseService
# ═════════════════════════════════════════════════════════════
#  Knows nothing about HTTP, auth headers, or base URLs.
#  Each facade call reads like a plain domain method.

class PurchaseService
  def initialize
    @auth      = AuthFacade.new
    @payment   = PaymentFacade.new
    @messaging = MessagingFacade.new
  end

  def make_purchase(token, amount, phone)
    puts "  [Auth]      Validating token..."
    user = @auth.validate_token(token)
    puts "  ✓ User: #{user[:email]}\n\n"

    puts "  [Payment]   Charging $#{amount}..."
    tx = @payment.charge(user[:user_id], amount)
    puts "  ✓ Charged — ref: #{tx[:transaction_id]}\n\n"

    puts "  [Messaging] Sending confirmation to #{phone}..."
    msg = @messaging.send(phone, "Payment confirmed. Ref: #{tx[:transaction_id]}")
    puts "  ✓ Message queued — id: #{msg[:message_id]}"
  end
end


# SECTION:: Client
# ═════════════════════════════════════════════════════════════
#  CLIENT
# ═════════════════════════════════════════════════════════════

if __FILE__ == $PROGRAM_NAME

SEP = "═" * 64

puts "╔══════════════════════════════════════════════════════════════╗"
puts "║           Facade — Third Party API Hub                      ║"
puts "╚══════════════════════════════════════════════════════════════╝"

puts "\n#{SEP}"
puts "  Scenario: PurchaseService.make_purchase()"
puts "#{SEP}\n\n"

PurchaseService.new.make_purchase("tok_user_jane", 49.99, "+15550142")

puts "\n#{SEP}"
puts "  Without the Facade"
puts SEP
puts ""
puts '  PurchaseService would need to know:'
puts '    auth:      base URL, bearer format, client ID header name'
puts '    payment:   base URL, merchant ID header, charge endpoint path'
puts '    messaging: base URL, account SID + auth token, dispatch endpoint'
puts '    — plus JSON serialization and error handling per TP'
puts ""
puts "  With the facade:"
puts "    auth.validate_token(token)"
puts "    payment.charge(user_id, amount)"
puts "    messaging.send(phone, message)"

puts "\n╔══════════════════════════════════════════════════════════════╗"
puts "║  Done                                                        ║"
puts "╚══════════════════════════════════════════════════════════════╝"

end # __FILE__ == $PROGRAM_NAME
