"use client";

import { useState } from "react";
import { client } from "@/api/client";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, UserMinus, UserCheck, RefreshCw, Users, Mail } from "lucide-react";

interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: "super_admin" | "admin" | "employee";
    is_active: boolean;
    created_at: string;
}

export default function MembersPage() {
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteFirstName, setInviteFirstName] = useState("");
    const [inviteLastName, setInviteLastName] = useState("");
    const [inviteRole, setInviteRole] = useState<"admin" | "employee">("employee");
    const [isInviting, setIsInviting] = useState(false);

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editRole, setEditRole] = useState<"admin" | "employee">("employee");
    const [editActive, setEditActive] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const { data: usersData, isLoading, refetch } = useAuthedQuery<{ data: User[] }>({
        method: "GET",
        path: "/v1/workspace/users"
    });

    const users = usersData?.data || [];

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsInviting(true);
        const toastId = toast.loading("Sending invitation...");

        try {
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ error?: { error?: string } }>>;
            const { error } = await apiClient.POST("/v1/workspace/users/invite", {
                body: {
                    email: inviteEmail,
                    first_name: inviteFirstName,
                    last_name: inviteLastName,
                    role: inviteRole
                }
            });

            if (error) throw new Error(error.error || "Failed to invite user");

            toast.success("User invited successfully", { id: toastId });
            setInviteModalOpen(false);
            setInviteEmail("");
            setInviteFirstName("");
            setInviteLastName("");
            refetch();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error inviting user", { id: toastId });
        } finally {
            setIsInviting(false);
        }
    };

    const handleOpenEdit = (user: User) => {
        if (user.role === 'super_admin') {
            toast.error("Cannot edit super admin users here");
            return;
        }
        setEditingUser(user);
        setEditRole(user.role as "admin" | "employee");
        setEditActive(user.is_active);
        setEditModalOpen(true);
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setIsSaving(true);
        const toastId = toast.loading("Updating user...");

        try {
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ error?: { error?: string } }>>;
            const { error } = await apiClient.PATCH("/v1/workspace/users/{id}", {
                params: { path: { id: editingUser.id } },
                body: { role: editRole, is_active: editActive }
            });

            if (error) throw new Error(error.error || "Failed to update user");

            toast.success("User updated successfully", { id: toastId });
            setEditModalOpen(false);
            refetch();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error updating user", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleStatus = async (user: User) => {
        if (user.role === 'super_admin') {
            toast.error("Cannot modify super admin status");
            return;
        }

        const action = user.is_active ? "deactivate" : "reactivate";
        const toastId = toast.loading(`Attempting to ${action} user...`);

        try {
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ error?: { error?: string } }>>;
            const { error } = await apiClient.PATCH("/v1/workspace/users/{id}", {
                params: { path: { id: user.id } },
                body: { is_active: !user.is_active }
            });

            if (error) throw new Error(error.error || `Failed to ${action} user`);

            toast.success(`User ${user.is_active ? 'deactivated' : 'reactivated'}`, { id: toastId });
            refetch();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : `Error trying to ${action} user`, { id: toastId });
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center">
                        <Users className="mr-3 h-6 w-6 text-primary" />
                        Team Members
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage workspace users and their access roles.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={refetch}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                    </Button>
                    <Button size="sm" onClick={() => setInviteModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Invite Member
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Directory</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="py-12 text-center text-muted-foreground animate-pulse">Loading members...</div>
                    ) : users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p>No other members found in this workspace.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border border-border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Joined</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map(user => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="font-medium text-foreground">{user.first_name} {user.last_name}</div>
                                                <div className="text-xs text-muted-foreground flex items-center">
                                                    <Mail className="h-3 w-3 mr-1" /> {user.email}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {user.role.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.is_active ? 'success' : 'secondary'}>
                                                    {user.is_active ? 'Active' : 'Deactivated'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleOpenEdit(user)}
                                                        disabled={user.role === 'super_admin'}
                                                        title="Edit User"
                                                    >
                                                        <Edit className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleToggleStatus(user)}
                                                        disabled={user.role === 'super_admin'}
                                                        title={user.is_active ? "Deactivate User" : "Reactivate User"}
                                                    >
                                                        {user.is_active ? (
                                                            <UserMinus className="h-4 w-4 text-warning" />
                                                        ) : (
                                                            <UserCheck className="h-4 w-4 text-success" />
                                                        )}
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

            {/* Invite Modal */}
            <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite Member</DialogTitle>
                        <DialogDescription>Send an invitation email to add a new user to the workspace.</DialogDescription>
                    </DialogHeader>
                    <form id="invite-form" onSubmit={handleInvite} className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input id="email" type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First name</Label>
                                <Input id="firstName" required value={inviteFirstName} onChange={e => setInviteFirstName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last name</Label>
                                <Input id="lastName" required value={inviteLastName} onChange={e => setInviteLastName(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Workspace Role</Label>
                            <select
                                id="role"
                                value={inviteRole}
                                onChange={e => setInviteRole(e.target.value as "admin" | "employee")}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            >
                                <option value="employee">Employee</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setInviteModalOpen(false)}>Cancel</Button>
                        <Button type="submit" form="invite-form" disabled={isInviting || !inviteEmail}>
                            {isInviting ? "Inviting..." : "Send Invite"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Member</DialogTitle>
                        <DialogDescription>Update the role and status for {editingUser?.first_name} {editingUser?.last_name}.</DialogDescription>
                    </DialogHeader>
                    <form id="edit-form" onSubmit={handleSaveEdit} className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="editRole">Workspace Role</Label>
                            <select
                                id="editRole"
                                value={editRole}
                                onChange={e => setEditRole(e.target.value as "admin" | "employee")}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            >
                                <option value="employee">Employee</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="editActive"
                                checked={editActive}
                                onChange={e => setEditActive(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary"
                            />
                            <Label htmlFor="editActive" className="cursor-pointer">Active User</Label>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
                        <Button type="submit" form="edit-form" disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
