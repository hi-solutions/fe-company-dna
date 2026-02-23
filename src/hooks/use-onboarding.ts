import { useAuthedQuery } from "@/hooks/use-authed-query";

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

export function useOnboarding() {
    // 1. Check DNA
    const { data: documentsData, isLoading: dnaLoading } = useAuthedQuery<{ data: DNADoc[] }>({
        method: "GET",
        path: "/v1/dna/documents",
        params: { query: { limit: 1 } }
    });

    // 2. Check Chat Sessions
    const { data: sessionsData, isLoading: chatLoading } = useAuthedQuery<{ data: ChatSession[] }>({
        method: "GET",
        path: "/v1/chat/sessions",
        params: { query: { limit: 1 } }
    });

    // 3. Check Artifacts
    const { data: artifactsData, isLoading: artifactsLoading } = useAuthedQuery<{ data: Artifact[] }>({
        method: "GET",
        path: "/v1/artifacts",
        params: { query: { limit: 1 } }
    });

    // 4. Check Schedules
    const { data: schedulesData, isLoading: schedulesLoading } = useAuthedQuery<{ data: Schedule[] }>({
        method: "GET",
        path: "/v1/schedules",
        params: { query: { limit: 1 } }
    });

    const loading = dnaLoading || chatLoading || artifactsLoading || schedulesLoading;

    let step: OnboardingStep = 1;

    const hasDNA = !!(documentsData?.data && documentsData.data.length > 0);
    const hasIndexedDNA = !!(documentsData?.data && documentsData.data.some(d => d.status === 'READY' || d.status === 'INDEXED' || d.status === 'indexed' || d.status === 'ready')); // Assuming uppercase or lowercase
    const hasChat = !!(sessionsData?.data && sessionsData.data.length > 0);
    const hasArtifact = !!(artifactsData?.data && artifactsData.data.length > 0);
    const hasSchedule = !!(schedulesData?.data && schedulesData.data.length > 0);

    if (hasSchedule) step = 6; // DONE
    else if (hasArtifact) step = 5;
    else if (hasChat) step = 4;
    else if (hasIndexedDNA) step = 3;
    else if (hasDNA) step = 2; // DNA uploaded but not indexed
    else step = 1;

    const progressPercent = Math.min(100, Math.max(0, ((step - 1) / 5) * 100));

    let nextRoute = "/app/onboarding";
    if (step === 6) {
        nextRoute = "/app/dashboard";
    }

    return {
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
        schedules: schedulesData?.data
    };
}
