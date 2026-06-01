# ============================================================
#  Integration Tests — Facade: Third Party API Hub
#
#  What we test here:
#    · Full make_purchase() produces correct end-to-end output
#    · Auth result feeds into Payment, Payment ref feeds into Messaging
#    · Each facade routes exclusively to its own TP base URL
#    · Credentials are masked with ••• — no raw values in output
#    · Swapping a facade subclass leaves other facades untouched
#
#  Run: pytest integration.test.py -v
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


# ── Full purchase flow ────────────────────────────────────────
class TestFullPurchaseFlow:
    def setup_method(self):
        self.lines = capture(
            lambda: PurchaseService().make_purchase('tok_user_jane', 49.99, '+15550142')
        )

    def test_all_three_confirmations_present(self):
        out = '\n'.join(self.lines)
        assert '✓ User:' in out
        assert '✓ Charged' in out
        assert '✓ Message queued' in out

    def test_auth_email_in_output(self):
        assert any('jane.doe@example.com' in l for l in self.lines)

    def test_transaction_id_in_output(self):
        assert any('txn_8821' in l for l in self.lines)

    def test_message_id_in_output(self):
        assert any('msg_3301' in l for l in self.lines)


# ── Loose coupling ────────────────────────────────────────────
class TestLooseCoupling:
    def test_each_facade_routes_to_its_own_base_url(self):
        payment_lines = capture(lambda: PaymentFacade().charge('usr_1', 100))
        auth_lines    = capture(lambda: AuthFacade().validate_token('tok_1'))
        msg_lines     = capture(lambda: MessagingFacade().send('+1', 'hi'))

        assert any('paymentprocessortp.com' in l for l in payment_lines)
        assert any('authprovidertp.com' in l for l in auth_lines)
        assert any('messagingtp.com' in l for l in msg_lines)

    def test_no_cross_contamination_between_urls(self):
        payment_out = '\n'.join(capture(lambda: PaymentFacade().charge('usr_1', 100)))
        auth_out    = '\n'.join(capture(lambda: AuthFacade().validate_token('tok_1')))

        assert 'authprovidertp.com' not in payment_out
        assert 'messagingtp.com' not in payment_out
        assert 'paymentprocessortp.com' not in auth_out

    def test_headers_masked_not_exposed(self):
        out = '\n'.join(capture(lambda: PurchaseService().make_purchase('tok', 10, '+1')))
        assert 'sk_live_demo' not in out
        assert 'auth_secret_demo' not in out
        assert 'SID_xyz' not in out
        assert '•••' in out  # headers ARE logged but masked


# ── Single point of change ───────────────────────────────────
class TestSinglePointOfChange:
    def test_swapping_payment_facade_does_not_affect_auth(self):
        class FreePayment(PaymentFacade):
            def charge(self, user_id, amount):
                return {'transaction_id': 'free_txn', 'status': 'success'}

        auth_result = AuthFacade().validate_token('tok_1')
        assert auth_result['user_id'] == 'usr_4421'

        tx = FreePayment().charge('usr_1', 0)
        assert tx['transaction_id'] == 'free_txn'

    def test_swapping_messaging_does_not_affect_payment(self):
        class SilentMessaging(MessagingFacade):
            def send(self, to, message):
                return {'message_id': 'silent', 'status': 'dropped'}

        tx = PaymentFacade().charge('usr_1', 50)
        assert tx['transaction_id'] == 'txn_8821'

        msg = SilentMessaging().send('+1', 'test')
        assert msg['status'] == 'dropped'
