"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { client } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { useOnboarding } from "@/hooks/use-onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Loader2, Sparkles, CheckCircle, Eye, Calendar, Clock, Globe } from "lucide-react";
import { toast } from "sonner";

interface Artifact {
    id: string;
    template_key: string;
    title: string;
    status: string;
    created_at: string;
}

interface Template {
    id: string;
    key: string;
    name: string;
    description: string;
}

export default function ArtifactsPage() {
    const { accessToken } = useAuth();
    const router = useRouter();
    const { hasSchedule, loading: onboardingLoading } = useOnboarding();
    const [activeTab, setActiveTab] = useState<"list" | "generator">("list");

    // Generator State
    const [generating, setGenerating] = useState(false);
    const [title, setTitle] = useState("");
    const [templateKey, setTemplateKey] = useState("");
    const [varsJson, setVarsJson] = useState('{\n  "context": "Focus on the new product line."\n}');
    const [streamedContent, setStreamedContent] = useState("");
    const [generatedArtifactId, setGeneratedArtifactId] = useState<string | null>(null);

    // Approve State
    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [artifactToApprove, setArtifactToApprove] = useState<string | null>(null);
    const [publishDate, setPublishDate] = useState(new Date().toISOString().split('T')[0]);
    const [publishTime, setPublishTime] = useState("09:00");
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [isApproving, setIsApproving] = useState(false);



    const { data: artifactsData, isLoading, refetch } = useAuthedQuery<{ data: Artifact[] }>({
        method: "GET",
        path: "/v1/artifacts",
        params: { query: { limit: 50 } }
    });
    const artifacts = artifactsData?.data || [];

    const { data: templatesData } = useAuthedQuery<{ data: Template[] }>({
        method: "GET",
        path: "/v1/templates",
        params: { query: { limit: 50 } }
    });
    const templates = templatesData?.data || [];

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !templateKey) return;

        let parsedVars = {};
        try {
            parsedVars = JSON.parse(varsJson);
        } catch {
            toast.error("Variables must be valid JSON");
            return;
        }

        setGenerating(true);
        setStreamedContent("");
        setGeneratedArtifactId(null);
        const toastId = toast.loading("Generating artifact...");

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/artifacts/generate:stream`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
                },
                body: JSON.stringify({
                    template_key: templateKey,
                    title,
                    vars: parsedVars
                })
            });

            if (!res.body) throw new Error("No response body");
            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");

            let done = false;
            let finalId = null;

            while (!done) {
                const { value, done: streamDone } = await reader.read();
                done = streamDone;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split("\n");
                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            const dataStr = line.slice(6).trim();
                            if (dataStr === "[DONE]") break;
                            try {
                                const parsed = JSON.parse(dataStr);
                                if (parsed.text) {
                                    setStreamedContent(prev => prev + parsed.text);
                                }
                                if (parsed.id || parsed.artifact_id) {
                                    finalId = parsed.id || parsed.artifact_id;
                                    setGeneratedArtifactId(finalId);
                                }
                            } catch { }
                        }
                    }
                }
            }
            toast.success("Generation complete!", { id: toastId });
            refetch();

            // If the chunk stream didn't contain an ID but we know it finished, 
            // we could fetch latest artifact or rely on the user to go to the list.
        } catch (e: unknown) {
            console.error("Failed to generate", e);
            toast.error(e instanceof Error ? e.message : "Failed to generate artifact", { id: toastId });
        } finally {
            setGenerating(false);
        }
    };

    const openApproveModal = (id: string) => {
        setArtifactToApprove(id);
        setApproveModalOpen(true);
    };

    const handleApprove = async () => {
        if (!artifactToApprove) return;
        setIsApproving(true);
        const toastId = toast.loading("Approving artifact...");

        try {
            // The instruction provided a PATCH call for status, but the original function was for approval/scheduling.
            // Assuming the intent is to update the API call for approval/scheduling with better error handling.
            // If the intent was to change to a generic status update, the body and path would be different.
            // Sticking to the original function's purpose (approve/schedule) but updating error handling.
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ error?: { error?: string } }>>;
            const { error } = await apiClient.POST("/v1/artifacts/{id}/approve", {
                params: { path: { id: artifactToApprove } },
                body: {
                    publish_start_date: publishDate,
                    timezone,
                    default_publish_time: publishTime
                }
            });
            if (error) throw new Error(error.error || "Approval failed");

            toast.success("Artifact approved and scheduled successfully", { id: toastId });
            setApproveModalOpen(false);
            refetch();
            // Redirect to schedules after short delay
            setTimeout(() => {
                router.push("/app/schedules");
            }, 1000);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Error approving artifact", { id: toastId });
        } finally {
            setIsApproving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Artifacts</h1>
                <div className="flex bg-muted p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab("list")}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        My Artifacts
                    </button>
                    <button
                        onClick={() => setActiveTab("generator")}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'generator' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Generator
                    </button>
                </div>
            </div>

            {activeTab === "list" && (
                <Card>
                    <CardHeader>
                        <CardTitle>Generated Content</CardTitle>
                        <CardDescription>View, manage, and approve generated company artifacts.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading || onboardingLoading ? (
                            <p className="text-muted-foreground text-center py-8">Loading artifacts...</p>
                        ) : artifacts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/20 border-dashed border rounded">
                                <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                                <p className="mb-4">No artifacts generated yet. Use the Generator tab to create one.</p>
                                {!hasSchedule && (
                                    <Button onClick={() => router.push("/app/onboarding")}>Continue Setup</Button>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-md border border-border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Template</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {artifacts.map(art => (
                                            <TableRow key={art.id}>
                                                <TableCell className="font-medium text-foreground">{art.title}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{art.template_key}</TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        art.status === 'completed' ? 'success' :
                                                            art.status === 'approved' ? 'default' :
                                                                art.status === 'failed' ? 'destructive' : 'secondary'
                                                    } className="capitalize">
                                                        {art.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {new Date(art.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="icon" onClick={() => router.push(`/app/artifacts/${art.id}`)} title="View Details">
                                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                        {art.status === 'completed' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openApproveModal(art.id)}
                                                            >
                                                                <CheckCircle className="mr-2 h-3 w-3" />
                                                                Approve
                                                            </Button>
                                                        )}
                                                    </div>
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

            {activeTab === "generator" && (
                <div className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-14rem)]">
                    <Card className="flex flex-col h-full overflow-hidden border-border bg-card">
                        <CardHeader className="flex-shrink-0">
                            <CardTitle>Generator Settings</CardTitle>
                            <CardDescription>Configure the artifact generation parameters.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto space-y-4">
                            <form id="generate-form" onSubmit={handleGenerate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Artifact Title</Label>
                                    <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Q4 Marketing Plan" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="templateKey">Template</Label>
                                    <select
                                        id="templateKey"
                                        value={templateKey}
                                        onChange={e => setTemplateKey(e.target.value)}
                                        required
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="" disabled>Select a template...</option>
                                        {templates.map(t => (
                                            <option key={t.key} value={t.key}>{t.name} ({t.key})</option>
                                        ))}
                                        {/* Fallback option if none exist yet */}
                                        {templates.length === 0 && <option value="blog_post">Blog Post (Fallback)</option>}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="vars">Variables (JSON)</Label>
                                    <textarea
                                        id="vars"
                                        value={varsJson}
                                        onChange={e => setVarsJson(e.target.value)}
                                        className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder={'{\n  "key": "value"\n}'}
                                    />
                                </div>
                            </form>
                        </CardContent>
                        <CardFooter className="flex-shrink-0 border-t border-border pt-4">
                            <Button type="submit" form="generate-form" disabled={generating || !title || !templateKey} className="w-full">
                                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Generate Artifact
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card className="flex flex-col h-full overflow-hidden border-border bg-background">
                        <CardHeader className="flex-shrink-0 border-b border-border bg-muted/30">
                            <CardTitle className="text-sm font-medium flex items-center justify-between">
                                Live Preview
                                {generatedArtifactId && !generating && (
                                    <Button size="sm" onClick={() => openApproveModal(generatedArtifactId)}>
                                        <CheckCircle className="mr-2 h-3 w-3" /> Approve Now
                                    </Button>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
                            {streamedContent ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-sans text-sm text-foreground">
                                    {streamedContent}
                                    {generating && <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse"></span>}
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                    Generated content will stream here...
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Approve Modal */}
            <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve & Schedule</DialogTitle>
                        <DialogDescription>
                            Approving this artifact will lock its content and prepare it for scheduling.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="date" className="flex items-center"><Calendar className="mr-2 h-4 w-4" /> Start Date</Label>
                            <Input id="date" type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="time" className="flex items-center"><Clock className="mr-2 h-4 w-4" /> Default Time</Label>
                            <Input id="time" type="time" value={publishTime} onChange={(e) => setPublishTime(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="tz" className="flex items-center"><Globe className="mr-2 h-4 w-4" /> Timezone</Label>
                            <Input id="tz" type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setApproveModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleApprove} disabled={isApproving}>
                            {isApproving ? "Approving..." : "Approve Artifact"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
