# ============================================================
#  Integration Tests — Facade: Third Party API Hub
#
#  What we test here:
#    · Full make_purchase() flow produces correct end-to-end output
#    · Auth result feeds into Payment, Payment ref feeds into Messaging
#    · Each facade routes exclusively to its own TP base URL
#    · Credentials masked with ••• — no raw values in output
#    · Swapping a facade subclass leaves other facades untouched
#
#  Run: rspec integration.test.rb
# ============================================================

require 'rspec'
require 'stringio'
require_relative '../../../../StructuralPatterns/Facade/ruby/ruby'

def capture_output(&block)
  old = $stdout
  $stdout = StringIO.new
  block.call
  $stdout.string.lines.map(&:chomp)
ensure
  $stdout = old
end

# ── Full purchase flow ────────────────────────────────────────
RSpec.describe 'PurchaseService — full make_purchase() flow' do
  let(:lines) do
    capture_output { PurchaseService.new.make_purchase('tok_user_jane', 49.99, '+15550142') }
  end

  it 'all three confirmation lines appear' do
    out = lines.join("\n")
    expect(out).to include('✓ User:')
    expect(out).to include('✓ Charged')
    expect(out).to include('✓ Message queued')
  end

  it 'auth email propagates into output' do
    expect(lines).to include(a_string_including('jane.doe@example.com'))
  end

  it 'transaction id propagates into output' do
    expect(lines).to include(a_string_including('txn_8821'))
  end

  it 'message id propagates into output' do
    expect(lines).to include(a_string_including('msg_3301'))
  end
end

# ── Loose coupling ────────────────────────────────────────────
RSpec.describe 'Facade — loose coupling' do
  it 'each facade routes exclusively to its own base URL' do
    payment_lines = capture_output { PaymentFacade.new.charge('usr_1', 100) }
    auth_lines    = capture_output { AuthFacade.new.validate_token('tok_1') }
    msg_lines     = capture_output { MessagingFacade.new.send('+1', 'hi') }

    expect(payment_lines).to include(a_string_including('paymentprocessortp.com'))
    expect(auth_lines).to    include(a_string_including('authprovidertp.com'))
    expect(msg_lines).to     include(a_string_including('messagingtp.com'))
  end

  it 'no cross-contamination between facade URLs' do
    payment_out = capture_output { PaymentFacade.new.charge('usr_1', 100) }.join("\n")
    auth_out    = capture_output { AuthFacade.new.validate_token('tok_1') }.join("\n")

    expect(payment_out).not_to include('authprovidertp.com')
    expect(payment_out).not_to include('messagingtp.com')
    expect(auth_out).not_to    include('paymentprocessortp.com')
  end

  it 'headers are masked — raw credentials never appear' do
    out = capture_output { PurchaseService.new.make_purchase('tok', 10, '+1') }.join("\n")
    expect(out).not_to include('sk_live_demo')
    expect(out).not_to include('auth_secret_demo')
    expect(out).not_to include('SID_xyz')
    expect(out).to include('•••')
  end
end

# ── Single point of change ───────────────────────────────────
RSpec.describe 'Facade — single point of change' do
  it 'swapping PaymentFacade subclass does not affect AuthFacade' do
    free_payment = Class.new(PaymentFacade) do
      def charge(user_id, amount)
        { transaction_id: 'free_txn', status: 'success' }
      end
    end

    auth_result = AuthFacade.new.validate_token('tok_1')
    expect(auth_result[:user_id]).to eq('usr_4421')

    tx = free_payment.new.charge('usr_1', 0)
    expect(tx[:transaction_id]).to eq('free_txn')
  end

  it 'swapping MessagingFacade does not affect PaymentFacade' do
    silent_msg = Class.new(MessagingFacade) do
      def send(to, message)
        { message_id: 'silent', status: 'dropped' }
      end
    end

    tx = PaymentFacade.new.charge('usr_1', 50)
    expect(tx[:transaction_id]).to eq('txn_8821')

    msg = silent_msg.new.send('+1', 'test')
    expect(msg[:status]).to eq('dropped')
  end
end
