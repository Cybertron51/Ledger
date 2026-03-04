"use client";

import Link from "next/link";
import { colors } from "@/lib/theme";

export default function PrivacyPolicyPage() {
    return (
        <div
            style={{
                minHeight: "100dvh",
                background: colors.background,
                color: colors.textPrimary,
                padding: "80px 24px 120px",
            }}
        >
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
                <Link
                    href="/"
                    style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: colors.green,
                        textDecoration: "none",
                    }}
                >
                    ← Back to Tash
                </Link>

                <h1
                    style={{
                        fontSize: 36,
                        fontWeight: 800,
                        letterSpacing: "-0.03em",
                        marginTop: 32,
                        marginBottom: 8,
                    }}
                >
                    Privacy Policy
                </h1>
                <p style={{ fontSize: 13, color: colors.textMuted, marginBottom: 48 }}>
                    Last updated: March 4, 2026
                </p>

                {[
                    {
                        title: "1. Information We Collect",
                        body: `When you create a Tash account, we collect your name, email address, and authentication credentials (via Google OAuth or email/password). When you use our platform, we may also collect transaction history, portfolio data, card deposit records, and usage analytics to improve our services.`,
                    },
                    {
                        title: "2. How We Use Your Information",
                        body: `We use your information to operate and improve Tash, process transactions, verify your identity for financial operations (via Stripe Connect), communicate with you about your account, and ensure the security of our platform. We do not sell your personal information to third parties.`,
                    },
                    {
                        title: "3. Data Sharing",
                        body: `We share your data only when necessary: with Stripe to facilitate payments and payouts, with authentication providers (e.g., Google) to verify your identity, and with law enforcement if required by law. We do not share your data with advertisers or data brokers.`,
                    },
                    {
                        title: "4. Data Security",
                        body: `Your data is stored securely using industry-standard encryption. Authentication tokens are managed via Supabase Auth with Row Level Security (RLS) policies enforced at the database level. Financial data is processed through PCI-compliant Stripe infrastructure.`,
                    },
                    {
                        title: "5. Cookies & Analytics",
                        body: `Tash uses essential cookies to maintain your session and authentication state. We may use privacy-respecting analytics to understand how users interact with our platform. You can disable cookies in your browser settings, though this may affect functionality.`,
                    },
                    {
                        title: "6. Your Rights",
                        body: `You may request access to, correction of, or deletion of your personal data at any time by contacting us. You may also close your account, which will remove your profile data. Transaction records may be retained as required by financial regulations.`,
                    },
                    {
                        title: "7. Children's Privacy",
                        body: `Tash is not intended for users under the age of 18. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us.`,
                    },
                    {
                        title: "8. Changes to This Policy",
                        body: `We may update this Privacy Policy from time to time. We will notify you of significant changes via email or an in-app notice. Your continued use of Tash after changes constitutes acceptance of the updated policy.`,
                    },
                    {
                        title: "9. Contact Us",
                        body: `If you have questions about this Privacy Policy or your data, please contact us at support@tash.com.`,
                    },
                ].map((section) => (
                    <div key={section.title} style={{ marginBottom: 36 }}>
                        <h2
                            style={{
                                fontSize: 17,
                                fontWeight: 700,
                                letterSpacing: "-0.01em",
                                marginBottom: 10,
                                color: colors.textPrimary,
                            }}
                        >
                            {section.title}
                        </h2>
                        <p
                            style={{
                                fontSize: 14,
                                lineHeight: 1.7,
                                color: colors.textSecondary,
                            }}
                        >
                            {section.body}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
