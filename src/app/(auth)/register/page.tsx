"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { client } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
    const [workspaceName, setWorkspaceName] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const { error: apiError } = await client.POST("/v1/auth/register", {
                body: {
                    workspace_name: workspaceName,
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    password
                },
            });

            if (apiError) {
                setError((apiError as { error?: string }).error || "Registration failed. Please check your inputs.");
            } else {
                // Automatically route to login after successful register
                router.push("/login?registered=true");
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 py-12">
            <Card className="w-full max-w-lg">
                <form onSubmit={handleRegister}>
                    <CardHeader>
                        <CardTitle className="text-2xl">Create a Workspace</CardTitle>
                        <CardDescription>Fill out the fields to start your Hi-Solutions DNA instance.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {error && <div className="p-3 text-sm text-red-600 bg-red-100 rounded-md">{error}</div>}

                        <div className="grid gap-2">
                            <Label htmlFor="workspaceName">Workspace Name</Label>
                            <Input id="workspaceName" placeholder="Acme Corp" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input id="firstName" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input id="lastName" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Work Email</Label>
                            <Input id="email" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} />
                            <p className="text-xs text-muted-foreground">Must be at least 8 characters long.</p>
                        </div>

                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create Workspace & Account"}
                        </Button>
                        <div className="text-center text-sm">
                            Already have an account?{" "}
                            <Link href="/login" className="underline text-primary">
                                Log in
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
