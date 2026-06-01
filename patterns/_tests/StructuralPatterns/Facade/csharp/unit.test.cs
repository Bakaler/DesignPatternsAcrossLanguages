// ============================================================
//  Unit Tests — Facade: Third Party API Hub
//
//  What we test here:
//    · Each facade method returns the correct mock response shape
//    · Each facade routes to its own base URL
//    · PurchaseService calls Auth → Payment → Messaging in order
//    · Consumer output never exposes raw credentials
//
//  Run: dotnet test  (requires xUnit project referencing the source)
// ============================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Xunit;

public class FacadeUnitTests
{
    // ── Output capture helper ─────────────────────────────────
    static List<string> Capture(Action fn)
    {
        var sb  = new System.Text.StringBuilder();
        var old = Console.Out;
        Console.SetOut(new StringWriter(sb));
        try { fn(); } finally { Console.SetOut(old); }
        return sb.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries)
                            .Select(l => l.TrimEnd('\r')).ToList();
    }

    // ── PaymentFacade ─────────────────────────────────────────
    public class PaymentFacadeTests
    {
        private readonly PaymentFacade _facade = new();

        [Fact]
        public void Charge_Returns_TransactionId_And_Success()
        {
            var result = _facade.Charge("usr_001", 99);
            Assert.Equal("txn_8821", result["transaction_id"]);
            Assert.Equal("success",  result["status"]);
        }

        [Fact]
        public void Refund_Returns_RefundId_And_Refunded()
        {
            var result = _facade.Refund("txn_8821");
            Assert.Equal("ref_1143",  result["refund_id"]);
            Assert.Equal("refunded",  result["status"]);
        }

        [Fact]
        public void GetTransaction_Returns_Settled_Details()
        {
            var result = _facade.GetTransaction("txn_8821");
            Assert.True(result.ContainsKey("transaction_id"));
            Assert.Equal("settled", result["status"]);
        }

        [Fact]
        public void Charge_Routes_To_Payment_BaseUrl()
        {
            var lines = Capture(() => _facade.Charge("usr_001", 99));
            Assert.Contains(lines, l => l.Contains("paymentprocessortp.com"));
            Assert.Contains(lines, l => l.Contains("/v1/charge"));
        }
    }

    // ── AuthFacade ────────────────────────────────────────────
    public class AuthFacadeTests
    {
        private readonly AuthFacade _facade = new();

        [Fact]
        public void ValidateToken_Returns_UserId_And_Email()
        {
            var result = _facade.ValidateToken("tok_test");
            Assert.Equal("usr_4421",             result["user_id"]);
            Assert.Equal("jane.doe@example.com", result["email"]);
        }

        [Fact]
        public void GetUser_Returns_Full_User_Details()
        {
            var result = _facade.GetUser("usr_4421");
            Assert.True(result.ContainsKey("name"));
            Assert.True(result.ContainsKey("email"));
        }

        [Fact]
        public void ValidateToken_Routes_To_Auth_BaseUrl()
        {
            var lines = Capture(() => _facade.ValidateToken("tok_test"));
            Assert.Contains(lines, l => l.Contains("authprovidertp.com"));
            Assert.Contains(lines, l => l.Contains("/v1/validate"));
        }
    }

    // ── MessagingFacade ───────────────────────────────────────
    public class MessagingFacadeTests
    {
        private readonly MessagingFacade _facade = new();

        [Fact]
        public void Send_Returns_MessageId_And_Queued()
        {
            var result = _facade.Send("+15550000", "Hello");
            Assert.Equal("msg_3301", result["message_id"]);
            Assert.Equal("queued",   result["status"]);
        }

        [Fact]
        public void GetStatus_Returns_Delivered()
        {
            var result = _facade.GetStatus("msg_3301");
            Assert.Equal("delivered", result["status"]);
        }

        [Fact]
        public void Send_Routes_To_Messaging_BaseUrl()
        {
            var lines = Capture(() => _facade.Send("+1", "hi"));
            Assert.Contains(lines, l => l.Contains("messagingtp.com"));
            Assert.Contains(lines, l => l.Contains("/v1/dispatch"));
        }
    }

    // ── PurchaseService ───────────────────────────────────────
    public class PurchaseServiceTests
    {
        List<string> Run() =>
            Capture(() => new PurchaseService().MakePurchase("tok_test", 49.99, "+15550142"));

        [Fact]
        public void Produces_All_Three_Section_Labels()
        {
            var lines = Run();
            Assert.Contains(lines, l => l.Contains("[Auth]"));
            Assert.Contains(lines, l => l.Contains("[Payment]"));
            Assert.Contains(lines, l => l.Contains("[Messaging]"));
        }

        [Fact]
        public void Auth_Called_Before_Payment()
        {
            var lines = Run();
            int authIdx    = lines.FindIndex(l => l.Contains("[Auth]"));
            int paymentIdx = lines.FindIndex(l => l.Contains("[Payment]"));
            Assert.True(authIdx < paymentIdx);
        }

        [Fact]
        public void Payment_Called_Before_Messaging()
        {
            var lines = Run();
            int paymentIdx   = lines.FindIndex(l => l.Contains("[Payment]"));
            int messagingIdx = lines.FindIndex(l => l.Contains("[Messaging]"));
            Assert.True(paymentIdx < messagingIdx);
        }

        [Fact]
        public void No_Raw_Credentials_In_Output()
        {
            string out = string.Join("\n", Run());
            Assert.DoesNotContain("sk_live_demo",    out);
            Assert.DoesNotContain("auth_secret_demo", out);
            Assert.DoesNotContain("SID_xyz",          out);
        }
    }
}
