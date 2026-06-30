import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetScenarioRun,
  getGetScenarioRunQueryKey,
  getListScenarioRunsQueryKey,
  getListMemoryQueryKey,
  useApproveRecommendation,
  useRejectRecommendation,
  useModifyRecommendation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  XCircle,
  Edit3,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Loader2,
  Clock,
  FileText,
  Brain,
  Shield,
} from "lucide-react";

const PRIORITY_STYLES: Record<string, string> = {
  critical: "border-red-500 text-red-400 bg-red-500/10",
  high: "border-orange-500 text-orange-400 bg-orange-500/10",
  medium: "border-yellow-500 text-yellow-400 bg-yellow-500/10",
  low: "border-blue-500 text-blue-400 bg-blue-500/10",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "text-muted-foreground border-border bg-secondary",
  approved: "text-green-400 border-green-500/30 bg-green-500/10",
  rejected: "text-red-400 border-red-500/30 bg-red-500/10",
  modified: "text-violet-400 border-violet-500/30 bg-violet-500/10",
};

const AGENT_STATUS_STYLES: Record<string, string> = {
  completed: "text-green-400",
  running: "text-primary",
  failed: "text-destructive",
  pending: "text-muted-foreground",
};

function ConfidenceBar({ score }: { score: number }) {
  const color = score >= 75 ? "bg-green-500" : score >= 55 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className="text-sm font-mono font-bold w-12 text-right">{score}%</span>
    </div>
  );
}

