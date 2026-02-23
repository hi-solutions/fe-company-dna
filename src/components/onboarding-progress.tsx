"use client";

import Link from "next/link";
import { useOnboarding } from "@/hooks/use-onboarding";
import { usePathname } from "next/navigation";
import { CheckCircle2, CircleDashed } from "lucide-react";
import clsx from "clsx";

export function OnboardingProgress() {
    const { step, loading, progressPercent, hasSchedule } = useOnboarding();
    const pathname = usePathname();

    if (loading || hasSchedule) return null;

    // Determine color based on progress
    let colorClass = "bg-red-500";
    if (progressPercent >= 100) colorClass = "bg-green-500";
    else if (progressPercent >= 50) colorClass = "bg-yellow-500";

    return (
        <Link href="/app/onboarding" className="group flex items-center gap-3 py-1 px-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border">
            <div className="flex flex-col gap-1 w-24">
                <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    <span>Setup</span>
                    <span>{Math.round(progressPercent)}%</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                        className={clsx("h-full transition-all duration-500 ease-in-out", colorClass)}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>
            {progressPercent >= 100 ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
                <CircleDashed className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            )}
        </Link>
    );
}
