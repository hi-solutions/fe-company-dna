import * as React from "react"
import { cn } from "@/lib/utils"

interface JsonViewerProps {
    data: unknown;
    className?: string;
}

export function JsonViewer({ data, className }: JsonViewerProps) {
    const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    return (
        <div className={cn("rounded-md bg-muted p-4 overflow-x-auto", className)}>
            <pre className="text-xs font-mono text-foreground">
                <code>{jsonString}</code>
            </pre>
        </div>
    )
}
