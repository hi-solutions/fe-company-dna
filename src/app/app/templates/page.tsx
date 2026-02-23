"use client";

import { useState } from "react";
import { client } from "@/api/client";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash, LayoutTemplate, RefreshCw } from "lucide-react";

interface Template {
    id?: string;
    key: string;
    name: string;
    description: string;
    category: string;
    language: string;
    model: string;
    system_prompt: string;
    user_template: string;
    version?: number;
    is_active: boolean;
}

const defaultTemplate: Template = {
    key: "",
    name: "",
    description: "",
    category: "general",
    language: "en",
    model: "gpt-4",
    system_prompt: "You are an AI assistant.",
    user_template: "Context: {context}\\nGenerate a response.",
    is_active: true
};

export default function TemplatesPage() {
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);


    const { data: templatesData, isLoading, refetch } = useAuthedQuery<{ data: Template[] }>({
        method: "GET",
        path: "/v1/templates",
        params: { query: { limit: 100 } }
    });

    const templates = templatesData?.data || [];

    const handleOpenEdit = (template?: Template) => {
        setEditingTemplate(template || { ...defaultTemplate });
        setEditModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTemplate || !editingTemplate.key) return;

        setIsSaving(true);
        const isNew = !editingTemplate.id; // if no ID, it's a new template
        const toastId = toast.loading(isNew ? "Creating template..." : "Updating template...");

        try {
            let error;
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ error?: { error?: string } }>>;
            if (isNew) {
                const res = await apiClient.POST("/v1/templates", {
                    body: editingTemplate
                });
                error = res.error;
            } else {
                const res = await apiClient.PUT("/v1/templates/{key}", {
                    params: { path: { key: editingTemplate.key } },
                    body: editingTemplate
                });
                error = res.error;
            }

            if (error) throw new Error(error.error || "Failed to save template");

            toast.success(isNew ? "Template created" : "Template updated", { id: toastId });
            setEditModalOpen(false);
            refetch();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error saving template", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!templateToDelete) return;

        const toastId = toast.loading("Deleting template...");
        try {
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ error?: { error?: string } }>>;
            const { error } = await apiClient.DELETE("/v1/templates/{key}", {
                params: { path: { key: templateToDelete } }
            });
            if (error) throw new Error(error.error || "Failed to delete template");
            toast.success("Template deleted", { id: toastId });
            refetch();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error deleting template", { id: toastId });
        } finally {
            setDeleteModalOpen(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Content Templates</h1>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={refetch}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                    </Button>
                    <Button size="sm" onClick={() => handleOpenEdit()}>
                        <Plus className="mr-2 h-4 w-4" /> New Template
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>System Templates</CardTitle>
                    <CardDescription>Manage prompt templates used by the AI engine.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="py-12 text-center text-muted-foreground animate-pulse">Loading templates...</div>
                    ) : templates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <LayoutTemplate className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p>No templates created yet.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border border-border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name & Key</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Model</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {templates.map(template => (
                                        <TableRow key={template.key}>
                                            <TableCell>
                                                <div className="font-medium text-foreground">{template.name}</div>
                                                <div className="text-xs text-muted-foreground font-mono">{template.key}</div>
                                            </TableCell>
                                            <TableCell className="capitalize text-muted-foreground">{template.category}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{template.model}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={template.is_active ? 'success' : 'secondary'}>
                                                    {template.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(template)} title="Edit Template">
                                                        <Edit className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => {
                                                        setTemplateToDelete(template.key);
                                                        setDeleteModalOpen(true);
                                                    }} title="Delete Template">
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

            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingTemplate?.id ? "Edit Template" : "New Template"}</DialogTitle>
                        <DialogDescription>Configure the system prompts and variables for AI generation.</DialogDescription>
                    </DialogHeader>
                    {editingTemplate && (
                        <form id="template-form" onSubmit={handleSave} className="grid gap-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="key">Unique Key</Label>
                                    <Input
                                        id="key"
                                        value={editingTemplate.key}
                                        onChange={e => setEditingTemplate({ ...editingTemplate, key: e.target.value })}
                                        disabled={!!editingTemplate.id} // cannot change key once created usually
                                        required
                                        placeholder="e.g. blog_post"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Display Name</Label>
                                    <Input
                                        id="name"
                                        value={editingTemplate.name}
                                        onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                                        required
                                        placeholder="e.g. Blog Post Generator"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Input id="category" value={editingTemplate.category} onChange={e => setEditingTemplate({ ...editingTemplate, category: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="model">Model</Label>
                                    <Input id="model" value={editingTemplate.model} onChange={e => setEditingTemplate({ ...editingTemplate, model: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="language">Language</Label>
                                    <Input id="language" value={editingTemplate.language} onChange={e => setEditingTemplate({ ...editingTemplate, language: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input id="description" value={editingTemplate.description} onChange={e => setEditingTemplate({ ...editingTemplate, description: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="system_prompt">System Prompt</Label>
                                <textarea
                                    id="system_prompt"
                                    value={editingTemplate.system_prompt}
                                    onChange={e => setEditingTemplate({ ...editingTemplate, system_prompt: e.target.value })}
                                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="user_template">User Prompt Template (use {'{var}'} for variables)</Label>
                                <textarea
                                    id="user_template"
                                    value={editingTemplate.user_template}
                                    onChange={e => setEditingTemplate({ ...editingTemplate, user_template: e.target.value })}
                                    className="flex min-h-[150px] font-mono w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={editingTemplate.is_active}
                                    onChange={e => setEditingTemplate({ ...editingTemplate, is_active: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor="is_active" className="cursor-pointer">Active Template</Label>
                            </div>
                        </form>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
                        <Button type="submit" form="template-form" disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save Template"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                title="Delete Template"
                description={`Are you sure you want to delete template ${templateToDelete}?`}
                onConfirm={handleDelete}
                destructive
                confirmLabel="Delete"
            />
        </div>
    );
}
