import { useState } from "react";
import {
  useListKnowledgeSources,
  useSearchKnowledge,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search, FileText, Loader2 } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  Procurement: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  "Vendor Management": "text-blue-400 border-blue-400/30 bg-blue-400/10",
  Logistics: "text-violet-400 border-violet-400/30 bg-violet-400/10",
  Warehouse: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  Escalation: "text-red-400 border-red-400/30 bg-red-400/10",
  "Customer Management": "text-green-400 border-green-400/30 bg-green-400/10",
};

export default function KnowledgeBase() {
  const { data: sources, isLoading: sourcesLoading } = useListKnowledgeSources();
  const searchKnowledge = useSearchKnowledge();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const res = await searchKnowledge.mutateAsync({ data: { query, topK: 8 } });
    setResults(res);
    setHasSearched(true);
  }

  if (sourcesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-16" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground mt-2">
          Enterprise policy documents indexed with TF-IDF. Search to retrieve relevant chunks used by the Knowledge Retrieval Agent.
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            TF-IDF Semantic Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-3">
            <Input
              data-testid="input-knowledge-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. emergency procurement vendor delay authorization..."
              className="flex-1 font-mono text-sm"
            />
            <Button
              data-testid="button-search"
              type="submit"
              disabled={searchKnowledge.isPending || !query.trim()}
            >
              {searchKnowledge.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      {hasSearched && (
        <div>
          <h2 className="text-base font-semibold mb-3">
            {results.length > 0 ? (
              <>Search Results <span className="text-muted-foreground font-normal">({results.length} chunks retrieved)</span></>
            ) : (
              "No results found"
            )}
          </h2>
          <div className="space-y-3">
            {results.map((r, i) => (
              <Card key={r.id} data-testid={`card-result-${i}`} className="border-border">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{r.title}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs border ${CATEGORY_COLORS[r.category] ?? "text-muted-foreground border-border"}`}
                      >
                        {r.category}
                      </Badge>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {(r.similarityScore * 100).toFixed(1)}% match
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min(r.similarityScore * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.content}</p>
                  <p className="text-xs text-muted-foreground/50 mt-2 font-mono">{r.source}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge Sources */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          Indexed Documents
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(sources ?? []).map((src) => (
            <Card
              key={src.id}
              data-testid={`card-source-${src.id}`}
              className="border-border hover:border-primary/30 transition-colors"
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{src.title}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1 truncate">{src.filename}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs border flex-shrink-0 ${CATEGORY_COLORS[src.category] ?? "text-muted-foreground border-border"}`}
                  >
                    {src.category}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">{src.chunkCount} chunks indexed</span>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(src.chunkCount, 8) }).map((_, i) => (
                      <div key={i} className="w-1.5 h-4 rounded-sm bg-primary/30" />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
