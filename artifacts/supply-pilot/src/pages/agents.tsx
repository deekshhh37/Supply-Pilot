import {
  useListAgents,
  useGetDashboardStats,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ServerCog, Database, Zap, Clock, CheckCircle2 } from "lucide-react";

const AGENT_COLORS: Record<string, string> = {
  planner: "text-primary border-primary/30 bg-primary/10",
  inventory: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  logistics: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  procurement: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  "customer-impact": "text-green-400 border-green-400/30 bg-green-400/10",
  "weather-risk": "text-violet-400 border-violet-400/30 bg-violet-400/10",
  "knowledge-retrieval": "text-orange-400 border-orange-400/30 bg-orange-400/10",
  recommendation: "text-rose-400 border-rose-400/30 bg-rose-400/10",
  memory: "text-teal-400 border-teal-400/30 bg-teal-400/10",
};

export default function AgentRegistry() {
  const { data: agents, isLoading: agentsLoading } = useListAgents();
  const { data: stats } = useGetDashboardStats();

  const agentStatsMap = new Map(
    (stats?.agentStats ?? []).map((s) => [s.agentId, s])
  );

  if (agentsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agent Registry</h1>
        <p className="text-muted-foreground mt-2">
          9 specialized AI agents powering the SupplyPilot decision intelligence pipeline.
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase font-medium">Total Agents</p>
            <p className="text-3xl font-bold font-mono mt-1">{agents?.length ?? 9}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase font-medium">Total Invocations</p>
            <p className="text-3xl font-bold font-mono mt-1">
              {(stats?.agentStats ?? []).reduce((sum, s) => sum + s.totalInvocations, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase font-medium">Avg Success Rate</p>
            <p className="text-3xl font-bold font-mono mt-1">
              {stats?.agentStats?.length
                ? `${Math.round(stats.agentStats.reduce((s, a) => s + a.successRate, 0) / stats.agentStats.length * 100)}%`
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(agents ?? []).map((agent) => {
          const color = AGENT_COLORS[agent.id] ?? "text-primary border-primary/30 bg-primary/10";
          const liveStats = agentStatsMap.get(agent.id);

          return (
            <Card
              key={agent.id}
              data-testid={`card-agent-${agent.id}`}
              className="border-border"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-md border ${color}`}>
                    <ServerCog className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{agent.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {agent.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Live stats */}
                {liveStats && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-secondary/30 rounded p-2 text-center">
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Zap className="w-3 h-3" />
                        Invocations
                      </p>
                      <p className="text-sm font-bold font-mono">{liveStats.totalInvocations}</p>
                    </div>
                    <div className="bg-secondary/30 rounded p-2 text-center">
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" />
                        Avg ms
                      </p>
                      <p className="text-sm font-bold font-mono">{liveStats.avgDurationMs}</p>
                    </div>
                    <div className="bg-secondary/30 rounded p-2 text-center">
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Success
                      </p>
                      <p className="text-sm font-bold font-mono">{Math.round(liveStats.successRate * 100)}%</p>
                    </div>
                  </div>
                )}

                {/* Capabilities */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium mb-2 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Capabilities
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities.map((cap) => (
                      <Badge
                        key={cap}
                        variant="secondary"
                        className="text-xs"
                      >
                        {cap}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Data Sources */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium mb-2 flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    Data Sources
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {agent.dataSources.map((ds) => (
                      <Badge
                        key={ds}
                        variant="outline"
                        className="text-xs border-border text-muted-foreground"
                      >
                        {ds}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
