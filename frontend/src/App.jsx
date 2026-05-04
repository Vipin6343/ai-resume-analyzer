import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";

import AppShell from "./components/AppShell";
import DashboardPage from "./pages/DashboardPage";
import JobMatchesPage from "./pages/JobMatchesPage";
import ResumeImprovementPage from "./pages/ResumeImprovementPage";
import UploadResumePage from "./pages/UploadResumePage";
import { fetchDashboard, resetDashboard as resetDashboardData } from "./services/api";

const USER_ID = "demo-user";

export default function App() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const [error, setError] = useState("");

  const refreshDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchDashboard(USER_ID);
      setDashboard(data);
    } catch (dashboardError) {
      setError(dashboardError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDashboard();
  }, []);

  const handleReset = async () => {
    try {
      setResetting(true);
      setError("");
      const data = await resetDashboardData(USER_ID);
      setDashboard(data);
      setResetVersion((current) => current + 1);
    } catch (resetError) {
      setError(resetError.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <AppShell
      dashboard={dashboard}
      loading={loading}
      resetting={resetting}
      onRefresh={refreshDashboard}
      onReset={handleReset}
    >
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <Routes>
        <Route path="/" element={<Navigate to="/upload" replace />} />
        <Route
          path="/upload"
          element={
            <UploadResumePage
              dashboard={dashboard}
              refreshDashboard={refreshDashboard}
              resetVersion={resetVersion}
              userId={USER_ID}
            />
          }
        />
        <Route path="/dashboard" element={<DashboardPage dashboard={dashboard} loading={loading} />} />
        <Route
          path="/jobs"
          element={
            <JobMatchesPage
              dashboard={dashboard}
              refreshDashboard={refreshDashboard}
              resetVersion={resetVersion}
              userId={USER_ID}
            />
          }
        />
        <Route
          path="/improvement"
          element={
            <ResumeImprovementPage
              dashboard={dashboard}
              refreshDashboard={refreshDashboard}
              resetVersion={resetVersion}
              userId={USER_ID}
            />
          }
        />
      </Routes>
    </AppShell>
  );
}
