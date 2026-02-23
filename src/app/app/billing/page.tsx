"use client";

import { useState } from "react";
import { client } from "@/api/client";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, ExternalLink, RefreshCw, Zap, TrendingUp, ChevronRight, CheckCircle2 } from "lucide-react";

interface Plan {
    id: string;
    name: string;
    description: string;
    monthly_price: number;
    annual_price?: number;
    features: Record<string, string | number>;
    is_active: boolean;
}

interface Subscription {
    id: string;
    plan_id: string;
    status: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
}

interface UsageMonthly {
    year: number;
    month: number;
    tokens_used: number;
    storage_used_bytes: number;
}

export default function BillingPage() {
    const [isManaging, setIsManaging] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);

    const { data: plansData, isLoading: plansLoading } = useAuthedQuery<{ data: Plan[] }>({
        method: "GET",
        path: "/v1/billing/plans"
    });

    const { data: subData, isLoading: subLoading, refetch: refetchSub } = useAuthedQuery<{ data: Subscription }>({
        method: "GET",
        path: "/v1/billing/subscription"
    });

    const { data: usageData, isLoading: usageLoading, refetch: refetchUsage } = useAuthedQuery<{ data: UsageMonthly }>({
        method: "GET",
        path: "/v1/billing/usage/current"
    });

    const plans = plansData?.data || [];
    const subscription = subData?.data;
    const usage = usageData?.data;

    const currentPlan = plans.find(p => p.id === subscription?.plan_id);

    const handleManageBilling = async () => {
        setIsManaging(true);
        const toastId = toast.loading("Connecting to billing portal...");
        try {
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ data?: { url: string }, error?: { error?: string } }>>;
            const returnUrl = window.location.href;
            const { data, error } = await apiClient.POST("/v1/billing/portal", {
                body: { return_url: returnUrl }
            });
            if (error) throw new Error(error.error || "Failed to get portal URL");
            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No URL returned from portal session");
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error accessing billing portal", { id: toastId });
        } finally {
            setIsManaging(false);
        }
    };

    const handleCheckout = async (planId: string) => {
        setIsCheckingOut(planId);
        const toastId = toast.loading("Redirecting to checkout...");
        try {
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ data?: { url: string }, error?: { error?: string } }>>;
            const currentUrl = window.location.href;
            const { data, error } = await apiClient.POST("/v1/billing/checkout-session", {
                body: {
                    plan_id: planId,
                    success_url: `${currentUrl}?success=true`,
                    cancel_url: `${currentUrl}?canceled=true`
                }
            });
            if (error) throw new Error(error.error || "Failed to create checkout session");
            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No checkout URL returned");
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error starting checkout", { id: toastId });
        } finally {
            setIsCheckingOut(null);
        }
    };

    const formatBytes = (bytes: number) => {
        if (!bytes) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const isLoading = plansLoading || subLoading || usageLoading;

    if (isLoading) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
                <div className="h-8 w-48 bg-muted rounded mb-4"></div>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="h-48 bg-muted rounded-xl"></div>
                    <div className="h-48 bg-muted rounded-xl"></div>
                </div>
                <div className="h-64 bg-muted rounded-xl mt-6"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center">
                        <CreditCard className="mr-3 h-6 w-6 text-primary" />
                        Billing & Usage
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your plan, billing details, and view current usage.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { refetchSub(); refetchUsage(); }}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Current Plan</CardTitle>
                        <CardDescription>Your active subscription details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        {subscription ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Plan Name</span>
                                    <span className="font-medium text-foreground">{currentPlan?.name || subscription.plan_id}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Status</span>
                                    <Badge variant={subscription.status === 'active' || subscription.status === 'trialing' ? 'success' : 'secondary'} className="capitalize">
                                        {subscription.status}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Renews on</span>
                                    <span className="font-medium text-foreground">{new Date(subscription.current_period_end).toLocaleDateString()}</span>
                                </div>
                                {subscription.cancel_at_period_end && (
                                    <div className="p-3 bg-warning/10 text-warning border border-warning/20 rounded-md mt-4">
                                        Your subscription will cancel at the end of the current billing period.
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-4 text-center text-muted-foreground">
                                No active subscription. Select a plan below.
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button
                            variant="secondary"
                            className="w-full"
                            onClick={handleManageBilling}
                            disabled={isManaging}
                        >
                            {isManaging ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                            Manage Billing in Stripe
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Current Usage</CardTitle>
                        <CardDescription>Your resource usage this billing cycle.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center text-muted-foreground"><TrendingUp className="mr-2 h-4 w-4" /> AI Tokens Used</span>
                                <span className="font-medium text-foreground">{usage?.tokens_used?.toLocaleString() || 0}</span>
                            </div>
                            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                                {/* Since limit isn't provided directly in usage struct easily, just show bar without limit or calculate from plan max */}
                                <div className="bg-primary h-full" style={{ width: `Math.min((usage?.tokens_used || 0) / 100000 * 100, 100)%` }} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center text-muted-foreground"><Zap className="mr-2 h-4 w-4" /> Storage Used</span>
                                <span className="font-medium text-foreground">{formatBytes(usage?.storage_used_bytes || 0)}</span>
                            </div>
                            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                                <div className="bg-orange-500 h-full" style={{ width: `Math.min((usage?.storage_used_bytes || 0) / (5*1024*1024*1024) * 100, 100)%` }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-8">
                <h3 className="text-xl font-bold tracking-tight text-foreground mb-4">Available Plans</h3>
                <div className="grid md:grid-cols-3 gap-6">
                    {plans.map(plan => {
                        const isCurrentPlan = subscription?.plan_id === plan.id;

                        return (
                            <Card key={plan.id} className={`flex flex-col relative ${isCurrentPlan ? 'border-primary ring-1 ring-primary' : ''}`}>
                                {isCurrentPlan && (
                                    <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                                        <Badge className="bg-primary text-primary-foreground shadow-sm">Current</Badge>
                                    </div>
                                )}
                                <CardHeader>
                                    <CardTitle>{plan.name}</CardTitle>
                                    <CardDescription>{plan.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 space-y-4">
                                    <div className="flex items-baseline text-3xl font-bold">
                                        ${(plan.monthly_price / 100).toFixed(2)}
                                        <span className="ml-1 text-sm font-medium text-muted-foreground">/mo</span>
                                    </div>
                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                        {Object.entries(plan.features || {}).map(([key, val]) => (
                                            <li key={key} className="flex items-start">
                                                <CheckCircle2 className="h-4 w-4 text-primary mr-2 mt-0.5 shrink-0" />
                                                <span className="capitalize">{key.replace(/_/g, ' ')}: {val === -1 ? 'Unlimited' : val}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    {isCurrentPlan ? (
                                        <Button variant="outline" className="w-full" disabled>Active Plan</Button>
                                    ) : (
                                        <Button
                                            className="w-full group"
                                            variant={isCurrentPlan ? "outline" : "default"}
                                            disabled={isCheckingOut === plan.id}
                                            onClick={() => handleCheckout(plan.id)}
                                        >
                                            {isCheckingOut === plan.id ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : "Select Plan"}
                                            {!isCheckingOut && <ChevronRight className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
