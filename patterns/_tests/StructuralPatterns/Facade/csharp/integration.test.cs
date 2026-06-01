// ============================================================
//  Integration Tests — Facade: Third Party API Hub
//
//  What we test here:
//    · Full MakePurchase() produces correct end-to-end output
//    · Auth result feeds into Payment, Payment ref feeds into Messaging
//    · Each facade routes exclusively to its own TP base URL
//    · Credentials masked with ••• — no raw values in output
//    · Swapping a facade subclass leaves other facades untouched
//
//  Run: dotnet test  (requires xUnit project referencing the source)
// ============================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Xunit;

public class FacadeIntegrationTests
{
    static List<string> Capture(Action fn)
    {
        var sb  = new System.Text.StringBuilder();
        var old = Console.Out;
        Console.SetOut(new StringWriter(sb));
        try { fn(); } finally { Console.SetOut(old); }
        return sb.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries)
                            .Select(l => l.TrimEnd('\r')).ToList();
    }

    // ── Full purchase flow ────────────────────────────────────
    public class FullPurchaseFlowTests
    {
        private readonly List<string> _lines = Capture(() =>
            new PurchaseService().MakePurchase("tok_user_jane", 49.99, "+15550142"));

        [Fact]
        public void All_Three_Confirmations_Present()
        {
            string out = string.Join("\n", _lines);
            Assert.Contains("✓ User:",         out);
            Assert.Contains("✓ Charged",       out);
            Assert.Contains("✓ Message queued", out);
        }

        [Fact]
        public void Auth_Email_In_Output() =>
            Assert.Contains(_lines, l => l.Contains("jane.doe@example.com"));

        [Fact]
        public void Transaction_Id_In_Output() =>
            Assert.Contains(_lines, l => l.Contains("txn_8821"));

        [Fact]
        public void Message_Id_In_Output() =>
            Assert.Contains(_lines, l => l.Contains("msg_3301"));
    }

    // ── Loose coupling ────────────────────────────────────────
    public class LooseCouplingTests
    {
        [Fact]
        public void Each_Facade_Routes_To_Its_Own_BaseUrl()
        {
            var paymentLines = Capture(() => new PaymentFacade().Charge("usr_1", 100));
            var authLines    = Capture(() => new AuthFacade().ValidateToken("tok_1"));
            var msgLines     = Capture(() => new MessagingFacade().Send("+1", "hi"));

            Assert.Contains(paymentLines, l => l.Contains("paymentprocessortp.com"));
            Assert.Contains(authLines,    l => l.Contains("authprovidertp.com"));
            Assert.Contains(msgLines,     l => l.Contains("messagingtp.com"));
        }

        [Fact]
        public void No_Cross_Contamination_Between_URLs()
        {
            string paymentOut = string.Join("\n", Capture(() => new PaymentFacade().Charge("usr_1", 100)));
            string authOut    = string.Join("\n", Capture(() => new AuthFacade().ValidateToken("tok_1")));

            Assert.DoesNotContain("authprovidertp.com",    paymentOut);
            Assert.DoesNotContain("messagingtp.com",       paymentOut);
            Assert.DoesNotContain("paymentprocessortp.com", authOut);
        }

        [Fact]
        public void Headers_Masked_Raw_Credentials_Never_Appear()
        {
            string out = string.Join("\n", Capture(() =>
                new PurchaseService().MakePurchase("tok", 10, "+1")));
            Assert.DoesNotContain("sk_live_demo",     out);
            Assert.DoesNotContain("auth_secret_demo", out);
            Assert.DoesNotContain("SID_xyz",          out);
            Assert.Contains("•••", out);
        }
    }

    // ── Single point of change ───────────────────────────────
    public class SinglePointOfChangeTests
    {
        sealed class FreePaymentFacade : PaymentFacade
        {
            public override Dictionary<string, object> Charge(string userId, double amount) =>
                new() { ["transaction_id"] = "free_txn", ["status"] = "success" };
        }

        sealed class SilentMessagingFacade : MessagingFacade
        {
            public override Dictionary<string, object> Send(string to, string message) =>
                new() { ["message_id"] = "silent", ["status"] = "dropped" };
        }

        [Fact]
        public void Swapping_Payment_Does_Not_Affect_Auth()
        {
            var authResult = new AuthFacade().ValidateToken("tok_1");
            Assert.Equal("usr_4421", authResult["user_id"]);

            var tx = new FreePaymentFacade().Charge("usr_1", 0);
            Assert.Equal("free_txn", tx["transaction_id"]);
        }

        [Fact]
        public void Swapping_Messaging_Does_Not_Affect_Payment()
        {
            var tx = new PaymentFacade().Charge("usr_1", 50);
            Assert.Equal("txn_8821", tx["transaction_id"]);

            var msg = new SilentMessagingFacade().Send("+1", "test");
            Assert.Equal("dropped", msg["status"]);
        }
    }
}
