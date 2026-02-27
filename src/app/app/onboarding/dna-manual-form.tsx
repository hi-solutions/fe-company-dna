"use client";

import { useState, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    ChevronDown,
    ChevronUp,
    Plus,
    Trash2,
    Eye,
    Loader2,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { client } from "@/api/client";
import { chunkDnaText } from "@/lib/chunking";
import {
    DNAFormData,
    EMPTY_DNA_FORM,
    LOCAL_STORAGE_KEY,
    DNA_SECTIONS,
    compileDnaDocument,
    validateDnaForm,
    type FAQItem,
} from "./dna-types";

interface DnaManualFormProps {
    onSuccess: () => void;
}

export function DnaManualForm({ onSuccess }: DnaManualFormProps) {
    const [form, setForm] = useState<DNAFormData>(EMPTY_DNA_FORM);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(["vision"])
    );
    const [showPreview, setShowPreview] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // --- Load draft from localStorage on mount ---
    useEffect(() => {
        try {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as DNAFormData;
                setForm(parsed);
            }
        } catch {
            // Ignore corrupt data
        }
    }, []);

    // --- Autosave draft to localStorage on change ---
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(form));
            } catch {
                // localStorage may be full
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [form]);

    // --- Field updaters ---
    const updateField = useCallback(
        (key: keyof Omit<DNAFormData, "faqs">, value: string) => {
            setForm((prev) => ({ ...prev, [key]: value }));
            setFormError(null);
        },
        []
    );

    const updateFaq = useCallback(
        (index: number, field: keyof FAQItem, value: string) => {
            setForm((prev) => {
                const faqs = [...prev.faqs];
                faqs[index] = { ...faqs[index], [field]: value };
                return { ...prev, faqs };
            });
        },
        []
    );

    const addFaq = useCallback(() => {
        setForm((prev) => ({
            ...prev,
            faqs: [...prev.faqs, { question: "", answer: "" }],
        }));
    }, []);

    const removeFaq = useCallback((index: number) => {
        setForm((prev) => ({
            ...prev,
            faqs: prev.faqs.filter((_, i) => i !== index),
        }));
    }, []);

    // --- Toggle accordion ---
    const toggleSection = (key: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    // --- Compiled preview ---
    const compiledDocument = compileDnaDocument(form);

    // --- Submit ---
    const handleSubmit = async () => {
        setFormError(null);
        setSubmitError(null);

        const validationError = validateDnaForm(form);
        if (validationError) {
            setFormError(validationError);
            return;
        }

        const documentText = compileDnaDocument(form);
        if (!documentText.trim()) {
            setFormError("The DNA document is empty.");
            return;
        }

        setSubmitting(true);
        const toastId = toast.loading("Creating DNA document...");

        try {
            const apiClient = client as unknown as Record<
                string,
                (
                    url: string,
                    init?: unknown
                ) => Promise<{
                    data?: { id?: string };
                    error?: { error?: string; message?: string };
                }>
            >;

            // 1. Create document record
            const { data: docData, error: docError } = await apiClient.POST(
                "/v1/dna/documents",
                {
                    body: {
                        title: "Company DNA (Manual)",
                        source_name: "manual",
                        mime_type: "text/plain",
                        storage_path: "manual://inline",
                    },
                }
            );

            if (docError) {
                throw new Error(
                    docError.error || docError.message || "Failed to create document"
                );
            }

            const docId = docData?.id;
            if (!docId) throw new Error("No document ID returned from server");

            // 2. Chunk the text
            toast.loading("Splitting into chunks and indexing...", { id: toastId });
            const chunks = chunkDnaText(documentText);

            // 3. Upload chunks
            const { error: chunkError } = await apiClient.POST(
                `/v1/dna/documents/${docId}/chunks` as `/v1/dna/documents/{docId}/chunks`,
                { body: { chunks } }
            );

            if (chunkError) {
                throw new Error(
                    chunkError.error || chunkError.message || "Failed to upload chunks"
                );
            }

            // 4. Success
            toast.success("Company DNA saved and indexed!", { id: toastId });
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            onSuccess();
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Something went wrong";
            setSubmitError(message);
            toast.error(message, { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    // --- Render ---
    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Validation error banner */}
            {formError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{formError}</span>
                </div>
            )}

            {/* Sections accordion */}
            {DNA_SECTIONS.map((section) => {
                const isOpen = expandedSections.has(section.key);
                const charCount = form[section.key].length;
                const hasContent = charCount > 0;

                return (
                    <div
                        key={section.key}
                        className="border rounded-lg overflow-hidden"
                    >
                        <button
                            type="button"
                            onClick={() => toggleSection(section.key)}
                            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                {hasContent && (
                                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                )}
                                <span className="font-medium text-sm">
                                    {section.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                {hasContent && (
                                    <span className="text-xs text-muted-foreground">
                                        {charCount}/{section.maxChars}
                                    </span>
                                )}
                                {isOpen ? (
                                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                )}
                            </div>
                        </button>

                        {isOpen && (
                            <div className="px-4 pb-4 space-y-2">
                                <p className="text-xs text-muted-foreground">
                                    {section.helper}
                                </p>
                                <Textarea
                                    value={form[section.key]}
                                    onChange={(e) =>
                                        updateField(
                                            section.key,
                                            e.target.value.slice(0, section.maxChars)
                                        )
                                    }
                                    placeholder={`Enter your ${section.label.toLowerCase()}...`}
                                    rows={4}
                                    className="resize-y"
                                    disabled={submitting}
                                />
                                <div className="text-right text-xs text-muted-foreground">
                                    {charCount} / {section.maxChars}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* FAQs section */}
            <div className="border rounded-lg overflow-hidden">
                <button
                    type="button"
                    onClick={() => toggleSection("faqs")}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        {form.faqs.some(
                            (f) => f.question.trim() || f.answer.trim()
                        ) && (
                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        )}
                        <span className="font-medium text-sm">
                            FAQs & Common Objections
                        </span>
                    </div>
                    {expandedSections.has("faqs") ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                </button>

                {expandedSections.has("faqs") && (
                    <div className="px-4 pb-4 space-y-4">
                        <p className="text-xs text-muted-foreground">
                            Add frequently asked questions and their answers so the AI
                            can handle objections and common queries.
                        </p>

                        {form.faqs.map((faq, idx) => (
                            <div
                                key={idx}
                                className="space-y-2 p-3 bg-muted/30 rounded-lg border"
                            >
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-medium">
                                        FAQ #{idx + 1}
                                    </Label>
                                    {form.faqs.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeFaq(idx)}
                                            disabled={submitting}
                                            className="h-7 px-2 text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                                <Input
                                    placeholder="Question..."
                                    value={faq.question}
                                    onChange={(e) =>
                                        updateFaq(idx, "question", e.target.value)
                                    }
                                    disabled={submitting}
                                />
                                <Textarea
                                    placeholder="Answer..."
                                    value={faq.answer}
                                    onChange={(e) =>
                                        updateFaq(idx, "answer", e.target.value)
                                    }
                                    rows={2}
                                    className="resize-y"
                                    disabled={submitting}
                                />
                            </div>
                        ))}

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addFaq}
                            disabled={submitting}
                            className="w-full"
                        >
                            <Plus className="w-4 h-4 mr-1" /> Add FAQ
                        </Button>
                    </div>
                )}
            </div>

            {/* Preview toggle */}
            <div className="pt-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className="w-full"
                >
                    <Eye className="w-4 h-4 mr-2" />
                    {showPreview ? "Hide Preview" : "Generate Preview"}
                </Button>
            </div>

            {showPreview && (
                <div className="border rounded-lg bg-muted/20 p-4 max-h-80 overflow-y-auto">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Compiled DNA Document Preview
                    </h4>
                    {compiledDocument.trim() ? (
                        <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                            {compiledDocument}
                        </pre>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">
                            Fill in at least one section to see the preview.
                        </p>
                    )}
                </div>
            )}

            {/* Submit error */}
            {submitError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{submitError}</span>
                </div>
            )}

            {/* Submit button */}
            <Button
                type="button"
                size="lg"
                disabled={submitting}
                onClick={handleSubmit}
                className="w-full"
            >
                {submitting ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving & Indexing...
                    </>
                ) : (
                    "Save Company DNA & Continue"
                )}
            </Button>
        </div>
    );
}
