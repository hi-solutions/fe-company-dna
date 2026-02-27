/**
 * Section-aware DNA document chunker.
 *
 * Strategy:
 *  1. Normalise whitespace and enforce a max document size guard.
 *  2. Split the document on Markdown headings (levels 1-6) into sections.
 *     Text before the first heading is wrapped under "# General".
 *  3. Each section is chunked independently. The heading is prepended to
 *     every sub-chunk so downstream embeddings always carry section context.
 *  4. Within a section, split boundaries are chosen in priority order:
 *     paragraph (\n\n) → list item (\n- / \n* ) → sentence (". ") → hard limit.
 *  5. Consecutive chunks overlap by OVERLAP characters for retrieval continuity.
 *  6. Every chunk carries metadata (section name, order, document type, source).
 */

export interface ChunkItem {
    chunk_index: number;
    text: string;
    section: string;
    section_order: number;
    document_type: "company_dna";
    source: "manual" | "upload";
}

const CHUNK_SIZE = 1200;
const OVERLAP = 150;
const MAX_DOCUMENT_LENGTH = 50_000;

const HEADING_RE = /^#{1,6}\s+(.+)$/;

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

function normalise(text: string): string {
    return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ---------------------------------------------------------------------------
// Section splitting
// ---------------------------------------------------------------------------

interface Section {
    heading: string;
    name: string;
    body: string;
}

function splitBySections(text: string): Section[] {
    const lines = text.split("\n");
    const sections: Section[] = [];
    let currentHeading = "";
    let currentName = "";
    let currentBody: string[] = [];

    const flush = () => {
        const body = currentBody.join("\n").trim();
        if (body || currentHeading) {
            const heading = currentHeading || "# General";
            const name = currentName || "general";
            sections.push({ heading, name, body });
        }
        currentBody = [];
    };

    for (const raw of lines) {
        const line = raw;
        const trimmed = line.trimStart();
        const match = HEADING_RE.exec(trimmed);

        if (match) {
            flush();
            currentHeading = trimmed;
            currentName = match[1].trim().toLowerCase();
        } else {
            currentBody.push(line);
        }
    }

    flush();
    return sections;
}

// ---------------------------------------------------------------------------
// Section chunking
// ---------------------------------------------------------------------------

function findBestSplit(body: string, offset: number, limit: number): number {
    const end = Math.min(offset + limit, body.length);
    if (end >= body.length) return body.length;

    const window = body.slice(offset, end);

    // 1. Paragraph boundary
    const para = window.lastIndexOf("\n\n");
    if (para > 0) return offset + para;

    // 2. List boundary
    const listDash = window.lastIndexOf("\n- ");
    const listStar = window.lastIndexOf("\n* ");
    const listBound = Math.max(listDash, listStar);
    if (listBound > 0) return offset + listBound;

    // 3. Sentence boundary
    const sent = window.lastIndexOf(". ");
    if (sent > 0) return offset + sent + 1;

    // 4. Hard limit
    return end;
}

function chunkSection(section: Section): string[] {
    const { heading, body } = section;

    if (!body) return [];

    const headingPrefix = `${heading}\n\n`;
    const maxBodyLen = CHUNK_SIZE - headingPrefix.length;

    if (maxBodyLen <= 0) return [`${heading}\n\n${body.slice(0, CHUNK_SIZE)}`];

    if (body.length <= maxBodyLen) {
        return [`${headingPrefix}${body}`];
    }

    const chunks: string[] = [];
    let offset = 0;
    let lastEnd = -1;

    while (offset < body.length) {
        const end = findBestSplit(body, offset, maxBodyLen);
        const slice = body.slice(offset, end).trim();

        if (slice && slice !== heading.trim()) {
            chunks.push(`${headingPrefix}${slice}`);
        }

        if (end === lastEnd) break;
        lastEnd = end;

        if (end >= body.length) break;

        offset = Math.max(end - OVERLAP, offset + 1);
        if (offset < 0) offset = 0;
    }

    return chunks;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function chunkDnaText(
    text: string,
    source: "manual" | "upload" = "manual",
): ChunkItem[] {
    const normalised = normalise(text);

    if (normalised.length > MAX_DOCUMENT_LENGTH) {
        throw new Error("DNA document exceeds maximum allowed length (50 000 characters)");
    }

    if (!normalised) return [];

    const sections = splitBySections(normalised);
    const items: ChunkItem[] = [];
    let globalIndex = 0;

    for (let sectionOrder = 0; sectionOrder < sections.length; sectionOrder++) {
        const section = sections[sectionOrder];
        const sectionChunks = chunkSection(section);

        for (const chunkText of sectionChunks) {
            if (chunkText.length > CHUNK_SIZE) {
                items.push({
                    chunk_index: globalIndex++,
                    text: chunkText.slice(0, CHUNK_SIZE),
                    section: section.name,
                    section_order: sectionOrder,
                    document_type: "company_dna",
                    source,
                });
                continue;
            }

            items.push({
                chunk_index: globalIndex++,
                text: chunkText,
                section: section.name,
                section_order: sectionOrder,
                document_type: "company_dna",
                source,
            });
        }
    }

    return items.filter((c) => {
        const stripped = c.text.replace(/^#{1,6}\s+.+\n*/m, "").trim();
        return stripped.length > 0;
    });
}
