import {
  useListMemory,
  getListMemoryQueryKey,
  useClearMemory,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { BrainCircuit, Trash2, CheckCircle2, XCircle, Edit3, AlertTriangle } from "lucide-react";

const OUTCOME_STYLES: Record<string, string> = {
  approved: "text-green-400 border-green-500/30 bg-green-500/10",
  rejected: "text-red-400 border-red-500/30 bg-red-500/10",
  modified: "text-violet-400 border-violet-500/30 bg-violet-500/10",
  modified_action: "text-violet-400 border-violet-500/30 bg-violet-500/10",
  approved_action: "text-green-400 border-green-500/30 bg-green-500/10",
  rejected_action: "text-red-400 border-red-500/30 bg-red-500/10",
};

const OUTCOME_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  approved: CheckCircle2,
  approved_action: CheckCircle2,
  rejected: XCircle,
  rejected_action: XCircle,
  modified: Edit3,
  modified_action: Edit3,
};

function ReliabilityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 88 ? "bg-green-500" : pct >= 75 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono w-10 text-right">{pct}%</span>
    </div>
  );
}

export default function MemoryPanel() {
  const { data: memory, isLoading } = useListMemory();
  const clearMemory = useClearMemory();
  const qc = useQueryClient();
  const { toast } = useToast();

  async function handleClear() {
    await clearMemory.mutateAsync({});
    qc.invalidateQueries({ queryKey: getListMemoryQueryKey() });
    toast({ title: "Memory cleared", description: "All decision history removed." });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const incidents = memory?.incidents ?? [];
  const vendors = memory?.vendorPerformance ?? [];
  const approvalRate = Math.round((memory?.approvalRate ?? 0) * 100);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Memory Panel</h1>
          <p className="text-muted-foreground mt-2">
            Agent decision history, vendor performance, and outcome tracking.
          </p>
        </div>
        <Button
          data-testid="button-clear-memory"
          variant="outline"
          size="sm"
          className="text-destructive border-destructive/30 hover:bg-destructive/10"
          disabled={clearMemory.isPending || incidents.length === 0}
          onClick={handleClear}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear Memory
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Total Decisions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono" data-testid="text-total-decisions">
              {memory?.totalDecisions ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Approval Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono" data-testid="text-approval-rate">
              {approvalRate}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Vendors Tracked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{vendors.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Decision History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BrainCircuit className="w-4 h-4 text-primary" />
            Decision History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p>No decisions recorded yet.</p>
              <p className="text-sm mt-1">Run a scenario and approve or reject recommendations to build memory.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-medium">Incident</th>
                    <th className="px-4 py-3 font-medium">Outcome</th>
                    <th className="px-4 py-3 font-medium">Confidence</th>
                    <th className="px-4 py-3 font-medium">Feedback</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((entry) => {
                    const Icon = OUTCOME_ICONS[entry.outcome] ?? BrainCircuit;
                    return (
                      <tr
                        key={entry.id}
                        data-testid={`row-memory-${entry.id}`}
                        className="border-b border-border hover:bg-secondary/30 transition-colors"
                      >
                        <td className="px-4 py-3 max-w-xs">
                          <p className="font-medium truncate">{entry.incidentSummary}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.decision.substring(0, 80)}...</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`text-xs border ${OUTCOME_STYLES[entry.outcome] ?? "text-muted-foreground border-border"}`}
                          >
                            <Icon className="w-3 h-3 mr-1" />
                            {entry.outcome.replace("_action", "").toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono">{entry.confidenceAtDecision}%</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs">
                          {entry.feedback ?? <span className="opacity-40">—</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(entry.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendor Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendor Performance Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          {vendors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No vendor data tracked yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {vendors.map((v) => (
                <div
                  key={v.vendorId}
                  data-testid={`row-vendor-${v.vendorId}`}
                  className="border border-border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{v.vendorName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{v.vendorId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Incidents</p>
                      <p className="font-bold font-mono">{v.totalIncidents}</p>
                    </div>
                  </div>
                  <ReliabilityBar score={v.reliabilityScore} />
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>Avg Lead Time: {v.avgLeadTimeDays} days</span>
                    {v.lastIncident && (
                      <span>Last incident: {new Date(v.lastIncident).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
