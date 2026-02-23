"use client";

import { CreditCard, Building2, Activity, CalendarDays } from "lucide-react";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Workspace {
    id: string;
    name: string;
    is_active: boolean;
    created_at: string;
}

interface Subscription {
    status: string;
    plan_id: string;
    current_period_end: string;
}

interface Usage {
    tokens_used: number;
}

export default function DashboardPage() {
    const { data: workspaceData, isLoading: workspaceLoading } = useAuthedQuery<Workspace>({
        method: "GET",
        path: "/v1/workspace/me" as const
    });

    const { data: subscriptionData, isLoading: subscriptionLoading } = useAuthedQuery<Subscription>({
        method: "GET",
        path: "/v1/billing/subscription" as const
    });

    const { data: usageData, isLoading: usageLoading } = useAuthedQuery<Usage>({
        method: "GET",
        path: "/v1/billing/usage/current" as const
    });

    const { data: healthData, error: healthError } = useAuthedQuery<unknown>({
        method: "GET",
        path: "/healthz" as unknown as never
    });

    const workspace = workspaceData;
    const subscription = subscriptionData ?? {} as Subscription;
    const usage = usageData ?? {} as Usage;

    const loading = workspaceLoading || subscriptionLoading || usageLoading;

    if (loading) {
        return <div className="space-y-4">
            <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl"></div>)}
            </div>
        </div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-1">Welcome back. Here&apos;s an overview of your workspace.</p>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                    <span className="text-muted-foreground">API Status:</span>
                    {healthError ? (
                        <span className="flex items-center text-destructive"><span className="h-2 w-2 rounded-full bg-destructive mr-2 animate-pulse"></span> Offline</span>
                    ) : healthData ? (
                        <span className="flex items-center text-success"><span className="h-2 w-2 rounded-full bg-success mr-2"></span> Online</span>
                    ) : (
                        <span className="flex items-center text-muted-foreground"><span className="h-2 w-2 rounded-full bg-muted-foreground mr-2"></span> Checking...</span>
                    )}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Workspace</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{workspace?.name || "N/A"}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Status: <span className={workspace?.is_active ? "text-green-600" : "text-red-600"}>{workspace?.is_active ? "Active" : "Inactive"}</span>
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Subscription</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold capitalize">{subscription?.status || "Unknown"}</div>
                        <p className="text-xs text-muted-foreground mt-1 capitalize">
                            Plan: {subscription?.plan_id || "None"}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Usage</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(usage?.tokens_used || 0).toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Tokens generated this month
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Activity Overview</CardTitle>
                        <CardDescription>System events and job queues status will appear here.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center border-t border-border">
                        <p className="text-muted-foreground text-sm">No recent activity to display.</p>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Upcoming Schedules</CardTitle>
                        <CardDescription>Next automated publishing artifacts.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center border-t border-border text-center">
                        <div className="flex flex-col items-center">
                            <CalendarDays className="h-10 w-10 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground text-sm">No upcoming schedules.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
