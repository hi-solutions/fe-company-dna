"use client";

import { useState } from "react";
import { client } from "@/api/client";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/hooks/use-onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { File, RefreshCw, UploadCloud, Play, Trash, List } from "lucide-react";

interface DNADoc {
    id: string;
    title: string;
    source_name: string;
    status: string;
    size_bytes: number;
    created_at: string;
}

interface DNAJob {
    id: string;
    status: string;
    attempt_count: number;
    error_message?: string;
    created_at: string;
    updated_at: string;
}

export default function DNAPage() {
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const router = useRouter();
    const { hasSchedule, loading: onboardingLoading } = useOnboarding();

    const [jobsModalOpen, setJobsModalOpen] = useState(false);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState<string | null>(null);

    const { data: documentsData, isLoading, refetch } = useAuthedQuery<DNADoc[]>({
        method: "GET",
        path: "/v1/dna/documents",
        params: { query: { limit: 50 } }
    });

    const documents = documentsData || [];

    const { data: jobsData, isLoading: jobsLoading } = useAuthedQuery<DNAJob[]>({
        method: "GET",
        path: "/v1/dna/documents/{docId}/jobs" as unknown as never,
        params: { path: { docId: selectedDocId || "" } },
        enabled: jobsModalOpen && !!selectedDocId
    });

    const jobs = jobsData || [];

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        const toastId = toast.loading("Uploading document...");

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("source_name", file.name);

            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ data?: { id?: string }, error?: { error?: string } }>>;
            const { data, error } = await apiClient.POST("/v1/dna/documents/upload", {
                body: formData as unknown as never
            });

            if (error) throw new Error(error.error || "Upload failed");

            toast.success("Document uploaded successfully", { id: toastId });
            setFile(null);

            if (data?.id) {
                toast.loading("Starting ingestion...", { id: toastId });
                await handleIngest(data.id, toastId);
            } else {
                refetch();
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "An error occurred during upload", { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    const handleIngest = async (docId: string, toastId?: string | number) => {
        const tId = toastId || toast.loading("Starting ingestion...");
        try {
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ error?: { error?: string } }>>;
            const { error } = await apiClient.POST("/v1/dna/documents/{docId}/ingest", {
                params: { path: { docId } }
            });
            if (error) throw new Error(error.error || "Failed to start ingestion");
            toast.success("Ingestion started", { id: tId });
            refetch();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error starting ingestion", { id: tId });
        }
    };

    const handleDelete = async () => {
        if (!docToDelete) return;
        const toastId = toast.loading("Deleting document...");
        try {
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ error?: { error?: string } }>>;
            const { error } = await apiClient.DELETE("/v1/dna/documents/{docId}", {
                params: { path: { docId: docToDelete } }
            });
            if (error) throw new Error(error.error || "Failed to delete document");
            toast.success("Document deleted", { id: toastId });
            refetch();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error deleting document", { id: toastId });
        }
    };

    const openJobsModal = (docId: string) => {
        setSelectedDocId(docId);
        setJobsModalOpen(true);
    };

    const openDeleteConfirm = (docId: string) => {
        setDocToDelete(docId);
        setDeleteConfirmOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Company DNA</h1>
                <Button onClick={refetch} variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Upload New DNA</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpload} className="flex gap-4 items-center">
                        <Input
                            type="file"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="max-w-md"
                            accept=".pdf,.txt,.md,.csv"
                            required
                        />
                        <Button type="submit" disabled={!file || uploading}>
                            {uploading ? "Uploading..." : <><UploadCloud className="mr-2 h-4 w-4" /> Upload & Ingest</>}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Indexed Knowledge</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading || onboardingLoading ? (
                        <div className="py-8 text-center text-muted-foreground">Loading documents...</div>
                    ) : documents.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded border border-dashed">
                            <File className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                            <p className="mb-4">No documents uploaded yet.</p>
                            {!hasSchedule && (
                                <Button onClick={() => router.push("/app/onboarding")}>Continue Setup</Button>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-md border border-border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Source Name</TableHead>
                                        <TableHead>Size (Bytes)</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Uploaded At</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {documents.map((doc) => (
                                        <TableRow key={doc.id}>
                                            <TableCell className="font-medium text-foreground">{doc.source_name}</TableCell>
                                            <TableCell className="text-muted-foreground">{doc.size_bytes.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        doc.status === 'indexed' ? 'success' :
                                                            doc.status === 'processing' ? 'default' :
                                                                doc.status === 'failed' ? 'destructive' : 'secondary'
                                                    }
                                                    className="capitalize"
                                                >
                                                    {doc.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {new Date(doc.created_at).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openJobsModal(doc.id)} title="View Jobs">
                                                        <List className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleIngest(doc.id)} title="Ingest Now">
                                                        <Play className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => openDeleteConfirm(doc.id)} title="Delete Document">
                                                        <Trash className="h-4 w-4 text-destructive" />
                                                    </Button>
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

            <Dialog open={jobsModalOpen} onOpenChange={setJobsModalOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Document Jobs</DialogTitle>
                        <DialogDescription>View the background processing jobs for this document.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {jobsLoading ? (
                            <p className="text-center text-muted-foreground">Loading jobs...</p>
                        ) : jobs.length === 0 ? (
                            <p className="text-center text-muted-foreground">No jobs found for this document.</p>
                        ) : (
                            <div className="rounded-md border border-border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Job ID</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Attempts</TableHead>
                                            <TableHead>Created At</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {jobs.map((job) => (
                                            <TableRow key={job.id}>
                                                <TableCell className="font-mono text-xs">{job.id}</TableCell>
                                                <TableCell>
                                                    <Badge variant={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'destructive' : 'secondary'} className="capitalize">
                                                        {job.status}
                                                    </Badge>
                                                    {job.error_message && (
                                                        <p className="text-xs text-destructive mt-1 break-all">{job.error_message}</p>
                                                    )}
                                                </TableCell>
                                                <TableCell>{job.attempt_count}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {new Date(job.created_at).toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                title="Delete Document"
                description="Are you sure you want to delete this document? This action cannot be undone."
                onConfirm={handleDelete}
                destructive
                confirmLabel="Delete"
            />
        </div>
    );
}
