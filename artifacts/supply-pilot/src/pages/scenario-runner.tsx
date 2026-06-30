import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListScenarios,
  useRunScenario,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Play,
  Zap,
  CloudLightning,
  ShoppingCart,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

const SCENARIO_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  vendor_delay: AlertTriangle,
  inventory_shortage: ShoppingCart,
  weather_disruption: CloudLightning,
  vip_customer_order: Zap,
};

const SCENARIO_COLORS: Record<string, string> = {
  vendor_delay: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  inventory_shortage: "text-red-400 border-red-400/30 bg-red-400/10",
  weather_disruption: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  vip_customer_order: "text-violet-400 border-violet-400/30 bg-violet-400/10",
};

const AGENT_STEP_LABELS: Record<string, string> = {
  planner: "Planner Agent",
  inventory: "Inventory Agent",
  logistics: "Logistics Agent",
  procurement: "Procurement Agent",
  "customer-impact": "Customer Impact Agent",
  "weather-risk": "Weather Risk Agent",
  "knowledge-retrieval": "Knowledge Retrieval Agent",
  recommendation: "Recommendation Agent",
  memory: "Memory Agent",
};

interface AgentStep {
  id: string;
  label: string;
  status: "pending" | "running" | "completed";
}

export default function ScenarioRunner() {
  const [, setLocation] = useLocation();
  const { data: scenarios, isLoading: scenariosLoading } = useListScenarios();
  const runScenario = useRunScenario();
  const { toast } = useToast();

  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const selected = scenarios?.find((s) => s.id === selectedScenario);

  function selectScenario(id: string) {
    const sc = scenarios?.find((s) => s.id === id);
    setSelectedScenario(id);
    setCustomInput(sc?.inputSample ?? "");
    setAgentSteps([]);
  }

  async function handleExecute() {
    if (!selected) return;
    setIsRunning(true);

    // Build agent steps for animation
    const agentIds = selected.agentsInvolved.map((name) => {
      const entry = Object.entries(AGENT_STEP_LABELS).find(([, label]) => label === name);
      return entry ? entry[0] : name.toLowerCase().replace(" ", "-");
    });

    const steps: AgentStep[] = agentIds.map((id) => ({
      id,
      label: AGENT_STEP_LABELS[id] ?? id,
      status: "pending" as const,
    }));
    setAgentSteps(steps);

    // Animate each step sequentially
    const animateSteps = async () => {
      for (let i = 0; i < steps.length; i++) {
        setAgentSteps((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, status: "running" } : s
          )
        );
        await new Promise((r) => setTimeout(r, 400));
        setAgentSteps((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, status: "completed" } : s
          )
        );
      }
    };

    const [, result] = await Promise.all([
      animateSteps(),
      runScenario.mutateAsync({
        data: { scenarioType: selected.scenarioType, input: customInput },
      }),
    ]);

    setIsRunning(false);
    if (result) {
      toast({ title: "Scenario complete", description: `${result.recommendations.length} recommendations generated.` });
      setLocation(`/scenarios/runs/${result.id}`);
    }
  }

  if (scenariosLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scenario Runner</h1>
        <p className="text-muted-foreground mt-2">
          Select a supply chain scenario to execute the agent pipeline and generate actionable recommendations.
        </p>
      </div>

      {/* Scenario cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(scenarios ?? []).map((sc) => {
          const Icon = SCENARIO_ICONS[sc.scenarioType] ?? Zap;
          const color = SCENARIO_COLORS[sc.scenarioType] ?? "text-primary border-primary/30 bg-primary/10";
          const isSelected = selectedScenario === sc.id;
          return (
            <button
              key={sc.id}
              data-testid={`scenario-card-${sc.id}`}
              onClick={() => selectScenario(sc.id)}
              className={`text-left rounded-lg border p-5 transition-all cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-card hover:border-primary/50 hover:bg-secondary/30"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-md border ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{sc.name}</h3>
                    {isSelected && (
                      <Badge variant="outline" className="text-xs border-primary text-primary">
                        SELECTED
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{sc.description}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {sc.agentsInvolved.map((a) => (
                      <span
                        key={a}
                        className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Input and Execute */}
      {selected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scenario Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              data-testid="input-scenario"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              rows={4}
              className="font-mono text-sm resize-none"
              placeholder="Describe the scenario details..."
              disabled={isRunning}
            />
            <Button
              data-testid="button-execute"
              onClick={handleExecute}
              disabled={isRunning || !customInput.trim()}
              size="lg"
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing Agent Pipeline...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Execute Scenario
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Agent execution timeline */}
      {agentSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agent Execution Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {agentSteps.map((step, idx) => (
                <div
                  key={step.id}
                  data-testid={`agent-step-${step.id}`}
                  className="flex items-center gap-3 p-3 rounded-md bg-secondary/30"
                >
                  <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                    {step.status === "completed" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : step.status === "running" ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-border" />
                    )}
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <span
                      className={`text-sm font-medium ${
                        step.status === "pending"
                          ? "text-muted-foreground"
                          : step.status === "running"
                          ? "text-primary"
                          : "text-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {step.status === "pending" && `Step ${idx + 1}`}
                      {step.status === "running" && "RUNNING..."}
                      {step.status === "completed" && "DONE"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