export default function RunDetail() {
  const [, params] = useRoute("/scenarios/runs/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ?? "";
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: run, isLoading } = useGetScenarioRun(id, {
    query: { queryKey: getGetScenarioRunQueryKey(id), enabled: !!id },
  });

  const approve = useApproveRecommendation();
  const reject = useRejectRecommendation();
  const modify = useModifyRecommendation();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [rejectFeedback, setRejectFeedback] = useState<Record<string, string>>({});
  const [modifyText, setModifyText] = useState<Record<string, string>>({});
  const [actionMode, setActionMode] = useState<Record<string, "reject" | "modify" | null>>({});

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetScenarioRunQueryKey(id) });
    qc.invalidateQueries({ queryKey: getListScenarioRunsQueryKey() });
    qc.invalidateQueries({ queryKey: getListMemoryQueryKey() });
  }

  async function handleApprove(recId: string) {
    await approve.mutateAsync({ id: recId, data: {} });
    invalidate();
    toast({ title: "Recommendation approved", description: "Stored in agent memory." });
  }

  async function handleReject(recId: string) {
    const feedback = rejectFeedback[recId];
    if (!feedback?.trim()) return;
    await reject.mutateAsync({ id: recId, data: { feedback } });
    setActionMode((prev) => ({ ...prev, [recId]: null }));
    invalidate();
    toast({ title: "Recommendation rejected", description: "Feedback stored in memory." });
  }

  async function handleModify(recId: string) {
    const modifiedDescription = modifyText[recId];
    if (!modifiedDescription?.trim()) return;
    await modify.mutateAsync({ id: recId, data: { modifiedDescription } });
    setActionMode((prev) => ({ ...prev, [recId]: null }));
    invalidate();
    toast({ title: "Recommendation modified", description: "Updated decision stored." });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        Run not found.
      </div>
    );
  }

  const recs = (run.recommendations ?? []) as any[];
  const timeline = (run.agentTimeline ?? []) as any[];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          data-testid="button-back"
          onClick={() => setLocation("/scenarios")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{run.scenarioName}</h1>
          <p className="text-muted-foreground text-sm font-mono mt-0.5">{run.id}</p>
        </div>
        <Badge className={`ml-auto border ${STATUS_STYLES.approved}`}>
          {run.status.toUpperCase()}
        </Badge>
      </div>

      {/* Planner Reasoning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="w-4 h-4 text-primary" />
            Planner Reasoning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre
            data-testid="text-planner-reasoning"
            className="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed bg-secondary/30 rounded-md p-4"
          >
            {run.plannerReasoning}
          </pre>
        </CardContent>
      </Card>

      {/* Agent Execution Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4 text-primary" />
            Agent Execution Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {timeline.map((entry: any, idx: number) => {
              const isExpanded = expanded[`tl-${idx}`];
              return (
                <div
                  key={idx}
                  data-testid={`agent-timeline-${entry.agentId}`}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  <button
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/30 transition-colors"
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [`tl-${idx}`]: !isExpanded }))
                    }
                  >
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        entry.status === "completed"
                          ? "bg-green-500"
                          : entry.status === "failed"
                          ? "bg-red-500"
                          : "bg-primary"
                      }`}
                    />
                    <span className="font-medium text-sm flex-1">{entry.agentName}</span>
                    <span
                      className={`text-xs font-mono ${AGENT_STATUS_STYLES[entry.status] ?? "text-muted-foreground"}`}
                    >
                      {entry.status.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground w-20 text-right">
                      {entry.durationMs}ms
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border bg-secondary/10">
                      <p className="text-sm text-muted-foreground mt-3 mb-2">{entry.outputSummary}</p>
                      <ul className="space-y-1">
                        {(entry.insights ?? []).map((insight: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-2">
                            <span className="text-primary flex-shrink-0">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <div>
        <h2 className="text-xl font-bold mb-4">
          Recommendations
          <span className="text-muted-foreground font-normal text-base ml-2">
            ({recs.length} generated, ranked by confidence)
          </span>
        </h2>
        <div className="space-y-4">
          {recs.map((rec: any, idx: number) => {
            const isExpanded = expanded[rec.id];
            const mode = actionMode[rec.id];
            const isBusy =
              approve.isPending || reject.isPending || modify.isPending;
            const isPending = rec.status === "pending";

            return (
              <Card
                key={rec.id}
                data-testid={`card-recommendation-${rec.id}`}
                className={`border ${
                  rec.priority === "critical"
                    ? "border-red-500/30"
                    : rec.priority === "high"
                    ? "border-orange-500/30"
                    : "border-border"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl font-black font-mono text-muted-foreground/30 leading-none mt-1">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-xs border ${PRIORITY_STYLES[rec.priority] ?? ""}`}
                        >
                          {rec.priority.toUpperCase()}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs border ${STATUS_STYLES[rec.status] ?? ""}`}
                        >
                          {rec.status.toUpperCase()}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-foreground mt-1">{rec.title}</h3>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs text-muted-foreground mb-1">Confidence</div>
                      <div className="text-lg font-bold font-mono">
                        {rec.confidenceScore}%
                      </div>
                    </div>
                  </div>
                  <div className="ml-10">
                    <ConfidenceBar score={rec.confidenceScore} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{rec.modifiedDescription ?? rec.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-secondary/30 rounded-md p-3">
                      <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Business Impact</p>
                      <p className="text-sm">{rec.businessImpact}</p>
                    </div>
                    <div className="bg-secondary/30 rounded-md p-3">
                      <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Estimated Cost</p>
                      <p className="text-sm">{rec.estimatedCost}</p>
                    </div>
                  </div>

                  {/* Evidence & Reasoning Toggle */}
                  <button
                    data-testid={`button-expand-${rec.id}`}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [rec.id]: !isExpanded }))
                    }
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    Evidence & Reasoning
                  </button>

                  {isExpanded && (
                    <div className="space-y-4 border-t border-border pt-4">
                      {/* Confidence Breakdown */}
                      <div>
                        <h4 className="text-xs uppercase font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <Shield className="w-3 h-3" />
                          Confidence Breakdown
                        </h4>
                        <div className="space-y-2">
                          {(rec.confidenceBreakdown ?? []).map((f: any, i: number) => (
                            <div key={i} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{f.factor}</span>
                                <span className="font-mono">{Math.round(f.score * 100)}%</span>
                              </div>
                              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary/70 rounded-full"
                                  style={{ width: `${Math.min(f.score * 100, 100)}%` }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground/70">{f.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Evidence */}
                      <div>
                        <h4 className="text-xs uppercase font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <FileText className="w-3 h-3" />
                          Retrieved Evidence
                        </h4>
                        <div className="space-y-2">
                          {(rec.evidence ?? []).map((e: any, i: number) => (
                            <div
                              key={i}
                              className="border border-border rounded-md p-3 bg-secondary/20"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-primary">{e.source}</span>
                                <span className="text-xs font-mono text-muted-foreground">
                                  {(e.similarityScore * 100).toFixed(1)}% match
                                </span>
                              </div>
                              <div className="h-1 bg-secondary rounded-full overflow-hidden mb-2">
                                <div
                                  className="h-full bg-primary/50 rounded-full"
                                  style={{ width: `${Math.min(e.similarityScore * 100, 100)}%` }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {e.excerpt}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Reasoning Trace */}
                      <div>
                        <h4 className="text-xs uppercase font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <Brain className="w-3 h-3" />
                          Reasoning Trace
                        </h4>
                        <ol className="space-y-1">
                          {(rec.reasoningTrace ?? []).map((step: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground flex gap-2">
                              <span className="font-mono text-primary flex-shrink-0">{String(i + 1).padStart(2, "0")}.</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Business Rules */}
                      {(rec.businessRules ?? []).length > 0 && (
                        <div>
                          <h4 className="text-xs uppercase font-medium text-muted-foreground mb-2">Applied Business Rules</h4>
                          <ul className="space-y-1">
                            {rec.businessRules.map((rule: string, i: number) => (
                              <li key={i} className="text-xs text-muted-foreground flex gap-2">
                                <span className="text-amber-400 flex-shrink-0">—</span>
                                <span>{rule}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {isPending && (
                    <div className="flex flex-col gap-3 pt-2 border-t border-border">
                      {mode === null && (
                        <div className="flex gap-2">
                          <Button
                            data-testid={`button-approve-${rec.id}`}
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            disabled={isBusy}
                            onClick={() => handleApprove(rec.id)}
                          >
                            {approve.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                            )}
                            Approve
                          </Button>
                          <Button
                            data-testid={`button-modify-${rec.id}`}
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            disabled={isBusy}
                            onClick={() => {
                              setModifyText((p) => ({ ...p, [rec.id]: rec.description }));
                              setActionMode((p) => ({ ...p, [rec.id]: "modify" }));
                            }}
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Modify
                          </Button>
                          <Button
                            data-testid={`button-reject-${rec.id}`}
                            size="sm"
                            variant="outline"
                            className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                            disabled={isBusy}
                            onClick={() =>
                              setActionMode((p) => ({ ...p, [rec.id]: "reject" }))
                            }
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {mode === "reject" && (
                        <div className="space-y-2">
                          <Textarea
                            data-testid={`input-reject-feedback-${rec.id}`}
                            placeholder="Provide feedback on why this recommendation is rejected..."
                            value={rejectFeedback[rec.id] ?? ""}
                            onChange={(e) =>
                              setRejectFeedback((p) => ({ ...p, [rec.id]: e.target.value }))
                            }
                            rows={2}
                            className="text-sm resize-none"
                          />
                          <div className="flex gap-2">
                            <Button
                              data-testid={`button-confirm-reject-${rec.id}`}
                              size="sm"
                              variant="destructive"
                              disabled={!rejectFeedback[rec.id]?.trim() || isBusy}
                              onClick={() => handleReject(rec.id)}
                            >
                              Confirm Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setActionMode((p) => ({ ...p, [rec.id]: null }))
                              }
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {mode === "modify" && (
                        <div className="space-y-2">
                          <Textarea
                            data-testid={`input-modify-${rec.id}`}
                            value={modifyText[rec.id] ?? ""}
                            onChange={(e) =>
                              setModifyText((p) => ({ ...p, [rec.id]: e.target.value }))
                            }
                            rows={4}
                            className="text-sm resize-none"
                          />
                          <div className="flex gap-2">
                            <Button
                              data-testid={`button-confirm-modify-${rec.id}`}
                              size="sm"
                              disabled={!modifyText[rec.id]?.trim() || isBusy}
                              onClick={() => handleModify(rec.id)}
                            >
                              Save Modified
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setActionMode((p) => ({ ...p, [rec.id]: null }))
                              }
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!isPending && rec.userFeedback && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Feedback: </span>
                        {rec.userFeedback}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
