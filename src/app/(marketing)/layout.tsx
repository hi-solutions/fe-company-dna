import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
                    <Link href="/" className="flex items-center space-x-2">
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Hi-Solutions DNA</span>
                    </Link>
                    <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-muted-foreground">
                        <Link href="/features" className="hover:text-primary transition-colors">Features</Link>
                        <Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
                    </nav>
                    <div className="flex items-center space-x-2 md:space-x-4">
                        <ThemeToggle />
                        <Link href="/login">
                            <Button variant="ghost" className="hidden sm:inline-flex">Login</Button>
                        </Link>
                        <Link href="/register">
                            <Button>Start Free</Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {children}
            </main>

            <footer className="border-t border-border bg-muted/50 py-8 text-center text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} Hi-Solutions. All rights reserved.</p>
                <p className="mt-2 text-xs">Empowering multi-tenant self-hosted AI infrastructures.</p>
            </footer>
        </div>
    );
}
