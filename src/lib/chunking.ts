/**
 * DNA text chunking utility.
 *
 * Splits a Markdown-like DNA document into chunks suitable for the
 * POST /v1/dna/documents/:docId/chunks endpoint.
 *
 * Rules:
 *  - chunkSizeChars  = 1200  (max characters per chunk)
 *  - overlapChars    = 150   (overlap between consecutive chunks)
 *  - Headings (lines starting with #) stay with their section content.
 *  - Output: { chunk_index: number; text: string }[]
 */

export interface ChunkItem {
    chunk_index: number;
    text: string;
}

const CHUNK_SIZE = 1200;
const OVERLAP = 150;

/**
 * Split `text` on Markdown heading boundaries, producing an array of
 * sections where each starts with its heading line.
 */
function splitBySections(text: string): string[] {
    const lines = text.split("\n");
    const sections: string[] = [];
    let current: string[] = [];

    for (const line of lines) {
        if (/^#{1,6}\s/.test(line) && current.length > 0) {
            sections.push(current.join("\n").trim());
            current = [];
        }
        current.push(line);
    }

    if (current.length > 0) {
        const trimmed = current.join("\n").trim();
        if (trimmed) sections.push(trimmed);
    }

    return sections;
}

/**
 * Chunk a single section. If it exceeds CHUNK_SIZE it is split with overlap.
 * The heading is prepended to every sub-chunk so context is preserved.
 */
function chunkSection(section: string): string[] {
    if (section.length <= CHUNK_SIZE) return [section];

    // Extract the heading (first line that starts with #)
    const firstNewline = section.indexOf("\n");
    let heading = "";
    let body = section;

    if (firstNewline > 0 && /^#{1,6}\s/.test(section)) {
        heading = section.slice(0, firstNewline).trim();
        body = section.slice(firstNewline + 1).trim();
    }

    const chunks: string[] = [];
    let offset = 0;

    while (offset < body.length) {
        const maxLen = heading
            ? CHUNK_SIZE - heading.length - 2 // 2 for \n\n
            : CHUNK_SIZE;

        let end = Math.min(offset + maxLen, body.length);

        // Try to break at a sentence/paragraph boundary
        if (end < body.length) {
            const candidate = body.lastIndexOf("\n\n", end);
            if (candidate > offset) {
                end = candidate;
            } else {
                const sentEnd = body.lastIndexOf(". ", end);
                if (sentEnd > offset) {
                    end = sentEnd + 1; // include the period
                }
            }
        }

        const slice = body.slice(offset, end).trim();
        const chunkText = heading ? `${heading}\n\n${slice}` : slice;
        if (chunkText) chunks.push(chunkText);

        // Advance with overlap
        offset = Math.max(offset + 1, end - OVERLAP);
    }

    return chunks;
}

/**
 * Main entry point: compile a DNA document string into indexable chunks.
 */
export function chunkDnaText(text: string): ChunkItem[] {
    const sections = splitBySections(text);
    const rawChunks: string[] = [];

    for (const section of sections) {
        rawChunks.push(...chunkSection(section));
    }

    return rawChunks.map((t, i) => ({ chunk_index: i, text: t }));
}
