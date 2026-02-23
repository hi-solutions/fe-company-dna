"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { client } from "@/api/client";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { JsonViewer } from "@/components/ui/json-viewer";
import { toast } from "sonner";
import { ArrowLeft, Clock, Share2, Copy, Trash, Edit, RefreshCw, AlertCircle } from "lucide-react";

interface Post {
    id: string;
    schedule_id: string;
    platform: string;
    publish_at: string;
    payload_json: string;
    status: string;
    error_message?: string;
    created_at: string;
}

export default function SchedulePostsPage() {
    const params = useParams();
    const router = useRouter();
    const scheduleId = params.id as string;

    const [editPost, setEditPost] = useState<Post | null>(null);
    const [editPlatform, setEditPlatform] = useState("");
    const [editPublishAt, setEditPublishAt] = useState("");
    const [editPayload, setEditPayload] = useState("");
    const [editStatus, setEditStatus] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const [deletePostId, setDeletePostId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { data: postsData, isLoading, refetch } = useAuthedQuery<{ data: Post[] }>({
        method: "GET",
        path: "/v1/schedules/{scheduleId}/posts" as const,
        params: { path: { scheduleId } },
        enabled: !!scheduleId
    });

    const posts = postsData?.data || [];

    const handleDuplicate = async (postId: string) => {
        const toastId = toast.loading("Duplicating post...");
        try {
            // we send the current time + 1 hour for the new publish_at to avoid instant conflicts
            const newPublishAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ error?: { error?: string } }>>;
            const { error } = await apiClient.POST("/v1/schedules/{scheduleId}/posts/{postId}/duplicate", {
                params: { path: { scheduleId, postId } },
                body: { publish_at: newPublishAt }
            });
            if (error) throw new Error(error.error || "Failed to duplicate post");
            toast.success("Post duplicated successfully", { id: toastId });
            refetch();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error duplicating post", { id: toastId });
        }
    };

    const handleDelete = async () => {
        if (!deletePostId) return;
        setIsDeleting(true);
        const toastId = toast.loading("Deleting post...");
        try {
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ error?: { error?: string } }>>;
            const { error } = await apiClient.DELETE("/v1/schedules/{scheduleId}/posts/{postId}", {
                params: { path: { scheduleId, postId: deletePostId } }
            });
            if (error) throw new Error(error.error || "Failed to delete post");
            toast.success("Post deleted", { id: toastId });
            refetch();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error deleting post", { id: toastId });
        } finally {
            setIsDeleting(false);
            setDeletePostId(null);
        }
    };

    const openEditDialog = (post: Post) => {
        setEditPost(post);
        setEditPlatform(post.platform);
        setEditStatus(post.status);

        let payloadString = post.payload_json;
        try {
            if (typeof post.payload_json === 'object') {
                payloadString = JSON.stringify(post.payload_json, null, 2);
            } else {
                payloadString = JSON.stringify(JSON.parse(post.payload_json), null, 2);
            }
        } catch { }
        setEditPayload(payloadString);

        // Format date for datetime-local input (YYYY-MM-DDThh:mm)
        try {
            const date = new Date(post.publish_at);
            // Quick local formatting hack for datetime-local
            const tzoffset = date.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
            setEditPublishAt(localISOTime);
        } catch {
            setEditPublishAt(post.publish_at);
        }
    };

    const handleSaveEdit = async () => {
        if (!editPost) return;
        let finalPayload;
        try {
            finalPayload = JSON.parse(editPayload);
        } catch {
            toast.error("Payload must be valid JSON");
            return;
        }

        const pubDate = new Date(editPublishAt);
        if (pubDate.getTime() < Date.now()) {
            toast.error("Publish time must be in the future");
            return;
        }

        setIsSaving(true);
        const toastId = toast.loading("Saving post...");
        try {
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ error?: { error?: string } }>>;
            const { error } = await apiClient.PATCH("/v1/schedules/{scheduleId}/posts/{postId}", {
                params: { path: { scheduleId, postId: editPost.id } },
                body: {
                    platform: editPlatform,
                    publish_at: new Date(editPublishAt).toISOString(),
                    payload_json: finalPayload,
                    status: editStatus as "queued" | "canceled"
                }
            });
            if (error) throw new Error(error.error || "Failed to update post");
            toast.success("Post updated successfully", { id: toastId });
            setEditPost(null);
            refetch();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error updating post", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/app/schedules")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Schedule Details</h1>
                        <p className="text-sm text-muted-foreground font-mono mt-1">ID: {scheduleId}</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={refetch}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh Status
                </Button>
            </div>

            {isLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-64 bg-muted animate-pulse rounded-xl"></div>)}
                </div>
            ) : posts.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <Share2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
                        <p>No posts generate for this schedule yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {posts.map(post => {
                        let parsedPayload = post.payload_json;
                        try {
                            if (typeof post.payload_json === 'string') {
                                parsedPayload = JSON.parse(post.payload_json);
                            }
                        } catch { }

                        return (
                            <Card key={post.id} className="flex flex-col overflow-hidden">
                                <CardHeader className="bg-muted/30 pb-3 border-b border-border/50">
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline" className="capitalize text-xs">
                                            {post.platform}
                                        </Badge>
                                        <Badge variant={
                                            post.status === 'posted' ? 'success' :
                                                post.status === 'queued' ? 'default' :
                                                    post.status === 'failed' ? 'destructive' :
                                                        post.status === 'posting' ? 'warning' : 'secondary'
                                        } className="capitalize">
                                            {post.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center mt-3 text-sm font-medium">
                                        <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                                        {new Date(post.publish_at).toLocaleString()}
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 flex-1">
                                    <div className="max-h-[150px] overflow-y-auto w-full text-xs">
                                        <JsonViewer data={parsedPayload} className="bg-transparent p-0" />
                                    </div>
                                    {post.error_message && (
                                        <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded-md flex items-start text-xs text-destructive">
                                            <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
                                            <span className="break-all">{post.error_message}</span>
                                        </div>
                                    )}
                                </CardContent>
                                <div className="border-t border-border/50 bg-muted/10 p-2 flex justify-end gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => handleDuplicate(post.id)} title="Duplicate Post">
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(post)} title="Edit Post">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setDeletePostId(post.id)} title="Delete Post">
                                        <Trash className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}

            <Dialog open={!!editPost} onOpenChange={(open: boolean) => !open && setEditPost(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Post</DialogTitle>
                        <DialogDescription>Modify the content, platform, and scheduling time for this post.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="platform">Platform</Label>
                                <Input id="platform" value={editPlatform} onChange={e => setEditPlatform(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <select
                                    id="status"
                                    value={editStatus}
                                    onChange={e => setEditStatus(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="queued">Queued</option>
                                    <option value="canceled">Canceled</option>
                                    <option value="posted" disabled>Posted</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="publishAt">Publish At (Local Time)</Label>
                            <Input id="publishAt" type="datetime-local" value={editPublishAt} onChange={e => setEditPublishAt(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="payload">Payload Data (JSON)</Label>
                            <textarea
                                id="payload"
                                value={editPayload}
                                onChange={e => setEditPayload(e.target.value)}
                                className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditPost(null)}>Cancel</Button>
                        <Button onClick={handleSaveEdit} disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deletePostId}
                onOpenChange={(open: boolean) => !open && !isDeleting && setDeletePostId(null)}
                title="Delete Post"
                description="Are you sure you want to delete this post? This action cannot be undone."
                onConfirm={handleDelete}
                destructive
                confirmLabel="Delete"
            />
        </div>
    );
}
