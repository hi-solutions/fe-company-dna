"use client";


import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function AccessDeniedPage() {
    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] bg-background text-foreground text-center p-4">
            <div className="space-y-4 max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="h-24 w-24 bg-destructive/10 rounded-full flex items-center justify-center">
                        <ShieldAlert className="h-12 w-12 text-destructive" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
                <p className="text-muted-foreground">
                    You do not have the necessary permissions to view this page. If you believe this is an error, please contact your workspace administrator.
                </p>
                <div className="pt-8">
                    <Button onClick={() => window.location.href = "/app/dashboard"}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Return to Dashboard
                    </Button>
                </div>
            </div>
        </div>
    );
}
