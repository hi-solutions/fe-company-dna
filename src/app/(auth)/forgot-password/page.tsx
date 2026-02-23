"use client";

import { useState } from "react";
import Link from "next/link";
import { MoveLeft, Loader2 } from "lucide-react";
import { client } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email) return;

        setIsLoading(true);
        try {
            // Endpoint to request a password reset email
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ error?: { error?: string } }>>;
            await apiClient.POST("/v1/auth/forgot-password", {
                body: { email }
            });
            // We always show success to prevent email enumeration
            setIsSubmitted(true);
            toast.success("Reset link sent if the account exists.");
        } catch (err: unknown) {
            // Event if it fails, we show success in UI generally, but if it's a network error we can show it
            console.error(err);
            toast.error("An error occurred. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex h-screen w-full items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
                    <CardDescription>
                        {isSubmitted
                            ? "Check your email for a reset link."
                            : "Enter your email address to receive a password reset link."}
                    </CardDescription>
                </CardHeader>
                {!isSubmitted ? (
                    <form onSubmit={onSubmit}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col space-y-4">
                            <Button type="submit" className="w-full" disabled={isLoading || !email}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Reset Link
                            </Button>
                            <div className="text-center text-sm">
                                <Link href="/login" className="flex items-center justify-center text-primary hover:underline font-medium">
                                    <MoveLeft className="mr-2 h-4 w-4" /> Back to Login
                                </Link>
                            </div>
                        </CardFooter>
                    </form>
                ) : (
                    <CardFooter className="flex flex-col space-y-4 pt-6">
                        <Button type="button" className="w-full" variant="outline" onClick={() => setIsSubmitted(false)}>
                            Try another email
                        </Button>
                        <div className="text-center text-sm">
                            <Link href="/login" className="flex items-center justify-center text-primary hover:underline font-medium">
                                <MoveLeft className="mr-2 h-4 w-4" /> Back to Login
                            </Link>
                        </div>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
