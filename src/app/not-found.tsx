"use client";

import { Button } from "@/components/ui/button";
import { MoveLeft } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground text-center p-4">
            <div className="space-y-4 max-w-md">
                <h1 className="text-8xl font-black text-primary/20 tracking-tighter">404</h1>
                <h2 className="text-2xl font-bold tracking-tight">Page Not Found</h2>
                <p className="text-muted-foreground">
                    Sorry, the page you are looking for doesn&apos;t exist or has been moved.
                </p>
                <div className="pt-6">
                    <Button onClick={() => window.location.href = "/"}>
                        <MoveLeft className="mr-2 h-4 w-4" /> Return Home
                    </Button>
                </div>
            </div>
        </div>
    );
}
