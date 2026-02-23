import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
    return (
        <div className="container max-w-4xl py-12 px-4 md:py-24 mx-auto">
            <div className="mb-8">
                <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
                </Link>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-foreground">Privacy Policy</h1>
            <p className="text-muted-foreground mb-8 text-lg">Effective Date: {new Date().toLocaleDateString()}</p>

            <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-foreground">
                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Information We Collect</h2>
                    <p className="text-muted-foreground leading-relaxed">We collect information you provide directly to us when you create an account, update your profile, use the interactive features of our services, or communicate with us. This may include your name, email address, and any documents or data you upload to the platform.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">2. How We Use Information</h2>
                    <p className="text-muted-foreground leading-relaxed">We use the information we collect to provide, maintain, and improve our services, to process transactions, to send you related information, and to respond to your comments, questions, and requests.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Data Security</h2>
                    <p className="text-muted-foreground leading-relaxed">We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction. We employ strict multi-tenancy to ensure your data is isolated and secure.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Sharing of Information</h2>
                    <p className="text-muted-foreground leading-relaxed">We do not share your personal information with third parties except as necessary to provide the service (e.g., payment processors), to comply with the law, or to protect our rights.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Contact Us</h2>
                    <p className="text-muted-foreground leading-relaxed">If you have any questions about this Privacy Policy, please contact us at privacy@example.com.</p>
                </section>
            </div>
        </div>
    );
}
