import fs from "fs";
import path from "path";
import { TfIdfIndex, type TfIdfDocument } from "./tfidf.js";

export interface KnowledgeChunk {
  id: string;
  source: string;
  title: string;
  content: string;
  category: string;
}

export interface RetrievedChunk extends KnowledgeChunk {
  similarityScore: number;
  type: "knowledge_base";
}

const KNOWLEDGE_DIR = (() => {
  const cwd = process.cwd();
  const base = cwd.endsWith(path.join("artifacts", "api-server"))
    ? path.resolve(cwd, "../..")
    : cwd;
  return path.resolve(base, "artifacts/api-server/data/knowledge");
})();

const CATEGORY_MAP: Record<string, string> = {
  "procurement-policy.md": "Procurement",
  "vendor-sla.md": "Vendor Management",
  "shipping-sop.md": "Logistics",
  "warehouse-guidelines.md": "Warehouse",
  "escalation-procedures.md": "Escalation",
  "customer-priority-matrix.md": "Customer Management",
};

const TITLE_MAP: Record<string, string> = {
  "procurement-policy.md": "Procurement Policy",
  "vendor-sla.md": "Vendor SLA",
  "shipping-sop.md": "Shipping SOP",
  "warehouse-guidelines.md": "Warehouse Guidelines",
  "escalation-procedures.md": "Escalation Procedures",
  "customer-priority-matrix.md": "Customer Priority Matrix",
};

function chunkMarkdown(text: string, chunkSize = 400): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if ((current + p).length > chunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = p;
    } else {
      current += (current ? "\n\n" : "") + p;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

let _chunks: KnowledgeChunk[] = [];
let _index: TfIdfIndex | null = null;

export function initKnowledgeBase(): void {
  if (_index !== null) return;
  _chunks = [];
  const docs: TfIdfDocument[] = [];

  const files = fs.readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".md"));
  for (const filename of files) {
    const content = fs.readFileSync(
      path.join(KNOWLEDGE_DIR, filename),
      "utf-8"
    );
    const chunks = chunkMarkdown(content);
    const title = TITLE_MAP[filename] ?? filename;
    const category = CATEGORY_MAP[filename] ?? "General";

    chunks.forEach((chunk, i) => {
      const id = `${filename.replace(".md", "")}-${i}`;
      _chunks.push({ id, source: filename, title, content: chunk, category });
      docs.push({
        id,
        text: chunk,
        metadata: { source: filename, title, category },
      });
    });
  }

  _index = new TfIdfIndex();
  _index.addDocuments(docs);
}

export function searchKnowledge(query: string, topK = 5): RetrievedChunk[] {
  if (!_index) initKnowledgeBase();
  const results = _index!.search(query, topK);
  return results
    .filter((r) => r.score > 0)
    .map((r) => {
      const chunk = _chunks.find((c) => c.id === r.id)!;
      return { ...chunk, similarityScore: r.score, type: "knowledge_base" as const };
    });
}

export function getKnowledgeSources() {
  if (!_index) initKnowledgeBase();
  const byFile = new Map<string, { count: number; title: string; category: string }>();
  for (const c of _chunks) {
    if (!byFile.has(c.source)) {
      byFile.set(c.source, { count: 0, title: c.title, category: c.category });
    }
    byFile.get(c.source)!.count++;
  }
  return Array.from(byFile.entries()).map(([filename, meta]) => ({
    id: filename.replace(".md", ""),
    filename,
    title: meta.title,
    chunkCount: meta.count,
    category: meta.category,
  }));
}
