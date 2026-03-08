"use client";

import { useState, useEffect } from "react";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ChevronRight, FileUp, Cpu, MessageSquare, Sparkles, CalendarCheck, Loader2, PenLine } from "lucide-react";
import { client } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { Input } from "@/components/ui/input";
import { DnaManualForm } from "./dna-manual-form";

export default function OnboardingPage() {
    const { step: currentStep, loading: onboardingLoading, hasSchedule, isForbidden } = useOnboarding();
    const router = useRouter();
    const { accessToken } = useAuth();

    // Fetch user role
    const { data: usersData } = useAuthedQuery<{ role: string }[]>({
        method: "GET",
        path: "/v1/workspace/users" as const
    });

    const isEmployee = usersData?.[0]?.role === "employee" || isForbidden;

    // Redirect to dashboard when onboarding is complete
    if (!onboardingLoading && hasSchedule) {
        router.push("/app/dashboard");
    }

    const steps = [
        { id: 1, title: "Upload DNA", icon: FileUp, description: "Add your company's knowledge" },
        { id: 2, title: "Process", icon: Cpu, description: "AI indexing and vectorization" },
        { id: 3, title: "Test Chat", icon: MessageSquare, description: "Verify knowledge with a question" },
        { id: 4, title: "Generate", icon: Sparkles, description: "Create your first artifact" },
        { id: 5, title: "Schedule", icon: CalendarCheck, description: "Approve and schedule delivery" }
    ];

    if (onboardingLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (isEmployee) {
        return (
            <div className="flex h-[80vh] items-center justify-center max-w-md mx-auto text-center">
                <div className="space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <h2 className="text-2xl font-bold">Waiting for Admin Setup</h2>
                    <p className="text-muted-foreground">Your workspace administrator is currently setting up the company DNA. You will be able to access the platform once the initial setup is complete.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Workspace Setup</h1>
                <p className="text-muted-foreground">Complete these steps to unlock the full potential of your unified AI.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Sidebar Progress */}
                <div className="col-span-1 space-y-4">
                    {steps.map((s) => {
                        const isCompleted = currentStep > s.id;
                        const isCurrent = currentStep === s.id;
                        const isUpcoming = currentStep < s.id;

                        return (
                            <div
                                key={s.id}
                                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${isCurrent ? 'bg-primary/10 border border-primary/20' : ''} ${isCompleted ? 'opacity-70' : ''} ${isUpcoming ? 'opacity-40' : ''}`}
                            >
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <s.icon className="w-4 h-4" />}
                                </div>
                                <div>
                                    <h3 className={`text-sm font-semibold ${isCurrent ? 'text-primary' : ''}`}>{s.title}</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Main Content Area */}
                <div className="col-span-1 md:col-span-3">
                    <Card className="min-h-[400px] border-2 shadow-sm relative overflow-hidden">
                        <CardContent className="p-8">
                            {currentStep === 1 && <Step1Upload />}
                            {currentStep === 2 && <Step2Process />}
                            {currentStep === 3 && <Step3Chat />}
                            {currentStep === 4 && <Step4Generate />}
                            {currentStep === 5 && <Step5Schedule />}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// === STEP COMPONENTS === //

type DnaInputMode = "upload" | "manual";

function Step1Upload() {
    const [mode, setMode] = useState<DnaInputMode>("upload");
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const { accessToken } = useAuth();

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        const toastId = toast.loading("Uploading DNA document...");

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("source_name", file.name);

            // Use native fetch for multipart/form-data — openapi-fetch JSON-serializes the body
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
            const uploadRes = await fetch(`${baseUrl}/v1/dna/documents/upload`, {
                method: "POST",
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
                body: formData,
                credentials: 'include',
            });

            if (!uploadRes.ok) {
                const errBody = await uploadRes.json().catch(() => ({}));
                throw new Error((errBody as { error?: string }).error || "Upload failed");
            }

            const uploadData = await uploadRes.json() as { document?: { id?: string } };
            const docId = uploadData.document?.id;

            // Auto-start ingestion
            if (docId) {
                toast.loading("Starting indexing process...", { id: toastId });
                const ingestRes = await fetch(`${baseUrl}/v1/dna/documents/${docId}/ingest`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                    },
                    credentials: 'include',
                });
                if (!ingestRes.ok) {
                    const errBody = await ingestRes.json().catch(() => ({}));
                    throw new Error((errBody as { error?: string }).error || "Failed to start ingestion");
                }
            }

            toast.success("Document uploaded and indexing started", { id: toastId });
            window.location.reload();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Upload failed", { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    const handleManualSuccess = () => {
        window.location.reload();
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <FileUp className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Add Company Knowledge</h2>
                <p className="text-muted-foreground max-w-lg">Choose how to add your Company DNA — upload a document or write it manually.</p>
            </div>

            {/* Segmented control toggle */}
            <div className="flex rounded-lg border bg-muted/50 p-1 mb-6 max-w-md">
                <button
                    type="button"
                    onClick={() => setMode("upload")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === "upload"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <FileUp className="w-4 h-4" />
                    Upload PDF
                </button>
                <button
                    type="button"
                    onClick={() => setMode("manual")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === "manual"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <PenLine className="w-4 h-4" />
                    Write Manually
                </button>
            </div>

            {/* Upload PDF flow (existing) */}
            {mode === "upload" && (
                <form onSubmit={handleUpload} className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto space-y-6">
                    <div className="border-2 border-dashed border-input rounded-xl p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                        <input
                            type="file"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            accept=".pdf,.txt,.docx,.csv"
                        />
                        <FileUp className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                        {file ? (
                            <p className="font-medium text-primary">{file.name}</p>
                        ) : (
                            <div>
                                <p className="font-medium mb-1">Click or drag file to upload</p>
                                <p className="text-xs text-muted-foreground">PDF, TXT, DOCX up to 10MB</p>
                            </div>
                        )}
                    </div>

                    <Button type="submit" size="lg" disabled={!file || uploading} className="w-full">
                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Upload & Continue"}
                        {!uploading && <ChevronRight className="ml-2 h-4 w-4" />}
                    </Button>
                </form>
            )}

            {/* Write manually flow (new) */}
            {mode === "manual" && (
                <div className="flex-1 max-w-lg w-full mx-auto overflow-y-auto max-h-[60vh] pr-1">
                    <DnaManualForm onSuccess={handleManualSuccess} />
                </div>
            )}
        </div>
    );
}

function Step2Process() {
    const { refetch } = useOnboarding();

    // Poll the onboarding context at 5s intervals (ingestion step)
    useEffect(() => {
        const interval = setInterval(() => {
            refetch();
        }, 5000);
        return () => clearInterval(interval);
    }, [refetch]);

    return (
        <div className="flex flex-col h-full items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500 py-12">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 animate-pulse" />
                <div className="w-20 h-20 bg-background border-2 border-primary rounded-full flex items-center justify-center relative z-10">
                    <Cpu className="w-10 h-10 text-primary animate-pulse" />
                </div>
            </div>

            <h2 className="text-2xl font-bold mb-3">Processing your DNA</h2>
            <p className="text-muted-foreground max-w-sm mb-8">The AI engine is currently extracting, chunking, and indexing your document into the vector database. This normally takes 1-2 minutes.</p>

            <div className="w-full max-w-md bg-muted rounded-full h-2 mb-4 overflow-hidden">
                <div className="bg-primary h-full w-full rounded-full animate-pulse opacity-50 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                </div>
            </div>
            <p className="text-sm font-medium animate-pulse">Analyzing semantics and tokenizing...</p>
        </div>
    );
}

function Step3Chat() {
    const [msg, setMsg] = useState("");
    const [sending, setSending] = useState(false);
    const { accessToken } = useAuth();

    // Start session on mount if we don't have one
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!msg.trim()) return;
        setSending(true);
        const toastId = toast.loading("Starting session...");

        try {
            // 1. Create session
            const { data: sessionData, error: sessionErr } = await client.POST("/v1/chat/sessions", {
                body: { title: "Onboarding Chat" }
            });
            if (sessionErr || !sessionData?.id) throw new Error("Failed to create session");

            // 2. We don't need to stream the response here, just send a message to unlock step 4
            // Since useOnboarding just checks if a chat exists, just creating it unlocks it!
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/chat/sessions/${sessionData.id}/messages:stream`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
                },
                body: JSON.stringify({ content: msg })
            });

            if (!res.ok) throw new Error("Failed to send message");

            toast.success("Awesome!", { id: toastId });
            window.location.reload();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to test chat", { id: toastId });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            <div className="mb-8">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Test the AI Knowledge</h2>
                <p className="text-muted-foreground">Your document is indexed! Ask the AI a question about the document you just uploaded to see the magic in action.</p>
            </div>

            <form onSubmit={handleSend} className="flex-1 flex flex-col mt-4 max-w-lg w-full">
                <div className="bg-muted/30 p-4 rounded-xl border mb-4 h-48 flex items-end">
                    <div className="text-sm text-muted-foreground w-full text-center pb-8 italic">
                        Type a question below to start your first session...
                    </div>
                </div>
                <div className="flex gap-2">
                    <Input
                        placeholder="e.g. What is our company's mission?"
                        value={msg}
                        onChange={e => setMsg(e.target.value)}
                        className="flex-1"
                        autoFocus
                    />
                    <Button type="submit" disabled={!msg.trim() || sending}>
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

const TEMPLATES_QUERY_PARAMS = { query: { limit: 10 } };

function Step4Generate() {
    const [generating, setGenerating] = useState(false);
    const { accessToken } = useAuth();

    // We need a template. Fetch templates.
    const { data: templatesData } = useAuthedQuery<{ key: string, name: string }[]>({
        method: "GET",
        path: "/v1/templates" as const,
        params: TEMPLATES_QUERY_PARAMS
    });

    const templates = templatesData || [];
    const handleGenerate = async () => {
        if (templates.length === 0) {
            toast.error("No templates available. Please contact support.");
            return;
        }

        setGenerating(true);
        const toastId = toast.loading("Generating content...");
        const body = JSON.stringify({
            template_key: templates[0].key,
            title: "Onboarding Generation",
            vars: { topic: "Company Overview" }
        });
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/artifacts/generate:stream`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
                },
                body
            });

            if (!res.ok) throw new Error("Generation failed");

            // Wait for it to finish
            const reader = res.body?.getReader();
            if (reader) {
                while (true) {
                    const { done } = await reader.read();
                    if (done) break;
                }
            }

            toast.success("Artifact created successfully!", { id: toastId });
            window.location.reload();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error generating", { id: toastId });
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500 justify-center items-center text-center py-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 -rotate-6">
                <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Generate Content</h2>
            <p className="text-muted-foreground max-w-md mb-8">Let&apos;s create your first piece of content. The AI will use your DNA guidelines and a default template to draft a post.</p>

            <Button size="lg" onClick={handleGenerate} disabled={generating || templates.length === 0} className="w-full max-w-xs group">
                {generating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2 group-hover:text-yellow-300 transition-colors" />}
                {generating ? "Drafting Document..." : "Auto-Generate Draft"}
            </Button>
            {templates.length === 0 && !generating && (
                <p className="text-xs text-destructive mt-4">Loading templates...</p>
            )}
        </div>
    );
}

function Step5Schedule() {
    const [approving, setApproving] = useState(false);
    const { artifacts } = useOnboarding();

    const handleApprove = async () => {
        if (!artifacts || artifacts.length === 0) return;

        setApproving(true);
        const toastId = toast.loading("Approving & Scheduling...");

        try {
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ error?: { error?: string } }>>;
            const { error } = await apiClient.POST("/v1/artifacts/{id}/approve", {
                params: { path: { id: artifacts[0].id } },
                body: {
                    publish_start_date: new Date().toISOString().split('T')[0],
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    default_publish_time: "09:00"
                }
            });

            if (error) throw new Error(error.error || "Approval failed");

            toast.success("All set! Onboarding complete.", { id: toastId });
            window.location.reload();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error approving", { id: toastId });
        } finally {
            setApproving(false);
        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500 justify-center items-center text-center py-8">
            <div className="relative mb-6">
                <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center transform rotate-6">
                    <CalendarCheck className="w-8 h-8 text-green-500" />
                </div>
            </div>
            <h2 className="text-2xl font-bold mb-3">Approve & Schedule</h2>
            <p className="text-muted-foreground max-w-md mb-8">Your draft is ready. By approving it, the system will verify the payload and schedule it for delivery according to your settings.</p>

            <div className="bg-muted/50 p-4 rounded-lg w-full max-w-sm mb-6 text-left border overflow-hidden">
                <div className="h-2 w-1/3 bg-muted-foreground/20 rounded mb-3" />
                <div className="h-2 w-full bg-muted-foreground/20 rounded mb-2" />
                <div className="h-2 w-5/6 bg-muted-foreground/20 rounded mb-2" />
                <div className="h-2 w-4/6 bg-muted-foreground/20 rounded" />
            </div>

            <Button size="lg" onClick={handleApprove} disabled={approving} className="w-full max-w-xs bg-green-600 hover:bg-green-700 text-white">
                {approving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                {approving ? "Scheduling..." : "Approve Draft"}
            </Button>
        </div>
    );
}

