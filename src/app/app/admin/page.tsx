"use client";

import { useState } from "react";
import { client } from "@/api/client";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { JsonViewer } from "@/components/ui/json-viewer";
import { toast } from "sonner";
import { Activity, Building2, AlertTriangle, RefreshCw, RefreshCcw, Database } from "lucide-react";

interface DLQMessage {
    id: string;
    message_type: string;
    payload_json: string;
    error_message: string;
    retry_count: number;
    created_at: string;
}

interface WorkspaceAdmin {
    id: string;
    name: string;
    slug: string;
    plan_id?: string;
    is_active: boolean;
    created_at: string;
}

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<"overview" | "workspaces" | "dlq">("overview");
    const [retryingId, setRetryingId] = useState<string | null>(null);

    // Queries
    const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useAuthedQuery<{ data: { total_workspaces: number; active_users: number; active_schedules: number; dlq_messages: number } }>({
        method: "GET",
        path: "/v1/internal/admin/stats",
        enabled: activeTab === "overview"
    });
    const stats = statsData?.data || {};

    const { data: workspacesData, isLoading: workspacesLoading, refetch: refetchWorkspaces } = useAuthedQuery<{ data: WorkspaceAdmin[] }>({
        method: "GET",
        path: "/v1/internal/admin/workspaces",
        params: { query: { limit: 100 } },
        enabled: activeTab === "workspaces"
    });
    const workspaces = workspacesData?.data || [];

    const { data: dlqData, isLoading: dlqLoading, refetch: refetchDlq } = useAuthedQuery<{ data: DLQMessage[] }>({
        method: "GET",
        path: "/v1/admin/dlq",
        params: { query: { limit: 100 } },
        enabled: activeTab === "dlq"
    });
    const dlqMessages = dlqData?.data || [];

    const handleDlqAction = async (message: DLQMessage, action: 'retry' | 'discard') => {
        setRetryingId(message.id);
        const actionText = action === 'retry' ? 'Retrying' : 'Discarding';
        const successText = action === 'retry' ? 'retried' : 'discarded';
        const toastId = toast.loading(`${actionText} message...`);
        try {
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ error?: { error?: string } }>>;
            let error;
            if (action === 'retry') {
                ({ error } = await apiClient.POST("/v1/admin/dlq/{id}/retry", {
                    params: { path: { id: message.id } }
                }));
            } else {
                ({ error } = await apiClient.POST("/v1/admin/dlq/{id}/discard", {
                    params: { path: { id: message.id } }
                }));
            }
            if (error) throw new Error(error.error || `Failed to ${action} message`);
            toast.success(`Message ${successText} successfully`, { id: toastId });
            refetchDlq();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : `Error ${actionText.toLowerCase()} message`, { id: toastId });
        } finally {
            setRetryingId(null);
        }
    };

    const handleRefresh = () => {
        if (activeTab === "overview") refetchStats();
        if (activeTab === "workspaces") refetchWorkspaces();
        if (activeTab === "dlq") refetchDlq();
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center">
                        <Database className="mr-3 h-6 w-6 text-primary" />
                        System Administration
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Super Admin Dashboard</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh Data
                </Button>
            </div>

            <div className="flex space-x-2 border-b border-border pb-4">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center ${activeTab === 'overview' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                >
                    <Activity className="mr-2 h-4 w-4" /> Overview
                </button>
                <button
                    onClick={() => setActiveTab("workspaces")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center ${activeTab === 'workspaces' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                >
                    <Building2 className="mr-2 h-4 w-4" /> Workspaces
                </button>
                <button
                    onClick={() => setActiveTab("dlq")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center ${activeTab === 'dlq' ? 'bg-primary/10 text-destructive' : 'text-muted-foreground hover:bg-muted'}`}
                >
                    <AlertTriangle className="mr-2 h-4 w-4" /> Dead Letter Queue
                </button>
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Metrics</CardTitle>
                            <CardDescription>Real-time application statistics</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {statsLoading ? (
                                <p className="text-muted-foreground">Loading metrics...</p>
                            ) : Object.keys(stats).length === 0 ? (
                                <p className="text-muted-foreground">No metrics available.</p>
                            ) : (
                                <div className="space-y-4">
                                    {Object.entries(stats).map(([key, val]) => (
                                        <div key={key} className="flex justify-between items-center border-b border-border/50 pb-2 last:border-0">
                                            <span className="text-sm font-medium capitalize text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                                            <span className="text-sm font-bold text-foreground">{String(val)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Workspaces Tab */}
            {activeTab === "workspaces" && (
                <Card>
                    <CardHeader>
                        <CardTitle>All Workspaces</CardTitle>
                        <CardDescription>Manage all tenants on the platform</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {workspacesLoading ? (
                            <p className="text-muted-foreground">Loading workspaces...</p>
                        ) : workspaces.length === 0 ? (
                            <p className="text-muted-foreground">No workspaces found.</p>
                        ) : (
                            <div className="rounded-md border border-border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Workspace Name</TableHead>
                                            <TableHead>Slug / ID</TableHead>
                                            <TableHead>Plan</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Created</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {workspaces.map(ws => (
                                            <TableRow key={ws.id}>
                                                <TableCell className="font-medium text-foreground">{ws.name}</TableCell>
                                                <TableCell className="text-muted-foreground font-mono text-xs">
                                                    <div>{ws.slug}</div>
                                                    <div className="text-[10px] opacity-70">{ws.id}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="uppercase">{ws.plan_id || 'free'}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={ws.is_active ? 'success' : 'secondary'}>
                                                        {ws.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {new Date(ws.created_at).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* DLQ Tab */}
            {activeTab === "dlq" && (
                <Card className="border-destructive/20 shadow-sm">
                    <CardHeader className="bg-destructive/5 border-b border-destructive/10 pb-4">
                        <CardTitle className="text-destructive flex items-center">
                            <AlertTriangle className="mr-2 h-5 w-5" />
                            Dead Letter Queue (DLQ)
                        </CardTitle>
                        <CardDescription>Messages or jobs that failed processing permanently.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {dlqLoading ? (
                            <p className="text-muted-foreground">Loading DLQ messages...</p>
                        ) : dlqMessages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <AlertTriangle className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <p>DLQ is perfectly empty. The system is healthy.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {dlqMessages.map(msg => {
                                    let parsedPayload: unknown = msg.payload_json;
                                    try {
                                        if (typeof msg.payload_json === 'string') {
                                            parsedPayload = JSON.parse(msg.payload_json);
                                        }
                                    } catch {
                                        parsedPayload = String(msg.payload_json);
                                    }

                                    return (
                                        <div key={msg.id} className="rounded-lg border border-border p-4 bg-muted/20">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant="destructive" className="font-mono text-[10px] tracking-wider uppercase">
                                                            {msg.message_type}
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground font-mono">ID: {msg.id.slice(0, 8)}</span>
                                                    </div>
                                                    <p className="text-sm font-semibold text-destructive mt-2 break-all bg-destructive/10 px-2 py-1 rounded inline-block">
                                                        Error: {msg.error_message}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-muted-foreground mb-3 font-mono">
                                                        {new Date(msg.created_at).toLocaleString()}
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDlqAction(msg, 'retry')}
                                                        disabled={retryingId === msg.id}
                                                    >
                                                        {retryingId === msg.id ? <RefreshCcw className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCcw className="mr-2 h-3 w-3" />}
                                                        Retry Message
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Payload Data:</p>
                                                <div className="max-h-[200px] overflow-y-auto w-full text-xs">
                                                    <JsonViewer data={parsedPayload} className="bg-background" />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
