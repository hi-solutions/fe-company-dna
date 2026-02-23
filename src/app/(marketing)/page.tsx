import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, UploadCloud, MessageSquare, Zap, Lock } from "lucide-react";

export default function HomePage() {
    return (
        <div className="flex flex-col items-center">
            {/* Hero Section */}
            <section className="w-full bg-background py-24 md:py-32 flex justify-center">
                <div className="container px-4 md:px-6 text-center">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6">
                        Your Company&apos;s <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">Autonomous Brain</span>
                    </h1>
                    <p className="max-w-[700px] mx-auto text-lg md:text-xl text-muted-foreground mb-8">
                        Ingest your documents, chat with your company DNA, and generate high-quality artifacts automatically. Multi-tenant and secure.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/register">
                            <Button size="lg" className="h-12 px-8 text-base">
                                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Link href="/features">
                            <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                                Explore Features
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section className="w-full py-20 px-4 md:px-8 border-t border-border bg-background flex justify-center">
                <div className="container max-w-6xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold tracking-tight text-foreground">How it works</h2>
                        <p className="mt-4 text-muted-foreground">From raw data to automated knowledge in minutes.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-10">
                        <div className="flex flex-col items-center text-center">
                            <div className="h-16 w-16 bg-primary/10 text-primary flex items-center justify-center rounded-2xl mb-6">
                                <UploadCloud className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">1. Upload DNA</h3>
                            <p className="text-muted-foreground">Securely upload PDFs and documents. We automatically chunk and index them into semantic vectors.</p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="h-16 w-16 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-2xl mb-6">
                                <MessageSquare className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">2. Chat & Generate</h3>
                            <p className="text-muted-foreground">Ask questions or use structured templates to generate accurate plans, posts, and strategies.</p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="h-16 w-16 bg-purple-100 text-purple-600 flex items-center justify-center rounded-2xl mb-6">
                                <Zap className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">3. Approve & Publish</h3>
                            <p className="text-muted-foreground">Review generated artifacts and schedule them for automatic publishing to your platforms.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Security Section */}
            <section className="w-full py-20 px-4 md:px-8 border-t border-border bg-card text-primary-foreground flex justify-center">
                <div className="container max-w-5xl text-center">
                    <Lock className="h-12 w-12 mx-auto text-primary mb-6" />
                    <h2 className="text-3xl font-bold tracking-tight mb-4">Enterprise Grade Security</h2>
                    <p className="max-w-2xl mx-auto text-muted-foreground text-lg mb-8">
                        Hi-Solutions Company DNA is built with strict multi-tenancy. Your data is isolated, encrypted, and can be configured to use self-hosted AI models to ensure your company secrets never leave your infrastructure.
                    </p>
                    <Link href="/register">
                        <Button variant="outline" size="lg" className="h-12 px-8 text-base bg-transparent border-border text-foreground hover:bg-secondary hover:text-foreground">
                            Create a Secure Workspace
                        </Button>
                    </Link>
                </div>
            </section>
        </div>
    );
}
