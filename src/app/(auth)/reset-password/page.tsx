"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { client } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";


function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!token) {
            toast.error("Invalid or missing reset token.");
        }
    }, [token]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!token) {
            toast.error("Cannot reset password without a valid token.");
            return;
        }

        if (password.length < 8) {
            toast.error("Password must be at least 8 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        setIsLoading(true);
        try {
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ error?: { error?: string } }>>;
            const { error } = await apiClient.POST("/v1/auth/reset-password", {
                body: { token, new_password: password }
            });

            if (error) {
                let errorMsg = "Failed to reset password";
                if (typeof error === 'object' && 'error' in error) {
                    errorMsg = (error as { error?: string }).error || "Failed to reset password";
                }
                throw new Error(errorMsg);
            }

            toast.success("Password reset successfully. You can now log in.");
            router.push("/login");
        } catch (err: unknown) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "An error occurred. Your token might be expired.");
        } finally {
            setIsLoading(false);
        }
    }

    if (!token) {
        return (
            <CardContent className="py-6 text-center">
                <p className="text-sm text-destructive mb-4">No reset token found in the URL. Please request a new link.</p>
                <Button variant="outline" onClick={() => router.push("/forgot-password")}>
                    Go to Forgot Password
                </Button>
            </CardContent>
        );
    }

    return (
        <form onSubmit={onSubmit}>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        minLength={8}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                        minLength={8}
                    />
                </div>
            </CardContent>
            <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading || !password || !confirmPassword}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reset Password
                </Button>
            </CardFooter>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="flex h-screen w-full items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
                    <CardDescription>
                        Enter your new password below.
                    </CardDescription>
                </CardHeader>
                <Suspense fallback={<CardContent className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent>}>
                    <ResetPasswordForm />
                </Suspense>
            </Card>
        </div>
    );
}
