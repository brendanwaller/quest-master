// ============================================================================
// Quest Master - App shell + routing. Fully self-contained, no Convex.
// Flow: Landing -> Signup/Login -> ConsentGate -> AgeTier -> Dashboard ...
// ============================================================================
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ErrorBanner, installGlobalErrorReporter, type RuntimeError } from "./components/ErrorBanner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useEffect, useState } from "react";
import { Landing } from "./pages/Landing";
import { Signup } from "./pages/Signup";
import { Login } from "./pages/Login";
import { ConsentGate } from "./pages/ConsentGate";
import { AgeTierPage } from "./pages/AgeTier";
import { Dashboard } from "./pages/Dashboard";
import { CampaignDetail } from "./pages/CampaignDetail";
import { CreateCampaign } from "./pages/CreateCampaign";
import CreateCharacter from "./pages/CreateCharacter";
import { SessionPage } from "./pages/SessionPage";
import { SessionRecap } from "./pages/SessionRecap";
import { StartDemoQuest } from "./pages/StartDemoQuest";
import { JoinCampaign } from "./pages/JoinCampaign";
import { Billing } from "./pages/Billing";
import { store } from "./lib/store";
import "./App.css";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  // COPPA gate: consent first, then age tier, before anything else.
  if (!store.hasConsent()) return <Navigate to="/consent" replace />;
  if (!store.getAgeTier()) return <Navigate to="/age-tier" replace />;
  return <>{children}</>;
}

function App() {
  const [runtimeErrors, setRuntimeErrors] = useState<RuntimeError[]>([]);

  useEffect(() => {
    installGlobalErrorReporter((error) => {
      setRuntimeErrors((errors) => [error, ...errors].slice(0, 5));
    });
  }, []);

  const dismissError = (id: string) => {
    setRuntimeErrors((errors) => errors.filter((error) => error.id !== id));
  };

  return (
    <AuthProvider>
      <ErrorBoundary>
        <ErrorBanner errors={runtimeErrors} onDismiss={dismissError} />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/consent" element={<ConsentGate />} />
            <Route path="/age-tier" element={<AgeTierPage />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/campaigns/new"
              element={
                <PrivateRoute>
                  <CreateCampaign />
                </PrivateRoute>
              }
            />
            <Route
              path="/campaigns/:id"
              element={
                <PrivateRoute>
                  <CampaignDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/characters/new"
              element={
                <PrivateRoute>
                  <CreateCharacter />
                </PrivateRoute>
              }
            />
            <Route
              path="/session/:id"
              element={
                <PrivateRoute>
                  <SessionPage />
                </PrivateRoute>
              }
            />
            <Route path="/join/:code" element={<JoinCampaign />} />
            <Route
              path="/demo-quest"
              element={
                <PrivateRoute>
                  <StartDemoQuest />
                </PrivateRoute>
              }
            />
            <Route
              path="/session/:id/recap"
              element={
                <PrivateRoute>
                  <SessionRecap />
                </PrivateRoute>
              }
            />
            <Route
              path="/billing"
              element={
                <PrivateRoute>
                  <Billing />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
