import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppShell from "./components/AppShell";

const NotFound = lazy(() => import("@/pages/NotFound"));
const DashboardPage = lazy(() => import("./pages/Dashboard"));
const BranchesPage = lazy(() => import("./pages/Branches").then(module => ({ default: module.BranchesPage })));
const BranchDetailPage = lazy(() => import("./pages/Branches").then(module => ({ default: module.BranchDetailPage })));
const SquaresPage = lazy(() => import("./pages/Squares"));
const ProspectsPage = lazy(() => import("./pages/Prospects"));
const VisitsPage = lazy(() => import("./pages/Visits"));
const TargetsPage = lazy(() => import("./pages/Targets"));
const QualityPage = lazy(() => import("./pages/Quality"));
const ReportsPage = lazy(() => import("./pages/Reports"));
const IntelligencePage = lazy(() => import("./pages/Intelligence"));
const AlertsPage = lazy(() => import("./pages/Alerts"));
const SettingsPage = lazy(() => import("./pages/Settings"));

function Router() {
  // make sure to consider if you need authentication for certain routes
  return <AppShell><Suspense fallback={<div className="grid min-h-[50vh] place-items-center text-sm text-slate-400">جارٍ تحميل الصفحة…</div>}><Switch>
    <Route path="/" component={DashboardPage} />
    <Route path="/branches" component={BranchesPage} />
    <Route path="/branches/:id" component={BranchDetailPage} />
    <Route path="/squares" component={SquaresPage} />
    <Route path="/prospects" component={ProspectsPage} />
    <Route path="/visits" component={VisitsPage} />
    <Route path="/targets" component={TargetsPage} />
    <Route path="/quality" component={QualityPage} />
    <Route path="/reports" component={ReportsPage} />
    <Route path="/intelligence" component={IntelligencePage} />
    <Route path="/alerts" component={AlertsPage} />
    <Route path="/settings" component={SettingsPage} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></Suspense></AppShell>;
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
