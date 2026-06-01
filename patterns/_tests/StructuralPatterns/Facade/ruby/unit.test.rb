# ============================================================
#  Unit Tests — Facade: Third Party API Hub
#
#  What we test here:
#    · Each facade method returns the correct mock response shape
#    · Each facade routes to its own base URL
#    · PurchaseService calls Auth → Payment → Messaging in order
#    · Consumer output never exposes raw credentials
#
#  Run: rspec unit.test.rb
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

# ── PaymentFacade ─────────────────────────────────────────────
RSpec.describe PaymentFacade do
  subject(:facade) { described_class.new }

  describe '#charge' do
    it 'returns transaction_id and success status' do
      result = facade.charge('usr_001', 99)
      expect(result[:transaction_id]).to eq('txn_8821')
      expect(result[:status]).to eq('success')
    end

    it 'routes to paymentprocessortp.com base URL' do
      lines = capture_output { facade.charge('usr_001', 99) }
      expect(lines).to include(a_string_including('paymentprocessortp.com'))
      expect(lines).to include(a_string_including('/v1/charge'))
    end
  end

  describe '#refund' do
    it 'returns refund_id and refunded status' do
      result = facade.refund('txn_8821')
      expect(result[:refund_id]).to eq('ref_1143')
      expect(result[:status]).to eq('refunded')
    end
  end

  describe '#get_transaction' do
    it 'returns settled transaction details' do
      result = facade.get_transaction('txn_8821')
      expect(result[:transaction_id]).to eq('txn_8821')
      expect(result[:status]).to eq('settled')
    end
  end
end

# ── AuthFacade ────────────────────────────────────────────────
RSpec.describe AuthFacade do
  subject(:facade) { described_class.new }

  describe '#validate_token' do
    it 'returns user_id and email' do
      result = facade.validate_token('tok_test')
      expect(result[:user_id]).to eq('usr_4421')
      expect(result[:email]).to eq('jane.doe@example.com')
    end

    it 'routes to authprovidertp.com base URL' do
      lines = capture_output { facade.validate_token('tok_test') }
      expect(lines).to include(a_string_including('authprovidertp.com'))
      expect(lines).to include(a_string_including('/v1/validate'))
    end
  end

  describe '#get_user' do
    it 'returns user_id, name, and email' do
      result = facade.get_user('usr_4421')
      expect(result[:user_id]).to eq('usr_4421')
      expect(result).to have_key(:name)
      expect(result).to have_key(:email)
    end
  end
end

# ── MessagingFacade ───────────────────────────────────────────
RSpec.describe MessagingFacade do
  subject(:facade) { described_class.new }

  describe '#send' do
    it 'returns message_id and queued status' do
      result = facade.send('+15550000', 'Hello')
      expect(result[:message_id]).to eq('msg_3301')
      expect(result[:status]).to eq('queued')
    end

    it 'routes to messagingtp.com /v1/dispatch' do
      lines = capture_output { facade.send('+1', 'hi') }
      expect(lines).to include(a_string_including('messagingtp.com'))
      expect(lines).to include(a_string_including('/v1/dispatch'))
    end
  end

  describe '#get_status' do
    it 'returns delivered status' do
      result = facade.get_status('msg_3301')
      expect(result[:status]).to eq('delivered')
    end
  end
end

# ── PurchaseService ───────────────────────────────────────────
RSpec.describe PurchaseService do
  def run_purchase
    capture_output { subject.make_purchase('tok_test', 49.99, '+15550142') }
  end

  it 'produces [Auth], [Payment], [Messaging] labels' do
    lines = run_purchase
    expect(lines).to include(a_string_including('[Auth]'))
    expect(lines).to include(a_string_including('[Payment]'))
    expect(lines).to include(a_string_including('[Messaging]'))
  end

  it 'calls Auth before Payment' do
    lines = run_purchase
    auth_idx    = lines.index { |l| l.include?('[Auth]') }
    payment_idx = lines.index { |l| l.include?('[Payment]') }
    expect(auth_idx).to be < payment_idx
  end

  it 'calls Payment before Messaging' do
    lines = run_purchase
    payment_idx   = lines.index { |l| l.include?('[Payment]') }
    messaging_idx = lines.index { |l| l.include?('[Messaging]') }
    expect(payment_idx).to be < messaging_idx
  end

  it 'never exposes raw credentials in output' do
    out = run_purchase.join("\n")
    expect(out).not_to include('sk_live_demo')
    expect(out).not_to include('auth_secret_demo')
    expect(out).not_to include('SID_xyz')
  end
end
