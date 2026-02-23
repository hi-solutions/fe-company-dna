"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JsonViewer } from "@/components/ui/json-viewer";
import { ArrowLeft, Loader2, Link as LinkIcon } from "lucide-react";

interface ArtifactSource {
    id: string;
    document_id: string;
    source_name: string;
    relevance_score?: number;
}

interface Artifact { // Changed from ArtifactDetail to Artifact as per instruction
    id: string;
    template_key: string;
    title: string;
    content: string;
    status: string;
    created_at: string;
    sources?: ArtifactSource[];
}

export default function ArtifactDetailPage() {
    const params = useParams();
    const router = useRouter();
    const artifactId = params.id as string; // Changed id to artifactId

    const { data: artifactData, isLoading } = useAuthedQuery<{ data: Artifact }>({ // Removed error, changed ArtifactDetail to Artifact
        method: "GET",
        path: "/v1/artifacts/{id}" as unknown as never, // Changed type assertion
        params: { path: { id: artifactId } } as unknown as never, // Changed id to artifactId and added as any
        enabled: !!artifactId // Changed id to artifactId
    });

    const artifact = artifactData?.data;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Loading artifact details...</p>
            </div>
        );
    }

    // The original code had `error` in the destructuring and used it here.
    // Since `error` was removed from the destructuring, this condition needs adjustment.
    // Assuming the intent is to check if artifact data is missing after loading.
    if (!artifact) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-red-500">
                <p className="font-semibold text-lg mb-2">Error loading artifact</p>
                <p className="text-sm">Artifact not found</p>
                <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                </Button>
            </div>
        );
    }

    // Try to parse content as JSON just in case it's a JSON artifact.
    let isJson = false;
    let parsedContent = artifact.content;
    try {
        if (artifact.content && (artifact.content.trim().startsWith('{') || artifact.content.trim().startsWith('['))) {
            parsedContent = JSON.parse(artifact.content);
            isJson = true;
        }
    } catch { // Removed 'e' from catch block
        // Not JSON
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/app/artifacts")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{artifact.title}</h1>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="font-mono">{artifact.template_key}</span>
                        <span>•</span>
                        <span>{new Date(artifact.created_at).toLocaleString()}</span>
                        <span>•</span>
                        <Badge variant={
                            artifact.status === 'completed' ? 'success' :
                                artifact.status === 'approved' ? 'default' : 'secondary'
                        } className="capitalize">
                            {artifact.status}
                        </Badge>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="min-h-[500px]">
                        <CardHeader>
                            <CardTitle>Generated Content</CardTitle>
                        </CardHeader>
                        <CardContent className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                            {isJson ? (
                                <JsonViewer data={parsedContent} />
                            ) : (
                                <div className="whitespace-pre-wrap">{artifact.content}</div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Citations & Sources</CardTitle>
                            <CardDescription>Knowledge used to generate this artifact.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!artifact.sources || artifact.sources.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No specific sources cited for this artifact.</p>
                            ) : (
                                <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-3 before:w-px before:bg-border">
                                    {artifact.sources.map((src, i) => (
                                        <li key={i} className="relative flex gap-4 pl-8">
                                            <div className="absolute left-0 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm">
                                                <LinkIcon className="h-3 w-3 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{src.source_name}</p>
                                                {src.relevance_score && (
                                                    <p className="text-xs text-muted-foreground">Relevance: {(src.relevance_score * 100).toFixed(1)}%</p>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Metadata</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-foreground">
                            <div>
                                <span className="text-muted-foreground block mb-1">ID</span>
                                <span className="font-mono text-xs truncate block">{artifact.id}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">Status</span>
                                <span className="capitalize">{artifact.status}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
