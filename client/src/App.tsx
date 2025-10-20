import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Demo from "@/pages/demo";
import AdminLogin from "@/pages/admin-login";
import AdminMatches from "@/pages/admin-matches";
import AdminMatchDetail from "@/pages/admin-match-detail";
import AdminPlayers from "@/pages/admin-players";
import UserLogin from "@/pages/user-login";
import UserMatches from "@/pages/user-matches";
import UserMatchDetail from "@/pages/user-match-detail";
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
      <Route path="/admin/matches/:id">
        {(params) => <AdminMatchDetail params={params} />}
      </Route>
      <Route path="/admin/players" component={AdminPlayers} />
      <Route path="/user/login" component={UserLogin} />
      <Route path="/user/matches" component={UserMatches} />
      <Route path="/user/matches/:id">
        {(params) => <UserMatchDetail params={params} />}
      </Route>
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
