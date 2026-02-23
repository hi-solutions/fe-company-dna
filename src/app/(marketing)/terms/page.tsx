import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
    return (
        <div className="container max-w-4xl py-12 px-4 md:py-24 mx-auto">
            <div className="mb-8">
                <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
                </Link>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-foreground">Terms of Service</h1>
            <p className="text-muted-foreground mb-8 text-lg">Effective Date: {new Date().toLocaleDateString()}</p>

            <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-foreground">
                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Acceptance of Terms</h2>
                    <p className="text-muted-foreground leading-relaxed">By accessing or using the Hi-Solutions DNA application, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Description of Service</h2>
                    <p className="text-muted-foreground leading-relaxed">Hi-Solutions DNA provides a platform for document ingestion, AI-driven chat, and artifact generation. We reserve the right to modify or discontinue, temporarily or permanently, the service with or without notice.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">3. User Accounts</h2>
                    <p className="text-muted-foreground leading-relaxed">You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password. You agree not to disclose your password to any third party.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Data and Privacy</h2>
                    <p className="text-muted-foreground leading-relaxed">Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service, to understand our practices regarding your data.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Intellectual Property</h2>
                    <p className="text-muted-foreground leading-relaxed">The service and its original content, features, and functionality are and will remain the exclusive property of Hi-Solutions and its licensors. The service is protected by copyright, trademark, and other laws.</p>
                </section>
            </div>
        </div>
    );
}
