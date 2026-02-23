"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { client } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";

type AuthedQueryOptions = {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    path: string;
    body?: unknown;
    params?: unknown;
    enabled?: boolean;
};

export function useAuthedQuery<T = unknown>({
    method,
    path,
    body,
    params,
    enabled = true,
}: AuthedQueryOptions) {
    const { isAuthenticated, accessToken, logout } = useAuth();
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(enabled);
    const [error, setError] = useState<string | null>(null);
    const [statusCode, setStatusCode] = useState<number | null>(null);

    // Serialize params/body to stable strings so they don't cause re-renders
    const paramsKey = JSON.stringify(params ?? null);
    const bodyKey = JSON.stringify(body ?? null);

    // Prevent duplicate in-flight requests
    const inflightRef = useRef(false);

    const refetch = useCallback(async () => {
        if (!enabled || !isAuthenticated || !accessToken) {
            setIsLoading(false);
            return;
        }

        if (inflightRef.current) return;
        inflightRef.current = true;

        setIsLoading(true);
        setError(null);

        try {
            const parsedParams = JSON.parse(paramsKey);
            const parsedBody = JSON.parse(bodyKey);

            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ data?: T; error?: { error?: string; message?: string }; response?: Response }>>;
            const init: Record<string, unknown> = {};
            if (parsedParams) init.params = parsedParams;
            if (parsedBody) init.body = parsedBody;
            const response = await apiClient[method](path, init);

            if (response.error) {
                const status = response.response?.status ?? 0;
                setStatusCode(status);
                if (status === 401) {
                    logout();
                    throw new Error("Unauthorized");
                }
                throw new Error(response.error.error || response.error.message || "An error occurred");
            }

            setStatusCode(response.response?.status ?? 200);
            if (response.data !== undefined) {
                console.log("response.data", response.data);
                setData(response.data);
            }
        } catch (err: unknown) {
            console.error(`Error in useAuthedQuery (${method} ${path}):`, err);
            setError(err instanceof Error ? err.message : "Failed to fetch data");
        } finally {
            setIsLoading(false);
            inflightRef.current = false;
        }
    }, [method, path, bodyKey, paramsKey, enabled, isAuthenticated, accessToken, logout]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { data, isLoading, error, statusCode, refetch };
}
