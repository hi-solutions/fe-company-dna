"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Global boundary caught:", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground text-center p-4">
            <div className="space-y-4 max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Something went wrong!</h2>
                <p className="text-muted-foreground text-sm">
                    An unexpected error occurred. Please try reloading the page.
                </p>
                <div className="pt-6 flex justify-center gap-4">
                    <Button onClick={() => window.location.reload()} variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" /> Reload Page
                    </Button>
                    <Button onClick={() => reset()}>
                        Try again
                    </Button>
                </div>
            </div>
        </div>
    );
}
