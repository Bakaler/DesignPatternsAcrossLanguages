// ============================================================
//  Unit Tests — Facade: Third Party API Hub
//
//  What we test here:
//    · Each facade method returns the correct mock response shape
//    · Each facade routes to its own base URL
//    · PurchaseService calls Auth → Payment → Messaging in order
//    · Consumer output never exposes raw credentials
//
//  Compile:
//    g++ -std=c++17 -DTESTING -I/usr/local/include \
//        unit.test.cpp -lgtest -lgtest_main -pthread -o unit_tests
//    ./unit_tests
// ============================================================

#define TESTING
#include "../../../../StructuralPatterns/Facade/cpp/cpp.cpp"

#include <gtest/gtest.h>
#include <sstream>
#include <string>

// ── Output capture helper ─────────────────────────────────────
static std::string capture(std::function<void()> fn) {
    std::ostringstream oss;
    auto* old = std::cout.rdbuf(oss.rdbuf());
    fn();
    std::cout.rdbuf(old);
    return oss.str();
}

static bool contains(const std::string& haystack, const std::string& needle) {
    return haystack.find(needle) != std::string::npos;
}

// ── PaymentFacade ─────────────────────────────────────────────
class PaymentFacadeTest : public ::testing::Test {
protected:
    PaymentFacade facade;
};

TEST_F(PaymentFacadeTest, Charge_Returns_TransactionId_And_Success) {
    auto result = facade.charge("usr_001", 99);
    EXPECT_EQ(result["transaction_id"], "txn_8821");
    EXPECT_EQ(result["status"],         "success");
}

TEST_F(PaymentFacadeTest, Refund_Returns_RefundId_And_Refunded) {
    auto result = facade.refund("txn_8821");
    EXPECT_EQ(result["refund_id"], "ref_1143");
    EXPECT_EQ(result["status"],    "refunded");
}

TEST_F(PaymentFacadeTest, GetTransaction_Returns_Settled) {
    auto result = facade.getTransaction("txn_8821");
    EXPECT_FALSE(result["transaction_id"].empty());
    EXPECT_EQ(result["status"], "settled");
}

TEST_F(PaymentFacadeTest, Charge_Routes_To_Payment_BaseUrl) {
    std::string out = capture([&]{ facade.charge("usr_001", 99); });
    EXPECT_TRUE(contains(out, "paymentprocessortp.com"));
    EXPECT_TRUE(contains(out, "/v1/charge"));
}

// ── AuthFacade ────────────────────────────────────────────────
class AuthFacadeTest : public ::testing::Test {
protected:
    AuthFacade facade;
};

TEST_F(AuthFacadeTest, ValidateToken_Returns_UserId_And_Email) {
    auto result = facade.validateToken("tok_test");
    EXPECT_EQ(result["user_id"], "usr_4421");
    EXPECT_EQ(result["email"],   "jane.doe@example.com");
}

TEST_F(AuthFacadeTest, GetUser_Returns_Full_User) {
    auto result = facade.getUser("usr_4421");
    EXPECT_FALSE(result["name"].empty());
    EXPECT_FALSE(result["email"].empty());
}

TEST_F(AuthFacadeTest, ValidateToken_Routes_To_Auth_BaseUrl) {
    std::string out = capture([&]{ facade.validateToken("tok_test"); });
    EXPECT_TRUE(contains(out, "authprovidertp.com"));
    EXPECT_TRUE(contains(out, "/v1/validate"));
}

// ── MessagingFacade ───────────────────────────────────────────
class MessagingFacadeTest : public ::testing::Test {
protected:
    MessagingFacade facade;
};

TEST_F(MessagingFacadeTest, Send_Returns_MessageId_And_Queued) {
    auto result = facade.send("+15550000", "Hello");
    EXPECT_EQ(result["message_id"], "msg_3301");
    EXPECT_EQ(result["status"],     "queued");
}

TEST_F(MessagingFacadeTest, GetStatus_Returns_Delivered) {
    auto result = facade.getStatus("msg_3301");
    EXPECT_EQ(result["status"], "delivered");
}

TEST_F(MessagingFacadeTest, Send_Routes_To_Messaging_BaseUrl) {
    std::string out = capture([&]{ facade.send("+1", "hi"); });
    EXPECT_TRUE(contains(out, "messagingtp.com"));
    EXPECT_TRUE(contains(out, "/v1/dispatch"));
}

// ── PurchaseService ───────────────────────────────────────────
class PurchaseServiceTest : public ::testing::Test {
protected:
    std::string run() {
        return capture([&]{ PurchaseService().makePurchase("tok_test", 4999, "+15550142"); });
    }
};

TEST_F(PurchaseServiceTest, Produces_All_Three_Section_Labels) {
    auto out = run();
    EXPECT_TRUE(contains(out, "[Auth]"));
    EXPECT_TRUE(contains(out, "[Payment]"));
    EXPECT_TRUE(contains(out, "[Messaging]"));
}

TEST_F(PurchaseServiceTest, Auth_Before_Payment) {
    auto out = run();
    auto auth_pos    = out.find("[Auth]");
    auto payment_pos = out.find("[Payment]");
    EXPECT_LT(auth_pos, payment_pos);
}

TEST_F(PurchaseServiceTest, Payment_Before_Messaging) {
    auto out = run();
    auto payment_pos   = out.find("[Payment]");
    auto messaging_pos = out.find("[Messaging]");
    EXPECT_LT(payment_pos, messaging_pos);
}

TEST_F(PurchaseServiceTest, No_Raw_Credentials_In_Output) {
    auto out = run();
    EXPECT_FALSE(contains(out, "sk_live_demo"));
    EXPECT_FALSE(contains(out, "auth_secret_demo"));
    EXPECT_FALSE(contains(out, "SID_xyz"));
}
