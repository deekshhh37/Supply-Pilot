export interface TfIdfDocument {
  id: string;
  text: string;
  metadata: Record<string, string>;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: Record<string, string>;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "any", "can",
  "had", "her", "was", "one", "our", "out", "day", "get", "has", "him",
  "his", "how", "man", "new", "now", "old", "see", "two", "way", "who",
  "boy", "did", "its", "let", "put", "say", "she", "too", "use", "this",
  "that", "with", "have", "from", "they", "will", "been", "when", "your",
  "each", "much", "then", "them", "than", "more", "also", "into", "must",
  "may", "upon", "such", "very", "over", "only", "both", "should", "would",
  "could", "these", "those", "there", "their", "where", "which", "what",
  "about", "after", "before", "other", "through",
]);

function filterStopWords(tokens: string[]): string[] {
  return tokens.filter((t) => !STOP_WORDS.has(t));
}

export class TfIdfIndex {
  private documents: TfIdfDocument[] = [];
  private termFrequencies: Map<string, number>[] = [];
  private idf: Map<string, number> = new Map();
  private tfidfVectors: Map<string, number>[] = [];

  addDocuments(docs: TfIdfDocument[]): void {
    this.documents = docs;
    this.termFrequencies = docs.map((doc) => this.computeTf(doc.text));
    this.idf = this.computeIdf(this.termFrequencies, docs.length);
    this.tfidfVectors = this.termFrequencies.map((tf) =>
      this.computeTfIdfVector(tf)
    );
  }

  private computeTf(text: string): Map<string, number> {
    const tokens = filterStopWords(tokenize(text));
    const freq = new Map<string, number>();
    for (const token of tokens) {
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
    const total = tokens.length || 1;
    for (const [term, count] of freq) {
      freq.set(term, count / total);
    }
    return freq;
  }

  private computeIdf(
    tfMaps: Map<string, number>[],
    numDocs: number
  ): Map<string, number> {
    const docFreq = new Map<string, number>();
    for (const tf of tfMaps) {
      for (const term of tf.keys()) {
        docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
      }
    }
    const idf = new Map<string, number>();
    for (const [term, df] of docFreq) {
      idf.set(term, Math.log((numDocs + 1) / (df + 1)) + 1);
    }
    return idf;
  }

  private computeTfIdfVector(tf: Map<string, number>): Map<string, number> {
    const vec = new Map<string, number>();
    for (const [term, tfVal] of tf) {
      const idfVal = this.idf.get(term) ?? 1;
      vec.set(term, tfVal * idfVal);
    }
    return vec;
  }

  private vectorize(text: string): Map<string, number> {
    const tf = this.computeTf(text);
    const vec = new Map<string, number>();
    for (const [term, tfVal] of tf) {
      const idfVal = this.idf.get(term) ?? Math.log(2);
      vec.set(term, tfVal * idfVal);
    }
    return vec;
  }

  private cosineSimilarity(
    a: Map<string, number>,
    b: Map<string, number>
  ): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (const [term, valA] of a) {
      const valB = b.get(term) ?? 0;
      dot += valA * valB;
      magA += valA * valA;
    }
    for (const valB of b.values()) {
      magB += valB * valB;
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  search(query: string, topK = 5): SearchResult[] {
    const queryVec = this.vectorize(query);
    const scores: { idx: number; score: number }[] = [];

    for (let i = 0; i < this.tfidfVectors.length; i++) {
      const score = this.cosineSimilarity(queryVec, this.tfidfVectors[i]);
      scores.push({ idx: i, score });
    }

    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, topK).map(({ idx, score }) => ({
      id: this.documents[idx].id,
      score: Math.round(score * 1000) / 1000,
      metadata: this.documents[idx].metadata,
    }));
  }
}
