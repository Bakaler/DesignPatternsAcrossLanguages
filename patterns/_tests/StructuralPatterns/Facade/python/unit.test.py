# ============================================================
#  Unit Tests — Facade: Third Party API Hub
#
#  What we test here:
#    · Each facade method returns the correct mock response shape
#    · Each facade routes to its own base URL
#    · PurchaseService calls Auth → Payment → Messaging in order
#    · Consumer output never exposes raw credentials
#
#  Run: pytest unit.test.py -v
# ============================================================

import sys, os, io
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../StructuralPatterns/Facade/python'))
from python import PaymentFacade, AuthFacade, MessagingFacade, PurchaseService


def capture(fn):
    buf = io.StringIO()
    sys.stdout = buf
    try:
        fn()
    finally:
        sys.stdout = sys.__stdout__
    return buf.getvalue().splitlines()


# ── PaymentFacade ─────────────────────────────────────────────
class TestPaymentFacade:
    def setup_method(self):
        self.facade = PaymentFacade()

    def test_charge_returns_transaction_id(self):
        result = self.facade.charge('usr_001', 99)
        assert result['transaction_id'] == 'txn_8821'
        assert result['status'] == 'success'

    def test_refund_returns_refund_id(self):
        result = self.facade.refund('txn_8821')
        assert result['refund_id'] == 'ref_1143'
        assert result['status'] == 'refunded'

    def test_get_transaction_returns_settled(self):
        result = self.facade.get_transaction('txn_8821')
        assert 'transaction_id' in result
        assert result['status'] == 'settled'

    def test_charge_routes_to_payment_base_url(self):
        lines = capture(lambda: self.facade.charge('usr_001', 99))
        assert any('paymentprocessortp.com' in l for l in lines)
        assert any('/v1/charge' in l for l in lines)

    def test_refund_routes_to_refund_endpoint(self):
        lines = capture(lambda: self.facade.refund('txn_8821'))
        assert any('/v1/refund' in l for l in lines)


# ── AuthFacade ────────────────────────────────────────────────
class TestAuthFacade:
    def setup_method(self):
        self.facade = AuthFacade()

    def test_validate_token_returns_user_id_and_email(self):
        result = self.facade.validate_token('tok_test')
        assert result['user_id'] == 'usr_4421'
        assert result['email'] == 'jane.doe@example.com'

    def test_get_user_returns_full_user(self):
        result = self.facade.get_user('usr_4421')
        assert result['user_id'] == 'usr_4421'
        assert 'name' in result
        assert 'email' in result

    def test_validate_token_routes_to_auth_base_url(self):
        lines = capture(lambda: self.facade.validate_token('tok_test'))
        assert any('authprovidertp.com' in l for l in lines)
        assert any('/v1/validate' in l for l in lines)


# ── MessagingFacade ───────────────────────────────────────────
class TestMessagingFacade:
    def setup_method(self):
        self.facade = MessagingFacade()

    def test_send_returns_message_id_and_queued(self):
        result = self.facade.send('+15550000', 'Hello')
        assert result['message_id'] == 'msg_3301'
        assert result['status'] == 'queued'

    def test_get_status_returns_delivered(self):
        result = self.facade.get_status('msg_3301')
        assert result['status'] == 'delivered'

    def test_send_routes_to_messaging_base_url(self):
        lines = capture(lambda: self.facade.send('+1', 'hi'))
        assert any('messagingtp.com' in l for l in lines)
        assert any('/v1/dispatch' in l for l in lines)


# ── PurchaseService ───────────────────────────────────────────
class TestPurchaseService:
    def _run(self):
        return capture(lambda: PurchaseService().make_purchase('tok_test', 49.99, '+15550142'))

    def test_produces_all_three_section_labels(self):
        lines = self._run()
        assert any('[Auth]' in l for l in lines)
        assert any('[Payment]' in l for l in lines)
        assert any('[Messaging]' in l for l in lines)

    def test_auth_before_payment(self):
        lines = self._run()
        auth_idx    = next(i for i, l in enumerate(lines) if '[Auth]' in l)
        payment_idx = next(i for i, l in enumerate(lines) if '[Payment]' in l)
        assert auth_idx < payment_idx

    def test_payment_before_messaging(self):
        lines = self._run()
        payment_idx   = next(i for i, l in enumerate(lines) if '[Payment]' in l)
        messaging_idx = next(i for i, l in enumerate(lines) if '[Messaging]' in l)
        assert payment_idx < messaging_idx

    def test_no_raw_credentials_in_output(self):
        out = '\n'.join(self._run())
        assert 'sk_live_demo' not in out
        assert 'auth_secret_demo' not in out
        assert 'SID_xyz' not in out
