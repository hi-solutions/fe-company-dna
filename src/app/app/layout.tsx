"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/auth/AuthProvider";
import { client } from "@/api/client";
import {
    Building2, LayoutDashboard, Database, MessageSquare,
    FileText, CalendarClock, LayoutTemplate, LogOut, Menu, Shield,
    Users, Settings, CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { OnboardingProvider, useOnboarding } from "@/hooks/use-onboarding";
import { OnboardingProgress } from "@/components/onboarding-progress";

interface User {
    role: string;
    first_name: string;
    last_name: string;
}

interface Workspace {
    name: string;
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
    const { logout, isAuthenticated, isLoading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const { hasSchedule, loading: onboardingLoading, isForbidden } = useOnboarding();

    // Track if we already redirected to prevent repeated pushes
    const hasRedirected = useRef(false);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
        } else if (isAuthenticated) {
            const loadWorkspaceContext = async () => {
                try {
                    const { data: wsData } = await client.GET("/v1/workspace/me");
                    if (wsData) {
                        setWorkspace(wsData as Workspace);
                    }
                    const { data: usersInfo } = await client.GET("/v1/workspace/users");
                    if (usersInfo && usersInfo.length > 0) {
                        setUser(usersInfo[0] as User);
                    }
                } catch (e) {
                    console.error(e);
                }
            };
            loadWorkspaceContext();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, isAuthenticated]);

    useEffect(() => {
        if (!isLoading && isAuthenticated && !onboardingLoading) {
            const allowedPaths = ["/app/onboarding", "/app/settings", "/app/billing", "/app/admin"];
            const isAllowed = allowedPaths.some(p => pathname.startsWith(p));

            // Employee with 403 — treat as waiting_for_admin, let them through
            if (isForbidden) return;

            if (!hasSchedule && !isAllowed && !hasRedirected.current) {
                hasRedirected.current = true;
                router.push("/app/onboarding");
            }
        }
    }, [isLoading, isAuthenticated, onboardingLoading, hasSchedule, pathname, router, isForbidden]);

    // Reset redirect guard when pathname changes (user navigated manually)
    useEffect(() => {
        hasRedirected.current = false;
    }, [pathname]);

    if (isLoading || !isAuthenticated) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    const role = user?.role || "employee";
    const isAdmin = ["admin", "super_admin"].includes(role);
    const isSuperAdmin = role === "super_admin";

    const navigation = [
        { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
        { name: "DNA", href: "/app/dna", icon: Database },
        { name: "Chat", href: "/app/chat", icon: MessageSquare },
        { name: "Artifacts", href: "/app/artifacts", icon: FileText },
        { name: "Schedules", href: "/app/schedules", icon: CalendarClock },
        { name: "Settings", href: "/app/settings", icon: Settings },
    ];

    if (isAdmin) {
        navigation.push({ name: "Templates", href: "/app/templates", icon: LayoutTemplate });
        navigation.push({ name: "Members", href: "/app/members", icon: Users });
        navigation.push({ name: "Billing", href: "/app/billing", icon: CreditCard });
    }
    if (isSuperAdmin) {
        navigation.push({ name: "Admin", href: "/app/admin", icon: Shield });
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background text-foreground">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-card/50 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-card text-card-foreground transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="flex h-16 items-center px-6 border-b border-border bg-muted/30">
                    <Building2 className="h-6 w-6 text-primary mr-2" />
                    <span className="text-lg font-bold truncate">{workspace?.name || "Loading..."}</span>
                </div>

                <div className="flex flex-col flex-1 overflow-y-auto pt-4 pb-4">
                    <nav className="flex-1 space-y-1 px-3">
                        {navigation.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium ${isActive
                                        ? "bg-secondary text-secondary-foreground"
                                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                        }`}
                                >
                                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="border-t border-border p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                                {user?.first_name?.charAt(0) || "U"}
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-foreground">{user?.first_name} {user?.last_name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{role.replace('_', ' ')}</p>
                            </div>
                        </div>
                        <ThemeToggle />
                    </div>

                    <div className="mb-4">
                        <OnboardingProgress />
                    </div>

                    <Button variant="ghost" onClick={logout} className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-secondary">
                        <LogOut className="mr-3 h-5 w-5" />
                        Sign Out
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden flex h-16 items-center justify-between border-b border-border bg-card px-4">
                    <div className="flex items-center">
                        <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground focus:outline-none">
                            <Menu className="h-6 w-6" />
                        </button>
                        <span className="ml-4 text-lg font-medium text-foreground">{workspace?.name || "Hi-Solutions DNA"}</span>
                    </div>
                    <ThemeToggle />
                </div>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <OnboardingProvider>
            <AppLayoutInner>{children}</AppLayoutInner>
        </OnboardingProvider>
    );
}
