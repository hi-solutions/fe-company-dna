"use client";

import { useEffect, useState, useRef } from "react";
import { client } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Send, StopCircle } from "lucide-react";

interface Session {
    id: string;
    title: string;
    created_at: string;
}

interface Message {
    id: string;
    role: string;
    content: string;
}

const extractAnswer = (content: string): string => {
    const markers = ["\nالافتراضات:", "\nالمصادر:", "\n⚠️"];
    let result = content;
    for (const marker of markers) {
        const idx = result.indexOf(marker);
        if (idx !== -1) {
            result = result.substring(0, idx);
        }
    }
    result = result.replace(/^الإجابة:\s*/, "");
    return result.trim();
};

export default function ChatPage() {
    const { accessToken } = useAuth();
    const router = useRouter();
    const { hasSchedule, loading: onboardingLoading } = useOnboarding();
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);

    const { data: sessionsData, refetch: refetchSessions } = useAuthedQuery<{ data: Session[] }>({
        method: "GET",
        path: "/v1/chat/sessions",
        params: { query: { limit: 50 } }
    });
    const sessions = sessionsData?.data || [];

    const { data: messagesData, isLoading: messagesLoading, refetch: refetchMessages } = useAuthedQuery<{ data: Message[] }>({
        method: "GET",
        path: "/v1/chat/sessions/{sessionId}/messages" as unknown as never,
        params: { path: { sessionId: activeSessionId || "" }, query: { limit: 100 } },
        enabled: !!activeSessionId
    });

    useEffect(() => {
        if (messagesData?.data) {
            // Sort ascending by default depending on API, assuming chronological
            setMessages(messagesData.data);
        }
    }, [messagesData]);

    useEffect(() => {
        if (autoScroll) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isStreaming, autoScroll]);

    const handleScroll = () => {
        if (!chatContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        setAutoScroll(isAtBottom);
    };

    const createSession = async () => {
        try {
            const { data } = await client.POST("/v1/chat/sessions", {
                body: { title: "New Chat" }
            });
            if (data && data.id) {
                setActiveSessionId(data.id);
                setMessages([]);
                refetchSessions();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(e as unknown as React.FormEvent);
        }
    };

    const cancelStream = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsStreaming(false);
            refetchMessages(); // Refetch to align state with backend
        }
    };

    const sendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || !activeSessionId || isStreaming) return;

        const userContent = input.trim();
        setInput("");
        setAutoScroll(true);

        // Optimistic UI update
        const userMsg = { id: `usr-${Date.now()}`, role: "user", content: userContent };
        const astMsgId = `ast-${Date.now()}`;
        setMessages(prev => [...prev, userMsg, { id: astMsgId, role: "assistant", content: "" }]);

        setIsStreaming(true);
        abortControllerRef.current = new AbortController();

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/chat/sessions/${activeSessionId}/messages:stream`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
                },
                body: JSON.stringify({ content: userContent }),
                signal: abortControllerRef.current.signal
            });

            if (!res.ok) throw new Error("API stream error");
            if (!res.body) throw new Error("No response body");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');

                // Keep the last partial line in the buffer
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.startsWith("event: done")) {
                        break;
                    }
                    if (line.startsWith("data: ")) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === "[DONE]") {
                            break;
                        }

                        try {
                            const parsed = JSON.parse(dataStr);
                            const chunk = parsed.delta ?? parsed.text;
                            if (chunk) {
                                setMessages(prev => prev.map(m =>
                                    m.id === astMsgId ? { ...m, content: m.content + chunk } : m
                                ));
                            }
                        } catch {
                            // Partial JSON, ignore
                        }
                    }
                }
            }
        } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') {
                console.log("Stream aborted");
            } else {
                setMessages(prev => prev.map(m =>
                    m.id === astMsgId ? { ...m, content: m.content + "\n*(Connection error)*" } : m
                ));
            }
        } finally {
            setIsStreaming(false);
            abortControllerRef.current = null;
            refetchMessages(); // Ensure we get final persisted state
        }
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] overflow-hidden border border-border rounded-xl bg-card shadow-sm">
            {/* Sidebar */}
            <div className="w-1/3 max-w-[300px] border-r border-border flex flex-col bg-muted/20">
                <div className="p-4 border-b border-border">
                    <Button onClick={createSession} className="w-full justify-start" variant="default">
                        <Plus className="mr-2 h-4 w-4" /> New Chat
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {sessions.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setActiveSessionId(s.id)}
                            className={`w-full text-left p-4 border-b border-border flex items-center hover:bg-muted transition-colors ${activeSessionId === s.id ? 'bg-muted border-l-4 border-l-primary' : ''}`}
                        >
                            <MessageSquare className="h-4 w-4 mr-3 text-muted-foreground flex-shrink-0" />
                            <div className="truncate text-sm font-medium text-foreground">{s.title || "Untitled Chat"}</div>
                        </button>
                    ))}
                    {sessions.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            No chats yet.
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-background relative">
                {activeSessionId ? (
                    <>
                        <div
                            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6"
                            ref={chatContainerRef}
                            onScroll={handleScroll}
                        >
                            {messagesLoading && messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    Loading messages...
                                </div>
                            ) : messages.map((m, i) => (
                                <div key={m.id || i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted text-foreground rounded-bl-none border border-border/50'}`}>
                                        {m.content || <span className="animate-pulse flex items-center h-5"><span className="w-1.5 h-1.5 bg-current rounded-full mr-1"></span><span className="w-1.5 h-1.5 bg-current rounded-full mr-1"></span><span className="w-1.5 h-1.5 bg-current rounded-full"></span></span>}
                                        {/* {(m.role === 'assistant' ? extractAnswer(m.content) : m.content) || <span className="animate-pulse flex items-center h-5"><span className="w-1.5 h-1.5 bg-current rounded-full mr-1"></span><span className="w-1.5 h-1.5 bg-current rounded-full mr-1"></span><span className="w-1.5 h-1.5 bg-current rounded-full"></span></span>} */}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} className="h-4" />
                        </div>
                        <div className="p-4 border-t border-border bg-card">
                            <form onSubmit={sendMessage} className="relative flex items-end gap-2 max-w-4xl mx-auto">
                                <textarea
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Message Company DNA... (Shift+Enter for newline)"
                                    disabled={isStreaming && !input}
                                    rows={Math.min(5, input.split('\n').length)}
                                    className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
                                />
                                {isStreaming ? (
                                    <Button type="button" onClick={cancelStream} variant="destructive" size="icon" className="rounded-full flex-shrink-0 h-11 w-11 mb-0.5" title="Stop generating">
                                        <StopCircle className="h-5 w-5" />
                                    </Button>
                                ) : (
                                    <Button type="submit" disabled={!input.trim()} size="icon" className="rounded-full flex-shrink-0 h-11 w-11 mb-0.5">
                                        <Send className="h-4 w-4" />
                                    </Button>
                                )}
                            </form>
                            <div className="text-center mt-2 text-[10px] text-muted-foreground">
                                Company DNA can make mistakes. Consider verifying important information.
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                        <h3 className="text-lg font-medium text-foreground mb-2">Welcome to Hi-Solutions DNA Chat</h3>
                        <p className="max-w-md mb-6">Select an existing session from the sidebar or click &quot;New Chat&quot; to start interacting with your company&apos;s indexed knowledge.</p>
                        {!hasSchedule && !onboardingLoading && (
                            <Button onClick={() => router.push("/app/onboarding")}>Continue Setup</Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
