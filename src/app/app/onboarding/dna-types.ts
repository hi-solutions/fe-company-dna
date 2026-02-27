/** Types for the manual DNA form. */

export interface FAQItem {
    question: string;
    answer: string;
}

export interface DNAFormData {
    vision: string;
    mission: string;
    values: string;
    brandVoice: string;
    productsServices: string;
    targetCustomers: string;
    dosAndDonts: string;
    faqs: FAQItem[];
}

export const EMPTY_DNA_FORM: DNAFormData = {
    vision: "",
    mission: "",
    values: "",
    brandVoice: "",
    productsServices: "",
    targetCustomers: "",
    dosAndDonts: "",
    faqs: [{ question: "", answer: "" }],
};

export const LOCAL_STORAGE_KEY = "dna-manual-draft";

/** DNA section metadata used to render the form and compile output. */
export interface DNASectionMeta {
    key: keyof Omit<DNAFormData, "faqs">;
    label: string;
    heading: string;
    helper: string;
    maxChars: number;
}

export const DNA_SECTIONS: DNASectionMeta[] = [
    {
        key: "vision",
        label: "Vision",
        heading: "# Vision",
        helper: "Where is the company heading? Describe the long-term aspiration.",
        maxChars: 2000,
    },
    {
        key: "mission",
        label: "Mission",
        heading: "# Mission",
        helper: "Why does the company exist? What problem does it solve?",
        maxChars: 2000,
    },
    {
        key: "values",
        label: "Values",
        heading: "# Values",
        helper: "Core principles that guide decision-making. One per line or comma-separated.",
        maxChars: 3000,
    },
    {
        key: "brandVoice",
        label: "Brand Voice",
        heading: "# Brand Voice",
        helper: "How should the brand sound? (e.g. formal, friendly, bold, empathetic)",
        maxChars: 2000,
    },
    {
        key: "productsServices",
        label: "Products / Services",
        heading: "# Products & Services",
        helper: "List the main products or services and a brief description of each.",
        maxChars: 4000,
    },
    {
        key: "targetCustomers",
        label: "Target Customers",
        heading: "# Target Customers",
        helper: "Who are the ideal customers? Demographics, industries, pain points.",
        maxChars: 3000,
    },
    {
        key: "dosAndDonts",
        label: "Do's & Don'ts / Guidelines",
        heading: "# Guidelines – Do's & Don'ts",
        helper: "Things the AI should always do or never do when writing on behalf of the company.",
        maxChars: 3000,
    },
];

/**
 * Compile all DNA sections into a single Markdown-like document.
 */
export function compileDnaDocument(data: DNAFormData): string {
    const parts: string[] = [];

    for (const section of DNA_SECTIONS) {
        const value = data[section.key].trim();
        if (value) {
            parts.push(`${section.heading}\n\n${value}`);
        }
    }

    // FAQs
    const validFaqs = data.faqs.filter(f => f.question.trim() || f.answer.trim());
    if (validFaqs.length > 0) {
        const faqLines = validFaqs
            .map(f => `**Q: ${f.question.trim()}**\n\nA: ${f.answer.trim()}`)
            .join("\n\n---\n\n");
        parts.push(`# FAQs & Common Objections\n\n${faqLines}`);
    }

    return parts.join("\n\n");
}

/**
 * Validate that at least Vision, Mission, or Values is filled.
 */
export function validateDnaForm(data: DNAFormData): string | null {
    const hasVision = data.vision.trim().length > 0;
    const hasMission = data.mission.trim().length > 0;
    const hasValues = data.values.trim().length > 0;

    if (!hasVision && !hasMission && !hasValues) {
        return "Please fill in at least one of: Vision, Mission, or Values.";
    }
    return null;
}
