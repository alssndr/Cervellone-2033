import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Demo from "@/pages/demo";
import AdminLogin from "@/pages/admin-login";
import AdminMatches from "@/pages/admin-matches";
import MatchViewPage from "@/pages/match-view";
import InviteSignup from "@/pages/invite-signup";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/demo" component={Demo} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/matches" component={AdminMatches} />
      <Route path="/matches/:id">
        {(params) => <MatchViewPage params={params} />}
      </Route>
      <Route path="/invite/:token">
        {(params) => <InviteSignup params={params} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
