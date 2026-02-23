"use client";

import { useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { client } from "@/api/client";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, User as UserIcon, Shield, Building2, UploadCloud } from "lucide-react";

export default function SettingsPage() {
    const { accessToken } = useAuth();
    const [activeTab, setActiveTab] = useState<"profile" | "security" | "workspace">("profile");

    const { data: userData } = useAuthedQuery<{ role: string }>({
        method: "GET",
        path: "/v1/users/me"
    });

    const role = userData?.role;
    const isAdmin = role === "admin" || role === "super_admin";

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your account and workspace preferences.</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                <aside className="w-full md:w-64 shrink-0">
                    <nav className="flex space-x-2 md:flex-col md:space-x-0 md:space-y-1">
                        <button
                            onClick={() => setActiveTab("profile")}
                            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md w-full transition-colors ${activeTab === 'profile' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                        >
                            <UserIcon className="mr-3 h-4 w-4" /> Profile
                        </button>
                        <button
                            onClick={() => setActiveTab("security")}
                            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md w-full transition-colors ${activeTab === 'security' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                        >
                            <Shield className="mr-3 h-4 w-4" /> Security
                        </button>
                        {isAdmin && (
                            <button
                                onClick={() => setActiveTab("workspace")}
                                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md w-full transition-colors ${activeTab === 'workspace' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                            >
                                <Building2 className="mr-3 h-4 w-4" /> Workspace
                            </button>
                        )}
                    </nav>
                </aside>

                <div className="flex-1">
                    {activeTab === "profile" && <ProfileSettings />}
                    {activeTab === "security" && <SecuritySettings />}
                    {activeTab === "workspace" && isAdmin && <WorkspaceSettings accessToken={accessToken} />}
                </div>
            </div>
        </div>
    );
}

function ProfileSettings() {
    const { data: userData, isLoading: userLoading, refetch } = useAuthedQuery<{ first_name: string; last_name: string; email: string }>({
        method: "GET",
        path: "/v1/users/me"
    });

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Sync input state once data is loaded
    useState(() => {
        if (userData) {
            setFirstName(userData.first_name || "");
            setLastName(userData.last_name || "");
        }
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const toastId = toast.loading("Saving profile...");
        try {
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ error?: { error?: string } }>>;
            const { error } = await apiClient.PATCH("/v1/users/me", {
                body: { first_name: firstName, last_name: lastName }
            });
            if (error) throw new Error(error.error || "Failed to update profile");
            toast.success("Profile updated", { id: toastId });
            refetch();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error updating profile", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    if (userLoading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground mr-2" />Loading...</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Update your personal information.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSave}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={userData?.email || ""} disabled />
                        <p className="text-xs text-muted-foreground">Email address cannot be changed</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First name</Label>
                            <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last name</Label>
                            <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save changes
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

function SecuritySettings() {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 8) {
            toast.error("New password must be at least 8 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        setIsSaving(true);
        const toastId = toast.loading("Updating password...");
        try {
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ error?: { error?: string } }>>;
            const { error } = await apiClient.POST("/v1/users/me/change-password", {
                body: { old_password: oldPassword, new_password: newPassword }
            });
            if (error) throw new Error(error.error || "Failed to update password");
            toast.success("Password updated successfully", { id: toastId });
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error updating password", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Change your password and secure your account.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSave}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="oldPassword">Current password</Label>
                        <Input id="oldPassword" type="password" required value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">New password</Label>
                        <Input id="newPassword" type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm new password</Label>
                        <Input id="confirmPassword" type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update password
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

function WorkspaceSettings({ accessToken }: { accessToken: string | null }) {
    const { data: wsData, isLoading: wsLoading, refetch } = useAuthedQuery<{ name: string; logo_url: string }>({
        method: "GET",
        path: "/v1/workspace/me"
    });

    const [wsName, setWsName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const [uploadingLogo, setUploadingLogo] = useState(false);

    // Sync input state once data is loaded
    useState(() => {
        if (wsData) {
            setWsName(wsData.name || "");
        }
    });

    const handleSaveInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const toastId = toast.loading("Saving workspace...");
        try {
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ error?: { error?: string } }>>;
            const { error } = await apiClient.PATCH("/v1/workspace/me", {
                body: { name: wsName }
            });
            if (error) throw new Error(error.error || "Failed to update workspace");
            toast.success("Workspace updated", { id: toastId });
            refetch();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error updating workspace", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setUploadingLogo(true);
        const toastId = toast.loading("Uploading logo...");

        try {
            const formData = new FormData();
            formData.append("logo", file);

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/workspace/logo`, {
                method: "POST",
                headers: {
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
                },
                body: formData
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Upload failed");
            }

            toast.success("Logo uploaded successfully", { id: toastId });
            refetch();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to upload logo", { id: toastId });
        } finally {
            setUploadingLogo(false);
        }
    };

    if (wsLoading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground mr-2" />Loading...</div>;

    const workspace = wsData;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Workspace Settings</CardTitle>
                    <CardDescription>Update your company workspace preferences.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSaveInfo}>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="wsName">Workspace Name</Label>
                                <Input id="wsName" value={wsName} onChange={e => setWsName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Workspace Logo URL</Label>
                                <Input value={workspace?.logo_url || "No logo uploaded"} disabled />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save workspace
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Update Logo</CardTitle>
                    <CardDescription>Upload a custom logo to brand your workspace.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center w-full">
                        <label htmlFor="dropzone-file" className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/50 border-border transition-colors ${uploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {uploadingLogo ? <Loader2 className="w-8 h-8 text-muted-foreground mb-4 animate-spin" /> : <UploadCloud className="w-8 h-8 text-muted-foreground mb-4" />}
                                <p className="mb-2 text-sm text-foreground font-medium">Click to upload logo</p>
                                <p className="text-xs text-muted-foreground">PNG, JPG or SVG (Max 2MB)</p>
                            </div>
                            <input id="dropzone-file" type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                        </label>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
