"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { client } from "@/api/client";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
    accessToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string) => void;
    logout: () => Promise<void>;
    ensureAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const interceptor = {
            onRequest({ request }: { request: Request }) {
                if (accessToken) {
                    request.headers.set('Authorization', `Bearer ${accessToken}`);
                }
                return request;
            },
            async onResponse({ request, response }: { request: Request, response: Response }) {
                if (response.status === 401 && !request.url.includes('/auth/refresh') && !request.url.includes('/auth/login')) {
                    const newToken = await refresh();
                    if (newToken) {
                        const newReq = new Request(request, {
                            headers: new Headers(request.headers)
                        });
                        newReq.headers.set('Authorization', `Bearer ${newToken}`);
                        return fetch(newReq);
                    } else {
                        logout();
                    }
                }
                return response;
            }
        };

        client.use(interceptor);

        return () => {
            client.eject(interceptor);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken]);

    const login = (token: string) => {
        document.cookie = `access_token=${token}; path=/; max-age=604800; samesite=Lax`;
        setAccessToken(token);
    };

    const logout = async () => {
        try {
            await client.POST("/v1/auth/logout");
        } catch { } // ignore network errors on logout
        document.cookie = `access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        setAccessToken(null);
        router.push("/login");
    };

    const refresh = async (): Promise<string | null> => {
        try {
            const { data } = await client.POST("/v1/auth/refresh");
            if (data?.access_token) {
                document.cookie = `access_token=${data.access_token}; path=/; max-age=604800; samesite=Lax`;
                setAccessToken(data.access_token);
                return data.access_token;
            }
            return null;
        } catch {
            return null;
        }
    };

    const ensureAuth = async (): Promise<boolean> => {
        if (accessToken) return true;
        const newToken = await refresh();
        if (newToken) {
            return true;
        }
        setAccessToken(null);
        return false;
    };

    useEffect(() => {
        const initAuth = async () => {
            setIsLoading(true);
            await refresh();
            setIsLoading(false);
        };
        initAuth();
    }, []);

    // Simple route protection
    useEffect(() => {
        if (!isLoading) {
            const isProtectedRoute = pathname.startsWith("/app");
            if (isProtectedRoute && !accessToken) {
                router.push("/login");
            }
        }
    }, [isLoading, accessToken, pathname, router]);

    return (
        <AuthContext.Provider value={{ accessToken, isAuthenticated: !!accessToken, isLoading, login, logout, ensureAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
