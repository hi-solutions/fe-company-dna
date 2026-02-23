"use client";

import { useState, useEffect, useCallback } from "react";
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

    const refetch = useCallback(async () => {
        if (!enabled || !isAuthenticated || !accessToken) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // we use unknown to bypass complex openapi-fetch typing in a dynamic wrapper
            const apiClient = client as unknown as Record<string, (url: string, init?: unknown) => Promise<{ data?: T; error?: { error?: string; message?: string }; response?: Response }>>;
            const response = await apiClient[method](path, {
                params: params,
                body: body,
            });

            if (response.error) {
                // Check if it's a 401, openapi-fetch throws error objects but the client interceptor might handle it.
                // Our AuthProvider handles 401s usually, but just in case:
                if (response.response?.status === 401) {
                    logout();
                    throw new Error("Unauthorized");
                }
                throw new Error(response.error.error || response.error.message || "An error occurred");
            }

            if (response.data !== undefined) {
                setData(response.data);
            }
        } catch (err: unknown) {
            console.error(`Error in useAuthedQuery (${method} ${path}):`, err);
            setError(err instanceof Error ? err.message : "Failed to fetch data");
        } finally {
            setIsLoading(false);
        }
    }, [method, path, body, params, enabled, isAuthenticated, accessToken, logout]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { data, isLoading, error, refetch };
}
