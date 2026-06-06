import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AgentChat from "./pages/AgentChat";
import Toolbox from "./pages/Toolbox";
import SupervisorSettings from "./pages/SupervisorSettings";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/agent/:slug"} component={AgentChat} />
      <Route path={"/toolbox"} component={Toolbox} />
      <Route path={"/settings"} component={SupervisorSettings} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
