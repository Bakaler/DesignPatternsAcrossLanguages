// ============================================================
//  Integration Tests — Facade: Third Party API Hub
//
//  What we test here:
//    · Full makePurchase() produces correct end-to-end output
//    · Auth result feeds into Payment, Payment ref feeds into Messaging
//    · Each facade routes exclusively to its own TP base URL
//    · Credentials masked with ••• — no raw values in output
//    · Swapping a facade subclass leaves other facades untouched
//
//  Run: javac -cp .:junit-platform-console-standalone.jar integration.test.java && java ...
// ============================================================

import org.junit.jupiter.api.*;
import java.io.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

public class integration {

    static List<String> capture(Runnable fn) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PrintStream old = System.out;
        System.setOut(new PrintStream(baos));
        try { fn.run(); } finally { System.setOut(old); }
        return Arrays.asList(baos.toString().split("\\r?\\n"));
    }

    // ── Full purchase flow ────────────────────────────────────
    @Nested
    class FullPurchaseFlow {
        List<String> lines;

        @BeforeEach
        void setup() {
            lines = capture(() -> new PurchaseService().makePurchase("tok_user_jane", 49.99, "+15550142"));
        }

        @Test
        void all_three_confirmations_present() {
            String out = String.join("\n", lines);
            assertTrue(out.contains("✓ User:"));
            assertTrue(out.contains("✓ Charged"));
            assertTrue(out.contains("✓ Message queued"));
        }

        @Test
        void auth_email_in_output() {
            assertTrue(lines.stream().anyMatch(l -> l.contains("jane.doe@example.com")));
        }

        @Test
        void transaction_id_in_output() {
            assertTrue(lines.stream().anyMatch(l -> l.contains("txn_8821")));
        }

        @Test
        void message_id_in_output() {
            assertTrue(lines.stream().anyMatch(l -> l.contains("msg_3301")));
        }
    }

    // ── Loose coupling ────────────────────────────────────────
    @Nested
    class LooseCoupling {
        @Test
        void each_facade_routes_to_its_own_base_url() {
            var paymentLines = capture(() -> new PaymentFacade().charge("usr_1", 100));
            var authLines    = capture(() -> new AuthFacade().validateToken("tok_1"));
            var msgLines     = capture(() -> new MessagingFacade().send("+1", "hi"));

            assertTrue(paymentLines.stream().anyMatch(l -> l.contains("paymentprocessortp.com")));
            assertTrue(authLines.stream().anyMatch(l -> l.contains("authprovidertp.com")));
            assertTrue(msgLines.stream().anyMatch(l -> l.contains("messagingtp.com")));
        }

        @Test
        void no_cross_contamination_between_urls() {
            String paymentOut = String.join("\n", capture(() -> new PaymentFacade().charge("usr_1", 100)));
            String authOut    = String.join("\n", capture(() -> new AuthFacade().validateToken("tok_1")));

            assertFalse(paymentOut.contains("authprovidertp.com"));
            assertFalse(paymentOut.contains("messagingtp.com"));
            assertFalse(authOut.contains("paymentprocessortp.com"));
        }

        @Test
        void headers_masked_raw_credentials_never_appear() {
            String out = String.join("\n", capture(() ->
                new PurchaseService().makePurchase("tok", 10, "+1")));
            assertFalse(out.contains("sk_live_demo"));
            assertFalse(out.contains("auth_secret_demo"));
            assertFalse(out.contains("SID_xyz"));
            assertTrue(out.contains("•••"));
        }
    }

    // ── Single point of change ───────────────────────────────
    @Nested
    class SinglePointOfChange {
        @Test
        void swapping_payment_facade_does_not_affect_auth() {
            // Custom payment facade returns fixed response
            PaymentFacade freePayment = new PaymentFacade() {
                @Override
                public Map<String, Object> charge(String userId, double amount) {
                    return map("transaction_id", "free_txn", "status", "success");
                }
            };

            var authResult = new AuthFacade().validateToken("tok_1");
            assertEquals("usr_4421", authResult.get("user_id"));

            var tx = freePayment.charge("usr_1", 0);
            assertEquals("free_txn", tx.get("transaction_id"));
        }

        @Test
        void swapping_messaging_does_not_affect_payment() {
            MessagingFacade silentMsg = new MessagingFacade() {
                @Override
                public Map<String, Object> send(String to, String message) {
                    return map("message_id", "silent", "status", "dropped");
                }
            };

            var tx = new PaymentFacade().charge("usr_1", 50);
            assertEquals("txn_8821", tx.get("transaction_id"));

            var msg = silentMsg.send("+1", "test");
            assertEquals("dropped", msg.get("status"));
        }
    }
}
