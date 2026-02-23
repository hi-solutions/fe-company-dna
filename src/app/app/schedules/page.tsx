"use client";

import { useRouter } from "next/navigation";
import { client } from "@/api/client";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { useOnboarding } from "@/hooks/use-onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Clock, Share2, Play, Pause, RefreshCw, XCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface Schedule {
    id: string;
    status: string;
    timezone: string;
    approved_at: string;
    publish_start_date: string;
    artifact_id: string;
}

export default function SchedulesPage() {
    const router = useRouter();
    const { hasSchedule, loading: onboardingLoading } = useOnboarding();
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const { data: schedulesData, isLoading, refetch } = useAuthedQuery<{ data: Schedule[] }>({
        method: "GET",
        path: "/v1/schedules",
        params: { query: { limit: 50 } }
    });

    const schedules = schedulesData?.data || [];

    const handleAction = async (id: string, action: "pause" | "resume" | "rebuild" | "cancel-future") => {
        setActionLoading(`${id}-${action}`);
        const toastId = toast.loading(`Performing ${action}...`);
        try {
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ error?: { error?: string } }>>;
            const { error } = await apiClient.POST(`/v1/schedules/${id}/${action}`, {
                params: { path: { id } }
            });
            if (error) throw new Error(error.error || `Failed to ${action} schedule`);
            toast.success(`Schedule ${action}d successfully`, { id: toastId });
            refetch();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : `Error performing ${action}`, { id: toastId });
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Content Schedules</h1>
                <Button variant="outline" size="sm" onClick={refetch}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
            </div>

            {isLoading || onboardingLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-xl"></div>)}
                </div>
            ) : schedules.length === 0 ? (
                <Card className="border-dashed bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <CalendarClock className="h-16 w-16 text-muted-foreground/50 mb-4" />
                        <p className="mb-4 text-center max-w-sm">No active schedules. Go generate and approve an artifact first.</p>
                        {!hasSchedule ? (
                            <Button onClick={() => router.push("/app/onboarding")}>Continue Setup</Button>
                        ) : (
                            <Button variant="outline" onClick={() => router.push("/app/artifacts")} className="mt-2">
                                Go to Artifacts
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {schedules.map((schedule) => (
                        <Card key={schedule.id} className="flex flex-col">
                            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <CalendarClock className="h-4 w-4 text-primary" />
                                            Schedule {schedule.id.slice(0, 8)}
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                                            Art: {schedule.artifact_id?.slice(0, 8) || 'N/A'}
                                        </p>
                                    </div>
                                    <Badge variant={
                                        schedule.status === 'active' ? 'success' :
                                            schedule.status === 'paused' ? 'warning' :
                                                schedule.status === 'completed' ? 'default' : 'secondary'
                                    } className="capitalize">
                                        {schedule.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 flex-1">
                                <div className="space-y-3 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-3">
                                        <Clock className="h-4 w-4 shrink-0 text-foreground/70" />
                                        <span>Timezone: <span className="text-foreground">{schedule.timezone}</span></span>
                                    </div>
                                    {schedule.publish_start_date && (
                                        <div className="flex items-center gap-3">
                                            <CalendarClock className="h-4 w-4 shrink-0 text-foreground/70" />
                                            <span>Starts: <span className="text-foreground">{schedule.publish_start_date}</span></span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <Share2 className="h-4 w-4 shrink-0 text-foreground/70" />
                                        <span>Approved: <span className="text-foreground">{new Date(schedule.approved_at).toLocaleDateString()}</span></span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="border-t border-border/50 bg-muted/10 p-3 flex flex-wrap gap-2 justify-between">
                                <div className="flex gap-1">
                                    {(schedule.status === 'active' || schedule.status === 'paused') && (
                                        <>
                                            {schedule.status === 'active' ? (
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    title="Pause Schedule"
                                                    disabled={!!actionLoading}
                                                    onClick={() => handleAction(schedule.id, "pause")}
                                                >
                                                    {actionLoading === `${schedule.id}-pause` ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3" />}
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    title="Resume Schedule"
                                                    disabled={!!actionLoading}
                                                    onClick={() => handleAction(schedule.id, "resume")}
                                                >
                                                    {actionLoading === `${schedule.id}-resume` ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                                                </Button>
                                            )}
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                className="h-8 w-8"
                                                title="Cancel Future Posts"
                                                disabled={!!actionLoading}
                                                onClick={() => handleAction(schedule.id, "cancel-future")}
                                            >
                                                {actionLoading === `${schedule.id}-cancel-future` ? <RefreshCw className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                                            </Button>
                                        </>
                                    )}
                                </div>
                                <Button size="sm" className="h-8" onClick={() => router.push(`/app/schedules/${schedule.id}`)}>
                                    View Posts <ArrowRight className="ml-2 h-3 w-3" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
