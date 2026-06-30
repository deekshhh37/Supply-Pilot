import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "./components/layout";
import Dashboard from "./pages/dashboard";
import ScenarioRunner from "./pages/scenario-runner";
import RunDetail from "./pages/run-detail";
import MemoryPanel from "./pages/memory";
import KnowledgeBase from "./pages/knowledge";
import AgentRegistry from "./pages/agents";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/scenarios" component={ScenarioRunner} />
        <Route path="/scenarios/runs/:id" component={RunDetail} />
        <Route path="/memory" component={MemoryPanel} />
        <Route path="/knowledge" component={KnowledgeBase} />
        <Route path="/agents" component={AgentRegistry} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
