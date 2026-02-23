"use client";

import { createContext, useContext, useEffect, useCallback, useRef, useMemo, ReactNode } from "react";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { useAuth } from "@/auth/AuthProvider";

interface DNADoc {
    id: string;
    status: string;
}

interface ChatSession {
    id: string;
}

interface Artifact {
    id: string;
    status: string;
}

interface Schedule {
    id: string;
}

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

interface OnboardingState {
    step: OnboardingStep;
    loading: boolean;
    progressPercent: number;
    nextRoute: string;
    hasDNA: boolean;
    hasIndexedDNA: boolean;
    hasChat: boolean;
    hasArtifact: boolean;
    hasSchedule: boolean;
    documents?: DNADoc[];
    sessions?: ChatSession[];
    artifacts?: Artifact[];
    schedules?: Schedule[];
    isForbidden: boolean;
    refetch: () => void;
}

const defaultState: OnboardingState = {
    step: 1,
    loading: true,
    progressPercent: 0,
    nextRoute: "/app/onboarding",
    hasDNA: false,
    hasIndexedDNA: false,
    hasChat: false,
    hasArtifact: false,
    hasSchedule: false,
    isForbidden: false,
    refetch: () => { },
};

const OnboardingContext = createContext<OnboardingState>(defaultState);

const DNA_QUERY_PARAMS = { query: { limit: 1 } };
const CHAT_QUERY_PARAMS = { query: { limit: 1 } };
const ARTIFACTS_QUERY_PARAMS = { query: { limit: 1 } };
const SCHEDULES_QUERY_PARAMS = { query: { limit: 1 } };

export function OnboardingProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();

    // 1. Check DNA
    const {
        data: documentsData,
        isLoading: dnaLoading,
        statusCode: dnaStatus,
        refetch: refetchDna
    } = useAuthedQuery<{ data: DNADoc[] }>({
        method: "GET",
        path: "/v1/dna/documents",
        params: DNA_QUERY_PARAMS,
        enabled: isAuthenticated
    });

    // Derive 403 directly from status code (no ref, no state, no effect)
    const isForbidden = dnaStatus === 403;

    // 2. Check Chat Sessions
    const { data: sessionsData, isLoading: chatLoading, refetch: refetchChat } = useAuthedQuery<{ data: ChatSession[] }>({
        method: "GET",
        path: "/v1/chat/sessions",
        params: CHAT_QUERY_PARAMS,
        enabled: isAuthenticated
    });

    // 3. Check Artifacts
    const { data: artifactsData, isLoading: artifactsLoading, refetch: refetchArtifacts } = useAuthedQuery<{ data: Artifact[] }>({
        method: "GET",
        path: "/v1/artifacts",
        params: ARTIFACTS_QUERY_PARAMS,
        enabled: isAuthenticated
    });

    // 4. Check Schedules
    const { data: schedulesData, isLoading: schedulesLoading, refetch: refetchSchedules } = useAuthedQuery<{ data: Schedule[] }>({
        method: "GET",
        path: "/v1/schedules",
        params: SCHEDULES_QUERY_PARAMS,
        enabled: isAuthenticated
    });

    const loading = dnaLoading || chatLoading || artifactsLoading || schedulesLoading;

    const hasDNA = !!(documentsData?.data && documentsData.data.length > 0);
    const hasIndexedDNA = !!(documentsData?.data && documentsData.data.some(d =>
        d.status === 'READY' || d.status === 'INDEXED' || d.status === 'indexed' || d.status === 'ready'
    ));
    const hasChat = !!(sessionsData?.data && sessionsData.data.length > 0);
    const hasArtifact = !!(artifactsData?.data && artifactsData.data.length > 0);
    const hasSchedule = !!(schedulesData?.data && schedulesData.data.length > 0);

    let step: OnboardingStep = 1;
    if (isForbidden) step = 1;
    else if (hasSchedule) step = 6;
    else if (hasArtifact) step = 5;
    else if (hasChat) step = 4;
    else if (hasIndexedDNA) step = 3;
    else if (hasDNA) step = 2;
    else step = 1;

    const progressPercent = Math.min(100, Math.max(0, ((step - 1) / 5) * 100));

    const nextRoute = step === 6 ? "/app/dashboard" : "/app/onboarding";

    // Slow polling: re-check every 30s, unless done
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const refetchAll = useCallback(() => {
        refetchDna();
        refetchChat();
        refetchArtifacts();
        refetchSchedules();
    }, [refetchDna, refetchChat, refetchArtifacts, refetchSchedules]);

    useEffect(() => {
        if (hasSchedule) {
            if (pollRef.current) clearInterval(pollRef.current);
            return;
        }

        pollRef.current = setInterval(refetchAll, 30_000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [hasSchedule, refetchAll]);

    const value: OnboardingState = useMemo(() => ({
        step,
        loading,
        progressPercent,
        nextRoute,
        hasDNA,
        hasIndexedDNA,
        hasChat,
        hasArtifact,
        hasSchedule,
        documents: documentsData?.data,
        sessions: sessionsData?.data,
        artifacts: artifactsData?.data,
        schedules: schedulesData?.data,
        isForbidden,
        refetch: refetchAll,
    }), [step, loading, progressPercent, nextRoute, hasDNA, hasIndexedDNA, hasChat, hasArtifact, hasSchedule, documentsData, sessionsData, artifactsData, schedulesData, isForbidden, refetchAll]);

    return (
        <OnboardingContext.Provider value={value}>
            {children}
        </OnboardingContext.Provider>
    );
}

export function useOnboarding() {
    return useContext(OnboardingContext);
}
