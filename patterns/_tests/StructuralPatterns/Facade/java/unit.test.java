// ============================================================
//  Unit Tests — Facade: Third Party API Hub
//
//  What we test here:
//    · Each facade method returns the correct mock response shape
//    · Each facade routes to its own base URL
//    · PurchaseService calls Auth → Payment → Messaging in order
//    · Consumer output never exposes raw credentials
//
//  Run: javac -cp .:junit-platform-console-standalone.jar unit.test.java && java ...
//  Or:  Use your IDE / Maven / Gradle test runner
// ============================================================

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.Nested;
import java.io.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

public class unit {

    // ── Output capture helper ─────────────────────────────────
    static List<String> capture(Runnable fn) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PrintStream old = System.out;
        System.setOut(new PrintStream(baos));
        try {
            fn.run();
        } finally {
            System.setOut(old);
        }
        return Arrays.asList(baos.toString().split("\\r?\\n"));
    }

    // ── PaymentFacade ─────────────────────────────────────────
    @Nested
    class PaymentFacadeTests {
        PaymentFacade facade = new PaymentFacade();

        @Test
        void charge_returns_transaction_id_and_success() {
            var result = facade.charge("usr_001", 99);
            assertEquals("txn_8821", result.get("transaction_id"));
            assertEquals("success",  result.get("status"));
        }

        @Test
        void refund_returns_refund_id_and_refunded() {
            var result = facade.refund("txn_8821");
            assertEquals("ref_1143",  result.get("refund_id"));
            assertEquals("refunded",  result.get("status"));
        }

        @Test
        void getTransaction_returns_settled_details() {
            var result = facade.getTransaction("txn_8821");
            assertTrue(result.containsKey("transaction_id"));
            assertEquals("settled", result.get("status"));
        }

        @Test
        void charge_routes_to_payment_base_url() {
            var lines = capture(() -> facade.charge("usr_001", 99));
            assertTrue(lines.stream().anyMatch(l -> l.contains("paymentprocessortp.com")));
            assertTrue(lines.stream().anyMatch(l -> l.contains("/v1/charge")));
        }
    }

    // ── AuthFacade ────────────────────────────────────────────
    @Nested
    class AuthFacadeTests {
        AuthFacade facade = new AuthFacade();

        @Test
        void validateToken_returns_user_id_and_email() {
            var result = facade.validateToken("tok_test");
            assertEquals("usr_4421",              result.get("user_id"));
            assertEquals("jane.doe@example.com",  result.get("email"));
        }

        @Test
        void getUser_returns_full_user_details() {
            var result = facade.getUser("usr_4421");
            assertTrue(result.containsKey("name"));
            assertTrue(result.containsKey("email"));
        }

        @Test
        void validateToken_routes_to_auth_base_url() {
            var lines = capture(() -> facade.validateToken("tok_test"));
            assertTrue(lines.stream().anyMatch(l -> l.contains("authprovidertp.com")));
            assertTrue(lines.stream().anyMatch(l -> l.contains("/v1/validate")));
        }
    }

    // ── MessagingFacade ───────────────────────────────────────
    @Nested
    class MessagingFacadeTests {
        MessagingFacade facade = new MessagingFacade();

        @Test
        void send_returns_message_id_and_queued() {
            var result = facade.send("+15550000", "Hello");
            assertEquals("msg_3301", result.get("message_id"));
            assertEquals("queued",   result.get("status"));
        }

        @Test
        void getStatus_returns_delivered() {
            var result = facade.getStatus("msg_3301");
            assertEquals("delivered", result.get("status"));
        }

        @Test
        void send_routes_to_messaging_base_url() {
            var lines = capture(() -> facade.send("+1", "hi"));
            assertTrue(lines.stream().anyMatch(l -> l.contains("messagingtp.com")));
            assertTrue(lines.stream().anyMatch(l -> l.contains("/v1/dispatch")));
        }
    }

    // ── PurchaseService ───────────────────────────────────────
    @Nested
    class PurchaseServiceTests {
        List<String> run() {
            return capture(() -> new PurchaseService().makePurchase("tok_test", 49.99, "+15550142"));
        }

        @Test
        void produces_all_three_section_labels() {
            var lines = run();
            assertTrue(lines.stream().anyMatch(l -> l.contains("[Auth]")));
            assertTrue(lines.stream().anyMatch(l -> l.contains("[Payment]")));
            assertTrue(lines.stream().anyMatch(l -> l.contains("[Messaging]")));
        }

        @Test
        void auth_called_before_payment() {
            var lines = run();
            int authIdx    = lines.indexOf(lines.stream().filter(l -> l.contains("[Auth]")).findFirst().orElse(""));
            int paymentIdx = lines.indexOf(lines.stream().filter(l -> l.contains("[Payment]")).findFirst().orElse(""));
            assertTrue(authIdx < paymentIdx);
        }

        @Test
        void payment_called_before_messaging() {
            var lines = run();
            int paymentIdx   = lines.indexOf(lines.stream().filter(l -> l.contains("[Payment]")).findFirst().orElse(""));
            int messagingIdx = lines.indexOf(lines.stream().filter(l -> l.contains("[Messaging]")).findFirst().orElse(""));
            assertTrue(paymentIdx < messagingIdx);
        }

        @Test
        void no_raw_credentials_in_output() {
            String out = String.join("\n", run());
            assertFalse(out.contains("sk_live_demo"));
            assertFalse(out.contains("auth_secret_demo"));
            assertFalse(out.contains("SID_xyz"));
        }
    }
}
